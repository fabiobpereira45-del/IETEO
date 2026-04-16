"use client"

import { useEffect, useState } from "react"
import { DollarSign, Loader2, GraduationCap, Calculator, CheckCircle2, AlertCircle, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { 
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
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
import { printProLaboreReceipt } from "@/lib/pdf"
import { toast } from "sonner"

export function ProLaboreManager({ onRefresh }: { onRefresh?: () => void } = {}) {
    const [data, setData] = useState<any[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // Stores id of the item being saved

    async function load() {
        setLoading(true)
        try {
            const [calcs, s, allCharges, allDisciplines] = await Promise.all([
                getProLaboreCalculations(),
                getFinancialSettings(),
                getFinancialCharges(),
                getDisciplines()
            ])
            
            setDisciplines(allDisciplines)
            
            // Enrich calculations with the actual charge ID for reversal
            const enriched = calcs.map(item => {
                const charge = allCharges.find(c => 
                    c.type === 'expense' && 
                    c.professorId === item.professorId && 
                    c.disciplineId === item.disciplineId && 
                    c.classId === item.classId &&
                    c.status === 'paid'
                )
                return { ...item, chargeId: charge?.id }
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

    async function handleSettle(item: any) {
        if (!confirm(`Deseja confirmar o pagamento de R$ ${item.totalAmount.toFixed(2)} referente à disciplina ${item.disciplineName} na turma ${item.className}?`)) return
        
        const key = `${item.professorId}-${item.disciplineId}-${item.classId}`
        setSaving(key)
        try {
            await settleProLabore({
                professorId: item.professorId,
                disciplineId: item.disciplineId,
                classId: item.classId,
                amount: item.totalAmount,
                description: `Pro-labore: ${item.disciplineName} (${item.className})`
            })
            toast.success("Pagamento registrado com sucesso!")
            load()
            onRefresh?.()
        } catch (e: any) {
            toast.error("Erro ao registrar pagamento: " + e.message)
        } finally {
            setSaving(null)
        }
    }

    async function handleReverse(item: any) {
        if (!item.chargeId) return
        if (!confirm("Tem certeza que deseja estornar este pagamento? O registro de despesa será excluído do financeiro.")) return
        
        setSaving(item.chargeId)
        try {
            await deleteFinancialCharge(item.chargeId)
            toast.success("Pagamento estornado com sucesso!")
            load()
            onRefresh?.()
        } catch (e: any) {
            toast.error("Erro ao estornar: " + e.message)
        } finally {
            setSaving(null)
        }
    }

    function handlePrintReceipt(item: any) {
        printProLaboreReceipt({
            professorName: item.professorName,
            disciplineName: item.disciplineName,
            className: item.className,
            amount: item.totalAmount,
            date: new Date().toISOString(),
            institutionName: settings?.institutionName || "IETEO",
            logo: settings?.logoBase64
        })
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
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-600">PAGO</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600">PENDENTE</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {!item.isPaid ? (
                                                                            <button 
                                                                                onClick={() => handleSettle(item)}
                                                                                disabled={saving === key}
                                                                                className="inline-flex items-center gap-1 text-[9px] font-bold bg-primary text-white px-2 py-1 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                                            >
                                                                                {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                                                                                DAR BAIXA
                                                                            </button>
                                                                        ) : (
                                                                            <>
                                                                                <button 
                                                                                    onClick={() => handlePrintReceipt(item)}
                                                                                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                                                                    title="Recibo"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleReverse(item)}
                                                                                    disabled={saving === item.chargeId}
                                                                                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                                                                    title="Estornar"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                                                </button>
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
                    Ao dar baixa, um registro de despesa será criado automaticamente no fluxo financeiro geral vinculado a este professor e turma.
                </p>
            </div>
        </div>
    )
}
