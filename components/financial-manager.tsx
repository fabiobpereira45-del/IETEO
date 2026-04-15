"use client"

import { useEffect, useState } from "react"
import { DollarSign, Plus, Eye, CheckCircle2, AlertCircle, Clock, Trash2, Zap, Loader2, Download, FileText, Pencil } from "lucide-react"
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
    getFinancialCharges, addFinancialCharge, updateFinancialChargeStatus, deleteFinancialCharge, updateFinancialCharge, updateFinancialChargesStatusBatch,
    getFinancialSettings, updateFinancialSettings, getAssessments, triggerN8nWebhook,
    generateMonthlyCharges
} from "@/lib/store"
import { printFinancialReportPDF } from "@/lib/pdf"
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

    // Edit Charge State
    const [editingCharge, setEditingCharge] = useState<FinancialCharge | null>(null)
    const [editAmount, setEditAmount] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editDueDate, setEditDueDate] = useState("")
    const [editStatus, setEditStatus] = useState<FinancialCharge["status"]>("pending")

    // Filter state
    const [searchName, setSearchName] = useState("")
    const [searchEnrollment, setSearchEnrollment] = useState("")
    const [searchClass, setSearchClass] = useState("all")
    const [allClasses, setAllClasses] = useState<any[]>([])

    const supabase = createClient()

    async function fetchAllStudents() {
        const { data } = await supabase.from('students').select('*').eq('status', 'active').order('name')
        return data || []
    }

    async function load() {
        setLoading(true)
        const [c, s, config, { data: classesData }] = await Promise.all([
            getFinancialCharges(),
            fetchAllStudents(),
            getFinancialSettings(),
            supabase.from('classes').select('*').order('name')
        ])
        setCharges(c)
        setStudents(s)
        setSettings(config)
        setAllClasses(classesData || [])
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

    async function handleEditCharge() {
        if (!editingCharge || !editAmount || !editDueDate || !editDescription.trim()) {
            alert("Preencha todos os campos corretamente.")
            return
        }

        setSaving(true)
        try {
            await updateFinancialCharge(editingCharge.id, {
                amount: parseFloat(editAmount),
                description: editDescription.trim(),
                dueDate: editDueDate
            })
            if (editStatus !== editingCharge.status) {
                await updateFinancialChargeStatus(editingCharge.id, editStatus)
            }
            setEditingCharge(null)
            load()
        } catch (e: any) {
            alert("Erro ao editar cobrança: " + e.message)
        } finally {
            setSaving(false)
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
        if (status === 'bolsa100') return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Bolsa 100%</span>
        if (status === 'bolsa50') return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Bolsa 50%</span>
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-sm">Controle de Mensalidades (Alunos)</h3>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                        setStudentId("")
                        setType("monthly")
                        setAmount("")
                        setDescription("")
                        setDueDate("")
                        setChargeModal(true)
                    }}>
                        <Plus className="h-3 w-3 mr-1" /> Nova Cobrança
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleTriggerReminders} disabled={saving} className="border-accent text-accent">
                        <Zap className="h-3 w-3 mr-1" /> Lembretes
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border shadow-sm rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Aluno</Label>
                    <Input 
                        placeholder="Buscar por nome..." 
                        value={searchName} 
                        onChange={e => setSearchName(e.target.value)}
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Matrícula</Label>
                    <Input 
                        placeholder="Buscar matrícula..." 
                        value={searchEnrollment} 
                        onChange={e => setSearchEnrollment(e.target.value)}
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Turma</Label>
                    <Select value={searchClass} onValueChange={setSearchClass}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Todas as Turmas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {allClasses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-9 flex-1" onClick={() => {
                        setSearchName("")
                        setSearchEnrollment("")
                        setSearchClass("all")
                    }}>
                        Limpar
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-9 flex-1 border-primary text-primary hover:bg-primary/5"
                        onClick={() => {
                            const filteredStudents = students.filter(s => {
                                const matchName = s.name.toLowerCase().includes(searchName.toLowerCase())
                                const matchEnroll = s.enrollment_number.toLowerCase().includes(searchEnrollment.toLowerCase())
                                const matchClass = searchClass === "all" || s.class_id === searchClass
                                return matchName && matchEnroll && matchClass
                            })
                            const filteredCharges = charges.filter(c => filteredStudents.some(s => s.id === c.studentId))
                            printFinancialReportPDF(filteredCharges, filteredStudents)
                        }}
                    >
                        <Download className="h-4 w-4 mr-2" /> PDF Filtro
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
                                <th className="px-4 py-3">ALUNO</th>
                                <th className="px-4 py-3">MATRÍCULA</th>
                                <th className="px-4 py-3">SITUAÇÃO</th>
                                <th className="px-4 py-3">SALDO</th>
                                <th className="px-4 py-3 text-right">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {students
                                .filter(s => {
                                    const matchName = s.name.toLowerCase().includes(searchName.toLowerCase())
                                    const matchEnroll = s.enrollment_number.toLowerCase().includes(searchEnrollment.toLowerCase())
                                    const matchClass = searchClass === "all" || s.class_id === searchClass
                                    return matchName && matchEnroll && matchClass
                                })
                                .map(s => {
                                    const studentCharges = charges.filter(c => c.studentId === s.id)
                                    const todayStr = new Date().toISOString().split('T')[0]
                                    
                                    const overdue = studentCharges.filter(c => 
                                        c.status !== 'paid' && 
                                        c.status !== 'cancelled' && 
                                        c.dueDate < todayStr
                                    )
                                    
                                    const pending = studentCharges.filter(c => 
                                        c.status !== 'paid' && 
                                        c.status !== 'cancelled'
                                    )

                                    const totalPending = pending.reduce((acc, curr) => acc + curr.amount, 0)
                                    const turmaName = allClasses.find(c => c.id === s.class_id)?.name || "-"
                                    
                                    return (
                                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-foreground">{s.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{turmaName}</div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{s.enrollment_number}</td>
                                            <td className="px-4 py-3">
                                                {overdue.some(c => c.status === 'late' || c.dueDate < todayStr) ? (
                                                    <span className="text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Pendente</span>
                                                ) : overdue.length > 0 ? (
                                                     <span className="text-amber-600 font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
                                                ) : (
                                                    <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Em dia</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-bold">R$ {totalPending.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button size="sm" variant="ghost" className="text-primary gap-2 hover:bg-primary/10" onClick={() => setSelectedStudent(s)}>
                                                    <Eye className="h-4 w-4" /> Ver Histórico
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={!!selectedStudent} onOpenChange={(o) => !o && setSelectedStudent(null)}>
                <DialogContent className="!max-w-none !w-screen !h-screen !max-h-screen !rounded-none border-none overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 border-b border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold font-serif">Extrato Financeiro</DialogTitle>
                                <p className="text-sm text-muted-foreground">{selectedStudent?.name} ({selectedStudent?.enrollment_number})</p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setSelectedStudent(null)}>
                                    Fechar
                                </Button>
                                <Button size="sm" variant="outline" className="h-9 text-xs font-bold border-blue-500 text-blue-600 hover:bg-blue-50" 
                                    onClick={async () => {
                                        const type = window.prompt("Bolsa Lote (Mensalidades Pendentes):\nDigite 100 para Bolsa Integral\nDigite 50 para Bolsa Parcial")
                                        if (type !== "100" && type !== "50") {
                                            if (type !== null && type.trim() !== "") alert("Valor inválido. Use 100 ou 50.")
                                            return
                                        }
                                        const stCharges = charges.filter(c => c.studentId === selectedStudent?.id && c.type === 'monthly' && (c.status === 'pending' || c.status === 'late'))
                                        if (stCharges.length === 0) return alert("Nenhuma mensalidade pendente encontrada.")
                                        if (!confirm(`Aplicar Bolsa ${type}% em ${stCharges.length} mensalidade(s)?`)) return
                                        
                                        setIsGenerating(true)
                                        try {
                                            const newStatus = type === "100" ? "bolsa100" : "bolsa50"
                                            const stChargeIds = stCharges.map(c => c.id)
                                            await updateFinancialChargesStatusBatch(stChargeIds, newStatus)
                                            await load()
                                            alert("Bolsas aplicadas com sucesso!")
                                        } catch (e: any) { alert("Erro ao aplicar bolsas: " + e.message) } 
                                        finally { setIsGenerating(false) }
                                    }}
                                    disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <DollarSign className="h-3 w-3 mr-2" />}
                                    Aplicar Bolsa (Lote)
                                </Button>
                                <Button size="sm" variant="outline" className="h-9 text-xs font-bold border-accent text-accent hover:bg-accent/10" 
                                    onClick={() => handleGeneratePlan(selectedStudent!.id)}
                                    disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <DollarSign className="h-3 w-3 mr-2" />}
                                    Gerar Carnê 18x
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-0 md:p-6 px-4 py-4">
                        <div className="w-full overflow-x-auto pb-4">
                            <table className="w-full min-w-[750px] text-sm text-left border-collapse">
                                <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 first:rounded-l-lg w-auto min-w-[220px]">Descrição da Cobrança</th>
                                        <th className="px-4 py-3 w-[130px] text-center whitespace-nowrap">Vencimento</th>
                                        <th className="px-4 py-3 w-[130px] text-center whitespace-nowrap">Valor (R$)</th>
                                        <th className="px-4 py-3 w-[120px] text-center">Status</th>
                                        <th className="px-4 py-3 text-right last:rounded-r-lg w-[120px]">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {charges.filter(c => c.studentId === selectedStudent?.id).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(c => (
                                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-foreground leading-tight">{c.description}</div>
                                                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">{{ enrollment: "Matrícula", monthly: "Mensalidade", second_call: "2ª Chamada", final_exam: "Prova Final", other: "Outros" }[c.type] || c.type}</div>
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground text-center tabular-nums whitespace-nowrap">
                                                {new Date(c.dueDate).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-foreground text-center tabular-nums whitespace-nowrap">
                                                R$ {c.amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="inline-flex justify-center">
                                                    {getStatusBadge(c.status)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end items-center gap-1">
                                                    {c.status !== 'paid' ? (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(c.id, 'paid')} title="Marcar como Pago"><CheckCircle2 className="h-4 w-4" /></Button>
                                                    ) : (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(c.id, 'pending')} title="Estornar"><Clock className="h-4 w-4" /></Button>
                                                    )}
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => {
                                                        setEditingCharge(c)
                                                        setEditAmount(c.amount.toString())
                                                        setEditDescription(c.description)
                                                        setEditDueDate(c.dueDate)
                                                        setEditStatus(c.status)
                                                    }} title="Editar"><Pencil className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Excluir" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                                        <SelectItem key={s.id} value={s.id} className="h-auto whitespace-normal">
                                            {s.name} ({s.enrollment_number})
                                        </SelectItem>
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

            {/* Edit Charge Dialog */}
            <Dialog open={!!editingCharge} onOpenChange={(o) => !o && setEditingCharge(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Cobrança</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Descrição</Label>
                            <Input
                                value={editDescription}
                                onChange={e => setEditDescription(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Valor (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Vencimento</Label>
                                <Input
                                    type="date"
                                    value={editDueDate}
                                    onChange={e => setEditDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Status</Label>
                            <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                    <SelectItem value="paid">Pago</SelectItem>
                                    <SelectItem value="late">Atrasado</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                    <SelectItem value="bolsa100">Bolsa 100%</SelectItem>
                                    <SelectItem value="bolsa50">Bolsa 50%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCharge(null)}>Cancelar</Button>
                        <Button onClick={handleEditCharge} disabled={saving}>Salvar Alterações</Button>
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
