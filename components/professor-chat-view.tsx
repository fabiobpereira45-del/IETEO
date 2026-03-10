"use client"

import { useEffect, useState } from "react"
import { MessageSquare, ArrowLeft, Search, User } from "lucide-react"
import { type Discipline, type StudentProfile, getDisciplines, getStudents } from "@/lib/store"
import { ChatThread } from "./chat-thread"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export function ProfessorChatView() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])

    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        async function load() {
            const [d, s] = await Promise.all([getDisciplines(), getStudents()])
            setDisciplines(d)
            setStudents(s)
        }
        load()
    }, [])

    const selectedDiscipline = disciplines.find(d => d.id === selectedDisciplineId)

    // Filter students based on search
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.enrollment_number.includes(searchTerm)
    )

    if (selectedStudent && selectedDiscipline) {
        return (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto w-full">
                <button
                    onClick={() => setSelectedStudent(null)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar para lista de alunos
                </button>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">Chat: {selectedStudent.name}</h3>
                        <p className="text-sm text-muted-foreground">Disciplina: {selectedDiscipline.name}</p>
                    </div>
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                </div>

                <ChatThread
                    disciplineId={selectedDiscipline.id}
                    studentId={selectedStudent.id}
                    studentName={selectedStudent.name}
                    isStudentView={false}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
            <div className="flex flex-col md:flex-row gap-4 items-end bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex flex-col gap-1.5 w-full md:w-1/2">
                    <Label>Selecione a Disciplina</Label>
                    <Select value={selectedDisciplineId} onValueChange={(val) => {
                        setSelectedDisciplineId(val)
                        setSelectedStudent(null)
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Escolha uma disciplina..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Selecione uma disciplina</SelectItem>
                            {disciplines.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1.5 w-full md:w-1/2">
                    <Label>Buscar Aluno</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nome ou Matrícula"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            disabled={selectedDisciplineId === "none"}
                        />
                    </div>
                </div>
            </div>

            {selectedDisciplineId === "none" ? (
                <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">Selecione uma disciplina</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                        Para iniciar ou continuar um chat, primeiro selecione a disciplina desejada.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.length === 0 ? (
                        <p className="text-muted-foreground text-sm col-span-full text-center py-10">Nenhum aluno encontrado.</p>
                    ) : (
                        filteredStudents.map(student => (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors flex flex-col h-full group cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <User className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 mb-3">
                                    <h4 className="font-semibold text-sm text-foreground leading-tight mb-1 truncate" title={student.name}>{student.name}</h4>
                                    <p className="text-xs text-muted-foreground font-mono">Matrícula: {student.enrollment_number}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    <span className="flex items-center"><MessageSquare className="h-3 w-3 mr-1.5" /> Abrir Chat</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
