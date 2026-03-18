"use client"

import { BookOpen } from "lucide-react"
import type { Semester, Discipline } from "@/lib/store"

interface CurriculumTabProps {
    semesters: Semester[]
    disciplines: Discipline[]
}

export function CurriculumTab({ semesters, disciplines }: CurriculumTabProps) {
    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-2 duration-500">
            {semesters.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-border border-dashed rounded-3xl bg-white">
                    <BookOpen className="h-12 w-12 mx-auto opacity-20 mb-4" />
                    <p className="font-medium italic">Nenhuma grade curricular cadastrada no momento.</p>
                </div>
            ) : (
                semesters.map((sem, idx) => {
                    const semDisciplines = disciplines.filter(d => d.semesterId === sem.id)
                    return (
                        <div key={sem.id} className="relative">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-accent font-bold text-xl shadow-lg shadow-navy/20">
                                    {idx + 1}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-bold text-foreground">{sem.name}</h3>
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{sem.shift || "Turno Regular"}</p>
                                </div>
                                <div className="h-px bg-border flex-1 ml-4" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ml-4 lg:ml-16">
                                {semDisciplines.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic col-span-full">Disciplinas em definição para este semestre.</p>
                                ) : (
                                    semDisciplines.map(disc => (
                                        <div key={disc.id} className="bg-white border border-border/50 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group">
                                            <div className="mb-4">
                                                <h4 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">{disc.name}</h4>
                                                {disc.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{disc.description}</p>}
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-border/50">
                                                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                                    <span className="text-muted-foreground">Docente</span>
                                                    <span className="text-navy">{disc.professorName || "A definir"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
