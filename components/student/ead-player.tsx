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
    myDisciplineIds: Set<string>
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

export function EadPlayer({ myDisciplineIds, studentId, studentName }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [lessons, setLessons] = useState<EadLesson[]>([])
    const [loading, setLoading] = useState(false)
    const [activeLesson, setActiveLesson] = useState<EadLesson | null>(null)

    // Live Tracking State
    const [trackingId, setTrackingId] = useState<string | null>(null)
    const [connectedSeconds, setConnectedSeconds] = useState<number>(0)
    const [isAttendanceValidated, setIsAttendanceValidated] = useState<boolean>(false)
    const [isLiveActive, setIsLiveActive] = useState<boolean>(false)
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        getDisciplines().then(all => {
            setDisciplines(all.filter(d => myDisciplineIds.has(d.id)))
        })
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

    if (disciplines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white border border-border rounded-3xl shadow-sm">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Video className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Aulas EAD Indisponíveis</h3>
                <p className="text-muted-foreground max-w-md">Você não possui disciplinas matriculadas no momento para acessar as aulas online.</p>
            </div>
        )
    }

    const activeStatus = activeLesson ? getLessonStatus(activeLesson) : null
    const isLiveMeet = activeLesson?.lessonType === 'live_meet' || (activeLesson?.videoUrl && activeLesson.videoUrl.includes('meet.google.com'))

    return (
        <div className="space-y-6">
            <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <PlaySquare className="h-5 w-5 text-accent" />
                        Ambiente de Aulas EAD & Salas Ao Vivo
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Acesse vídeo-aulas gravadas e salas ao vivo Google Meet com frequência automática.</p>
                </div>
                <div className="w-full sm:w-72">
                    <select
                        className="w-full border border-input rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm font-medium"
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

            {selectedDisciplineId !== "none" && (
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
                                    /* Live Google Meet Classroom Hub */
                                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden">
                                        {/* Background glow & accents */}
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                                        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-5">
                                            {/* Live Status Badge */}
                                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider animate-pulse">
                                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                                                <Radio className="h-4 w-4 text-rose-400" />
                                                Transmissão Ao Vivo (Google Meet)
                                            </div>

                                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                                {activeLesson.title}
                                            </h2>

                                            {activeLesson.description && (
                                                <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-lg">
                                                    {activeLesson.description}
                                                </p>
                                            )}

                                            {/* Attendance Rule Card */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-left">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-300">Registro de Presença</div>
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
                                                        <div className="text-xs font-semibold text-slate-300">Monitor de Permanência</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                            Tempo ativo contabilizado e sincronizado com o sistema
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Live Session Counter when Active */}
                                            {isLiveActive && (
                                                <div className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                    <div className="w-full lg:w-80 shrink-0">
                        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full max-h-[600px]">
                            <div className="p-4 border-b border-border bg-muted/30">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-accent" /> Conteúdo da Disciplina
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">{lessons.length} {lessons.length === 1 ? 'aula cadastrada' : 'aulas cadastradas'}</p>
                            </div>
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
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

                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => handleSelectLesson(lesson)}
                                                className={`w-full text-left p-3 rounded-xl flex gap-3 items-start transition-all ${
                                                    isActive 
                                                        ? 'bg-accent text-accent-foreground shadow-md' 
                                                        : isLocked || isExpired
                                                            ? 'hover:bg-muted/70 text-muted-foreground bg-muted/20 opacity-80'
                                                            : 'hover:bg-muted text-foreground'
                                                }`}
                                            >
                                                <div className="shrink-0 mt-0.5">
                                                    {isActive ? (
                                                        <PlayCircle className="h-5 w-5" />
                                                    ) : isLocked ? (
                                                        <Lock className="h-4 w-4 text-amber-600 mt-0.5" />
                                                    ) : isExpired ? (
                                                        <Clock className="h-4 w-4 text-rose-600 mt-0.5" />
                                                    ) : isLessonLive ? (
                                                        <Radio className="h-4 w-4 text-rose-500 mt-0.5" />
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-[9px] font-bold">
                                                            {idx + 1}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        {isLessonLive && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 uppercase">
                                                                Meet
                                                            </span>
                                                        )}
                                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent-foreground' : 'text-foreground'}`}>
                                                            {lesson.title}
                                                        </p>
                                                    </div>
                                                    <p className={`text-[10px] mt-0.5 ${isActive ? 'opacity-90' : isLocked ? 'text-amber-700 font-medium' : isExpired ? 'text-rose-700 font-medium' : 'text-muted-foreground'}`}>
                                                        {isActive ? "Reproduzindo agora" : status.label}
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
        </div>
    )
}
