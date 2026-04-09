"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Save, CheckCircle2, User, Search, RefreshCw, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    type Discipline, type StudentProfile, type Attendance, type ClassRoom,
    getDisciplines, getStudents, getAttendances, saveAttendance, getProfessorSession, getDisciplinesByProfessor, getClasses
} from "@/lib/store"
import { printAttendanceReportPDF, printDailyAttendancePDF } from "@/lib/pdf"

export function AttendanceManager() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])

    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [selectedClassId, setSelectedClassId] = useState<string>("all")
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
    const [searchTerm, setSearchTerm] = useState("")

    const [classes, setClasses] = useState<ClassRoom[]>([])

    const [attendances, setAttendances] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Initialize
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const session = getProfessorSession()
            let d: Discipline[] = []
            
            if (session?.role === 'master') {
                d = await getDisciplines()
            } else if (session?.professorId) {
                d = await getDisciplinesByProfessor(session.professorId)
            }
            
            const c = await getClasses()
            const s = await getStudents()
            setDisciplines(d)
            setClasses(c)
            setStudents(s)
            setLoading(false)
        }
        loadData()
    }, [])

    // Load attendances when discipline or date changes
    useEffect(() => {
        async function fetchAttendances() {
            if (selectedDisciplineId === "none" || !selectedDate) return
            setLoading(true)
            const data = await getAttendances(selectedDisciplineId)

            const attMap: Record<string, boolean> = {}
            // We assume students not present in DB are absent
            // Default is false (absent) as requested by the user

            data.forEach(a => {
                if (a.date === selectedDate) {
                    attMap[a.studentId] = a.isPresent
                }
            })
            setAttendances(attMap)
            setLoading(false)
        }
        fetchAttendances()
    }, [selectedDisciplineId, selectedDate])

    async function handleSave() {
        if (selectedDisciplineId === "none" || !selectedDate) return
        setSaving(true)
        try {
            // For each student currently visible or in state, save their attendance
            const promises = filteredStudents.map(student => {
                const isPresent = attendances[student.id] === true
                return saveAttendance(student.id, selectedDisciplineId, selectedDate, isPresent)
            })
            await Promise.all(promises)
            alert("Frequência salva com sucesso!")
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message)
        }
        setSaving(false)
    }

    function toggleAttendance(studentId: string) {
        setAttendances(prev => ({
            ...prev,
            [studentId]: prev[studentId] === false ? true : false
        }))
    }

    // Filter students based on search and class
    const filteredStudents = students.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.enrollment_number.includes(searchTerm)
        const matchClass = selectedClassId === "all" || s.class_id === selectedClassId
        return matchSearch && matchClass
    })

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Diário de Classe (Frequência)</h2>
                    <p className="text-sm text-muted-foreground">Registre a presença dos alunos nas suas disciplinas</p>
                </div>
                    <Button variant="outline" onClick={async () => {
                        if (selectedDisciplineId === "none") return alert("Selecione uma disciplina.")
                        const discName = disciplines.find(d => d.id === selectedDisciplineId)?.name || ""
                        printDailyAttendancePDF(selectedDate, discName, filteredStudents, attendances)
                    }} className="border-amber-600 text-amber-600 hover:bg-amber-50">
                        <Download className="h-4 w-4 mr-2" />
                        Imprimir Chamada do Dia
                    </Button>
                    <Button variant="outline" onClick={async () => {
                        if (selectedDisciplineId === "none") return alert("Selecione uma disciplina.")
                        setLoading(true)
                        try {
                            const att = await getAttendances(selectedDisciplineId)
                            const discName = disciplines.find(d => d.id === selectedDisciplineId)?.name || ""
                            printAttendanceReportPDF(att, students, discName)
                        } catch (e: any) { alert("Erro ao gerar PDF: " + e.message) }
                        setLoading(false)
                    }} className="border-primary text-primary hover:bg-primary/10">
                        <Download className="h-4 w-4 mr-2" />
                        Relatório Consolidado
                    </Button>
                    <Button onClick={handleSave} disabled={saving || selectedDisciplineId === "none" || !selectedDate} className="bg-green-600 hover:bg-green-700">
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Frequência
                    </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 border border-border rounded-xl p-4">
                <div className="flex flex-col gap-1.5 align-bottom">
                    <Label>Disciplina *</Label>
                    <Select value={selectedDisciplineId} onValueChange={setSelectedDisciplineId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Selecione uma disciplina...</SelectItem>
                            {disciplines.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex flex-col gap-1.5 align-bottom">
                    <Label>Turma (Opcional)</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todas as Turmas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {classes.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 align-bottom">
                    <Label>Data da Aula *</Label>
                    <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 align-bottom">
                    <Label>Buscar Aluno</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nome ou Matrícula"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {selectedDisciplineId === "none" ? (
                <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
                    <User className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">Selecione uma disciplina</h3>
                    <p className="text-muted-foreground text-sm max-w-md">Para realizar a chamada, primeiro selecione a disciplina e a data desejada.</p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-4 py-3 w-16 text-center">Nº</th>
                                        <th className="px-4 py-3 min-w-[200px]">Nome do Aluno</th>
                                        <th className="px-4 py-3">Matrícula</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Presença</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground italic">
                                                Nenhum aluno encontrado na busca.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((student, idx) => {
                                            // Defaulting to absent if it wasn't explicitly saved as present in the DB
                                            const isPresent = attendances[student.id] === true

                                            return (
                                                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 text-center text-muted-foreground font-mono">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-foreground">
                                                        {student.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground font-mono">
                                                        {student.enrollment_number}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isPresent ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Presente
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                                                                <AlertCircle className="h-3.5 w-3.5" /> Faltou
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center flex justify-center">
                                                        <button
                                                            onClick={() => toggleAttendance(student.id)}
                                                            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isPresent ? "bg-green-500 justify-end" : "bg-red-400 justify-start"
                                                                }`}
                                                        >
                                                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
