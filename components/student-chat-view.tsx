"use client"

import { useEffect, useState } from "react"
import { MessageSquare, LayoutGrid, ArrowLeft } from "lucide-react"
import { type Discipline, type Semester, getDisciplines, getSemesters } from "@/lib/store"
import { ChatThread } from "./chat-thread"

interface Props {
    studentId: string
    studentName: string
}

export function StudentChatView({ studentId, studentName }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null)

    useEffect(() => {
        async function load() {
            const [d, s] = await Promise.all([getDisciplines(), getSemesters()])
            setDisciplines(d)
            setSemesters(s)
        }
        load()
    }, [])

    if (selectedDiscipline) {
        return (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                    onClick={() => setSelectedDiscipline(null)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar para disciplinas
                </button>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">{selectedDiscipline.name}</h3>
                        <p className="text-sm text-muted-foreground">Tire suas dúvidas diretamente com o professor.</p>
                    </div>
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                </div>

                <ChatThread
                    disciplineId={selectedDiscipline.id}
                    studentId={studentId}
                    studentName={studentName}
                    professorName={selectedDiscipline.professorName || "Professor da Disciplina"}
                    isStudentView={true}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-card border border-border shadow-sm rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                    <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Tire suas Dúvidas</h3>
                <p className="text-muted-foreground max-w-md">
                    Selecione uma disciplina abaixo para iniciar um chat com o professor responsável.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {disciplines.length === 0 ? (
                    <p className="text-muted-foreground text-sm col-span-full text-center py-10">Nenhuma disciplina cadastrada.</p>
                ) : (
                    disciplines.map(disc => {
                        const sem = semesters.find(s => s.id === disc.semesterId)
                        return (
                            <div
                                key={disc.id}
                                onClick={() => setSelectedDiscipline(disc)}
                                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors flex flex-col h-full group cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                        <LayoutGrid className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 mb-3">
                                    <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mb-1" title={disc.name}>{disc.name}</h4>
                                    <p className="text-xs text-primary font-medium truncate">{sem?.name || "Sem Semestre"} • Prof. {disc.professorName || "N/A"}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    <MessageSquare className="h-3 w-3 mr-1.5" /> Abrir Chat
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
