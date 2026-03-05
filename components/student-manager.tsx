"use client"

import { useState, useEffect } from "react"
import { Users, Plus, ShieldCheck, Mail, Loader2, CheckCircle2, User, Phone, MapPin, Building2, UserCircle2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    getStudents, registerStudentByAdmin, getClasses, type StudentProfile, type ClassRoom, triggerFlowGravit
} from "@/lib/store"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

export function StudentManager() {
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [loading, setLoading] = useState(true)

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form fields
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [cpf, setCpf] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [church, setChurch] = useState("")
    const [pastor, setPastor] = useState("")
    const [classId, setClassId] = useState("none")

    async function load() {
        setLoading(true)
        const [s, c] = await Promise.all([
            getStudents(),
            getClasses()
        ])
        setStudents(s)
        setClasses(c)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

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
                paymentStatus: "paid" // FORÇA O PAGAMENTO COMO PAGO
            })
            setIsAddOpen(false)
            resetForm()
            await load()
            alert("Aluno matriculado com sucesso!")
        } catch (err: any) {
            alert("Erro ao matricular aluno: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    function resetForm() {
        setName("")
        setEmail("")
        setPassword("")
        setCpf("")
        setPhone("")
        setAddress("")
        setChurch("")
        setPastor("")
        setClassId("none")
    }

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold font-serif text-foreground">Gestão de Alunos</h2>
                    <p className="text-muted-foreground text-sm">Visualize alunos e realize matrículas manuais sem cobrança.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsAddOpen(true) }} className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold px-3 py-1.5 h-9">
                    <Plus className="h-4 w-4 mr-1.5" /> Matricular Aluno (Manual)
                </Button>
            </div>

            <div className="bg-card border border-border rounded-xl flex items-center justify-between p-4">
                <div className="flex items-center gap-3 text-primary">
                    <Users className="h-5 w-5" />
                    <span className="font-semibold text-sm">Total de Alunos Matriculados:</span>
                </div>
                <div className="text-2xl font-bold">{students.length}</div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Aluno</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Turma</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status F.</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((stu) => {
                            const c = classes.find((cl) => cl.id === stu.class_id)
                            return (
                                <tr key={stu.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground">{stu.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{stu.cpf ? `${stu.cpf}@student.ieteo.com` : 'Privado'}</td>
                                    <td className="px-4 py-3 text-center text-xs">
                                        {c ? <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{c.name}</span> : <span className="text-muted-foreground">Sem turma</span>}
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
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            title="Enviar WhatsApp"
                                            onClick={() => triggerFlowGravit('mensagem_manual', {
                                                type: 'manual',
                                                name: stu.name,
                                                phone: stu.phone
                                            })}
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-6 text-muted-foreground italic text-sm">Nenhum aluno matriculado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for manual enrollment */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Matrícula Manual (Admin)</DialogTitle>
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
                                <Input type="password" placeholder="Mínimo 6 caracteres" className="text-sm h-9" value={password} onChange={e => setPassword(e.target.value)} />
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

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs">Turma Inicial (Opcional)</Label>
                            <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full text-sm h-9 border border-input rounded-md px-3 bg-background">
                                <option value="none">Sem turma inicial</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.shift || 'N/A'})</option>)}
                            </select>
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
        </div>
    )
}
