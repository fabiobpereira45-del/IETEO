"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, CheckCircle2, Clock, Loader2, DollarSign, Calculator } from "lucide-react"
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
    type Expense,
    getExpenses, addExpense, updateExpense, deleteExpense
} from "@/lib/store"

export function ExpenseManager() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("fixa")
    const [dueDate, setDueDate] = useState("")

    async function load() {
        setLoading(true)
        try {
            const data = await getExpenses()
            setExpenses(data)
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
        } catch (e: any) {
            alert("Erro ao salvar despesa: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleStatusChange(id: string, status: Expense["status"]) {
        try {
            await updateExpense(id, { status })
            load()
        } catch (e: any) {
            alert("Erro ao atualizar status: " + e.message)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir esta despesa?")) return
        try {
            await deleteExpense(id)
            load()
        } catch (e: any) {
            alert("Erro ao excluir: " + e.message)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold font-serif">Saídas e Despesas</h3>
                    <p className="text-xs text-muted-foreground font-medium">Controle de contas a pagar da instituição</p>
                </div>
                <Button onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
                </Button>
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
                        {expenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">Nenhuma despesa lançada</td>
                            </tr>
                        ) : (
                            expenses.map(e => (
                                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-4 font-medium text-foreground">{e.description}</td>
                                    <td className="px-4 py-4">
                                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{e.category}</span>
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">{new Date(e.dueDate).toLocaleDateString("pt-BR")}</td>
                                    <td className="px-4 py-4 font-bold text-rose-600">- R$ {e.amount.toFixed(2)}</td>
                                    <td className="px-4 py-4">
                                        {e.status === 'paid' ? (
                                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit border border-green-200">
                                                <CheckCircle2 className="h-3 w-3" /> PAGO
                                            </span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit border border-amber-200">
                                                <Clock className="h-3 w-3" /> PENDENTE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            {e.status !== 'paid' ? (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(e.id, 'paid')} title="Marcar como Pago">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(e.id, 'pending')} title="Estornar">
                                                    <Clock className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-rose-50" onClick={() => handleDelete(e.id)} title="Excluir">
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
        </div>
    )
}
