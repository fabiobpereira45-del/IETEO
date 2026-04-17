"use client"

import { useEffect, useState } from "react"
import { DollarSign, Loader2, GraduationCap, Calculator, CheckCircle2, AlertCircle, Calendar, Printer, RotateCcw, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    getProLaboreCalculations,
    type FinancialSettings,
    getFinancialSettings,
    settleProLabore,
    deleteFinancialCharge,
    getFinancialCharges,
    getDisciplines,
    type Discipline
} from "@/lib/store"
import { toast } from "sonner"

export function ProLaboreManager({ onRefresh }: { onRefresh?: () => void } = {}) {
    const [data, setData] = useState<any[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    // Settle modal state
    const [settleItem, setSettleItem] = useState<any | null>(null)
    const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0])
    const [settleModalOpen, setSettleModalOpen] = useState(false)

    // Reverse confirmation state
    const [reverseItem, setReverseItem] = useState<any | null>(null)
    const [reverseDialogOpen, setReverseDialogOpen] = useState(false)

    async function load() {
        setLoading(true)
        try {
            const [calcs, s, allCharges, allDisciplines] = await Promise.all([
                getProLaboreCalculations(),
                getFinancialSettings(),
                getFinancialCharges(),
                getDisciplines()
            ])

            // ── Sort disciplines chronologically by year then month ──────
            const MONTH_ORDER: Record<string, number> = {
                'Jan': 1, 'Fev': 2, 'Mar': 3, 'Abr': 4, 'Mai': 5, 'Jun': 6,
                'Jul': 7, 'Ago': 8, 'Set': 9, 'Out': 10, 'Nov': 11, 'Dez': 12
            }
            const sortedDisciplines = [...allDisciplines].sort((a, b) => {
                // First try strictly CURRICULUM order if available from store's semester mapping
                if ((a as any).semesterOrder !== undefined && (b as any).semesterOrder !== undefined) {
                    const sA = (a as any).semesterOrder;
                    const sB = (b as any).semesterOrder;
                    if (sA !== sB) return sA - sB;
                    return a.order - b.order;
                }

                // Fallback to chronological month/year for display consistency
                const yearA = parseInt(a.applicationYear || '9999')
                const yearB = parseInt(b.applicationYear || '9999')
                if (yearA !== yearB) return yearA - yearB

                const mA = (MONTH_ORDER[a.applicationMonth || ''] ?? parseInt(a.applicationMonth || '0')) || 13
                const mB = (MONTH_ORDER[b.applicationMonth || ''] ?? parseInt(b.applicationMonth || '0')) || 13
                if (mA !== mB) return mA - mB

                return a.order - b.order
            })
            setDisciplines(sortedDisciplines)

            const enriched = calcs.map(item => {
                const charge = allCharges.find(c =>
                    (c.type as any) === 'expense' &&
                    c.professorId === item.professorId &&
                    c.disciplineId === item.disciplineId &&
                    c.classId === item.classId &&
                    c.status === 'paid'
                )
                return { ...item, chargeId: charge?.id, paymentDate: charge?.paymentDate }
            })

            setData(enriched)
            setSettings(s)
        } catch (e) {
            console.error(e)
            toast.error("Erro ao carregar cálculos")
        } finally {
            setLoading(false)
        }
    }

    function openSettle(item: any) {
        setSettleItem(item)
        setSettleDate(new Date().toISOString().split('T')[0])
        setSettleModalOpen(true)
    }

    async function handleSettle() {
        if (!settleItem) return

        const key = `${settleItem.professorId}-${settleItem.disciplineId}-${settleItem.classId}`
        console.log("Iniciando baixa de pro-labore para chave:", key)
        setSaving(key)
        
        try {
            await settleProLabore({
                professorId: settleItem.professorId,
                disciplineId: settleItem.disciplineId,
                classId: settleItem.classId,
                amount: settleItem.totalAmount,
                description: `Pro-labore: ${settleItem.disciplineName} (${settleItem.className})`
            })
            
            console.log("Baixa realizada com sucesso no banco.")
            setSettleModalOpen(false)
            toast.success("Pagamento registrado com sucesso!")
            
            // Auto-print receipt immediately after settling
            printProLaboreReceipt(settleItem, settleDate, settings)
            
            await load()
            onRefresh?.()
            setSettleItem(null)
        } catch (e: any) {
            console.error("Erro no handleSettle:", e)
            toast.error("Erro ao registrar pagamento: " + (e.message || "Erro desconhecido"))
        } finally {
            setSaving(null)
        }
    }

    async function handleReverse() {
        if (!reverseItem?.chargeId) return

        setSaving(reverseItem.chargeId)
        setReverseDialogOpen(false)
        try {
            await deleteFinancialCharge(reverseItem.chargeId)
            toast.success("Pagamento estornado com sucesso!")
            load()
            onRefresh?.()
        } catch (e: any) {
            toast.error("Erro ao estornar: " + e.message)
        } finally {
            setSaving(null)
            setReverseItem(null)
        }
    }

    function handlePrintReceipt(item: any) {
        printProLaboreReceipt(item, item.paymentDate || new Date().toISOString().split('T')[0], settings)
    }

    useEffect(() => { load() }, [])

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold font-serif">Pro-labore Docente</h3>
                    <p className="text-xs text-muted-foreground font-medium">Controle por Disciplina e Turma</p>
                </div>
                <div className="bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary">Taxa/Aula: R$ {settings?.proLaboreFeePerLesson?.toFixed(2) || "0,00"}</span>
                </div>
            </div>

            {disciplines.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
                    <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground font-medium">Nenhuma disciplina cadastrada no sistema.</p>
                </div>
            ) : (
                <Accordion type="single" collapsible className="space-y-4">
                    {disciplines.map(discipline => {
                        const disciplineCalcs = data.filter(item => item.disciplineId === discipline.id)
                        const totalPending = disciplineCalcs.filter(c => !c.isPaid).reduce((acc, c) => acc + c.totalAmount, 0)
                        const isFullyPaid = disciplineCalcs.length > 0 && disciplineCalcs.every(c => c.isPaid)
                        const hasActiveLinks = disciplineCalcs.length > 0

                        return (
                            <AccordionItem key={discipline.id} value={discipline.id} className="border border-border/60 bg-white rounded-xl overflow-hidden shadow-sm px-0">
                                <AccordionTrigger className="hover:no-underline px-4 py-4 group">
                                    <div className="flex items-center justify-between w-full pr-4 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <GraduationCap className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">{discipline.name}</h4>
                                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 uppercase tracking-wider">
                                                    {discipline.applicationMonth}/{discipline.applicationYear} • {disciplineCalcs.length} Turmas vinculadas
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {!hasActiveLinks ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                                                    <Calendar className="h-3 w-3" /> AGENDADA / SEM PROFESSOR
                                                </span>
                                            ) : isFullyPaid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                    <CheckCircle2 className="h-3 w-3" /> LIQUIDADA
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                        <Loader2 className="h-3 w-3" /> PENDENTE
                                                    </span>
                                                    {totalPending > 0 && (
                                                        <span className="text-[10px] font-black text-rose-500 mt-1">
                                                            A PAGAR: R$ {totalPending.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-0 pt-0 pb-0 border-t border-border/50">
                                    {!hasActiveLinks ? (
                                        <div className="p-8 text-center bg-muted/10">
                                            <p className="text-xs text-muted-foreground italic font-medium">Esta disciplina ainda não possui agendamentos de aulas ou professor vinculado.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-muted/30">
                                                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Professor</th>
                                                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Turma</th>
                                                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Aulas</th>
                                                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                                                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                                                        <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    {disciplineCalcs.map(item => {
                                                        const key = `${item.professorId}-${item.disciplineId}-${item.classId}`
                                                        const isThisSaving = saving === key || saving === item.chargeId
                                                        return (
                                                            <tr key={key} className="hover:bg-muted/10 transition-colors">
                                                                <td className="px-4 py-3 text-xs font-bold">{item.professorName}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className="text-[10px] font-medium text-foreground py-0.5 px-2 bg-muted rounded-full uppercase">
                                                                        {item.className}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-xs">{item.lessonsCount}</td>
                                                                <td className="px-4 py-3 text-sm font-black text-primary">R$ {item.totalAmount.toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {item.isPaid ? (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                                            <CheckCircle2 className="h-3 w-3" /> PAGO
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                                            PENDENTE
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {!item.isPaid ? (
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 text-[10px] font-bold px-3 gap-1.5 shadow-sm active:scale-95"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    openSettle(item);
                                                                                }}
                                                                                disabled={isThisSaving}
                                                                            >
                                                                                {isThisSaving
                                                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                                    : <DollarSign className="h-3 w-3" />
                                                                                }
                                                                                DAR BAIXA
                                                                            </Button>
                                                                        ) : (
                                                                            <>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-7 text-[10px] font-bold px-2 gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                                                                    onClick={() => handlePrintReceipt(item)}
                                                                                    title="Imprimir Recibo"
                                                                                >
                                                                                    <Printer className="h-3 w-3" />
                                                                                    Recibo
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    className="h-7 text-[10px] font-bold px-2 gap-1 text-destructive hover:bg-rose-50"
                                                                                    onClick={() => { setReverseItem(item); setReverseDialogOpen(true) }}
                                                                                    disabled={isThisSaving}
                                                                                    title="Estornar"
                                                                                >
                                                                                    <RotateCcw className="h-3 w-3" />
                                                                                    Estornar
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            )}

            <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground font-medium italic">
                    Ao dar baixa, um registro de despesa será criado automaticamente no fluxo financeiro geral vinculado a este professor e turma. Um recibo será gerado automaticamente.
                </p>
            </div>

            {/* ─── Settle Modal ─────────────────────────────────────────── */}
            <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold font-serif">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Confirmar Pagamento de Pro-labore
                        </DialogTitle>
                    </DialogHeader>

                    {settleItem && (
                        <div className="px-6 py-5 space-y-4">
                            {/* Summary Card */}
                            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Professor</p>
                                        <p className="text-sm font-bold text-foreground mt-0.5">{settleItem.professorName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Valor</p>
                                        <p className="text-xl font-black text-primary mt-0.5">R$ {settleItem.totalAmount?.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Disciplina</p>
                                        <p className="font-semibold text-foreground">{settleItem.disciplineName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Turma</p>
                                        <p className="font-semibold text-foreground">{settleItem.className}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Aulas</p>
                                        <p className="font-semibold text-foreground">{settleItem.lessonsCount} aulas × R$ {settleItem.feePerLesson?.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date picker */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Data do Pagamento</Label>
                                <Input
                                    type="date"
                                    value={settleDate}
                                    onChange={e => setSettleDate(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                Um recibo será gerado automaticamente após a confirmação.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="px-6 pb-6 gap-2">
                        <Button variant="outline" className="text-xs" onClick={() => setSettleModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button className="text-xs font-bold gap-1.5 shadow-sm" onClick={handleSettle} disabled={!!saving}>
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
                            Confirmar Pagamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Reverse Confirmation Dialog ─────────────────────────── */}
            <AlertDialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Estornar Pagamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O pagamento de pro-labore de <strong>{reverseItem?.professorName}</strong> referente à disciplina <strong>{reverseItem?.disciplineName}</strong> ({reverseItem?.className}) será estornado e o registro de despesa será excluído do financeiro. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReverseItem(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={handleReverse}
                        >
                            Confirmar Estorno
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ─── Receipt PDF Generation ───────────────────────────────────────────────────

function printProLaboreReceipt(item: any, paymentDate: string, settings: any) {
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    const amount = item.totalAmount || 0
    const amountStr = formatter.format(amount)
    const dateStr = (() => {
        try { return new Date(paymentDate + 'T12:00:00').toLocaleDateString('pt-BR') }
        catch { return new Date().toLocaleDateString('pt-BR') }
    })()
    const institution = settings?.institutionName || 'Instituto de Ensino Teológico — IETEO'
    const now = new Date()
    const receiptNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`

    // Number to words (extenso) simplified
    const reais = Math.floor(amount)
    const centavos = Math.round((amount - reais) * 100)
    let extenso = `${reais} reais`
    if (centavos > 0) extenso += ` e ${centavos} centavos`

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo Pro-labore — ${item.professorName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Crimson+Pro:wght@600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: #f0f4f8;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 20px;
      min-height: 100vh;
    }

    /* 
      1/4 of A4 portrait = 105mm × 148.5mm 
      At 96dpi screen: 105mm ≈ 397px, 148.5mm ≈ 561px
    */
    .receipt-wrap {
      display: flex;
      flex-direction: column;
      gap: 0;
      width: 397px;
    }

    /* Main Copy */
    .receipt {
      width: 397px;
      min-height: 280px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      position: relative;
    }

    /* Decorative left accent */
    .receipt::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 50%, #f97316 100%);
    }

    .receipt-header {
      padding: 14px 18px 12px 22px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .inst-name {
      font-size: 9px;
      font-weight: 800;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1.3;
    }

    .receipt-title {
      font-family: 'Crimson Pro', serif;
      font-size: 22px;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .receipt-no {
      text-align: right;
    }

    .receipt-no .label {
      font-size: 8px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .receipt-no .value {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      font-family: monospace;
    }

    .receipt-body {
      padding: 16px 18px 16px 22px;
    }

    /* Amount block */
    .amount-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }

    .amount-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #166534;
      letter-spacing: 0.8px;
    }

    .amount-value {
      font-size: 22px;
      font-weight: 800;
      color: #15803d;
      letter-spacing: -0.5px;
    }

    .amount-extenso {
      font-size: 8px;
      color: #166534;
      font-style: italic;
      margin-top: 1px;
    }

    /* Details grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      margin-bottom: 14px;
    }

    .detail-item { }

    .detail-label {
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 2px;
    }

    .detail-value {
      font-size: 10.5px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
    }

    /* Declaration text */
    .declaration {
      font-size: 9px;
      color: #475569;
      line-height: 1.55;
      border-top: 1px dashed #e2e8f0;
      padding-top: 10px;
      margin-top: 4px;
    }

    .declaration strong {
      font-weight: 700;
      color: #1e293b;
    }

    /* Receipt footer */
    .receipt-footer {
      padding: 10px 18px 14px 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #f1f5f9;
    }

    .sig-block { text-align: center; }

    .sig-line {
      border-top: 1px solid #94a3b8;
      width: 130px;
      padding-top: 4px;
      font-size: 8px;
      color: #64748b;
      font-weight: 500;
    }

    .sig-name {
      font-size: 8.5px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2px;
    }

    .date-block {
      text-align: right;
      font-size: 8.5px;
      color: #64748b;
    }

    .date-block strong {
      font-weight: 700;
      color: #1e293b;
      display: block;
      font-size: 10px;
    }

    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 70px;
      font-weight: 900;
      color: rgba(30, 58, 95, 0.04);
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
      letter-spacing: 4px;
    }

    /* Tear line between copies */
    .tear-line {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 10px 0;
      color: #94a3b8;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .tear-line::before,
    .tear-line::after {
      content: '';
      flex: 1;
      border-bottom: 1px dashed #cbd5e1;
    }

    /* Smaller duplicate copy */
    .receipt-copy {
      width: 397px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 18px 10px 22px;
      position: relative;
    }

    .receipt-copy::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #64748b 0%, #94a3b8 100%);
      border-radius: 8px 0 0 8px;
    }

    .copy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .copy-label {
      font-size: 8px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: #e2e8f0;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .copy-mini-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }

    .copy-item .label { font-size: 7px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .copy-item .value { font-size: 9.5px; color: #475569; font-weight: 600; }
    .copy-item.amount .value { font-size: 12px; font-weight: 800; color: #15803d; }

    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; border-color: #e2e8f0; }
      @page { size: A5 portrait; margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="receipt-wrap">

    <!-- MAIN RECEIPT -->
    <div class="receipt">
      <div class="watermark">IETEO</div>

      <div class="receipt-header">
        <div>
          <div class="inst-name">${institution}</div>
          <div class="receipt-title">Recibo</div>
        </div>
        <div class="receipt-no">
          <div class="label">Nº do Recibo</div>
          <div class="value">${receiptNumber}</div>
        </div>
      </div>

      <div class="receipt-body">
        <!-- Amount -->
        <div class="amount-block">
          <div>
            <div class="amount-label">Valor Recebido</div>
            <div class="amount-extenso">${extenso}</div>
          </div>
          <div class="amount-value">${amountStr}</div>
        </div>

        <!-- Details -->
        <div class="details-grid">
          <div class="detail-item full-width">
            <div class="detail-label">Professor / Docente</div>
            <div class="detail-value" style="font-size:12px;font-weight:700">${item.professorName || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Referente à Disciplina</div>
            <div class="detail-value">${item.disciplineName || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Turma</div>
            <div class="detail-value">${item.className || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Aulas Ministradas</div>
            <div class="detail-value">${item.lessonsCount || '—'} aulas</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Taxa por Aula</div>
            <div class="detail-value">${formatter.format(item.feePerLesson || 0)}</div>
          </div>
        </div>

        <!-- Declaration -->
        <div class="declaration">
          Declaro ter recebido de <strong>${institution}</strong> a importância de <strong>${amountStr}</strong> (${extenso}), a título de <strong>Pro-labore docente</strong> pela disciplina <strong>${item.disciplineName}</strong> ministrada para a turma <strong>${item.className}</strong>, conforme acordo institucional vigente.
        </div>
      </div>

      <div class="receipt-footer">
        <div class="date-block">
          <span>Emitido em</span>
          <strong>${dateStr}</strong>
        </div>
        <div class="sig-block">
          <div class="sig-line">Assinatura do Docente</div>
          <div class="sig-name">${item.professorName || '—'}</div>
        </div>
      </div>
    </div>

    <!-- TEAR LINE -->
    <div class="tear-line">✂ Via da Instituição</div>

    <!-- COPY (smaller, for institution records) -->
    <div class="receipt-copy">
      <div class="copy-header">
        <span style="font-size:9px;font-weight:700;color:#475569">${institution}</span>
        <span class="copy-label">Via da Instituição</span>
      </div>
      <div class="copy-mini-grid">
        <div class="copy-item">
          <div class="label">Professor</div>
          <div class="value">${item.professorName || '—'}</div>
        </div>
        <div class="copy-item">
          <div class="label">Disciplina</div>
          <div class="value">${(item.disciplineName || '').split(' ').slice(0, 3).join(' ')}…</div>
        </div>
        <div class="copy-item amount">
          <div class="label">Valor</div>
          <div class="value">${amountStr}</div>
        </div>
        <div class="copy-item">
          <div class="label">Turma</div>
          <div class="value">${item.className || '—'}</div>
        </div>
        <div class="copy-item">
          <div class="label">Nº Recibo</div>
          <div class="value" style="font-family:monospace;font-size:8px">${receiptNumber}</div>
        </div>
        <div class="copy-item">
          <div class="label">Data</div>
          <div class="value">${dateStr}</div>
        </div>
      </div>
    </div>

  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

    const win = window.open("", "_blank", "width=520,height=750")
    if (!win) { alert("Permita pop-ups para imprimir o recibo."); return }
    win.document.write(html)
    win.document.close()
}
