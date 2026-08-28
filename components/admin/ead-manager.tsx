"use client"

import { useState, useEffect, useCallback } from "react"
import { getDisciplines, type Discipline, getEadLessons, type EadLesson, addEadLesson, updateEadLesson, deleteEadLesson } from "@/lib/store"
import { PlaySquare, Plus, Trash2, Pencil, Save, X, Loader2, Video, Calendar, Clock, Lock, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function formatDateTimeForInput(dateStr?: string | null): string {
    if (!dateStr) return ""
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ""
        const pad = (n: number) => n.toString().padStart(2, '0')
        const yyyy = d.getFullYear()
        const MM = pad(d.getMonth() + 1)
        const dd = pad(d.getDate())
        const hh = pad(d.getHours())
        const mm = pad(d.getMinutes())
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
    } catch {
        return ""
    }
}

function formatDisplayDate(dateStr?: string | null): string {
    if (!dateStr) return ""
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ""
        return d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    } catch {
        return ""
    }
}

function getLessonAvailabilityStatus(lesson: EadLesson): { status: "available" | "scheduled" | "expired"; label: string; color: string } {
    const now = new Date().getTime()
    if (lesson.availableFrom) {
        const from = new Date(lesson.availableFrom).getTime()
        if (!isNaN(from) && now < from) {
            return {
                status: "scheduled",
                label: `Abre em ${formatDisplayDate(lesson.availableFrom)}`,
                color: "bg-amber-100 text-amber-800 border-amber-300"
            }
        }
    }
    if (lesson.availableUntil) {
        const until = new Date(lesson.availableUntil).getTime()
        if (!isNaN(until) && now > until) {
            return {
                status: "expired",
                label: `Encerrada em ${formatDisplayDate(lesson.availableUntil)}`,
                color: "bg-rose-100 text-rose-800 border-rose-300"
            }
        }
        return {
            status: "available",
            label: `Disponível até ${formatDisplayDate(lesson.availableUntil)}`,
            color: "bg-emerald-100 text-emerald-800 border-emerald-300"
        }
    }
    return {
        status: "available",
        label: "Disponível (Sem prazo)",
        color: "bg-emerald-100 text-emerald-800 border-emerald-300"
    }
}

