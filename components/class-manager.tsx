"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Pencil, Save, X, Users, Clock, GraduationCap, Loader2, Calendar } from "lucide-react"
import { getClasses, addClass, updateClass, deleteClass, getStudents, type ClassRoom, type StudentProfile } from "@/lib/store"

const SHIFTS = [
    { value: "morning", label: "Manhã" },
    { value: "afternoon", label: "Tarde" },
    { value: "evening", label: "Noite" },
    { value: "ead", label: "EAD/Online" },
]

const DAYS = [
    { value: "", label: "Não definido" },
    { value: "monday", label: "Segunda-feira" },
    { value: "tuesday", label: "Terça-feira" },
    { value: "wednesday", label: "Quarta-feira" },
    { value: "thursday", label: "Quinta-feira" },
    { value: "friday", label: "Sexta-feira" },
    { value: "saturday", label: "Sábado" },
]

const DAY_LABEL: Record<string, string> = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
}

const SHIFT_LABEL: Record<string, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    evening: "Noite",
    ead: "EAD/Online",
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

type FormState = { name: string; shift: ClassRoom["shift"]; dayOfWeek: string; maxStudents: number }
const EMPTY_FORM: FormState = { name: "", shift: "ead", dayOfWeek: "", maxStudents: 30 }

// ─── ClassForm defined OUTSIDE ClassManager to prevent remount on every keystroke ───
interface ClassFormProps {
    val: FormState
    onChange: (field: keyof FormState, value: string | number) => void
}

function ClassForm({ val, onChange }: ClassFormProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome da Turma *</label>
                <input
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Ex: Turma A - 2026"
                    value={val.name}
                    onChange={e => onChange("name", e.target.value)}
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Dia da Semana</label>
                <select
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                    value={val.dayOfWeek}
                    onChange={e => onChange("dayOfWeek", e.target.value)}
                >
                    {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Turno</label>
                <select
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                    value={val.shift}
                    onChange={e => onChange("shift", e.target.value)}
                >
                    {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Máx. de Alunos</label>
                <input
                    type="number" min={1} max={500}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                    value={val.maxStudents}
                    onChange={e => onChange("maxStudents", Number(e.target.value))}
                />
            </div>
        </div>
    )
}

export function ClassManager() {
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showNew, setShowNew] = useState(false)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

    async function load() {
        setLoading(true)
        const [cls, stds] = await Promise.all([getClasses(), getStudents()])

        // Sort classes by day of week
        const sortedCls = [...cls].sort((a, b) => {
            const orderA = a.dayOfWeek ? (DAY_ORDER[a.dayOfWeek] || 99) : 100
            const orderB = b.dayOfWeek ? (DAY_ORDER[b.dayOfWeek] || 99) : 100
            if (orderA !== orderB) return orderA - orderB
            return a.name.localeCompare(b.name)
        })

        setClasses(sortedCls)
        setStudents(stds)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleAdd() {
        if (!form.name.trim()) return
        setSaving(true)
        try {
            await addClass({ name: form.name.trim(), shift: form.shift, dayOfWeek: form.dayOfWeek || undefined, maxStudents: form.maxStudents })
            setForm(EMPTY_FORM)
            setShowNew(false)
            await load()
        } finally { setSaving(false) }
    }

    async function handleUpdate(id: string) {
        setSaving(true)
        try {
            await updateClass(id, { name: editForm.name.trim(), shift: editForm.shift, dayOfWeek: editForm.dayOfWeek || undefined, maxStudents: editForm.maxStudents })
            setEditingId(null)
            await load()
        } finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir esta turma? Alunos vinculados perderão a associação.")) return
        await deleteClass(id)
        await load()
    }

    function startEdit(c: ClassRoom) {
        setEditingId(c.id)
        setEditForm({ name: c.name, shift: c.shift, dayOfWeek: c.dayOfWeek || "", maxStudents: c.maxStudents })
        setShowNew(false)
    }

    const handleFormChange = (field: keyof FormState, value: string | number) =>
        setForm(f => ({ ...f, [field]: value }))

    const handleEditFormChange = (field: keyof FormState, value: string | number) =>
        setEditForm(f => ({ ...f, [field]: value }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-accent" /> Turmas
                    </h2>
                    <p className="text-sm text-muted-foreground">Gerencie turmas, dias e vagas disponíveis</p>
                </div>
                <button
                    onClick={() => { setShowNew(true); setEditingId(null) }}
                    className="flex items-center gap-2 bg-accent text-accent-foreground font-bold px-4 py-2 rounded-xl hover:bg-accent/90 transition-colors text-sm"
                >
                    <Plus className="h-4 w-4" /> Nova Turma
                </button>
            </div>

            {/* New Class Form */}
            {showNew && (
                <div className="bg-accent/5 border-2 border-accent/20 rounded-2xl p-5 space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-accent" /> Nova Turma</h3>
                    <ClassForm val={form} onChange={handleFormChange} />
                    <div className="flex gap-3">
                        <button onClick={handleAdd} disabled={saving || !form.name.trim()}
                            className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors text-sm">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Turma
                        </button>
                        <button onClick={() => setShowNew(false)} className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm hover:bg-muted transition-colors">
                            <X className="h-4 w-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Classes List */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
            ) : classes.length === 0 ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                    <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma turma cadastrada.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {classes.map(c => (
                        <div key={c.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            {editingId === c.id ? (
                                <div className="space-y-4">
                                    <ClassForm val={editForm} onChange={handleEditFormChange} />
                                    <div className="flex gap-3">
                                        <button onClick={() => handleUpdate(c.id)} disabled={saving}
                                            className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors text-sm">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm hover:bg-muted transition-colors">
                                            <X className="h-4 w-4" /> Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground truncate">{c.name}</p>
                                            <div className="flex flex-wrap items-center gap-3 mt-1">
                                                {c.dayOfWeek && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />{DAY_LABEL[c.dayOfWeek] || c.dayOfWeek}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />{SHIFT_LABEL[c.shift] || c.shift}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Users className="h-3 w-3" />{c.maxStudents} vagas
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => startEdit(c)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Editar">
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors" title="Excluir">
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de Alunos Matriculados */}
                                    <div className="mt-4 pt-4 border-t border-border/50">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5" />
                                            Alunos Matriculados ({students.filter(s => s.class_id === c.id).length})
                                        </h4>
                                        <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                            {students.filter(s => s.class_id === c.id).length === 0 ? (
                                                <span className="text-xs text-muted-foreground italic px-1">Nenhum aluno matriculado ainda.</span>
                                            ) : (
                                                students.filter(s => s.class_id === c.id).map(student => (
                                                    <div key={student.id} className="flex justify-between items-center text-sm py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                        <span className="font-medium text-foreground">{student.name}</span>
                                                        <span className="text-xs text-muted-foreground font-mono bg-muted border border-border px-2 py-0.5 rounded-md">
                                                            {student.enrollment_number || "Sem Registro"}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div >
            )
            }
        </div >
    )
}
