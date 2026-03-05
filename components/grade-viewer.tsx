"use client"

import { useState, useEffect } from "react"
import { X, BookOpen, Users, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { getClasses, getSemesters, getDisciplines, type ClassRoom, type Semester, type Discipline } from "@/lib/store"

const SHIFT_LABEL: Record<string, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    evening: "Noite",
    ead: "EAD/Online",
}

interface GradeViewerProps {
    onClose: () => void
}

export function GradeViewer({ onClose }: GradeViewerProps) {
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [loading, setLoading] = useState(true)
    const [openSem, setOpenSem] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            const [cls, sems, discs] = await Promise.all([getClasses(), getSemesters(), getDisciplines()])
            setClasses(cls)
            setSemesters(sems)
            setDisciplines(discs)
            if (sems.length > 0) setOpenSem(sems[0].id)
            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-accent" />
                        <div>
                            <h2 className="font-bold text-lg">Grade Curricular</h2>
                            <p className="text-xs text-primary-foreground/70">Instituto de Ensino Teológico - IETEO</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Turmas */}
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Turmas Disponíveis
                                </h3>
                                {classes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">Nenhuma turma cadastrada.</p>
                                ) : (
                                    <div className="grid gap-3">
                                        {classes.map(c => (
                                            <div key={c.id} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3 border border-border">
                                                <div>
                                                    <p className="font-semibold text-foreground">{c.name}</p>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                        <Clock className="h-3 w-3" />
                                                        {SHIFT_LABEL[c.shift] || c.shift}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-accent">{c.maxStudents}</p>
                                                    <p className="text-xs text-muted-foreground">vagas</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Disciplinas por Semestre */}
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Disciplinas por Semestre
                                </h3>
                                {semesters.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">Nenhuma grade cadastrada.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {semesters.map(sem => {
                                            const semDiscs = disciplines.filter(d => d.semesterId === sem.id)
                                            const isOpen = openSem === sem.id
                                            return (
                                                <div key={sem.id} className="border border-border rounded-xl overflow-hidden">
                                                    <button
                                                        onClick={() => setOpenSem(isOpen ? null : sem.id)}
                                                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                                    >
                                                        <span className="font-semibold text-sm">{sem.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">{semDiscs.length} disciplinas</span>
                                                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </div>
                                                    </button>
                                                    {isOpen && (
                                                        <div className="divide-y divide-border">
                                                            {semDiscs.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground px-4 py-3 italic">Nenhuma disciplina neste semestre.</p>
                                                            ) : (
                                                                semDiscs.map(d => (
                                                                    <div key={d.id} className="px-4 py-2.5 flex items-center gap-3">
                                                                        <BookOpen className="h-3.5 w-3.5 text-accent shrink-0" />
                                                                        <span className="text-sm">{d.name}</span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:bg-accent/90 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
