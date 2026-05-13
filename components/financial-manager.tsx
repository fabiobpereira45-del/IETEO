"use client"

import { useEffect, useState } from "react"
// Version: 1.2.3 - Fixed Financial Status Logic
import { toast } from "sonner"
import { DollarSign, Plus, Eye, CheckCircle2, AlertCircle, Clock, Trash2, Zap, Loader2, Download, FileText, Pencil, Gift } from "lucide-react"
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
    syncStudentTuitionByDisciplines, settleFinancialCharge, reverseFinancialCharge
} from "@/lib/store"
import { printFinancialReportPDF } from "@/lib/pdf"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"

export function FinancialManager({ onRefresh, month, year, scope }: { 
    onRefresh?: () => void,
    month?: string,
    year?: string,
    scope?: "month" | "year" | "all"
} = {}) {
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)

    // Helper for scope filtering
    const isInScope = (dateString?: string) => {
        if (!dateString) return false;
        if (scope === "all") return true;

        const parts = dateString.split('T')[0].split('-');
        let y, m;
        if (parts.length === 3) {
             y = parts[0];
             m = (parseInt(parts[1], 10) - 1).toString();
        } else {
            const d = new Date(dateString);
            y = d.getFullYear().toString();
            m = d.getMonth().toString();
        }

        if (scope === "year") return y === year;
        if (scope === "month") return y === year && m === month;
        return false;
    }

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
    const [reverseId, setReverseId] = useState<string | null>(null)
    const [editAmount, setEditAmount] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editDueDate, setEditDueDate] = useState("")
    const [editStatus, setEditStatus] = useState<FinancialCharge["status"]>("pending")

    // Filter state
    const [searchName, setSearchName] = useState("")
    const [searchEnrollment, setSearchEnrollment] = useState("")
    const [searchClass, setSearchClass] = useState("all")
    const [searchBolsa, setSearchBolsa] = useState("all")
    const [allClasses, setAllClasses] = useState<any[]>([])

    // Calculate totals for selected class for the current period
    const { classProjected, classRealized } = (function() {
        if (searchClass === "all") return { classProjected: 0, classRealized: 0 };
        
        const classStudentsList = students.filter(s => s.class_id === searchClass);
        const classStudentIds = new Set(classStudentsList.map(s => s.id));
        
        const relevantCharges = charges.filter(c => c.type !== 'expense' && classStudentIds.has(c.studentId));
        
        const projected = relevantCharges
            .filter(c => isInScope(c.dueDate))
            .reduce((acc, curr) => acc + curr.amount, 0);
            
        const realized = relevantCharges
            .filter(c => c.status === 'paid' && isInScope(c.paymentDate || c.dueDate))
            .reduce((acc, curr) => acc + (curr.actualPaidAmount ?? curr.amount), 0);
            
        return { classProjected: projected, classRealized: realized };
    })();

    // Settlement (Dar Baixa) State
    const [settleModal, setSettleModal] = useState(false)
    const [settleCharge, setSettleCharge] = useState<FinancialCharge | null>(null)
    const [settleAmount, setSettleAmount] = useState("")
    const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0])
    const [settleMethod, setSettleMethod] = useState<"pix" | "cartao" | "dinheiro">("pix")

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
            onRefresh?.()
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
            onRefresh?.()
            toast.success("Status atualizado com sucesso!")
        } catch (e: any) {
            toast.error("Erro ao atualizar status: " + e.message)
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

    async function handleSyncGrade(studentId: string) {
        if (!confirm("Isso irá apagar as cobranças atuais e gerar novas baseadas na grade curricular e taxa de matrícula. Prosseguir?")) return
        setIsGenerating(true)
        try {
            await syncStudentTuitionByDisciplines(studentId)
            toast.success("Financeiro sincronizado com a grade curricular!")
            load()
            onRefresh?.()
        } catch (e: any) {
            toast.error("Erro ao sincronizar: " + e.message)
        } finally {
            setIsGenerating(false)
        }
    }

    async function handleSettleSubmit() {
        if (!settleCharge || !settleAmount) return
        setSaving(true)
        try {
            await settleFinancialCharge(settleCharge.id, {
                paidAmount: parseFloat(settleAmount),
                method: settleMethod,
                date: settleDate
            })
            setSettleModal(false)
            load()
            onRefresh?.()
            toast.success("Pagamento confirmado!")
        } catch (e: any) {
            toast.error("Erro ao dar baixa: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleReverse(id: string) {
        setSaving(true)
        try {
            await reverseFinancialCharge(id)
            await load()
            onRefresh?.()
            setReverseId(null)
            toast.success("Pagamento estornado com sucesso.")
        } catch (e: any) {
            toast.error("Erro ao estornar: " + e.message)
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
            onRefresh?.()
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
            onRefresh?.()
        } catch (e: any) {
            alert("Erro ao editar cobrança: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleBulkSync() {
        if (!confirm("Isso irá apagar TODAS as cobranças pendentes e gerar novas baseadas na grade curricular para TODOS os alunos ativos. Prosseguir?")) return
        setIsGenerating(true)
        try {
            for (const s of students) {
                await syncStudentTuitionByDisciplines(s.id)
            }
            alert("Financeiro sincronizado para todos os alunos!")
            load()
            onRefresh?.()
        } catch (e: any) {
            alert("Erro no processamento em lote: " + e.message)
        } finally {
            setIsGenerating(false)
        }
    }

    function getStatusBadge(status: string) {
        if (status === 'paid') return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</span>
        if (status === 'late') return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</span>
        if (status === 'cancelled') return <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Cancelado</span>
        if (status === 'bolsa100') return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Bolsa 100%</span>
        if (status === 'bolsa50') return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Bolsa 50%</span>
        if (status === 'isento') return <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Isento</span>
        // Default to "Em dia" if not late/overdue in this context? 
        // Actually this is for INDIVIDUAL charges, so "Pendente" (amber) is fine for a future charge.
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
                    <Button variant="outline" size="sm" onClick={handleBulkSync} disabled={isGenerating} className="border-orange-500 text-orange-600 hover:bg-orange-50">
                        <Zap className="h-3 w-3 mr-1" /> Sincronizar Tudo
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
                    {searchClass !== "all" && (
                        <div className="flex items-center gap-3 mt-1 px-0.5 animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">P:</span>
                                <span className="text-[10px] font-bold text-orange-600 tabular-nums">R$ {classProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">R:</span>
                                <span className="text-[10px] font-bold text-green-600 tabular-nums">R$ {classRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Aluno</Label>
                    <Select value={searchBolsa} onValueChange={setSearchBolsa}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Alunos</SelectItem>
                            <SelectItem value="paying">Pagantes (Sem Bolsa)</SelectItem>
                            <SelectItem value="bolsa100">Bolsa 100% (Integral)</SelectItem>
                            <SelectItem value="bolsa50">Bolsa 50% (Parcial)</SelectItem>
                            <SelectItem value="pending">Com Pendência</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-9 flex-1" onClick={() => {
                        setSearchName("")
                        setSearchEnrollment("")
                        setSearchClass("all")
                        setSearchBolsa("all")
                    }}>
                        Limpar
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-foreground">Lista de Alunos e Situação Financeira</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            {students.filter(s => {
                                const matchName = s.name.toLowerCase().includes(searchName.toLowerCase())
                                const matchEnroll = s.enrollment_number.toLowerCase().includes(searchEnrollment.toLowerCase())
                                const matchClass = searchClass === "all" || s.class_id === searchClass
                                const studentCharges = charges.filter(c => c.studentId === s.id && c.type === 'monthly')
                                const matchBolsa = searchBolsa === "all" || (
                                    searchBolsa === "paying" ? !studentCharges.some(c => c.status === 'bolsa100' || c.status === 'bolsa50') :
                                    searchBolsa === "bolsa100" ? studentCharges.some(c => c.status === 'bolsa100') :
                                    searchBolsa === "bolsa50" ? studentCharges.some(c => c.status === 'bolsa50') :
                                    searchBolsa === "pending" ? charges.some(c => 
                                        c.studentId === s.id && 
                                        c.status !== 'paid' && 
                                        c.status !== 'cancelled' && 
                                        c.status !== 'bolsa100' && 
                                        c.status !== 'bolsa50' && 
                                        c.status !== 'isento' &&
                                        c.dueDate < new Date().toISOString().split('T')[0]
                                    ) : true
                                )
                                return matchName && matchEnroll && matchClass && matchBolsa
                            }).length} Alunos Filtrados
                        </span>
                    </div>
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
                                    const studentCharges = charges.filter(c => c.studentId === s.id && c.type === 'monthly')
                                    const matchBolsa = searchBolsa === "all" || (
                                        searchBolsa === "paying" ? !studentCharges.some(c => c.status === 'bolsa100' || c.status === 'bolsa50') :
                                        searchBolsa === "bolsa100" ? studentCharges.some(c => c.status === 'bolsa100') :
                                        searchBolsa === "bolsa50" ? studentCharges.some(c => c.status === 'bolsa50') :
                                        searchBolsa === "pending" ? charges.some(c => 
                                            c.studentId === s.id && 
                                            c.status !== 'paid' && 
                                            c.status !== 'cancelled' && 
                                            c.status !== 'bolsa100' && 
                                            c.status !== 'bolsa50' && 
                                            c.status !== 'isento' &&
                                            c.dueDate < new Date().toISOString().split('T')[0]
                                        ) : true
                                    )
                                    return matchName && matchEnroll && matchClass && matchBolsa
                                })
                                .map(s => {
                                    const studentCharges = charges.filter(c => c.studentId === s.id)
                                    const todayStr = new Date().toISOString().split('T')[0]
                                    
                                    const overdue = studentCharges.filter(c => 
                                        c.status !== 'paid' && 
                                        c.status !== 'cancelled' && 
                                        c.status !== 'bolsa100' && 
                                        c.status !== 'bolsa50' && 
                                        c.status !== 'isento' &&
                                        c.dueDate < todayStr
                                    )
                                    
                                    const pending = studentCharges.filter(c => 
                                        c.status !== 'paid' && 
                                        c.status !== 'cancelled' &&
                                        c.status !== 'bolsa100' && 
                                        c.status !== 'bolsa50' && 
                                        c.status !== 'isento'
                                    )

                                    const totalPending = pending.reduce((acc, curr) => acc + curr.amount, 0)
                                    const totalCount = studentCharges.length
                                    const paidCount = studentCharges.filter(c => c.status === 'paid').length
                                    const turmaName = allClasses.find(c => c.id === s.class_id)?.name || "-"
                                    
                                    return (
                                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-foreground">{s.name}</div>
                                                        <div className="flex items-center gap-1.5 translate-y-[1px]">
                                                            <span className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border/50 uppercase tracking-tighter shadow-sm flex items-center gap-1">
                                                                {totalCount} Lançamentos
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter shadow-sm flex items-center gap-1 ${paidCount > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-muted/50 text-muted-foreground/50 border-border/20'}`}>
                                                                {paidCount} Pagos
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{turmaName}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{s.enrollment_number}</td>
                                            <td className="px-4 py-3">
                                                {overdue.length > 0 ? (
                                                    <span className="text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Pendente</span>
                                                ) : studentCharges.some(c => c.type === 'monthly' && c.status === 'bolsa100') ? (
                                                    <span className="text-blue-600 font-bold flex items-center gap-1"><Zap className="h-3 w-3" /> Bolsa 100%</span>
                                                ) : studentCharges.some(c => c.type === 'monthly' && c.status === 'bolsa50') ? (
                                                    <span className="text-blue-500 font-bold flex items-center gap-1"><Zap className="h-3 w-3" /> Bolsa 50%</span>
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
                <DialogContent className="sm:max-w-[95vw] sm:max-h-[90vh] w-full h-full flex flex-col p-0 overflow-hidden">
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
                                            onRefresh?.()
                                            toast.success(`Bolsas de ${type}% aplicadas com sucesso!`)
                                        } catch (e: any) { toast.error("Erro ao aplicar bolsas: " + e.message) } 
                                        finally { setIsGenerating(false) }
                                    }}
                                    disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <DollarSign className="h-3 w-3 mr-2" />}
                                    Aplicar Bolsa (Lote)
                                </Button>
                                <Button size="sm" variant="outline" className="h-9 text-xs font-bold border-accent text-accent hover:bg-accent/10" 
                                    onClick={() => handleSyncGrade(selectedStudent!.id)}
                                    disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Zap className="h-3 w-3 mr-2" />}
                                    Sincronizar Grade
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
                                    {charges.filter(c => c.studentId === selectedStudent?.id).sort((a,b) => {
                                        if (a.type === 'enrollment' && b.type !== 'enrollment') return -1;
                                        if (b.type === 'enrollment' && a.type !== 'enrollment') return 1;
                                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                    }).map(c => (
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
                                                    {c.status !== 'paid' && c.status !== 'bolsa100' && c.status !== 'isento' ? (
                                                        <>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-600 hover:bg-purple-50" onClick={async () => {
                                                                if(confirm("Deseja conceder isenção 100% para esta cobrança? O aluno não ficará com pendências.")) {
                                                                    await handleStatusChange(c.id, 'isento')
                                                                }
                                                            }} title="Isentar Integral"><Gift className="h-4 w-4" /></Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => {
                                                                setSettleCharge(c)
                                                                setSettleAmount(c.amount.toString())
                                                                setSettleModal(true)
                                                            }} title="Dar Baixa"><CheckCircle2 className="h-4 w-4" /></Button>
                                                        </>
                                                    ) : (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => setReverseId(c.id)} title="Estornar/Remover Baixa"><Clock className="h-4 w-4" /></Button>
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

            {/* Settle Modal */}
            <Dialog open={settleModal} onOpenChange={setSettleModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Dar Baixa no Pagamento</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Cobrança</p>
                            <p className="text-sm font-bold">{settleCharge?.description}</p>
                            <p className="text-xs text-muted-foreground">Valor Original: R$ {settleCharge?.amount.toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Valor Recebido (R$)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    value={settleAmount} 
                                    onChange={e => setSettleAmount(e.target.value)} 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Data do Pagamento</Label>
                                <Input 
                                    type="date" 
                                    value={settleDate} 
                                    onChange={e => setSettleDate(e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Modalidade</Label>
                            <Select value={settleMethod} onValueChange={(v: any) => setSettleMethod(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="cartao">Cartão</SelectItem>
                                    <SelectItem value="dinheiro">Dinheiro / Espécie</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettleModal(false)}>Cancelar</Button>
                        <Button onClick={handleSettleSubmit} disabled={saving} className="premium-gradient text-white border-none shadow-lg">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Confirmar Recebimento
                        </Button>
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

            <AlertDialog open={!!reverseId} onOpenChange={(o) => !o && setReverseId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Estornar Pagamento</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja estornar este pagamento? O status da cobrança voltará para "Pendente" e a data/método de pagamento serão removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-amber-600 hover:bg-amber-700" 
                            onClick={(e) => {
                                e.preventDefault()
                                if (reverseId) handleReverse(reverseId)
                            }}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Confirmar Estorno
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
