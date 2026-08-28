"use client"

import { useState, useEffect, useCallback } from "react"
import { getEadLessons, type EadLesson, getDisciplines, type Discipline } from "@/lib/store"
import { PlaySquare, Video, Loader2, PlayCircle, BookOpen, Clock, ChevronRight, Lock, Calendar, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
    myDisciplineIds: Set<string>
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
        label: "Disponível"
    }
}

export function EadPlayer({ myDisciplineIds }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [lessons, setLessons] = useState<EadLesson[]>([])
    const [loading, setLoading] = useState(false)
    const [activeLesson, setActiveLesson] = useState<EadLesson | null>(null)

    useEffect(() => {
        getDisciplines().then(all => {
            setDisciplines(all.filter(d => myDisciplineIds.has(d.id)))
        })
    }, [myDisciplineIds])

    const loadLessons = useCallback(async () => {
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
    }, [selectedDisciplineId])

    useEffect(() => {
        loadLessons()
    }, [loadLessons])

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

    return (
        <div className="space-y-6">
            <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <PlaySquare className="h-5 w-5 text-accent" />
                        Ambiente de Aulas EAD
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Acesse todas as vídeo-aulas das suas disciplinas atuais.</p>
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
                                        <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">Aula Ainda Não Disponível</h3>
                                        <p className="text-sm text-amber-800/90 max-w-md mb-3">
                                            Esta aula está agendada para ser liberada em:
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
                                        <h3 className="text-lg sm:text-xl font-bold text-rose-900 mb-2">Prazo de Acesso Encerrado</h3>
                                        <p className="text-sm text-rose-800/90 max-w-md mb-3">
                                            O período para assistir a esta vídeo-aula expirou em:
                                        </p>
                                        <div className="inline-flex items-center gap-2 bg-rose-100/90 border border-rose-300 px-4 py-2 rounded-xl text-sm font-bold text-rose-900">
                                            <Clock className="h-4 w-4" />
                                            {formatDisplayDate(activeLesson.availableUntil)}
                                        </div>
                                    </div>
                                ) : (
                                    /* Active Video Player */
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
                                        <h2 className="text-xl font-bold text-foreground">{activeLesson.title}</h2>
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

                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => setActiveLesson(lesson)}
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
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-[9px] font-bold">
                                                            {idx + 1}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent-foreground' : 'text-foreground'}`}>
                                                        {lesson.title}
                                                    </p>
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
