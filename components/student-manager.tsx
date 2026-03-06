"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Users, Plus, ShieldCheck, Mail, Loader2, CheckCircle2, User, Phone,
    MapPin, Building2, UserCircle2, MessageSquare, Search, Pencil, Trash2,
    X, AlertTriangle, Eye, EyeOff, BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    getStudents, registerStudentByAdmin, getClasses, updateStudent, deleteStudent,
    type StudentProfile, type ClassRoom, triggerFlowGravit
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

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentManager({ isMaster }: { isMaster?: boolean }) {
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Dialogs
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isViewOpen, setIsViewOpen] = useState(false)

    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Selected student (for edit / delete / view)
    const [selected, setSelected] = useState<StudentProfile | null>(null)

    // ── Add form ──────────────────────────────────────────────────────────────
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
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
    const [editPayment, setEditPayment] = useState("paid")

    // ─── Data Load ────────────────────────────────────────────────────────────

    async function load() {
        setLoading(true)
        const [s, c] = await Promise.all([getStudents(), getClasses()])
        setStudents(s)
        setClasses(c)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    // ─── Filtered list ────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        if (!q) return students
        return students.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.enrollment_number || "").toLowerCase().includes(q) ||
            (s.cpf || "").includes(q) ||
            (s.phone || "").includes(q)
        )
    }, [students, search])

    // ─── Create ───────────────────────────────────────────────────────────────

    function resetAddForm() {
        setName(""); setEmail(""); setPassword(""); setCpf(""); setPhone("")
        setAddress(""); setChurch(""); setPastor(""); setClassId("none"); setPaymentStatus("paid")
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
        setEditPayment(stu.payment_status || "paid")
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
                payment_status: editPayment,
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

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold font-serif text-foreground">Gestão de Alunos</h2>
                    <p className="text-muted-foreground text-sm">Visualize, edite e gerencie os alunos matriculados.</p>
                </div>
                <Button
                    onClick={() => { resetAddForm(); setIsAddOpen(true) }}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold px-3 py-1.5 h-9 self-start sm:self-auto"
                >
                    <Plus className="h-4 w-4 mr-1.5" /> Matricular Aluno
                </Button>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border rounded-xl flex items-center justify-between p-4">
                <div className="flex items-center gap-3 text-primary">
                    <Users className="h-5 w-5" />
                    <span className="font-semibold text-sm">Total de Alunos Matriculados:</span>
                </div>
                <div className="text-2xl font-bold">{students.length}</div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome, matrícula, CPF ou telefone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Aluno</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Matrícula</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Turma</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status F.</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((stu) => {
                                const cls = classes.find(c => c.id === stu.class_id)
                                return (
                                    <tr key={stu.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">{stu.name}</div>
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
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                                    Pendente
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
                                                {/* WhatsApp */}
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    title="Enviar WhatsApp"
                                                    onClick={() => triggerFlowGravit('mensagem_manual', { type: 'manual', name: stu.name, phone: stu.phone })}
                                                >
                                                    <MessageSquare className="h-4 w-4" />
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
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Status Financeiro</Label>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="paid">Pago</option>
                                    <option value="pending">Pendente</option>
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Turma</Label>
                                <select value={editClassId} onChange={e => setEditClassId(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="none">Sem turma</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({SHIFT_LABELS[c.shift] || c.shift})</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs">Status Financeiro</Label>
                                <select value={editPayment} onChange={e => setEditPayment(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                    <option value="paid">Pago</option>
                                    <option value="pending">Pendente</option>
                                </select>
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
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-xs text-muted-foreground w-24 shrink-0">Status Financeiro</span>
                                    {selected.payment_status === "paid" ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                            <CheckCircle2 className="h-3 w-3" /> Pago
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                            Pendente
                                        </span>
                                    )}
                                </div>
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

        </div>
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