export function EadManager() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [lessons, setLessons] = useState<EadLesson[]>([])
    
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    
    const [formTitle, setFormTitle] = useState("")
    const [formUrl, setFormUrl] = useState("")
    const [formDescription, setFormDescription] = useState("")
    const [formAvailableFrom, setFormAvailableFrom] = useState("")
    const [formAvailableUntil, setFormAvailableUntil] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)

    useEffect(() => {
        getDisciplines().then(d => setDisciplines(d))
    }, [])

    const loadLessons = useCallback(async () => {
        if (selectedDisciplineId === "none") return
        setLoading(true)
        try {
            const data = await getEadLessons(selectedDisciplineId)
            setLessons(data)
        } finally {
            setLoading(false)
        }
    }, [selectedDisciplineId])

    useEffect(() => {
        loadLessons()
    }, [loadLessons])

    async function handleSave() {
        if (!formTitle.trim() || !formUrl.trim() || selectedDisciplineId === "none") return
        setSaving(true)
        try {
            const payload = {
                title: formTitle.trim(),
                videoUrl: formUrl.trim(),
                description: formDescription.trim(),
                disciplineId: selectedDisciplineId,
                availableFrom: formAvailableFrom ? new Date(formAvailableFrom).toISOString() : null,
                availableUntil: formAvailableUntil ? new Date(formAvailableUntil).toISOString() : null
            }

            if (editingId) {
                await updateEadLesson(editingId, payload)
            } else {
                await addEadLesson({
                    ...payload,
                    orderIndex: lessons.length
                })
            }
            closeForm()
            await loadLessons()
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir esta vídeo-aula?")) return
        setLoading(true)
        try {
            await deleteEadLesson(id)
            await loadLessons()
        } finally {
            setLoading(false)
        }
    }

    function openEdit(lesson: EadLesson) {
        setEditingId(lesson.id)
        setFormTitle(lesson.title)
        setFormUrl(lesson.videoUrl)
        setFormDescription(lesson.description || "")
        setFormAvailableFrom(formatDateTimeForInput(lesson.availableFrom))
        setFormAvailableUntil(formatDateTimeForInput(lesson.availableUntil))
        setShowForm(true)
    }

    function closeForm() {
        setEditingId(null)
        setFormTitle("")
        setFormUrl("")
        setFormDescription("")
        setFormAvailableFrom("")
        setFormAvailableUntil("")
        setShowForm(false)
    }

    // Extract Video ID to show a small thumbnail if it's youtube
    function getYoutubeThumb(url: string) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
        if (match && match[1]) {
            return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
        }
        return null
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground">Aulas Online (EAD)</h2>
                    <p className="text-sm text-muted-foreground mt-1">Gerencie vídeos, prazos de abertura e fechamento por disciplina</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="mb-6">
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Selecione a Disciplina</label>
                    <select
                        className="w-full sm:w-1/2 border border-input rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-accent font-medium text-foreground"
                        value={selectedDisciplineId}
                        onChange={e => setSelectedDisciplineId(e.target.value)}
                    >
                        <option value="none">-- Selecione a Disciplina --</option>
                        {disciplines.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.semesterName})</option>
                        ))}
                    </select>
                </div>

                {selectedDisciplineId !== "none" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Video className="h-4 w-4 text-accent" /> Vídeos Cadastrados
                            </h3>
                            <Button 
                                onClick={() => setShowForm(true)} 
                                size="sm" 
                                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 font-bold shadow-sm"
                                disabled={showForm}
                            >
                                <Plus className="h-4 w-4" /> Nova Aula
                            </Button>
                        </div>

                        {showForm && (
                            <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in zoom-in-95">
                                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                                    <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                                        <PlaySquare className="h-4 w-4 text-accent" />
                                        {editingId ? "Editar Vídeo-Aula" : "Cadastrar Nova Vídeo-Aula"}
                                    </h4>
                                    <button onClick={closeForm} className="text-muted-foreground hover:text-foreground p-1 rounded-md">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-foreground block mb-1">Título da Aula *</label>
                                        <input
                                            className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                            placeholder="Ex: Aula 01 - Introdução às Seitas"
                                            value={formTitle}
                                            onChange={e => setFormTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-foreground block mb-1">URL do Vídeo (YouTube ou Vimeo) *</label>
                                        <input
                                            className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                            placeholder="https://youtu.be/..."
                                            value={formUrl}
                                            onChange={e => setFormUrl(e.target.value)}
                                        />
                                    </div>

                                    {/* Data e Horário de Abertura */}
                                    <div className="bg-background border border-border/80 rounded-xl p-3 space-y-1.5">
                                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                            Data e Horário de Abertura
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">Quando a aula será liberada para o aluno assistir</p>
                                        <input
                                            type="datetime-local"
                                            className="w-full border border-input rounded-lg px-3 py-1.5 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                            value={formAvailableFrom}
                                            onChange={e => setFormAvailableFrom(e.target.value)}
                                        />
                                        {formAvailableFrom && (
                                            <button 
                                                type="button"
                                                onClick={() => setFormAvailableFrom("")} 
                                                className="text-[11px] text-muted-foreground hover:text-destructive underline pt-0.5"
                                            >
                                                Limpar (Liberar Imediatamente)
                                            </button>
                                        )}
                                    </div>

                                    {/* Data e Horário de Fechamento */}
                                    <div className="bg-background border border-border/80 rounded-xl p-3 space-y-1.5">
                                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-rose-600" />
                                            Data e Horário de Fechamento
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">Quando o acesso à aula será bloqueado/encerrado</p>
                                        <input
                                            type="datetime-local"
                                            className="w-full border border-input rounded-lg px-3 py-1.5 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                            value={formAvailableUntil}
                                            onChange={e => setFormAvailableUntil(e.target.value)}
                                        />
                                        {formAvailableUntil && (
                                            <button 
                                                type="button"
                                                onClick={() => setFormAvailableUntil("")} 
                                                className="text-[11px] text-muted-foreground hover:text-destructive underline pt-0.5"
                                            >
                                                Limpar (Sem Prazo de Fechamento)
                                            </button>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-foreground block mb-1">Descrição / Instruções da Aula (Opcional)</label>
                                        <textarea
                                            className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background min-h-[70px] focus:ring-2 focus:ring-accent focus:outline-none"
                                            placeholder="Informações adicionais, leituras complementares ou resumo..."
                                            value={formDescription}
                                            onChange={e => setFormDescription(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                                    <Button variant="outline" size="sm" onClick={closeForm} className="rounded-xl">Cancelar</Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving || !formTitle || !formUrl} className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Salvar Aula
                                    </Button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
                        ) : lessons.length === 0 ? (
                            <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center">
                                <PlaySquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Nenhuma aula EAD cadastrada para esta disciplina.</p>
                                <Button variant="link" onClick={() => setShowForm(true)} className="text-accent mt-1 font-bold">Cadastre a primeira aula</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {lessons.map(lesson => {
                                    const thumb = getYoutubeThumb(lesson.videoUrl)
                                    const statusInfo = getLessonAvailabilityStatus(lesson)

                                    return (
                                        <div key={lesson.id} className="flex flex-col sm:flex-row gap-4 border border-border rounded-2xl p-4 bg-background shadow-sm hover:shadow-md transition-shadow group relative">
                                            <div className="w-full sm:w-36 h-24 bg-muted rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-border/60">
                                                {thumb ? (
                                                    <img src={thumb} alt="Thumbnail" className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <Video className="h-8 w-8 text-muted-foreground/40" />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                                                    <PlaySquare className="h-7 w-7 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm text-foreground truncate" title={lesson.title}>{lesson.title}</h4>
                                                    {lesson.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lesson.description}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                        {lesson.availableFrom && (
                                                            <span title="Abertura" className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3 text-emerald-600" />
                                                                {formatDisplayDate(lesson.availableFrom)}
                                                            </span>
                                                        )}
                                                        {lesson.availableUntil && (
                                                            <span title="Fechamento" className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3 text-rose-600" />
                                                                {formatDisplayDate(lesson.availableUntil)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => openEdit(lesson)} 
                                                            title="Editar aula"
                                                            className="p-1.5 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(lesson.id)} 
                                                            title="Excluir aula"
                                                            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
