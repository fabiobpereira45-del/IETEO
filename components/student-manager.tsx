"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Users, Plus, ShieldCheck, Mail, Loader2, CheckCircle2, User, Phone,
    MapPin, Building2, UserCircle2, MessageSquare, Search, Pencil, Trash2,
    X, AlertTriangle, Eye, EyeOff, BookOpen, MessageCircle, Download, FileText
} from "lucide-react"
import { printEnrollmentCertificatePDF } from "@/lib/pdf"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    getStudents, registerStudentByAdmin, getClasses, updateStudent, deleteStudent, getClassSchedules,
    type StudentProfile, type ClassRoom, type ClassSchedule, triggerN8nWebhook
} from "@/lib/store"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHIFT_LABELS: Record<string, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    evening: "Noite",
    ead: "EAD",
}

const DAY_ORDER: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentManager({ isMaster }: { isMaster?: boolean }) {
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [schedules, setSchedules] = useState<ClassSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterClass, setFilterClass] = useState("all")
    const [filterPayment, setFilterPayment] = useState("all")

    // Dialogs
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isViewOpen, setIsViewOpen] = useState(false)
    const [isCustomMsgOpen, setIsCustomMsgOpen] = useState(false)
    const [customMessage, setCustomMessage] = useState("")
    const [sendingMsg, setSendingMsg] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [editPassword, setEditPassword] = useState("")
    const [showEditPassword, setShowEditPassword] = useState(false)
    const [isBulkOpen, setIsBulkOpen] = useState(false)
    const [bulkText, setBulkText] = useState("")
    const [bulkError, setBulkError] = useState("")
    const [importing, setImporting] = useState(false)

    // Selected student (for edit / delete / view)
    const [selected, setSelected] = useState<StudentProfile | null>(null)

    // ── Add form ──────────────────────────────────────────────────────────────
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("123456")
    const [showPassword, setShowPassword] = useState(false)
    const [cpf, setCpf] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [church, setChurch] = useState("")
    const [pastor, setPastor] = useState("")
    const [classId, setClassId] = useState("none")
    const [paymentStatus, setPaymentStatus] = useState("paid")

    // ── Edit form ─────────────────────────────────────────────────────────────
    const [editName, setEditName] = useState("")
    const [editCpf, setEditCpf] = useState("")
    const [editPhone, setEditPhone] = useState("")
    const [editAddress, setEditAddress] = useState("")
    const [editChurch, setEditChurch] = useState("")
    const [editPastor, setEditPastor] = useState("")
    const [editClassId, setEditClassId] = useState("none")
    const [editPaymentStatus, setEditPaymentStatus] = useState("pending")
    const [editStatus, setEditStatus] = useState<StudentProfile['status']>('pending')

    // ─── Data Load ────────────────────────────────────────────────────────────

    async function load() {
        setLoading(true)
        const [s, c, sch] = await Promise.all([getStudents(), getClasses(), getClassSchedules()])
        setStudents(s)

        // Sort classes by day of week
        const sortedClasses = [...c].sort((a, b) => {
            const orderA = a.dayOfWeek ? (DAY_ORDER[a.dayOfWeek] || 99) : 100
            const orderB = b.dayOfWeek ? (DAY_ORDER[b.dayOfWeek] || 99) : 100
            if (orderA !== orderB) return orderA - orderB
            return a.name.localeCompare(b.name)
        })

        setClasses(sortedClasses)
        setSchedules(sch)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    // ─── Filtered list ────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = students;
        
        // Filter by Search
        const q = search.toLowerCase()
        if (q) {
            list = list.filter(s =>
                s.name.toLowerCase().includes(q) ||
                (s.enrollment_number || "").toLowerCase().includes(q) ||
                (s.cpf || "").includes(q) ||
                (s.phone || "").includes(q)
            )
        }

        // Filter by Class
        if (filterClass !== "all") {
            list = list.filter(s => s.class_id === filterClass)
        }

        // Filter by Payment
        if (filterPayment !== "all") {
            list = list.filter(s => s.payment_status === filterPayment)
        }

        return list
    }, [students, search, filterClass, filterPayment])

    // ─── Create ───────────────────────────────────────────────────────────────

    function resetAddForm() {
        setName(""); setEmail(""); setPassword("123456"); setCpf(""); setPhone("")
        setAddress(""); setChurch(""); setPastor(""); setClassId("none")
    }

    async function handleAdd() {
        if (!name.trim()) return alert("Nome é obrigatório.")
        if (!email.trim() || !password.trim()) return alert("Email e senha são obrigatórios.")
        setSaving(true)
        try {
            await registerStudentByAdmin({
                name: name.trim(),
                email: email.trim(),
                password: password.trim(),
                cpf: cpf.trim(),
                phone: phone.trim(),
                address: address.trim(),
                church: church.trim(),
                pastor: pastor.trim(),
                classId: classId === "none" ? undefined : classId,
                paymentStatus,
            })
            setIsAddOpen(false)
            resetAddForm()
            await load()
            alert("Aluno matriculado com sucesso!")
        } catch (err: any) {
            alert("Erro ao matricular aluno: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    // ─── Open Edit ────────────────────────────────────────────────────────────

    function openEdit(stu: StudentProfile) {
        setSelected(stu)
        setEditName(stu.name)
        setEditCpf(stu.cpf || "")
        setEditPhone(stu.phone || "")
        setEditAddress(stu.address || "")
        setEditChurch(stu.church || "")
        setEditPastor(stu.pastor_name || "")
        setEditClassId(stu.class_id || "none")
        setEditPaymentStatus(stu.payment_status || "pending")
        setEditStatus(stu.status || 'pending')
        setEditPassword("")
        setIsEditOpen(true)
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    async function handleEdit() {
        if (!selected) return
        if (!editName.trim()) return alert("Nome é obrigatório.")
        setSaving(true)
        try {
            await updateStudent(selected.id, {
                name: editName.trim(),
                cpf: editCpf.trim(),
                phone: editPhone.trim(),
                address: editAddress.trim(),
                church: editChurch.trim(),
                pastor_name: editPastor.trim(),
                class_id: editClassId === "none" ? null : editClassId,
                payment_status: editPaymentStatus,
                status: editStatus,
                ...(editPassword ? { password: editPassword } : {}),
            })
            setIsEditOpen(false)
            await load()
        } catch (err: any) {
            alert("Erro ao salvar alterações: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    function openDelete(stu: StudentProfile) {
        setSelected(stu)
        setIsDeleteOpen(true)
    }

    async function handleDelete() {
        if (!selected) return
        setDeleting(true)
        try {
            if (selected.auth_user_id) {
                await fetch(`/api/admin/users?id=${encodeURIComponent(selected.auth_user_id)}`, { method: "DELETE" })
            }
            await deleteStudent(selected.id)
            setIsDeleteOpen(false)
            setSelected(null)
            await load()
        } catch (err: any) {
            alert("Erro ao excluir aluno: " + err.message)
        } finally {
            setDeleting(false)
        }
    }

    // ─── View ─────────────────────────────────────────────────────────────────
    function openView(stu: StudentProfile) {
        setSelected(stu)
        setIsViewOpen(true)
    }

    // ─── WhatsApp ─────────────────────────────────────────────────────────────
    function openCustomMessage(stu: StudentProfile) {
        setSelected(stu)
        setCustomMessage(`Olá ${stu.name.split(' ')[0]}, tudo bem? Gostaria de falar sobre...`)
        setIsCustomMsgOpen(true)
    }

    async function handleSendCustomMessage() {
        if (!selected || !customMessage.trim()) return
        setSendingMsg(true)
        try {
            await triggerN8nWebhook('mensagem_manual', {
                type: 'manual',
                name: selected.name,
                phone: selected.phone,
                message: customMessage.trim()
            })
            setIsCustomMsgOpen(false)
            setCustomMessage("")
        } catch (err: any) {
            alert("Erro ao enviar mensagem: " + err.message)
        } finally {
            setSendingMsg(false)
        }
    }

    function downloadStudentsPDF() {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text("Relatório Geral de Alunos", 14, 20)
        
        doc.setFontSize(10)
        doc.setTextColor(100)
        const classLabel = filterClass === "all" ? "Todas" : (classes.find(c => c.id === filterClass)?.name || "N/D")
        const payLabel = filterPayment === "all" ? "Todos" : (filterPayment === "paid" ? "Pago" : filterPayment === "bolsa100" ? "Bolsa 100%" : filterPayment === "bolsa50" ? "Bolsa 50%" : "Pendente")
        doc.text(`Filtros - Turma: ${classLabel} | Financeiro: ${payLabel}`, 14, 28)
        doc.text(`Total de registros: ${filtered.length} | Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 33)

        const tableData = filtered.map((s, i) => {
            const cls = classes.find(c => c.id === s.class_id)
            return [
                i + 1,
                s.name,
                s.enrollment_number || "—",
                cls?.name || "Sem Turma",
                s.payment_status === "paid" ? "Pago" : s.payment_status === "bolsa100" ? "Bolsa 100%" : s.payment_status === "bolsa50" ? "Bolsa 50%" : "Pendente",
                s.phone || "—"
            ]
        })

        ;(doc as any).autoTable({
            startY: 40,
            head: [['#', 'Nome', 'Matrícula', 'Turma', 'Financeiro', 'Telefone']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
            styles: { fontSize: 8 }
        })

        doc.save(`Relatorio_Alunos_${new Date().getTime()}.pdf`)
    }

    async function handleBulkImport() {
        if (!bulkText.trim()) return
        setImporting(true)
        setBulkError("")
        
        const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean)
        let successCount = 0
        let errors = []

        for (const line of lines) {
            // Skip header if present
            if (line.toLowerCase().includes("nome;") || line.toLowerCase().includes("cpf;")) continue

            const parts = line.split(";")
            if (parts.length < 3) continue

            try {
                const [bulkName, bulkCpf, bulkEmail, bulkPhone, bulkClassId] = parts
                
                // If it's a PDF export from somewhere else, it might have noise or different order.
                // We'll assume: Nome; CPF; Email; Telefone; ID_Turma
                
                await registerStudentByAdmin({
                    name: bulkName?.trim() || "",
                    email: bulkEmail?.trim() || "",
                    password: "123456", // Default password
                    cpf: bulkCpf?.trim() || "",
                    phone: bulkPhone?.trim() || "",
                    class_id: bulkClassId?.trim() === "none" ? undefined : bulkClassId?.trim(),
                    payment_status: "paid" // Default to paid for bulk import unless specified
                })
                successCount++
            } catch (err) {
                console.error("Erro ao importar linha:", line, err)
                errors.push(line)
            }
        }

        if (successCount > 0) {
            await load()
            setIsBulkOpen(false)
            setBulkText("")
        } else {
            setBulkError("Nenhum aluno foi importado. Verifique se o formato está correto (Nome; CPF; Email; Telefone; ID_Turma)")
        }
        setImporting(false)
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex justify-between items-center glass rounded-2xl p-6 premium-shadow">
                <div>
                    <h2 className="text-xl font-bold font-serif text-foreground">Gestão de Alunos</h2>
                    <p className="text-muted-foreground text-sm">Visualize, edite e gerencie os alunos com matrícula ativa.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsBulkOpen(true)}
                        className="rounded-xl border border-border bg-background"
                    >
                        <Plus className="h-4 w-4 mr-1.5" /> Importar Lote
                    </Button>
                    <Button
                        variant="outline"
                        onClick={downloadStudentsPDF}
                        disabled={filtered.length === 0}
                        className="rounded-xl border border-border bg-background"
                    >
                        <Download className="h-4 w-4 mr-1.5" /> Exportar PDF
                    </Button>
                    <Button
                        onClick={() => { resetAddForm(); setIsAddOpen(true) }}
                        className="rounded-xl shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-4 w-4 mr-1.5" /> Matricular Aluno
                    </Button>
                </div>
            </div>


            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por nome, matrícula, CPF ou telefone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-11 h-12 text-sm rounded-xl border-border/50 bg-card hover:border-primary/30 focus:border-primary/50 transition-all premium-shadow shadow-sm"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="h-12 px-4 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-w-[140px]"
                    >
                        <option value="all">Todas as Turmas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={filterPayment}
                        onChange={e => setFilterPayment(e.target.value)}
                        className="h-12 px-4 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-w-[150px]"
                    >
                        <option value="all">Status Fin. (Todos)</option>
                        <option value="paid">Pago</option>
                        <option value="pending">Pendente</option>
                        <option value="bolsa100">Bolsa 100%</option>
                        <option value="bolsa50">Bolsa 50%</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden premium-shadow relative">
                {/* Scroll Indicator (Visual only) */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none md:hidden" />
                
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    <table className="w-full text-sm min-w-[600px] sm:min-w-0">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/20">
                                <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aluno</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Matrícula</th>
                                <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Turma</th>
                                <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Financeiro</th>
                                <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Status Conta</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((stu) => {
                                const cls = classes.find(c => c.id === stu.class_id)
                                return (
                                    <tr key={stu.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">{stu.name}</div>
                                            {stu.phone && <div className="text-xs text-muted-foreground">{stu.phone}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell font-mono">
                                            {stu.enrollment_number || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs hidden md:table-cell">
                                            {cls
                                                ? <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{cls.name}</span>
                                                : <span className="text-muted-foreground">Sem turma</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {stu.payment_status === "paid" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                    <CheckCircle2 className="h-3 w-3" /> Pago
                                                </span>
                                            ) : stu.payment_status === "bolsa100" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    Bolsa 100%
                                                </span>
                                            ) : stu.payment_status === "bolsa50" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    Bolsa 50%
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                                    Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                                            {stu.status === "pending" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                    Aguard. Pagto.
                                                </span>
                                            ) : stu.status === "inactive" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                    Inativo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                                    Ativo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* View */}
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    title="Ver detalhes"
                                                    onClick={() => openView(stu)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {/* Edit */}
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    title="Editar aluno"
                                                    onClick={() => openEdit(stu)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                    title="Comprovante de Matrícula"
                                                    onClick={() => printEnrollmentCertificatePDF(stu, cls?.name || "N/A")}
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                {/* WhatsApp */}
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                    title="Enviar WhatsApp"
                                                    onClick={() => openCustomMessage(stu)}
                                                >
                                                    <MessageCircle className="h-4 w-4 fill-green-600/10" />
                                                </Button>
                                                {/* Delete */}
                                                {isMaster && (
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Excluir aluno"
                                                        onClick={() => openDelete(stu)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-muted-foreground italic text-sm">
                                        {search ? "Nenhum aluno encontrado para essa busca." : "Nenhum aluno matriculado."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {search && filtered.length > 0 && (
                    <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                        Mostrando {filtered.length} de {students.length} alunos
                    </div>
                )}
            </div>

            {/* ── Modal: CADASTRAR ─────────────────────────────────────────────────── */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Matricular Aluno (Manual)</DialogTitle>
                        <DialogDescription>Crie a conta do aluno diretamente com status <strong className="text-green-600">Pago</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <Label className="text-xs">Nome Completo *</Label>
                                <div className="relative"><User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={name} onChange={e => setName(e.target.value)} /></div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">E-mail *</Label>
                                <div className="relative"><Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input type="email" className="pl-8 text-sm h-9" value={email} onChange={e => setEmail(e.target.value)} /></div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Senha Inicial *</Label>
                                <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} placeholder="Mín. 6 caracteres" className="pr-8 text-sm h-9" value={password} onChange={e => setPassword(e.target.value)} />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">CPF</Label>
                                <Input className="text-sm h-9" placeholder="Apenas números" value={cpf} onChange={e => setCpf(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Celular / WhatsApp</Label>
                                <div className="relative"><Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs">Endereço</Label>
                            <div className="relative"><MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={address} onChange={e => setAddress(e.target.value)} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Igreja que congrega</Label>
                                <div className="relative"><Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={church} onChange={e => setChurch(e.target.value)} /></div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Pastor Dirigente</Label>
                                <div className="relative"><UserCircle2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={pastor} onChange={e => setPastor(e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Turma Inicial (Opcional)</Label>
                                <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="none">Sem turma inicial</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({SHIFT_LABELS[c.shift] || c.shift})</option>)}
                                </select>
                                {classId !== "none" && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {schedules.filter(s => s.classId === classId).map(s => (
                                            <span key={s.id} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium uppercase">
                                                {{
                                                    segunda: "Seg", terca: "Ter", quarta: "Qua",
                                                    quinta: "Qui", sexta: "Sex", sabado: "Sab"
                                                }[s.dayOfWeek] || s.dayOfWeek}: {s.timeStart.substring(0, 5)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Status Financeiro</Label>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="paid">Pago</option>
                                    <option value="pending">Pendente</option>
                                    <option value="bolsa100">Bolsa 100%</option>
                                    <option value="bolsa50">Bolsa 50%</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={saving} className="text-xs h-9">Cancelar</Button>
                        <Button onClick={handleAdd} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold h-9">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />} Matricular
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Modal: EDITAR ────────────────────────────────────────────────────── */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Aluno</DialogTitle>
                        <DialogDescription>Matrícula: <strong>{selected?.enrollment_number}</strong></DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs">Nome Completo *</Label>
                            <div className="relative"><User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={editName} onChange={e => setEditName(e.target.value)} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">CPF</Label>
                                <Input className="text-sm h-9" placeholder="Apenas números" value={editCpf} onChange={e => setEditCpf(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Celular / WhatsApp</Label>
                                <div className="relative"><Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={editPhone} onChange={e => setEditPhone(e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs">Endereço</Label>
                            <div className="relative"><MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={editAddress} onChange={e => setEditAddress(e.target.value)} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Igreja que congrega</Label>
                                <div className="relative"><Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={editChurch} onChange={e => setEditChurch(e.target.value)} /></div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Pastor Dirigente</Label>
                                <div className="relative"><UserCircle2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 text-sm h-9" value={editPastor} onChange={e => setEditPastor(e.target.value)} /></div>
                            </div>
                        </div>                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Turma</Label>
                                <select value={editClassId} onChange={e => setEditClassId(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="none">Sem turma</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({SHIFT_LABELS[c.shift] || c.shift})</option>)}
                                </select>
                                {editClassId !== "none" && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {schedules.filter(s => s.classId === editClassId).map(s => (
                                            <span key={s.id} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium uppercase">
                                                {{
                                                    segunda: "Seg", terca: "Ter", quarta: "Qua",
                                                    quinta: "Qui", sexta: "Sex", sabado: "Sab"
                                                }[s.dayOfWeek] || s.dayOfWeek}: {s.timeStart.substring(0, 5)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Status Financeiro</Label>
                                <select value={editPaymentStatus} onChange={e => setEditPaymentStatus(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="paid">Pago</option>
                                    <option value="pending">Pendente</option>
                                    <option value="bolsa100">Bolsa 100%</option>
                                    <option value="bolsa50">Bolsa 50%</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs">Status da Matrícula</Label>
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                <option value="pending">Pendente (Oculto na listagem)</option>
                                <option value="active">Ativo (Visível na listagem)</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs">Alterar Senha (Opcional)</Label>
                            <div className="relative">
                                <Input 
                                    type={showEditPassword ? "text" : "password"} 
                                    className="pr-8 text-sm h-9" 
                                    value={editPassword} 
                                    onChange={e => setEditPassword(e.target.value)} 
                                    placeholder="Deixe em branco para manter a atual"
                                />
                                <button type="button" onClick={() => setShowEditPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showEditPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={saving} className="text-xs h-9">Cancelar</Button>
                        <Button onClick={handleEdit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pencil className="h-4 w-4 mr-2" />} Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Modal: VER DETALHES ──────────────────────────────────────────────── */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base">{selected?.name}</DialogTitle>
                        <DialogDescription>Detalhes completos do aluno</DialogDescription>
                    </DialogHeader>
                    {selected && (() => {
                        const cls = classes.find(c => c.id === selected.class_id)
                        return (
                            <div className="flex flex-col gap-3 text-sm py-2">
                                <InfoRow icon={<BookOpen className="h-3.5 w-3.5" />} label="Matrícula" value={selected.enrollment_number || "—"} />
                                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="CPF" value={selected.cpf ? selected.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—"} />
                                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={selected.phone || "—"} />
                                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Endereço" value={selected.address || "—"} />
                                <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Igreja" value={selected.church || "—"} />
                                <InfoRow icon={<UserCircle2 className="h-3.5 w-3.5" />} label="Pastor" value={selected.pastor_name || "—"} />
                                <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="Turma" value={cls ? `${cls.name} (${SHIFT_LABELS[cls.shift] || cls.shift})` : "Sem turma"} />
                                <div className="text-xs text-muted-foreground pt-1">
                                    Cadastrado em: {new Date(selected.created_at).toLocaleDateString("pt-BR")}
                                </div>
                            </div>
                        )
                    })()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsViewOpen(false); if (selected) openEdit(selected) }} className="text-xs h-9">
                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                        </Button>
                        <Button onClick={() => setIsViewOpen(false)} className="text-xs h-9">Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Modal: MENSAGEM CUSTOMIZADA WHATSAPP ──────────────────────────── */}
            <Dialog open={isCustomMsgOpen} onOpenChange={setIsCustomMsgOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <MessageSquare className="h-5 w-5" /> Enviar WhatsApp
                        </DialogTitle>
                        <DialogDescription>
                            Personalize a mensagem para <strong>{selected?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="custom-msg" className="text-xs">Sua Mensagem</Label>
                            <Textarea
                                id="custom-msg"
                                placeholder="Digite sua mensagem aqui..."
                                className="min-h-[120px] text-sm rounded-xl resize-none"
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                            />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-700">
                            💡 A mensagem será enviada via n8n para o número <strong>{selected?.phone}</strong>.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomMsgOpen(false)} disabled={sendingMsg} className="text-xs h-9">Cancelar</Button>
                        <Button onClick={handleSendCustomMessage} disabled={sendingMsg || !customMessage.trim()} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold h-9">
                            {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />} Enviar Agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Modal: CONFIRMAR EXCLUSÃO ────────────────────────────────────────── */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" /> Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir o aluno <strong>{selected?.name}</strong>? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mt-1">
                        ⚠️ O registro do aluno será removido do banco de dados. O acesso de login (conta Auth) do aluno não será apagado automaticamente.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting} className="text-xs h-9">Cancelar</Button>
                        <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Excluir Aluno
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Modal */}
            <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Importar Alunos em Lote</DialogTitle>
                        <DialogDescription>
                            Cole abaixo a lista de alunos separados por ponto e vírgula (;). 
                            <br />Formato: <code className="bg-muted px-1 rounded text-xs">Nome; CPF; Email; Telefone; ID_da_Turma</code>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col gap-4 py-4">
                        {bulkError && (
                            <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> {bulkError}
                            </div>
                        )}
                        <Textarea
                            placeholder="Exemplo:&#10;João Silva; 123.456.789-01; joao@email.com; (11) 99999-9999; turma_id_ou_none"
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            className="h-64 font-mono text-xs rounded-xl border-border/50 bg-muted/20"
                        />
                        <div className="text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
                            <strong>Dicas:</strong> 
                            <ul className="list-disc ml-4 space-y-1 mt-1">
                                <li>Para o ID da Turma, use 'none' se não quiser vincular agora.</li>
                                <li>A senha padrão para todos os novos alunos será '123456'.</li>
                                <li>Se a primeira linha for um cabeçalho, ela será ignorada automaticamente.</li>
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkOpen(false)} disabled={importing}>
                            Cancelar
                        </Button>
                        <Button onClick={handleBulkImport} disabled={!bulkText.trim() || importing} className="gap-2">
                            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Importar Agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </div >
    )
}

// ─── Aux Component ────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5">{icon}</span>
            <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
            <span className="text-foreground font-medium text-xs">{value}</span>
        </div>
    )
}
