"use client"

import { useState, useEffect, useCallback } from "react"
import { getDisciplines, type Discipline, getEadLessons, type EadLesson, addEadLesson, updateEadLesson, deleteEadLesson } from "@/lib/store"
import { PlaySquare, Plus, Trash2, Pencil, Save, X, Loader2, Video, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EadManager() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [lessons, setLessons] = useState<EadLesson[]>([])
    
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    
    const [formTitle, setFormTitle] = useState("")
    const [formUrl, setFormUrl] = useState("")
    const [formDescription, setFormDescription] = useState("")
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
            if (editingId) {
                await updateEadLesson(editingId, {
                    title: formTitle.trim(),
                    videoUrl: formUrl.trim(),
                    description: formDescription.trim(),
                    disciplineId: selectedDisciplineId
                })
            } else {
                await addEadLesson({
                    title: formTitle.trim(),
                    videoUrl: formUrl.trim(),
                    description: formDescription.trim(),
                    disciplineId: selectedDisciplineId,
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
        setShowForm(true)
    }

    function closeForm() {
        setEditingId(null)
        setFormTitle("")
        setFormUrl("")
        setFormDescription("")
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
                    <p className="text-sm text-muted-foreground mt-1">Gerencie vídeos e conteúdos online por disciplina</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="mb-6">
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Selecione a Disciplina</label>
                    <select
                        className="w-full sm:w-1/2 border border-input rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        value={selectedDisciplineId}
                        onChange={e => setSelectedDisciplineId(e.target.value)}
                    >
                        <option value="none">-- Selecione --</option>
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
                                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                                disabled={showForm}
                            >
                                <Plus className="h-4 w-4" /> Nova Aula
                            </Button>
                        </div>

                        {showForm && (
                            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4 animate-in fade-in zoom-in-95">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-sm text-foreground">{editingId ? "Editar Aula" : "Cadastrar Nova Aula"}</h4>
                                    <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Título da Aula *</label>
                                        <input
                                            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
                                            placeholder="Ex: Aula 01 - Introdução"
                                            value={formTitle}
                                            onChange={e => setFormTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground block mb-1">URL do Vídeo (YouTube/Vimeo) *</label>
                                        <input
                                            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
                                            placeholder="https://youtu.be/..."
                                            value={formUrl}
                                            onChange={e => setFormUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Descrição Breve (Opcional)</label>
                                        <textarea
                                            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background min-h-[60px]"
                                            placeholder="Descreva sobre o que é esta aula..."
                                            value={formDescription}
                                            onChange={e => setFormDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={closeForm}>Cancelar</Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving || !formTitle || !formUrl}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Salvar Aula
                                    </Button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
                        ) : lessons.length === 0 ? (
                            <div className="bg-muted border border-border rounded-xl p-8 text-center">
                                <PlaySquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Nenhuma aula EAD cadastrada para esta disciplina.</p>
                                <Button variant="link" onClick={() => setShowForm(true)} className="text-accent mt-1">Cadastre a primeira aula</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {lessons.map(lesson => {
                                    const thumb = getYoutubeThumb(lesson.videoUrl)
                                    return (
                                        <div key={lesson.id} className="flex gap-4 border border-border rounded-xl p-3 bg-background shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="w-32 h-20 bg-muted rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
                                                {thumb ? (
                                                    <img src={thumb} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <Video className="h-8 w-8 text-muted-foreground/40" />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                                    <PlaySquare className="h-6 w-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="font-bold text-sm text-foreground truncate" title={lesson.title}>{lesson.title}</h4>
                                                    {lesson.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lesson.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(lesson)} className="p-1.5 hover:bg-accent/10 hover:text-accent rounded-md transition-colors">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(lesson.id)} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
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
