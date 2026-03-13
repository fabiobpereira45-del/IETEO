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
    getFinancialSettings, updateFinancialSettings, getAssessments, triggerN8nWebhook,
    generateMonthlyCharges
} from "@/lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
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
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    const supabase = createClient()

    async function fetchAllStudents() {
        const { data } = await supabase.from('students').select('*').eq('status', 'active').order('name')
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

    const [settingsModal, setSettingsModal] = useState(false)
    const [tempCard, setTempCard] = useState("")
    const [tempPix, setTempPix] = useState("")
    const [tempEnrollment, setTempEnrollment] = useState("")
    const [tempMonthly, setTempMonthly] = useState("")
    const [tempSecondCall, setTempSecondCall] = useState("")
    const [tempFinalExam, setTempFinalExam] = useState("")
    const [tempMonths, setTempMonths] = useState("")

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

            if (newStatus === "paid") {
                const charge = charges.find(c => c.id === id)
                if (charge && charge.type === "enrollment") {
                    try {
                        const res = await fetch('/api/student/activate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ studentId: charge.studentId })
                        })
                        if (!res.ok) {
                            console.error("Falha ao ativar aluno:", await res.text())
                        }
                    } catch (actErr) {
                        console.error("Erro de rede na ativação:", actErr)
                    }
                }
            }

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
                    await triggerN8nWebhook('lembrete_financeiro_amanha', {
                        type: 'finance_upcoming',
                        name: student.name,
                        phone: student.phone,
                        amount: c.amount,
                        dueDate: c.dueDate
                    })
                } else if (new Date(c.dueDate) < now && c.status === 'pending') {
                    // Overdue logic
                    await triggerN8nWebhook('financeiro_atrasado', {
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
                        await triggerN8nWebhook(triggerId, {
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

    async function handleGeneratePlan(uid: string) {
        if (!settings?.monthlyFee) {
            alert("Configure a mensalidade nas configurações antes de gerar.")
            return
        }
        if (!confirm("Deseja gerar as 18 mensalidades (Abril 2026 a Setembro 2027) para este aluno?")) return

        setIsGenerating(true)
        try {
            await generateMonthlyCharges(uid, settings.monthlyFee)
            alert("Mensalidades geradas com sucesso!")
            load()
        } catch (actErr: any) {
            alert("Erro ao gerar mensalidades: " + actErr.message)
        } finally {
            setIsGenerating(false)
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

    async function handleSaveSettings() {
        if (!settings) return
        setSaving(true)
        try {
            await updateFinancialSettings({
                enrollmentFee: Number(tempEnrollment),
                monthlyFee: Number(tempMonthly),
                secondCallFee: Number(tempSecondCall),
                finalExamFee: Number(tempFinalExam),
                totalMonths: Number(tempMonths),
                creditCardUrl: tempCard,
                pixKey: tempPix
            })
            alert("Configurações salvas com sucesso!")
            setSettingsModal(false)
            load()
        } catch (e: any) {
            alert("Erro ao salvar configurações: " + e.message)
        } finally {
            setSaving(false)
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
                    <p className="text-muted-foreground text-sm">Controle de mensalidades e extratos individuais</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setTempCard(settings?.creditCardUrl || "")
                        setTempPix(settings?.pixKey || "")
                        setTempEnrollment(settings?.enrollmentFee.toString() || "0")
                        setTempMonthly(settings?.monthlyFee.toString() || "0")
                        setTempSecondCall(settings?.secondCallFee.toString() || "0")
                        setTempFinalExam(settings?.finalExamFee.toString() || "0")
                        setTempMonths(settings?.totalMonths.toString() || "12")
                        setSettingsModal(true)
                    }} className="border-primary text-primary hover:bg-primary/10">
                        Configurar Pagamentos
                    </Button>
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
                <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="font-bold text-sm text-foreground">Lista de Alunos e Situação Financeira</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3">Aluno</th>
                                <th className="px-4 py-3">Matrícula</th>
                                <th className="px-4 py-3">Situação</th>
                                <th className="px-4 py-3">Saldo</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {students.map(s => {
                                const studentCharges = charges.filter(c => c.studentId === s.id)
                                const pending = studentCharges.filter(c => c.status === 'pending' || c.status === 'late')
                                const totalPending = pending.reduce((acc, curr) => acc + curr.amount, 0)
                                return (
                                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{s.enrollment_number}</td>
                                        <td className="px-4 py-3">
                                            {pending.some(c => c.status === 'late') ? (
                                                <span className="text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Inadimplente</span>
                                            ) : pending.length > 0 ? (
                                                <span className="text-amber-600 font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
                                            ) : (
                                                <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Em dia</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-bold">R$ {totalPending.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button size="sm" variant="ghost" className="text-primary gap-2" onClick={() => setSelectedStudent(s)}>
                                                <Eye className="h-4 w-4" /> Ver
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Detail Modal */}
            <Dialog open={!!selectedStudent} onOpenChange={(o) => !o && setSelectedStudent(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                        <div>
                            <DialogTitle className="text-xl font-serif">{selectedStudent?.name}</DialogTitle>
                            <p className="text-sm text-muted-foreground">{selectedStudent?.enrollment_number}</p>
                        </div>
                        <div className="flex gap-2">
                             <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-accent text-accent hover:bg-accent/10" 
                                onClick={() => handleGeneratePlan(selectedStudent!.id)}
                                disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <DollarSign className="h-3 w-3 mr-2" />}
                                Gerar Carnê 18x
                             </Button>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {charges.filter(c => c.studentId === selectedStudent?.id).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(c => (
                                    <tr key={c.id}>
                                        <td className="px-4 py-3 font-medium">{c.description}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{new Date(c.dueDate).toLocaleDateString("pt-BR")}</td>
                                        <td className="px-4 py-3 font-bold">R$ {c.amount.toFixed(2)}</td>
                                        <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {c.status !== 'paid' && (
                                                    <Button size="sm" variant="ghost" className="h-8 text-[10px] text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(c.id, 'paid')}>Baixar</Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

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

            <Dialog open={settingsModal} onOpenChange={setSettingsModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurações de Pagamento Manual</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Taxa de Matrícula (R$)</Label>
                                <Input type="number" step="0.01" value={tempEnrollment} onChange={e => setTempEnrollment(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Mensalidade (R$)</Label>
                                <Input type="number" step="0.01" value={tempMonthly} onChange={e => setTempMonthly(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>2ª Chamada (R$)</Label>
                                <Input type="number" step="0.01" value={tempSecondCall} onChange={e => setTempSecondCall(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Prova Final (R$)</Label>
                                <Input type="number" step="0.01" value={tempFinalExam} onChange={e => setTempFinalExam(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Duração do Curso (Meses)</Label>
                            <Input type="number" value={tempMonths} onChange={e => setTempMonths(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2 border-t mt-2">
                            <Label className="font-bold">Integrações de Pagamento Manual</Label>
                            <Label className="text-[11px] text-muted-foreground">Links e Chaves mostradas ao aluno na matrícula</Label>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Link de Pagamento (Cartão de Crédito)</Label>
                            <Input
                                value={tempCard}
                                onChange={e => setTempCard(e.target.value)}
                                placeholder="Link do Mercado Pago, PicPay, etc."
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Chave PIX para Recebimento</Label>
                            <Input
                                value={tempPix}
                                onChange={e => setTempPix(e.target.value)}
                                placeholder="E-mail, CPF, CNPJ ou Aleatória"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSettings} disabled={saving}>Salvar Configurações</Button>
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
