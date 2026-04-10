"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Save, CheckCircle2, User, Search, RefreshCw, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    type Discipline, type StudentProfile, type Attendance, type ClassRoom, type AttendanceLock,
    getDisciplines, getStudents, getAttendances, saveAttendance, getProfessorSession, getDisciplinesByProfessor, getClasses,
    getAttendanceLock, lockAttendance, unlockAttendance, getAttendanceAnalysis
} from "@/lib/store"
import { printAttendanceReportPDF, printDailyAttendancePDF, printAttendanceAnalysisPDF } from "@/lib/pdf"

export function AttendanceManager() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])

    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("none")
    const [selectedClassId, setSelectedClassId] = useState<string>("all")
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [searchTerm, setSearchTerm] = useState("")

    const [classes, setClasses] = useState<ClassRoom[]>([])

    const [attendances, setAttendances] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [lockInfo, setLockInfo] = useState<AttendanceLock | null>(null)
    const [session, setSession] = useState<any>(null)

    // Initialize
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const s = getProfessorSession()
            setSession(s)
            let d: Discipline[] = []
            
            if (s?.role === 'master') {
                d = await getDisciplines()
            } else if (s?.professorId) {
                d = await getDisciplinesByProfessor(s.professorId)
            }
            
            const c = await getClasses()
            const st = await getStudents()
            setDisciplines(d)
            setClasses(c)
            setStudents(st)
            setLoading(false)
        }
        loadData()
    }, [])

    // Load attendances and lock status when discipline or date changes
    useEffect(() => {
        async function fetchAttendances() {
            if (selectedDisciplineId === "none" || !selectedDate) return
            setLoading(true)
            
            const [data, lock] = await Promise.all([
                getAttendances(selectedDisciplineId),
                getAttendanceLock(selectedDisciplineId, selectedDate)
            ])

            setLockInfo(lock)

            const attMap: Record<string, boolean> = {}
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
        console.log(`[Database Architect] Tentando salvar frequência para ${selectedDate}...`);
        
        try {
            // Save all students in the class (ignore search filter for saving)
            const studentsToSave = students.filter(s => selectedClassId === "all" || s.class_id === selectedClassId)
            
            if (studentsToSave.length === 0) {
                alert("Nenhum aluno encontrado para salvar nesta turma.");
                setSaving(false);
                return;
            }

            const promises = studentsToSave.map(student => {
                const isPresent = attendances[student.id] === true
                return saveAttendance(student.id, selectedDisciplineId, selectedDate, isPresent)
            })

            await Promise.all(promises)
            
            // Re-fetch to confirm persistence
            const updatedData = await getAttendances(selectedDisciplineId)
            const attMap: Record<string, boolean> = {}
            updatedData.forEach(a => {
                if (a.date === selectedDate) {
                    attMap[a.studentId] = a.isPresent
                }
            })
            setAttendances(attMap)

            alert(`Frequência de ${studentsToSave.length} alunos salva com sucesso para o dia ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}!`)
        } catch (e: any) {
            console.error("[Debugger] Erro crítico no salvamento:", e);
            alert("ERRO CRÍTICO DE BANCO DE DADOS:\n\n" + e.message + "\n\nO sistema não conseguiu gravar as informações. Por favor, verifique as permissões de acesso (RLS) no Supabase.")
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
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground">Diário de Classe (Frequência)</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Registre a presença dos alunos nas suas disciplinas 
                        {Object.keys(attendances).length > 0 && !saving && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 animate-in fade-in zoom-in duration-300">
                                <CheckCircle2 className="h-3 w-3" /> {Object.keys(attendances).length} REGISTROS CARREGADOS
                            </span>
                        )}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 font-bold shadow-sm h-10 px-6">
                                <Download className="h-4 w-4 mr-2" />
                                Relatórios de Frequência
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl border-border">
                            <DropdownMenuItem 
                                className="flex items-center gap-3 py-3 px-4 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-lg transition-colors"
                                onClick={async () => {
                                    if (selectedDisciplineId === "none") return alert("Selecione uma disciplina.")
                                    const discName = disciplines.find(d => d.id === selectedDisciplineId)?.name || ""
                                    printDailyAttendancePDF(selectedDate, discName, filteredStudents, attendances)
                                }}
                            >
                                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                                    <Download className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-xs uppercase tracking-tight">Imprimir Chamada do Dia</span>
                                    <span className="text-[10px] text-muted-foreground">PDF da data selecionada</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="flex items-center gap-3 py-3 px-4 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-lg transition-colors border-t border-border/50 mt-1"
                                onClick={async () => {
                                    if (selectedDisciplineId === "none") return alert("Selecione uma disciplina.")
                                    setLoading(true)
                                    try {
                                        const att = await getAttendances(selectedDisciplineId)
                                        const discName = disciplines.find(d => d.id === selectedDisciplineId)?.name || ""
                                        printAttendanceReportPDF(att, students, discName)
                                    } catch (e: any) { alert("Erro ao gerar PDF: " + e.message) }
                                    setLoading(false)
                                }}
                            >
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Download className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-xs uppercase tracking-tight">Relatório Consolidado (Especialista)</span>
                                    <span className="text-[10px] text-muted-foreground">Dash completo com estatísticas</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                className="flex items-center gap-3 py-3 px-4 cursor-pointer focus:bg-red-50 focus:text-red-600 rounded-lg transition-colors border-t border-border/50 mt-1"
                                onClick={async () => {
                                    if (selectedDisciplineId === "none") return alert("Selecione uma disciplina.")
                                    setLoading(true)
                                    try {
                                        const discName = disciplines.find(d => d.id === selectedDisciplineId)?.name || ""
                                        const analysis = await getAttendanceAnalysis(selectedDisciplineId, students)
                                        printAttendanceAnalysisPDF(analysis, discName)
                                    } catch (e: any) { alert("Erro ao gerar análise: " + e.message) }
                                    setLoading(false)
                                }}
                            >
                                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-xs uppercase tracking-tight">Análise Estrutural (Especialista)</span>
                                    <span className="text-[10px] text-muted-foreground">Diagnóstico de falhas e padrões</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                        onClick={handleSave} 
                        disabled={saving || !!lockInfo || selectedDisciplineId === "none" || !selectedDate} 
                        className={cn(
                            "font-bold shadow-lg transition-all h-10 px-8 rounded-xl",
                            lockInfo ? "bg-slate-100 text-slate-400 border border-slate-200" : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                        )}
                    >
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : (lockInfo ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />)}
                        {lockInfo ? "Diário Finalizado" : "Salvar Frequência"}
                    </Button>
                    
                    {!lockInfo && selectedDisciplineId !== "none" && (
                        <Button 
                            onClick={async () => {
                                if (!confirm("Deseja finalizar este diário? Após a finalização, correções só poderão ser feitas pelo administrador.")) return
                                setSaving(true)
                                try {
                                    await handleSave()
                                    await lockAttendance(selectedDisciplineId, selectedDate, session?.professorId || 'master')
                                    const lock = await getAttendanceLock(selectedDisciplineId, selectedDate)
                                    setLockInfo(lock)
                                    alert("Diário finalizado com sucesso!")
                                } catch (e: any) { alert("Erro ao finalizar: " + e.message) }
                                setSaving(false)
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-amber-200"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Finalizar Diário
                        </Button>
                    )}

                    {lockInfo && session?.role === 'master' && (
                        <Button 
                            variant="destructive"
                            className="font-bold h-10 px-6 rounded-xl shadow-lg shadow-red-200"
                            onClick={async () => {
                                if (!confirm("Deseja reabrir este diário para edições?")) return
                                await unlockAttendance(lockInfo.id)
                                setLockInfo(null)
                            }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reabrir Diário
                        </Button>
                    )}
                </div>
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
                                                            disabled={!!lockInfo}
                                                            onClick={() => !lockInfo && toggleAttendance(student.id)}
                                                            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isPresent ? "bg-green-500 justify-end" : "bg-red-400 justify-start"
                                                                } ${lockInfo ? "opacity-50 cursor-not-allowed" : ""}`}
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
