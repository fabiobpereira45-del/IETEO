"use client"

import { useEffect, useState } from "react"
import { DollarSign, Plus, Eye, CheckCircle2, AlertCircle, Clock, Trash2, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    type FinancialCharge, type StudentProfile, type FinancialSettings, type Assessment,
    getFinancialCharges, addFinancialCharge, updateFinancialChargeStatus, deleteFinancialCharge,
    getFinancialSettings, getAssessments, triggerN8nWebhook
} from "@/lib/store"
import { createClient } from "@/lib/supabase/client"

export function FinancialManager() {
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)

    // Charge Modal
    const [chargeModal, setChargeModal] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [studentId, setStudentId] = useState("")
    const [type, setType] = useState<FinancialCharge["type"]>("monthly")
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")

    const [deleteId, setDeleteId] = useState<string | null>(null)

    const supabase = createClient()

    async function fetchAllStudents() {
        const { data } = await supabase.from('students').select('*').order('name')
        return data || []
    }

    async function load() {
        setLoading(true)
        const [c, s, config] = await Promise.all([
            getFinancialCharges(),
            fetchAllStudents(),
            getFinancialSettings()
        ])
        setCharges(c)
        setStudents(s)
        setSettings(config)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    // Auto-fill amount based on type and settings
    useEffect(() => {
        if (!settings) return
        let val = 0
        if (type === "enrollment") val = settings.enrollmentFee
        else if (type === "monthly") val = settings.monthlyFee
        else if (type === "second_call") val = settings.secondCallFee
        else if (type === "final_exam") val = settings.finalExamFee

        if (val > 0) setAmount(val.toString())
    }, [type, settings])


    async function handleSaveCharge() {
        if (!studentId || !amount || !dueDate || !description.trim()) {
            alert("Preencha todos os campos corretamente.")
            return
        }

        setSaving(true)
        try {
            await addFinancialCharge({
                studentId,
                type,
                amount: parseFloat(amount),
                dueDate,
                description: description.trim()
            })
            setChargeModal(false)
            load()
        } catch (e: any) {
            alert("Erro ao gerar cobrança: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleStatusChange(id: string, newStatus: FinancialCharge["status"]) {
        try {
            await updateFinancialChargeStatus(id, newStatus)
            load()
        } catch (e: any) {
            alert("Erro ao atualizar status: " + e.message)
        }
    }

    async function handleTriggerReminders() {
        setSaving(true)
        try {
            const now = new Date()
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const formatDateStr = (d: Date) => d.toISOString().split('T')[0]
            const tomorrowStr = formatDateStr(tomorrow)
            const todayStr = formatDateStr(now)

            // 1. Check Financial Reminders
            for (const c of charges) {
                if (c.status === 'paid') continue
                const student = students.find(s => s.id === c.studentId)
                if (!student) continue

                if (c.dueDate === tomorrowStr) {
                    await triggerFlowGravit('lembrete_financeiro_amanha', {
                        type: 'finance_upcoming',
                        name: student.name,
                        phone: student.phone,
                        amount: c.amount,
                        dueDate: c.dueDate
                    })
                } else if (new Date(c.dueDate) < now && c.status === 'pending') {
                    // Overdue logic
                    await triggerFlowGravit('financeiro_atrasado', {
                        type: 'finance_overdue',
                        name: student.name,
                        phone: student.phone,
                        amount: c.amount,
                        dueDate: c.dueDate
                    })
                }
            }

            // 2. Check Exam Reminders
            const assessments = await getAssessments()
            for (const a of assessments) {
                if (!a.isPublished || !a.openAt) continue
                const openDate = formatDateStr(new Date(a.openAt))

                if (openDate === tomorrowStr || openDate === todayStr) {
                    const triggerId = openDate === tomorrowStr ? 'lembrete_prova_amanha' : 'lembrete_prova_hoje'
                    for (const s of students) {
                        await triggerFlowGravit(triggerId, {
                            type: openDate === tomorrowStr ? 'exam_tomorrow' : 'exam_today',
                            name: s.name,
                            phone: s.phone,
                            title: a.title,
                            date: openDate,
                            open_time: a.openAt ? new Date(a.openAt).toLocaleTimeString("pt-BR") : "N/A",
                            close_time: a.closeAt ? new Date(a.closeAt).toLocaleTimeString("pt-BR") : "N/A"
                        })
                    }
                }
            }

            alert("Disparo de lembretes concluído!")
        } catch (err: any) {
            alert("Erro ao disparar lembretes: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!deleteId) return
        try {
            await deleteFinancialCharge(deleteId)
            setDeleteId(null)
            load()
        } catch (e: any) {
            alert("Erro ao excluir: " + e.message)
        }
    }

    function getStatusBadge(status: string) {
        if (status === 'paid') return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</span>
        if (status === 'late') return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</span>
        if (status === 'cancelled') return <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Cancelado</span>
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold font-serif text-foreground">Gestão Financeira</h2>
                    <p className="text-muted-foreground text-sm">Controle de mensalidades e recebimentos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleTriggerReminders} disabled={saving} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all shadow-sm">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                        Disparar Lembretes
                    </Button>
                    <Button onClick={() => {
                        setStudentId("")
                        setType("monthly")
                        setAmount("")
                        setDescription("")
                        setDueDate("")
                        setChargeModal(true)
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Cobrança
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3">Aluno</th>
                                <th className="px-4 py-3">Descrição / Tipo</th>
                                <th className="px-4 py-3">Vencimento</th>
                                <th className="px-4 py-3">Valor</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {charges.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                        Nenhuma cobrança registrada.
                                    </td>
                                </tr>
                            ) : (
                                charges.map(c => {
                                    const student = students.find(s => s.id === c.studentId)
                                    return (
                                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-foreground">
                                                {student?.name || "Aluno Excluído"}
                                                <div className="text-xs text-muted-foreground font-normal">{student?.enrollment_number}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>{c.description}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{c.type.replace('_', ' ')}</div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(c.dueDate).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                R$ {c.amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(c.status)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {c.status !== 'paid' && (
                                                        <Button size="sm" variant="outline" className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(c.id, 'paid')}>
                                                            Baixar Pago
                                                        </Button>
                                                    )}
                                                    {c.status === 'paid' && (
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleStatusChange(c.id, 'pending')}>
                                                            Estornar
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(c.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={chargeModal} onOpenChange={setChargeModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gerar Nova Cobrança</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Aluno</Label>
                            <Select value={studentId} onValueChange={setStudentId}>
                                <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                                <SelectContent>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollment_number})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Tipo de Cobrança</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensalidade</SelectItem>
                                    <SelectItem value="enrollment">Taxa de Matrícula</SelectItem>
                                    <SelectItem value="second_call">Segunda Chamada</SelectItem>
                                    <SelectItem value="final_exam">Prova Final</SelectItem>
                                    <SelectItem value="other">Outros / Avulso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Descrição</Label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Ex: Mensalidade - Abril/2026"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Valor (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Vencimento</Label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChargeModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveCharge} disabled={saving}>Gerar Boleto/Cobrança</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja excluir este registro financeiro? Esta ação não possui volta.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive" onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
