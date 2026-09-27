"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Plus, Trash2, Loader2, Copy, Search, BookOpen } from "lucide-react"
import {
    getClassCurriculum, saveClassCurriculumItem, deleteClassCurriculumItem, reorderClassCurriculum,
    copyGlobalGradeToClass, getDisciplines,
    type ClassCurriculumItem, type Discipline, type ClassRoom
} from "@/lib/store"

const MONTHS = [
    { value: "Jan", label: "Janeiro" }, { value: "Fev", label: "Fevereiro" }, { value: "Mar", label: "Março" },
    { value: "Abr", label: "Abril" }, { value: "Mai", label: "Maio" }, { value: "Jun", label: "Junho" },
    { value: "Jul", label: "Julho" }, { value: "Ago", label: "Agosto" }, { value: "Set", label: "Setembro" },
    { value: "Out", label: "Outubro" }, { value: "Nov", label: "Novembro" }, { value: "Dez", label: "Dezembro" },
]

const YEARS = ["2025", "2026", "2027", "2028"]

export function ClassCurriculumManager({ classRoom, onClose }: { classRoom: ClassRoom; onClose: () => void }) {
    const [items, setItems] = useState<ClassCurriculumItem[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showPicker, setShowPicker] = useState(false)
    const [search, setSearch] = useState("")

    const load = useCallback(async () => {
        setLoading(true)
        const [curriculum, allDisciplines] = await Promise.all([
            getClassCurriculum(classRoom.id),
            getDisciplines()
        ])
        setItems(curriculum)
        setDisciplines(allDisciplines)
        setLoading(false)
    }, [classRoom.id])

    useEffect(() => { load() }, [load])

    const disciplineById = useMemo(() => new Map(disciplines.map(d => [d.id, d])), [disciplines])

    const availableDisciplines = useMemo(() => {
        const usedIds = new Set(items.map(i => i.disciplineId))
        return disciplines
            .filter(d => !usedIds.has(d.id))
            .filter(d => !search.trim() || d.name.toLowerCase().includes(search.toLowerCase()))
    }, [disciplines, items, search])

    async function handleAddDiscipline(disciplineId: string) {
        setSaving(true)
        try {
            await saveClassCurriculumItem({
                classId: classRoom.id,
                disciplineId,
                order: items.length,
                isConcluded: false,
            })
            setShowPicker(false)
            setSearch("")
            await load()
        } finally {
            setSaving(false)
        }
    }

    async function handleUpdateItem(item: ClassCurriculumItem, patch: Partial<ClassCurriculumItem>) {
        setSaving(true)
        try {
            await saveClassCurriculumItem({
                classId: item.classId,
                disciplineId: item.disciplineId,
                order: item.order,
                applicationMonth: item.applicationMonth,
                applicationYear: item.applicationYear,
                isConcluded: item.isConcluded,
                ...patch,
            }, item.id)
            await load()
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteItem(id: string) {
        if (!confirm("Remover esta disciplina da grade da turma?")) return
        setSaving(true)
        try {
            await deleteClassCurriculumItem(id)
            await load()
        } finally {
            setSaving(false)
        }
    }

    async function moveItem(index: number, direction: -1 | 1) {
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= items.length) return
        const reordered = [...items]
        const [moved] = reordered.splice(index, 1)
        reordered.splice(targetIndex, 0, moved)
        setItems(reordered)
        setSaving(true)
        try {
            await reorderClassCurriculum(reordered.map(i => i.id))
            await load()
        } finally {
            setSaving(false)
        }
    }

    async function handleCopyGlobal() {
        if (!confirm("Copiar a grade global atual (por modalidade/polo) para esta turma? Disciplinas já cadastradas na turma não serão duplicadas.")) return
        setSaving(true)
        try {
            const inserted = await copyGlobalGradeToClass(classRoom.id)
            alert(inserted > 0 ? `${inserted} disciplina(s) copiada(s) da grade global.` : "Nenhuma disciplina nova para copiar.")
            await load()
        } catch (err: any) {
            alert("Erro ao copiar grade global: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Grade Curricular da Turma
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{classRoom.name} — sequência própria de disciplinas e meses de cobrança</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-10 text-sm text-muted-foreground">
                            Esta turma ainda não tem grade própria cadastrada.
                        </div>
                    ) : (
                        items.map((item, index) => {
                            const disc = disciplineById.get(item.disciplineId)
                            return (
                                <div key={item.id} className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl p-3">
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                        <button disabled={index === 0} onClick={() => moveItem(index, -1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">▲</button>
                                        <button disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">▼</button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">{disc?.name || "(disciplina removida do catálogo)"}</p>
                                    </div>
                                    <select
                                        className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background"
                                        value={item.applicationMonth || ""}
                                        onChange={(e) => handleUpdateItem(item, { applicationMonth: e.target.value })}
                                    >
                                        <option value="">Mês</option>
                                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                    <select
                                        className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background"
                                        value={item.applicationYear || ""}
                                        onChange={(e) => handleUpdateItem(item, { applicationYear: e.target.value })}
                                    >
                                        <option value="">Ano</option>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors shrink-0" title="Remover">
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </button>
                                </div>
                            )
                        })
                    )}

                    {showPicker && (
                        <div className="border border-border rounded-xl p-3 space-y-2 bg-background">
                            <div className="flex items-center gap-2 border border-input rounded-lg px-2">
                                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar disciplina no catálogo..."
                                    className="flex-1 text-sm py-1.5 bg-transparent focus:outline-none"
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {availableDisciplines.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-3">Nenhuma disciplina encontrada.</p>
                                ) : availableDisciplines.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => handleAddDiscipline(d.id)}
                                        className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                                    >
                                        {d.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 p-5 border-t border-border">
                    <button
                        onClick={handleCopyGlobal}
                        disabled={saving}
                        className="flex items-center gap-2 text-xs font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                    >
                        <Copy className="h-3.5 w-3.5" /> Copiar da Grade Global
                    </button>
                    <button
                        onClick={() => setShowPicker(v => !v)}
                        disabled={saving}
                        className="flex items-center gap-2 text-xs font-bold bg-accent text-accent-foreground px-3 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-60"
                    >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Disciplina
                    </button>
                </div>
            </div>
        </div>
    )
}
