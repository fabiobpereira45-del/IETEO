"use client"

import { useState, useEffect, useCallback } from "react"
import { getEadLessons, type EadLesson, getDisciplines, type Discipline } from "@/lib/store"
import { PlaySquare, Video, Loader2, PlayCircle, BookOpen, Clock, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
    myDisciplineIds: Set<string>
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
                setActiveLesson(data[0])
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
                        className="w-full border border-input rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm"
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
                        ) : activeLesson ? (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-border ring-1 ring-black/5">
                                    <iframe 
                                        src={getEmbedUrl(activeLesson.videoUrl)} 
                                        title={activeLesson.title}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="bg-white p-5 md:p-6 rounded-2xl border border-border shadow-sm">
                                    <h2 className="text-xl font-bold text-foreground mb-2">{activeLesson.title}</h2>
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
                                <p className="text-xs text-muted-foreground mt-1">{lessons.length} {lessons.length === 1 ? 'aula disponível' : 'aulas disponíveis'}</p>
                            </div>
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                {loading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>
                                ) : lessons.length === 0 ? (
                                    <div className="text-center p-4 text-xs text-muted-foreground italic">Lista vazia.</div>
                                ) : (
                                    lessons.map((lesson, idx) => {
                                        const isActive = activeLesson?.id === lesson.id
                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => setActiveLesson(lesson)}
                                                className={`w-full text-left p-3 rounded-xl flex gap-3 items-start transition-all ${isActive ? 'bg-accent text-accent-foreground shadow-md' : 'hover:bg-muted text-foreground'}`}
                                            >
                                                <div className="shrink-0 mt-0.5">
                                                    {isActive ? (
                                                        <PlayCircle className="h-5 w-5" />
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-[9px] font-bold">
                                                            {idx + 1}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent-foreground' : 'text-foreground'}`}>{lesson.title}</p>
                                                    {isActive && <p className="text-[10px] opacity-80 mt-1 uppercase tracking-wider font-bold">Reproduzindo agora</p>}
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
