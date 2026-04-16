"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, CheckCircle2, Clock, Loader2, DollarSign, Calculator, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    type Expense, type FinancialCharge,
    getExpenses, addExpense, addExpenseBatch, updateExpense, deleteExpense,
    getFinancialCharges, updateFinancialChargeStatus, deleteFinancialCharge
} from "@/lib/store"

export function ExpenseManager({ onRefresh }: { onRefresh?: () => void } = {}) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [expenseCharges, setExpenseCharges] = useState<FinancialCharge[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("fixa")
    const [dueDate, setDueDate] = useState("")

    // Installment Form State
    const [installmentModalOpen, setInstallmentModalOpen] = useState(false)
    const [instDescription, setInstDescription] = useState("")
    const [instAmount, setInstAmount] = useState("")
    const [instCategory, setInstCategory] = useState("fixa")
    const [instCount, setInstCount] = useState("12")
    const [instDate, setInstDate] = useState("")

    async function load() {
        setLoading(true)
        try {
            const [data, charges] = await Promise.all([
                getExpenses(),
                getFinancialCharges()
            ])
            setExpenses(data)
            setExpenseCharges(charges.filter(c => c.type === 'expense'))
        } catch (e) {
            console.error("Erro ao carregar despesas:", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    async function handleSave() {
        if (!description || !amount || !dueDate) {
            alert("Preencha todos os campos.")
            return
        }
        setSaving(true)
        try {
            await addExpense({
                description,
                amount: parseFloat(amount),
                category,
                dueDate
            })
            setModalOpen(false)
            load()
            // Reset form
            setDescription("")
            setAmount("")
            setDueDate("")
            onRefresh?.()
        } catch (e: any) {
            alert("Erro ao salvar despesa: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    const previewInstallments = () => {
        if (!instAmount || !instCount || !instDate) return []
        const total = parseFloat(instAmount)
        const count = parseInt(instCount)
        if (isNaN(total) || isNaN(count) || count <= 0) return []
        
        const chunk = total / count
        // Prevenir fuso horário atrasando 1 dia
        const start = new Date(instDate + "T12:00:00")
        
        return Array.from({ length: count }).map((_, i) => {
            const d = new Date(start.getTime())
            d.setMonth(d.getMonth() + i)
            return {
                amount: chunk,
                date: d.toISOString().split('T')[0],
                label: `${i + 1}/${count}`
            }
        })
    }

    async function handleSaveInstallments() {
        const installments = previewInstallments()
        if (installments.length === 0 || !instDescription) {
            alert("Preencha todos os campos corretamente.")
            return
        }

        setSaving(true)
        try {
            const expensesToBatch = installments.map(inst => ({
                description: `${instDescription} (${inst.label})`,
                amount: inst.amount,
                category: instCategory,
                dueDate: inst.date
            }))

            await addExpenseBatch(expensesToBatch)

            setInstallmentModalOpen(false)
            setInstDescription("")
            setInstAmount("")
            setInstCount("12")
            setInstDate("")
            load()
            onRefresh?.()
        } catch(e: any) {
            alert("Erro ao lançar parcelas: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleStatusChange(id: string, status: Expense["status"], isCharge: boolean) {
        try {
            if (isCharge) {
                await updateFinancialChargeStatus(id, status)
            } else {
                await updateExpense(id, { status })
            }
            load()
            onRefresh?.()
        } catch (e: any) {
            alert("Erro ao atualizar status: " + e.message)
        }
    }

    async function handleDelete(id: string, isCharge: boolean) {
        if (!confirm("Excluir esta despesa?")) return
        try {
            if (isCharge) {
                await deleteFinancialCharge(id)
            } else {
                await deleteExpense(id)
            }
            load()
            onRefresh?.()
        } catch (e: any) {
            alert("Erro ao excluir: " + e.message)
        }
    }

    const combinedExpenses = [
        ...expenses.map(e => ({ ...e, isCharge: false })),
        ...expenseCharges.map(c => ({
            id: c.id,
            description: c.description,
            amount: c.amount,
            category: "pro-labore",
            dueDate: c.dueDate,
            status: c.status,
            paidAt: c.paymentDate,
            createdAt: c.createdAt,
            isCharge: true
        }))
    ].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold font-serif">Saídas e Despesas</h3>
                    <p className="text-xs text-muted-foreground font-medium">Controle de contas a pagar da instituição</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5" onClick={() => setInstallmentModalOpen(true)}>
                        <CalendarDays className="h-4 w-4 mr-2" /> Despesas Parceladas
                    </Button>
                    <Button onClick={() => setModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Nova Despesa
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-wider italic">
                        <tr>
                            <th className="px-4 py-3">Descrição</th>
                            <th className="px-4 py-3">Categoria</th>
                            <th className="px-4 py-3">Vencimento</th>
                            <th className="px-4 py-3">Valor</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {combinedExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">Nenhuma despesa lançada</td>
                            </tr>
                        ) : (
                            combinedExpenses.map(e => (
                                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-4 font-medium text-foreground">{e.description}</td>
                                    <td className="px-4 py-4">
                                        <span className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full border ${e.category === 'pro-labore' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {e.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">{new Date(e.dueDate).toLocaleDateString("pt-BR")}</td>
                                    <td className="px-4 py-4 font-bold text-rose-600">- R$ {e.amount.toFixed(2)}</td>
                                    <td className="px-4 py-4">
                                        {e.status === 'paid' ? (
                                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit border border-green-200">
                                                <CheckCircle2 className="h-3 w-3" /> PAGO
                                            </span>
                                        ) : e.status === 'cancelled' ? (
                                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit border border-slate-200">
                                                <Trash2 className="h-3 w-3" /> ESTORNADO/CANCELADO
                                            </span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit border border-amber-200">
                                                <Clock className="h-3 w-3" /> PENDENTE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            {e.status === 'pending' && (
                                                <>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(e.id, 'paid', e.isCharge as boolean)} title="Marcar como Pago">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(e.id, 'cancelled' as any, e.isCharge as boolean)} title="Estornar/Cancelar Parcela">
                                                        <Clock className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {e.status === 'paid' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(e.id, 'pending', e.isCharge as boolean)} title="Estornar Pagamento">
                                                    <Clock className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {e.status === 'cancelled' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleStatusChange(e.id, 'pending', e.isCharge as boolean)} title="Reativar Despesa">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-rose-50" onClick={() => handleDelete(e.id, e.isCharge as boolean)} title="Excluir">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Lançamento de Despesa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <Label>Descrição</Label>
                            <Input placeholder="Ex: Aluguel do Prédio" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Valor (R$)</Label>
                                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Vencimento</Label>
                                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Categoria</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixa">Despesa Fixa</SelectItem>
                                    <SelectItem value="variavel">Despesa Variável</SelectItem>
                                    <SelectItem value="imposto">Imposto / Taxa</SelectItem>
                                    <SelectItem value="infra">Infraestrutura</SelectItem>
                                    <SelectItem value="marketing">Marketing / Social</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>Salvar Despesa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={installmentModalOpen} onOpenChange={setInstallmentModalOpen}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b border-border/50 bg-muted/20">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold font-serif">
                            <CalendarDays className="h-5 w-5 text-primary" /> Lançamento de Despesas Parceladas
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            As parcelas serão criadas como despesas previstas no DRE dos meses correspondentes.
                        </p>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Form Column */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Descrição da Despesa</Label>
                                <Input placeholder="Ex: Compra de Equipamentos" value={instDescription} onChange={e => setInstDescription(e.target.value)} className="border-primary/30 focus-visible:ring-primary/20 transition-all font-medium" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                                <Select value={instCategory} onValueChange={setInstCategory}>
                                    <SelectTrigger className="font-medium"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixa">Despesa Fixa</SelectItem>
                                        <SelectItem value="variavel">Despesa Variável</SelectItem>
                                        <SelectItem value="imposto">Imposto / Taxa</SelectItem>
                                        <SelectItem value="infra">Infraestrutura</SelectItem>
                                        <SelectItem value="marketing">Marketing / Social</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor Total (R$)</Label>
                                    <Input type="number" step="0.01" placeholder="0.00" value={instAmount} onChange={e => setInstAmount(e.target.value)} className="font-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nº Parcelas</Label>
                                    <Input type="number" min="1" step="1" value={instCount} onChange={e => setInstCount(e.target.value)} className="font-medium" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data 1º Vencimento</Label>
                                <Input type="date" value={instDate} onChange={e => setInstDate(e.target.value)} className="font-medium text-muted-foreground" />
                            </div>
                        </div>

                        {/* Preview Column */}
                        <div className="bg-muted/30 p-6 border-l border-border/50 flex flex-col h-full max-h-[350px]">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Pré-Visualização</h4>
                                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">{previewInstallments().length} Parcelas</span>
                            </div>
                            
                            {previewInstallments().length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 border-2 border-dashed border-border rounded-xl p-6">
                                    <CalendarDays className="h-10 w-10 mb-2" />
                                    <p className="text-xs text-center font-medium italic">Preencha os dados ao lado<br/>para simular as parcelas.</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {previewInstallments().map((inst, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-card border border-border/60 p-3 rounded-lg shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground">Parcela {inst.label}</span>
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase">{new Date(inst.date).toLocaleDateString("pt-BR")}</span>
                                            </div>
                                            <div className="text-sm font-black text-rose-600">
                                                R$ {inst.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-muted/10 border-t border-border/50">
                        <Button variant="outline" className="text-xs font-bold" onClick={() => setInstallmentModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black px-6 shadow-md" onClick={handleSaveInstallments} disabled={saving || previewInstallments().length === 0}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Gerar e Lançar Parcelas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
