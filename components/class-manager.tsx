"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Pencil, Save, X, Users, Clock, GraduationCap, Loader2 } from "lucide-react"
import { getClasses, addClass, updateClass, deleteClass, type ClassRoom } from "@/lib/store"

const SHIFTS = [
    { value: "morning", label: "Manhã" },
    { value: "afternoon", label: "Tarde" },
    { value: "evening", label: "Noite" },
    { value: "ead", label: "EAD/Online" },
]

export function ClassManager() {
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showNew, setShowNew] = useState(false)
    const [form, setForm] = useState({ name: "", shift: "ead" as ClassRoom["shift"], maxStudents: 30 })
    const [editForm, setEditForm] = useState({ name: "", shift: "ead" as ClassRoom["shift"], maxStudents: 30 })

    async function load() {
        setLoading(true)
        setClasses(await getClasses())
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleAdd() {
        if (!form.name.trim()) return
        setSaving(true)
        try {
            await addClass({ name: form.name.trim(), shift: form.shift, maxStudents: form.maxStudents })
            setForm({ name: "", shift: "ead", maxStudents: 30 })
            setShowNew(false)
            await load()
        } finally { setSaving(false) }
    }

    async function handleUpdate(id: string) {
        setSaving(true)
        try {
            await updateClass(id, { name: editForm.name.trim(), shift: editForm.shift, maxStudents: editForm.maxStudents })
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
        setEditForm({ name: c.name, shift: c.shift, maxStudents: c.maxStudents })
        setShowNew(false)
    }

    const shiftLabel = (s: string) => SHIFTS.find(x => x.value === s)?.label ?? s

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-accent" /> Turmas
                    </h2>
                    <p className="text-sm text-muted-foreground">Gerencie turmas e vagas disponíveis</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome da Turma</label>
                            <input
                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="Ex: Turma A - 2026"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Turno</label>
                            <select
                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                value={form.shift}
                                onChange={e => setForm(f => ({ ...f, shift: e.target.value as ClassRoom["shift"] }))}
                            >
                                {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Máx. de Alunos</label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                value={form.maxStudents}
                                onChange={e => setForm(f => ({ ...f, maxStudents: Number(e.target.value) }))}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleAdd}
                            disabled={saving || !form.name.trim()}
                            className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors text-sm"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Salvar Turma
                        </button>
                        <button onClick={() => setShowNew(false)} className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm hover:bg-muted transition-colors">
                            <X className="h-4 w-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Classes List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 text-accent animate-spin" />
                </div>
            ) : classes.length === 0 ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                    <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma turma cadastrada.</p>
                    <p className="text-sm text-muted-foreground/70">Clique em "Nova Turma" para começar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {classes.map(c => (
                        <div key={c.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            {editingId === c.id ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-1">
                                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome</label>
                                            <input
                                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                                value={editForm.name}
                                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Turno</label>
                                            <select
                                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                                value={editForm.shift}
                                                onChange={e => setEditForm(f => ({ ...f, shift: e.target.value as ClassRoom["shift"] }))}
                                            >
                                                {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Máx. Alunos</label>
                                            <input
                                                type="number" min={1}
                                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                                value={editForm.maxStudents}
                                                onChange={e => setEditForm(f => ({ ...f, maxStudents: Number(e.target.value) }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleUpdate(c.id)} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors text-sm">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm hover:bg-muted transition-colors">
                                            <X className="h-4 w-4" /> Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground truncate">{c.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />{shiftLabel(c.shift)}
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
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
