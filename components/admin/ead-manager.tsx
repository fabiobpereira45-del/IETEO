"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
    getDisciplines, type Discipline, getEadLessons, type EadLesson, 
    addEadLesson, updateEadLesson, deleteEadLesson,
    getLiveLessonTracking, type EadLiveTracking, uploadEadCover
} from "@/lib/store"
import { 
    PlaySquare, Plus, Trash2, Pencil, Save, X, Loader2, Video, 
    Calendar, Clock, Lock, CheckCircle2, AlertCircle, Radio, 
    Users, ExternalLink, RefreshCw, Printer, Timer, FileText,
    Image as ImageIcon, Upload, Sparkles, Wand2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"

// Sugestões de capas com estética teológica e acadêmica de alta resolução
const PRESET_COVERS = [
    { name: "Meet Ao Vivo (Oficial)", url: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=1200&q=80" },
    { name: "Teologia & Bíblia Sagrada", url: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80" },
    { name: "Hermenêutica & Estudos", url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80" },
    { name: "História da Igreja", url: "https://images.unsplash.com/photo-1548625361-19597237000d?auto=format&fit=crop&w=1200&q=80" },
    { name: "Liderança & Ministério", url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80" },
]

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

function formatMinutes(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}min ${secs > 0 ? `${secs}s` : ''}`
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
        label: lesson.lessonType === 'live_meet' ? "Sala Ao Vivo Disponível" : "Disponível (Sem prazo)",
        color: "bg-emerald-100 text-emerald-800 border-emerald-300"
    }
}

export function EadManager() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [lessons, setLessons] = useState<EadLesson[]>([])
    
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    
    // Form fields
    const [formLessonType, setFormLessonType] = useState<'recorded' | 'live_meet'>('recorded')
    const [formTitle, setFormTitle] = useState("")
    const [formUrl, setFormUrl] = useState("")
    const [formMeetUrl, setFormMeetUrl] = useState("")
    const [formCoverUrl, setFormCoverUrl] = useState("")
    const [uploadingCover, setUploadingCover] = useState(false)
    const coverFileInputRef = useRef<HTMLInputElement>(null)
    const [formMinMinutes, setFormMinMinutes] = useState("0")
    const [formDescription, setFormDescription] = useState("")
    const [formAvailableFrom, setFormAvailableFrom] = useState("")
    const [formAvailableUntil, setFormAvailableUntil] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)

    // Tracking Modal State
    const [selectedTrackingLesson, setSelectedTrackingLesson] = useState<EadLesson | null>(null)
    const [trackingList, setTrackingList] = useState<EadLiveTracking[]>([])
    const [loadingTracking, setLoadingTracking] = useState(false)

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

    // Load Live Session Tracking Report
    const openTrackingModal = async (lesson: EadLesson) => {
        setSelectedTrackingLesson(lesson)
        setLoadingTracking(true)
        try {
            const data = await getLiveLessonTracking(lesson.id)
            setTrackingList(data)
        } finally {
            setLoadingTracking(false)
        }
    }

    const refreshTracking = async () => {
        if (!selectedTrackingLesson) return
        setLoadingTracking(true)
        try {
            const data = await getLiveLessonTracking(selectedTrackingLesson.id)
            setTrackingList(data)
        } finally {
            setLoadingTracking(false)
        }
    }

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione um arquivo de imagem válido.")
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.")
            return
        }

        try {
            setUploadingCover(true)
            const publicUrl = await uploadEadCover(file)
            setFormCoverUrl(publicUrl)
            toast.success("Capa da aula carregada com sucesso!")
        } catch (err: any) {
            console.error("Erro no upload da capa:", err)
            toast.error("Erro ao enviar imagem: " + (err.message || "Tente novamente"))
        } finally {
            setUploadingCover(false)
            if (coverFileInputRef.current) {
                coverFileInputRef.current.value = ""
            }
        }
    }

    // Extract Video ID to show a small thumbnail if it's youtube
    function getYoutubeThumb(url: string) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
        if (match && match[1]) {
            return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
        }
        return null
    }

    function handleCaptureYoutubeThumb() {
        const thumb = getYoutubeThumb(formUrl)
        if (thumb) {
            setFormCoverUrl(thumb)
            toast.success("Thumbnail do YouTube aplicada como capa!")
        } else {
            toast.error("Não foi possível extrair a thumbnail do link do YouTube informado.")
        }
    }

    async function handleSave() {
        const finalUrl = formLessonType === 'live_meet' ? formMeetUrl.trim() : formUrl.trim()
        if (!formTitle.trim()) {
            alert("Por favor, preencha o título da aula.")
            return
        }
        if (!finalUrl) {
            alert(formLessonType === 'live_meet' ? "Por favor, insira o link da sala Google Meet." : "Por favor, insira o link do vídeo.")
            return
        }
        if (selectedDisciplineId === "none") {
            alert("Por favor, selecione uma disciplina primeiro.")
            return
        }

        setSaving(true)
        try {
            const payload = {
                title: formTitle.trim(),
                videoUrl: finalUrl,
                meetUrl: formLessonType === 'live_meet' ? finalUrl : undefined,
                coverUrl: formCoverUrl.trim() || undefined,
                lessonType: formLessonType,
                minMinutesForPresence: parseInt(formMinMinutes, 10) || 0,
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
        } catch (err: any) {
            console.error("Erro ao salvar aula EAD:", err)
            alert("Erro ao salvar aula: " + (err.message || "Erro desconhecido"))
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir esta aula?")) return
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
        setFormLessonType(lesson.lessonType || 'recorded')
        setFormTitle(lesson.title)
        if (lesson.lessonType === 'live_meet') {
            setFormMeetUrl(lesson.meetUrl || lesson.videoUrl)
            setFormUrl("")
        } else {
            setFormUrl(lesson.videoUrl)
            setFormMeetUrl("")
        }
        setFormCoverUrl(lesson.coverUrl || "")
        setFormMinMinutes(String(lesson.minMinutesForPresence || 0))
        setFormDescription(lesson.description || "")
        setFormAvailableFrom(formatDateTimeForInput(lesson.availableFrom))
        setFormAvailableUntil(formatDateTimeForInput(lesson.availableUntil))
        setShowForm(true)
    }

    function closeForm() {
        setEditingId(null)
        setFormLessonType('recorded')
        setFormTitle("")
        setFormUrl("")
        setFormMeetUrl("")
        setFormCoverUrl("")
        setFormMinMinutes("0")
        setFormDescription("")
        setFormAvailableFrom("")
        setFormAvailableUntil("")
        setShowForm(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground">Aulas Online & Salas Virtuais (EAD)</h2>
                    <p className="text-sm text-muted-foreground mt-1">Gerencie vídeo-aulas gravadas, links Google Meet ao vivo e frequência automática por disciplina</p>
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
                                <Video className="h-4 w-4 text-accent" /> Aulas e Salas Cadastradas
                            </h3>
                            <Button 
                                onClick={() => setShowForm(true)} 
                                size="sm" 
                                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 font-bold shadow-sm"
                                disabled={showForm}
                            >
                                <Plus className="h-4 w-4" /> Nova Aula / Sala Ao Vivo
                            </Button>
                        </div>

                        {showForm && (
                            <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in zoom-in-95">
                                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                                    <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                                        <PlaySquare className="h-4 w-4 text-accent" />
                                        {editingId ? "Editar Aula / Sala" : "Cadastrar Nova Aula"}
                                    </h4>
                                    <button onClick={closeForm} className="text-muted-foreground hover:text-foreground p-1 rounded-md">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Toggle Type: Recorded vs Google Meet */}
                                <div>
                                    <label className="text-xs font-bold text-foreground block mb-1.5">Tipo de Formato da Aula</label>
                                    <div className="grid grid-cols-2 gap-3 max-w-md">
                                        <button
                                            type="button"
                                            onClick={() => setFormLessonType('recorded')}
                                            className={`p-3 rounded-xl border flex items-center gap-2.5 text-sm font-semibold transition-all ${
                                                formLessonType === 'recorded'
                                                    ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                                                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Video className="h-4 w-4 text-blue-600" />
                                            Vídeo Gravado (YouTube)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormLessonType('live_meet')}
                                            className={`p-3 rounded-xl border flex items-center gap-2.5 text-sm font-semibold transition-all ${
                                                formLessonType === 'live_meet'
                                                    ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300 shadow-sm'
                                                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Radio className="h-4 w-4 text-rose-600 animate-pulse" />
                                            🔴 Google Meet Ao Vivo
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-foreground block mb-1">Título da Aula *</label>
                                        <input
                                            className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                            placeholder={formLessonType === 'live_meet' ? "Ex: Aula Ao Vivo 01 - Hermenêutica Bíblica Aplicada" : "Ex: Aula 01 - Introdução às Seitas"}
                                            value={formTitle}
                                            onChange={e => setFormTitle(e.target.value)}
                                        />
                                    </div>

                                    {formLessonType === 'live_meet' ? (
                                        <>
                                            <div className="md:col-span-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <label className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2 mb-1">
                                                        <Radio className="h-4 w-4 text-rose-600" />
                                                        Link da Sala Virtual Google Meet *
                                                    </label>
                                                    <input
                                                        className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                                                        placeholder="https://meet.google.com/abc-defg-hij"
                                                        value={formMeetUrl}
                                                        onChange={e => setFormMeetUrl(e.target.value)}
                                                    />
                                                    <p className="text-[11px] text-muted-foreground mt-1">Cole o link gerado no Google Meet para esta aula ao vivo.</p>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-foreground block mb-1">
                                                        Regra de Validação da Presença Automática
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="180"
                                                            className="w-28 border border-input rounded-xl px-3 py-1.5 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none font-medium"
                                                            value={formMinMinutes}
                                                            onChange={e => setFormMinMinutes(e.target.value)}
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {parseInt(formMinMinutes, 10) <= 0 
                                                                ? "minutos (0 = Presença imediata ao entrar na sala)" 
                                                                : `minutos mínimos conectado para validar presença`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-semibold text-foreground block mb-1">URL do Vídeo (YouTube ou Vimeo) *</label>
                                            <input
                                                className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                                placeholder="https://youtu.be/..."
                                                value={formUrl}
                                                onChange={e => setFormUrl(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {/* Capa Personalizada da Aula (Thumbnail) */}
                                    <div className="md:col-span-2 bg-gradient-to-r from-amber-500/5 via-primary/5 to-transparent border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-4 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <label className="text-xs font-bold text-foreground flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                Capa Personalizada / Banner da Aula (Thumbnail)
                                            </label>
                                            {formCoverUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormCoverUrl("")}
                                                    className="text-[11px] text-destructive hover:underline font-semibold flex items-center gap-1"
                                                >
                                                    <X className="h-3 w-3" /> Remover Capa
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                                            {/* Preview da Capa */}
                                            <div className="sm:col-span-4 aspect-video bg-black/40 rounded-xl overflow-hidden relative border border-border/80 flex items-center justify-center group shadow-sm">
                                                {formCoverUrl ? (
                                                    <>
                                                        <img src={formCoverUrl} alt="Capa da Aula" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                                                            <span className="text-[10px] font-bold text-white truncate max-w-full">
                                                                {formTitle || "Pré-visualização"}
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center p-3">
                                                        <ImageIcon className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                                                        <p className="text-[10px] text-muted-foreground font-medium">Sem capa vinculada</p>
                                                        <p className="text-[9px] text-muted-foreground/70">(Usará padrão do vídeo/meet)</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Controles de Capa */}
                                            <div className="sm:col-span-8 space-y-2.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <input
                                                        type="file"
                                                        ref={coverFileInputRef}
                                                        onChange={handleCoverUpload}
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => coverFileInputRef.current?.click()}
                                                        disabled={uploadingCover}
                                                        className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-amber-500/30 hover:bg-amber-500/10 text-foreground"
                                                    >
                                                        {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-amber-600" />}
                                                        {uploadingCover ? "Enviando Imagem..." : "Upload de Imagem"}
                                                    </Button>

                                                    {formUrl && getYoutubeThumb(formUrl) && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleCaptureYoutubeThumb}
                                                            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400"
                                                        >
                                                            <Wand2 className="h-3.5 w-3.5" />
                                                            Usar Thumbnail do YouTube
                                                        </Button>
                                                    )}
                                                </div>

                                                <div>
                                                    <input
                                                        type="url"
                                                        placeholder="Ou cole a URL direta de uma imagem (https://...)"
                                                        value={formCoverUrl}
                                                        onChange={e => setFormCoverUrl(e.target.value)}
                                                        className="w-full border border-input rounded-xl px-3 py-1.5 text-xs bg-background focus:ring-2 focus:ring-accent focus:outline-none"
                                                    />
                                                </div>

                                                {/* Sugestões Rápidas de Capas */}
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                                                        <Sparkles className="h-3 w-3 text-amber-500" /> Banners Teológicos Sugeridos:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {PRESET_COVERS.map(preset => (
                                                            <button
                                                                key={preset.name}
                                                                type="button"
                                                                onClick={() => setFormCoverUrl(preset.url)}
                                                                className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-all ${
                                                                    formCoverUrl === preset.url
                                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-bold'
                                                                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                                                }`}
                                                            >
                                                                {preset.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data e Horário de Abertura */}
                                    <div className="bg-background border border-border/80 rounded-xl p-3 space-y-1.5">
                                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                            {formLessonType === 'live_meet' ? "Data e Horário de Início da Live" : "Data e Horário de Abertura"}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">Quando a aula ao vivo começará ou o vídeo será liberado</p>
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
                                            {formLessonType === 'live_meet' ? "Data e Horário de Encerramento" : "Data e Horário de Fechamento"}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">Quando a transmissão ao vivo ou o acesso ao vídeo se encerra</p>
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
                                        <label className="text-xs font-semibold text-foreground block mb-1">Descrição / Pauta da Aula (Opcional)</label>
                                        <textarea
                                            className="w-full border border-input rounded-xl px-3.5 py-2 text-sm bg-background min-h-[70px] focus:ring-2 focus:ring-accent focus:outline-none"
                                            placeholder="Informações adicionais, tópicos abordados ou orientações aos alunos..."
                                            value={formDescription}
                                            onChange={e => setFormDescription(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                                    <Button variant="outline" size="sm" onClick={closeForm} className="rounded-xl">Cancelar</Button>
                                    <Button 
                                        size="sm" 
                                        onClick={handleSave} 
                                        disabled={saving || !formTitle || (formLessonType === 'live_meet' ? !formMeetUrl : !formUrl)} 
                                        className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Salvar {formLessonType === 'live_meet' ? 'Sala Ao Vivo' : 'Aula'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
                        ) : lessons.length === 0 ? (
                            <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center">
                                <PlaySquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Nenhuma aula ou sala virtual cadastrada para esta disciplina.</p>
                                <Button variant="link" onClick={() => setShowForm(true)} className="text-accent mt-1 font-bold">Cadastre a primeira aula ou sala Google Meet</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {lessons.map(lesson => {
                                    const isLiveMeet = lesson.lessonType === 'live_meet' || (lesson.videoUrl && lesson.videoUrl.includes('meet.google.com'))
                                    const thumb = lesson.coverUrl || (!isLiveMeet ? getYoutubeThumb(lesson.videoUrl) : null)
                                    const statusInfo = getLessonAvailabilityStatus(lesson)

                                    return (
                                        <div key={lesson.id} className={`flex flex-col sm:flex-row gap-4 border rounded-2xl p-4 bg-background shadow-sm hover:shadow-md transition-shadow group relative ${
                                            isLiveMeet ? 'border-rose-200 dark:border-rose-900/40 bg-gradient-to-r from-rose-500/[0.02] to-transparent' : 'border-border'
                                        }`}>
                                            <div className={`w-full sm:w-36 h-24 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border shadow-xs ${
                                                thumb ? 'bg-black' : isLiveMeet ? 'bg-gradient-to-br from-rose-900 to-slate-900 border-rose-500/30' : 'bg-muted border-border/60'
                                            }`}>
                                                {thumb ? (
                                                    <>
                                                        <img src={thumb} alt={lesson.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                                                        {lesson.coverUrl && (
                                                            <span className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-amber-300 backdrop-blur-xs border border-amber-500/30 flex items-center gap-1">
                                                                <ImageIcon className="h-2.5 w-2.5" /> Capa
                                                            </span>
                                                        )}
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            {isLiveMeet ? (
                                                                <div className="h-8 w-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg">
                                                                    <Radio className="h-4 w-4 animate-pulse" />
                                                                </div>
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-black/60 group-hover:bg-primary text-white flex items-center justify-center transition-colors shadow-lg">
                                                                    <PlaySquare className="h-4 w-4 drop-shadow-md" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : isLiveMeet ? (
                                                    <div className="text-center p-2">
                                                        <Radio className="h-6 w-6 text-rose-400 mx-auto mb-1 animate-pulse" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-200">Meet Live</span>
                                                    </div>
                                                ) : (
                                                    <Video className="h-8 w-8 text-muted-foreground/40" />
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        {isLiveMeet ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                                                                <Radio className="h-3 w-3 text-rose-600 animate-pulse" /> Google Meet Ao Vivo
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 flex items-center gap-1">
                                                                <Video className="h-3 w-3 text-blue-600" /> Gravada
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm text-foreground truncate" title={lesson.title}>{lesson.title}</h4>
                                                    {lesson.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lesson.description}</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between mt-3 pt-2 border-t border-border/40 gap-2">
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                        {lesson.availableFrom && (
                                                            <span title="Início" className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3 text-emerald-600" />
                                                                {formatDisplayDate(lesson.availableFrom)}
                                                            </span>
                                                        )}
                                                        {lesson.availableUntil && (
                                                            <span title="Encerramento" className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3 text-rose-600" />
                                                                {formatDisplayDate(lesson.availableUntil)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1">
                                                        {isLiveMeet && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openTrackingModal(lesson)}
                                                                className="h-7 text-xs font-bold gap-1 rounded-lg border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                                            >
                                                                <Users className="h-3.5 w-3.5" />
                                                                Presenças & Tempo
                                                            </Button>
                                                        )}
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

            {/* Modal: Relatório de Presença e Tempo da Aula Ao Vivo */}
            <Dialog open={!!selectedTrackingLesson} onOpenChange={open => !open && setSelectedTrackingLesson(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-3xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <Radio className="h-5 w-5 text-rose-600 animate-pulse" />
                                    Relatório de Presença & Permanência Ao Vivo
                                </DialogTitle>
                                <DialogDescription className="mt-1">
                                    Aula: <strong className="text-foreground">{selectedTrackingLesson?.title}</strong>
                                </DialogDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={refreshTracking} 
                                disabled={loadingTracking}
                                className="rounded-xl gap-1.5"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loadingTracking ? 'animate-spin' : ''}`} />
                                Atualizar
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
                        {/* Summary metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-muted/40 border border-border rounded-2xl p-3.5 text-center">
                                <div className="text-xs text-muted-foreground font-semibold">Total de Alunos Acessaram</div>
                                <div className="text-2xl font-black text-foreground mt-1">{trackingList.length}</div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-center">
                                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Presenças Validadas</div>
                                <div className="text-2xl font-black text-emerald-600 mt-1">
                                    {trackingList.filter(t => t.isValidated).length}
                                </div>
                            </div>
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3.5 text-center">
                                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">Regra de Frequência</div>
                                <div className="text-sm font-bold text-indigo-600 mt-1.5">
                                    {(selectedTrackingLesson?.minMinutesForPresence || 0) > 0 
                                        ? `${selectedTrackingLesson?.minMinutesForPresence} min mínimos` 
                                        : "Imediata ao entrar"}
                                </div>
                            </div>
                        </div>

                        {loadingTracking ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 text-accent animate-spin" />
                            </div>
                        ) : trackingList.length === 0 ? (
                            <div className="bg-muted/20 border border-dashed border-border rounded-2xl p-10 text-center">
                                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                <h4 className="font-bold text-foreground text-sm">Nenhum aluno conectado até o momento</h4>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Os registros de entrada, saída e tempo de permanência aparecerão aqui em tempo real assim que os alunos acessarem a sala.
                                </p>
                            </div>
                        ) : (
                            <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/60 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3">Aluno</th>
                                            <th className="p-3">Entrada</th>
                                            <th className="p-3">Tempo Conectado</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">Frequência</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {trackingList.map(item => (
                                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-3 font-semibold text-foreground">
                                                    {item.studentName}
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {formatDisplayDate(item.joinedAt)}
                                                </td>
                                                <td className="p-3 font-mono font-bold text-foreground">
                                                    {formatMinutes(item.totalSeconds)}
                                                </td>
                                                <td className="p-3">
                                                    {item.status === 'online' ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                            Conectado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                            Desconectado
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {item.isValidated ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            Confirmada
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                            <Clock className="h-3 w-3 text-amber-600" />
                                                            Pendente
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
