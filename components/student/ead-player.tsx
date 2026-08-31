"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
    getEadLessons, type EadLesson, getDisciplines, type Discipline,
    recordLiveSessionJoin, pingLiveSessionHeartbeat
} from "@/lib/store"
import { 
    PlaySquare, Video, Loader2, PlayCircle, BookOpen, Clock, 
    ChevronRight, Lock, Calendar, AlertCircle, Radio, ExternalLink, 
    CheckCircle2, Users, Timer, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
    myDisciplineIds?: Set<string>
    studentId?: string
    studentName?: string
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

function getLessonStatus(lesson: EadLesson): { status: "available" | "scheduled" | "expired"; label: string } {
    const now = new Date().getTime()
    if (lesson.availableFrom) {
        const from = new Date(lesson.availableFrom).getTime()
        if (!isNaN(from) && now < from) {
            return {
                status: "scheduled",
                label: `Disponível em ${formatDisplayDate(lesson.availableFrom)}`
            }
        }
    }
    if (lesson.availableUntil) {
        const until = new Date(lesson.availableUntil).getTime()
        if (!isNaN(until) && now > until) {
            return {
                status: "expired",
                label: `Encerrada em ${formatDisplayDate(lesson.availableUntil)}`
            }
        }
        return {
            status: "available",
            label: `Disponível até ${formatDisplayDate(lesson.availableUntil)}`
        }
    }
    return {
        status: "available",
        label: lesson.lessonType === 'live_meet' ? "Ao Vivo / Disponível" : "Disponível"
    }
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Extract Video ID to show a thumbnail if it's youtube
function getYoutubeThumb(url: string) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    if (match && match[1]) {
        return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }
    return null
}

export function EadPlayer({ myDisciplineIds, studentId, studentName }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [lessons, setLessons] = useState<EadLesson[]>([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [activeLesson, setActiveLesson] = useState<EadLesson | null>(null)
    const [viewMode, setViewMode] = useState<"player" | "gallery">("player")

    // Live Tracking State
    const [trackingId, setTrackingId] = useState<string | null>(null)
    const [connectedSeconds, setConnectedSeconds] = useState<number>(0)
    const [isAttendanceValidated, setIsAttendanceValidated] = useState<boolean>(false)
    const [isLiveActive, setIsLiveActive] = useState<boolean>(false)
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        let isMounted = true
        getDisciplines().then(all => {
            if (!isMounted) return
            const filtered = (myDisciplineIds && myDisciplineIds.size > 0)
                ? all.filter(d => myDisciplineIds.has(d.id))
                : all
            const listToUse = filtered.length > 0 ? filtered : all
            setDisciplines(listToUse)
            setInitialLoading(false)

            if (listToUse.length > 0) {
                setSelectedDisciplineId(prev => {
                    if (prev === "none" || !listToUse.some(d => d.id === prev)) {
                        return listToUse[0].id
                    }
                    return prev
                })
            }
        }).catch(err => {
            console.error("Erro ao carregar disciplinas EAD:", err)
            if (isMounted) setInitialLoading(false)
        })
        return () => { isMounted = false }
    }, [myDisciplineIds])

    // Cleanup heartbeat & timer when changing lesson or unmounting
    const stopLiveSession = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current)
            heartbeatRef.current = null
        }
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        setIsLiveActive(false)
    }, [])

    useEffect(() => {
        return () => {
            stopLiveSession()
        }
    }, [stopLiveSession])

    const loadLessons = useCallback(async () => {
        stopLiveSession()
        setTrackingId(null)
        setConnectedSeconds(0)
        setIsAttendanceValidated(false)

        if (selectedDisciplineId === "none") {
            setLessons([])
            setActiveLesson(null)
            return
        }
        setLoading(true)
        try {
            const data = await getEadLessons(selectedDisciplineId)
            setLessons(data)
            if (data.length > 0) {
                // Find first available lesson or fallback to first
                const firstAvail = data.find(l => getLessonStatus(l).status === "available") || data[0]
                setActiveLesson(firstAvail)
            } else {
                setActiveLesson(null)
            }
        } finally {
            setLoading(false)
        }
    }, [selectedDisciplineId, stopLiveSession])

    useEffect(() => {
        loadLessons()
    }, [loadLessons])

    // Handler when changing active lesson
    const handleSelectLesson = (lesson: EadLesson) => {
        stopLiveSession()
        setTrackingId(null)
        setConnectedSeconds(0)
        setIsAttendanceValidated(false)
        setActiveLesson(lesson)
        setViewMode("player")
    }

    // Handler for entering Google Meet live classroom
    const handleJoinMeet = async () => {
        if (!activeLesson) return
        const meetUrl = activeLesson.meetUrl || activeLesson.videoUrl
        if (!meetUrl) return

        // 1. Open Google Meet in new window
        window.open(meetUrl, "_blank", "noopener,noreferrer")

        // 2. Start local session tracking & backend heartbeat
        setIsLiveActive(true)
        const dateStr = activeLesson.liveDate || (activeLesson.availableFrom ? activeLesson.availableFrom.substring(0, 10) : new Date().toISOString().substring(0, 10))
        const minMins = activeLesson.minMinutesForPresence || 0

        try {
            const sId = studentId || "aluno_demo"
            const sName = studentName || "Aluno Matriculado"
            const result = await recordLiveSessionJoin(
                activeLesson.id,
                sId,
                sName,
                selectedDisciplineId,
                dateStr,
                minMins
            )
            setTrackingId(result.trackingId)
            setConnectedSeconds(result.totalSeconds)
            setIsAttendanceValidated(result.isValidated)

            // Local 1-second UI display timer
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
                setConnectedSeconds(prev => prev + 1)
            }, 1000)

            // 30-second Heartbeat to sync with DB
            if (heartbeatRef.current) clearInterval(heartbeatRef.current)
            heartbeatRef.current = setInterval(async () => {
                if (result.trackingId) {
                    try {
                        const pingRes = await pingLiveSessionHeartbeat(
                            result.trackingId,
                            30,
                            sId,
                            selectedDisciplineId,
                            dateStr,
                            minMins
                        )
                        if (pingRes.isValidated) {
                            setIsAttendanceValidated(true)
                        }
                    } catch (e) {
                        console.warn("Heartbeat ping error:", e)
                    }
                }
            }, 30000)
        } catch (err) {
            console.error("Error joining live session:", err)
        }
    }

    // Convert youtube URL to embed URL
    function getEmbedUrl(url: string) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
        }
        return url
    }

    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center bg-white border border-border rounded-3xl shadow-sm">
                <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Carregando ambiente de aulas online...</p>
            </div>
        )
    }

    if (disciplines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white border border-border rounded-3xl shadow-sm">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Video className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Aulas EAD Indisponíveis</h3>
                <p className="text-muted-foreground max-w-md">Nenhuma disciplina cadastrada encontrada para o seu curso no momento.</p>
            </div>
        )
    }

    const activeStatus = activeLesson ? getLessonStatus(activeLesson) : null
    const isLiveMeet = activeLesson?.lessonType === 'live_meet' || (activeLesson?.videoUrl && activeLesson.videoUrl.includes('meet.google.com'))

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                        <PlaySquare className="h-5 w-5 text-accent" />
                        Ambiente de Aulas EAD & Salas Ao Vivo
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Acesse vídeo-aulas gravadas e salas ao vivo Google Meet com frequência automática.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 shrink-0">
                        <button
                            onClick={() => setViewMode("player")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                viewMode === "player"
                                    ? "bg-white text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            ▶ Player
                        </button>
                        <button
                            onClick={() => setViewMode("gallery")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                viewMode === "gallery"
                                    ? "bg-white text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            ⊞ Grade de Capas
                        </button>
                    </div>

                    <div className="w-full sm:w-72">
                        <select
                            className="w-full border border-input rounded-xl px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm font-medium"
                            value={selectedDisciplineId}
                            onChange={e => setSelectedDisciplineId(e.target.value)}
                        >
                            <option value="none">-- Selecione a Disciplina --</option>
                            {disciplines.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.semesterName})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedDisciplineId !== "none" && (
                <>
                    {/* Modo Grade de Capas (Catálogo Visual) */}
                    {viewMode === "gallery" ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" /> Catálogo de Aulas da Disciplina
                                </h4>
                                <span className="text-xs text-muted-foreground font-medium">{lessons.length} aulas disponíveis</span>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-accent animate-spin" /></div>
                            ) : lessons.length === 0 ? (
                                <div className="aspect-video bg-muted/40 rounded-2xl flex flex-col items-center justify-center border border-dashed border-border p-8 text-center">
                                    <Video className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                    <p className="text-sm font-medium text-muted-foreground">Nenhuma aula cadastrada nesta disciplina.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                    {lessons.map((lesson, idx) => {
                                        const status = getLessonStatus(lesson)
                                        const isLocked = status.status === "scheduled"
                                        const isExpired = status.status === "expired"
                                        const isLessonLive = lesson.lessonType === 'live_meet' || (lesson.videoUrl && lesson.videoUrl.includes('meet.google.com'))
                                        const thumb = lesson.coverUrl || (!isLessonLive ? getYoutubeThumb(lesson.videoUrl) : null)

                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => !isLocked && !isExpired && handleSelectLesson(lesson)}
                                                className={`group relative bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col ${
                                                    isLocked || isExpired ? 'opacity-80 cursor-not-allowed border-border' : 'cursor-pointer hover:-translate-y-1 border-border/80 hover:border-accent/40'
                                                }`}
                                            >
                                                {/* Capa com Proporção 16:9 */}
                                                <div className={`aspect-video w-full relative overflow-hidden flex items-center justify-center ${
                                                    thumb ? 'bg-black' : isLessonLive ? 'bg-gradient-to-br from-rose-900 to-slate-900' : 'bg-muted'
                                                }`}>
                                                    {thumb ? (
                                                        <>
                                                            <img src={thumb} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                        </>
                                                    ) : isLessonLive ? (
                                                        <div className="text-center p-4">
                                                            <Radio className="h-8 w-8 text-rose-400 mx-auto mb-1 animate-pulse" />
                                                            <span className="text-xs font-black uppercase tracking-wider text-rose-200">Google Meet Live</span>
                                                        </div>
                                                    ) : (
                                                        <Video className="h-10 w-10 text-muted-foreground/40" />
                                                    )}

                                                    {/* Badge de Formato no Topo */}
                                                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                                        {isLessonLive ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-md">
                                                                <Radio className="h-3 w-3 animate-pulse" /> Ao Vivo
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-md">
                                                                <Video className="h-3 w-3" /> Vídeo-Aula
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white/90 backdrop-blur-xs border border-white/10">
                                                            Aula {idx + 1}
                                                        </span>
                                                    </div>

                                                    {/* Botão de Play Central */}
                                                    {!isLocked && !isExpired && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px]">
                                                            <div className="h-12 w-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                                                                <PlayCircle className="h-6 w-6" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isLocked && (
                                                        <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                                                            <Lock className="h-6 w-6 text-amber-300 mb-1" />
                                                            <span className="text-[11px] font-bold text-amber-200">Abre em breve</span>
                                                        </div>
                                                    )}

                                                    {isExpired && (
                                                        <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                                                            <Clock className="h-6 w-6 text-rose-300 mb-1" />
                                                            <span className="text-[11px] font-bold text-rose-200">Encerrada</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Detalhes do Card */}
                                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                                    <div>
                                                        <h5 className="font-bold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-accent transition-colors" title={lesson.title}>
                                                            {lesson.title}
                                                        </h5>
                                                        {lesson.description && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                                                                {lesson.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                                                        <span className="text-muted-foreground font-medium">{status.label}</span>
                                                        <span className="font-bold text-accent group-hover:underline flex items-center gap-1">
                                                            Acessar <ChevronRight className="h-3.5 w-3.5" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Modo Player Principal + Playlist */
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Player Area */}
                            <div className="flex-1 space-y-4">
                                {loading ? (
                                    <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center border border-border shadow-sm">
                                        <Loader2 className="h-10 w-10 text-accent animate-spin" />
                                    </div>
                                ) : activeLesson && activeStatus ? (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                        {activeStatus.status === "scheduled" ? (
                                            /* Locked Placeholder */
                                            <div className="aspect-video bg-amber-950/10 border-2 border-dashed border-amber-400/50 rounded-2xl flex flex-col items-center justify-center text-center p-6 sm:p-10 shadow-sm">
                                                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-700 shadow-sm">
                                                    <Lock className="h-8 w-8" />
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">
                                                    {isLiveMeet ? "Sala Virtual Ainda Não Liberada" : "Aula Ainda Não Disponível"}
                                                </h3>
                                                <p className="text-sm text-amber-800/90 max-w-md mb-3">
                                                    {isLiveMeet ? "A transmissão da aula ao vivo está agendada para:" : "Esta aula está agendada para ser liberada em:"}
                                                </p>
                                                <div className="inline-flex items-center gap-2 bg-amber-100/90 border border-amber-300 px-4 py-2 rounded-xl text-sm font-bold text-amber-900">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDisplayDate(activeLesson.availableFrom)}
                                                </div>
                                            </div>
                                        ) : activeStatus.status === "expired" ? (
                                            /* Expired Placeholder */
                                            <div className="aspect-video bg-rose-950/10 border-2 border-dashed border-rose-400/50 rounded-2xl flex flex-col items-center justify-center text-center p-6 sm:p-10 shadow-sm">
                                                <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-700 shadow-sm">
                                                    <Clock className="h-8 w-8" />
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-rose-900 mb-2">
                                                    {isLiveMeet ? "Transmissão Ao Vivo Encerrada" : "Prazo de Acesso Encerrado"}
                                                </h3>
                                                <p className="text-sm text-rose-800/90 max-w-md mb-3">
                                                    O período para participar desta aula expirou em:
                                                </p>
                                                <div className="inline-flex items-center gap-2 bg-rose-100/90 border border-rose-300 px-4 py-2 rounded-xl text-sm font-bold text-rose-900">
                                                    <Clock className="h-4 w-4" />
                                                    {formatDisplayDate(activeLesson.availableUntil)}
                                                </div>
                                            </div>
                                        ) : isLiveMeet ? (
                                            /* Live Google Meet Classroom Hub with Custom Cover Backdrop */
                                            <div className="rounded-3xl p-6 sm:p-10 shadow-xl border border-indigo-500/20 relative overflow-hidden bg-slate-950 text-white min-h-[420px] flex flex-col justify-center">
                                                {/* Capa de Fundo com Blur Elegante se existir */}
                                                {activeLesson.coverUrl ? (
                                                    <>
                                                        <img 
                                                            src={activeLesson.coverUrl} 
                                                            alt={activeLesson.title} 
                                                            className="absolute inset-0 w-full h-full object-cover opacity-35 blur-[1px] scale-105" 
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/60" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                                                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                                                    </>
                                                )}

                                                <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-5">
                                                    {/* Live Status Badge */}
                                                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider animate-pulse">
                                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                                                        <Radio className="h-4 w-4 text-rose-400" />
                                                        Transmissão Ao Vivo (Google Meet)
                                                    </div>

                                                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                                                        {activeLesson.title}
                                                    </h2>

                                                    {activeLesson.description && (
                                                        <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-lg">
                                                            {activeLesson.description}
                                                        </p>
                                                    )}

                                                    {/* Attendance Rule Card */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-left shadow-lg">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-200">Registro de Presença</div>
                                                                <div className="text-xs text-slate-400 mt-0.5">
                                                                    {(activeLesson.minMinutesForPresence || 0) > 0 
                                                                        ? `Permaneça ${activeLesson.minMinutesForPresence} min para validar frequência` 
                                                                        : "Frequência registrada automaticamente ao entrar"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                                                                <Timer className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-200">Monitor de Permanência</div>
                                                                <div className="text-xs text-slate-400 mt-0.5">
                                                                    Tempo ativo contabilizado e sincronizado com o sistema
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Live Session Counter when Active */}
                                                    {isLiveActive && (
                                                        <div className="w-full bg-emerald-950/60 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center gap-3 text-left">
                                                                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                                                                <div>
                                                                    <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Sessão Conectada</div>
                                                                    <div className="text-lg font-black text-white font-mono">
                                                                        {formatDuration(connectedSeconds)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                {isAttendanceValidated ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                                                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                                        Presença Confirmada no Sistema
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium">
                                                                        <Clock className="h-4 w-4 text-amber-400 animate-spin" />
                                                                        Contabilizando minutos para validar presença...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Button */}
                                                    <div className="pt-2">
                                                        <Button
                                                            size="lg"
                                                            onClick={handleJoinMeet}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base px-8 py-6 rounded-2xl shadow-lg shadow-emerald-900/40 hover:shadow-emerald-700/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
                                                        >
                                                            <ExternalLink className="h-5 w-5" />
                                                            {isLiveActive ? "Reabrir Sala Google Meet" : "Acessar Sala Virtual Google Meet"}
                                                        </Button>
                                                    </div>

                                                    <p className="text-[11px] text-slate-400">
                                                        A sala será aberta em uma nova aba do Google Meet. Mantenha esta página aberta para registrar seu tempo total de aula.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Active Video Player for Recorded Lessons */
                                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-border ring-1 ring-black/5">
                                                <iframe 
                                                    src={getEmbedUrl(activeLesson.videoUrl)} 
                                                    title={activeLesson.title}
                                                    className="w-full h-full border-0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        )}

                                        <div className="bg-white p-5 md:p-6 rounded-2xl border border-border shadow-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2">
                                                    {isLiveMeet ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
                                                            <Radio className="h-3 w-3" /> Aula Ao Vivo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">
                                                            <Video className="h-3 w-3" /> Vídeo-Aula Gravada
                                                        </span>
                                                    )}
                                                    <h2 className="text-xl font-bold text-foreground">{activeLesson.title}</h2>
                                                </div>
                                                {activeLesson.availableUntil && activeStatus.status === "available" && (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        <Clock className="h-3 w-3" />
                                                        Disponível até {formatDisplayDate(activeLesson.availableUntil)}
                                                    </span>
                                                )}
                                            </div>
                                            {activeLesson.description ? (
                                                <p className="text-muted-foreground text-sm leading-relaxed">{activeLesson.description}</p>
                                            ) : (
                                                <p className="text-muted-foreground text-sm italic">Nenhuma descrição fornecida para esta aula.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-muted/50 rounded-2xl flex flex-col items-center justify-center border border-dashed border-border shadow-sm text-center p-6">
                                        <Video className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                        <h3 className="font-bold text-foreground mb-1">Nenhuma aula encontrada</h3>
                                        <p className="text-sm text-muted-foreground">Esta disciplina ainda não possui aulas EAD cadastradas.</p>
                                    </div>
                                )}
                            </div>

                            {/* Playlist Area */}
                            <div className="w-full lg:w-88 shrink-0">
                                <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full max-h-[620px]">
                                    <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-sm flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-accent" /> Conteúdo da Disciplina
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">{lessons.length} {lessons.length === 1 ? 'aula cadastrada' : 'aulas cadastradas'}</p>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                                        {loading ? (
                                            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>
                                        ) : lessons.length === 0 ? (
                                            <div className="text-center p-4 text-xs text-muted-foreground italic">Lista vazia.</div>
                                        ) : (
                                            lessons.map((lesson, idx) => {
                                                const isActive = activeLesson?.id === lesson.id
                                                const status = getLessonStatus(lesson)
                                                const isLocked = status.status === "scheduled"
                                                const isExpired = status.status === "expired"
                                                const isLessonLive = lesson.lessonType === 'live_meet' || (lesson.videoUrl && lesson.videoUrl.includes('meet.google.com'))
                                                const thumb = lesson.coverUrl || (!isLessonLive ? getYoutubeThumb(lesson.videoUrl) : null)

                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => handleSelectLesson(lesson)}
                                                        className={`w-full text-left p-2.5 rounded-2xl flex gap-3 items-center transition-all group ${
                                                            isActive 
                                                                ? 'bg-amber-500/10 border-2 border-amber-500 text-amber-950 dark:text-amber-200 shadow-sm' 
                                                                : isLocked || isExpired
                                                                    ? 'hover:bg-muted/70 text-muted-foreground bg-muted/20 opacity-75 border border-transparent'
                                                                    : 'hover:bg-muted text-foreground border border-border/50'
                                                        }`}
                                                    >
                                                        {/* Mini Thumbnail */}
                                                        <div className={`w-20 h-13 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border shadow-xs ${
                                                            thumb ? 'bg-black border-border/50' : isLessonLive ? 'bg-gradient-to-br from-rose-900 to-slate-900 border-rose-500/30' : 'bg-muted border-border/60'
                                                        }`}>
                                                            {thumb ? (
                                                                <>
                                                                    <img src={thumb} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
                                                                    {isActive && (
                                                                        <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                                                                            <PlayCircle className="h-5 w-5 text-white drop-shadow" />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : isLessonLive ? (
                                                                <div className="text-center p-1">
                                                                    <Radio className="h-4 w-4 text-rose-400 mx-auto animate-pulse" />
                                                                    <span className="text-[7px] font-black uppercase text-rose-200">Meet Live</span>
                                                                </div>
                                                            ) : (
                                                                <PlaySquare className="h-5 w-5 text-muted-foreground/50" />
                                                            )}
                                                            
                                                            {isLocked ? (
                                                                <div className="absolute inset-0 bg-amber-950/70 backdrop-blur-xs flex items-center justify-center">
                                                                    <Lock className="h-4 w-4 text-amber-300" />
                                                                </div>
                                                            ) : isExpired ? (
                                                                <div className="absolute inset-0 bg-rose-950/70 backdrop-blur-xs flex items-center justify-center">
                                                                    <Clock className="h-4 w-4 text-rose-300" />
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                {isLessonLive ? (
                                                                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 uppercase">
                                                                        🔴 Meet Ao Vivo
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                                                                        Gravada
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] font-semibold text-muted-foreground/80">Aula {idx + 1}</span>
                                                            </div>
                                                            <p className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                                                {lesson.title}
                                                            </p>
                                                            <p className={`text-[10px] mt-1 truncate ${isActive ? 'text-amber-700 font-medium' : isLocked ? 'text-amber-700 font-medium' : isExpired ? 'text-rose-700 font-medium' : 'text-muted-foreground'}`}>
                                                                {isActive ? "▶ Reproduzindo agora" : status.label}
                                                            </p>
                                                        </div>
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
