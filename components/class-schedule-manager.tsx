"use client"

import { useEffect, useState, useMemo } from "react"
import {
    CalendarDays, Plus, Pencil, Trash2, Clock, Users, BookOpen, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    type ClassSchedule, type ClassRoom, type Discipline, type ProfessorAccount,
    getClassSchedules, addClassSchedule, updateClassSchedule, deleteClassSchedule,
    getClasses, getDisciplines, getProfessorAccounts, MASTER_CREDENTIALS
} from "@/lib/store"

const DAYS_OF_WEEK = [
    { value: "segunda", label: "Segunda-feira", short: "SEG" },
    { value: "terca", label: "Terça-feira", short: "TER" },
    { value: "quarta", label: "Quarta-feira", short: "QUA" },
    { value: "quinta", label: "Quinta-feira", short: "QUI" },
    { value: "sexta", label: "Sexta-feira", short: "SEX" },
    { value: "sabado", label: "Sábado", short: "SÁB" },
]

export function ClassScheduleManager() {
    const [schedules, setSchedules] = useState<ClassSchedule[]>([])
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [professors, setProfessors] = useState<ProfessorAccount[]>([])

    const [loading, setLoading] = useState(true)
    const [activeClassId, setActiveClassId] = useState<string>("all")

    // Modal de Agendamento
    const [modalOpen, setModalOpen] = useState(false)
    const [formClassId, setFormClassId] = useState("")
    const [formDay, setFormDay] = useState("segunda")
    const [formTimeStart, setFormTimeStart] = useState("19:00")
    const [formTimeEnd, setFormTimeEnd] = useState("21:00")
    const [formDisciplineId, setFormDisciplineId] = useState("")
    const [formProfessor, setFormProfessor] = useState("")
    const [formLessonsCount, setFormLessonsCount] = useState<number>(1)
    const [formWorkload, setFormWorkload] = useState<number>(0)
    const [formStartDate, setFormStartDate] = useState("")
    const [formEndDate, setFormEndDate] = useState("")

    // Deletar e Editar
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [editId, setEditId] = useState<string | null>(null)

    async function loadData() {
        setLoading(true)
        const [scheds, cls, discs, profs] = await Promise.all([
            getClassSchedules(),
            getClasses(),
            getDisciplines(),
            getProfessorAccounts()
        ])
        setSchedules(scheds)
        setClasses(cls)
        setDisciplines(discs)
        setProfessors(profs)
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    function openNewSchedule(day?: string) {
        setFormClassId(activeClassId !== "all" ? activeClassId : (classes[0]?.id || ""))
        setFormDay(day || "segunda")
        setFormTimeStart("19:00")
        setFormTimeEnd("21:00")
        setFormDisciplineId("")
        setFormProfessor("none")
        setFormLessonsCount(1)
        setFormWorkload(0)
        setFormStartDate("")
        setFormEndDate("")
        setModalOpen(true)
    }

    // Calcular Carga Horária automaticamente
    useEffect(() => {
        if (!formTimeStart || !formTimeEnd || !formLessonsCount) {
            setFormWorkload(0)
            return
        }

        const [hS, mS] = formTimeStart.split(":").map(Number)
        const [hE, mE] = formTimeEnd.split(":").map(Number)

        const startMinutes = hS * 60 + mS
        const endMinutes = hE * 60 + mE

        let diff = endMinutes - startMinutes
        if (diff < 0) diff += 24 * 60 // Caso passe da meia-noite

        const hoursPerLesson = diff / 60
        const totalWorkload = hoursPerLesson * formLessonsCount
        setFormWorkload(Number(totalWorkload.toFixed(1)))
    }, [formTimeStart, formTimeEnd, formLessonsCount])

    async function handleSave() {
        if (!formClassId || !formDisciplineId || !formTimeStart || !formTimeEnd) {
            alert("Preencha todos os campos obrigatórios.")
            return
        }

        try {
            const prof = formProfessor === "none" ? "Sem Professor" : formProfessor

            const scheduleData = {
                classId: formClassId,
                disciplineId: formDisciplineId,
                professorName: prof,
                dayOfWeek: formDay,
                timeStart: formTimeStart,
                timeEnd: formTimeEnd,
                lessonsCount: formLessonsCount,
                workload: formWorkload,
                startDate: formStartDate || undefined,
                endDate: formEndDate || undefined
            }

            if (editId) {
                await updateClassSchedule(editId, scheduleData)
            } else {
                await addClassSchedule(scheduleData)
            }

            setModalOpen(false)
            setEditId(null)
            loadData()
        } catch (err: any) {
            console.error("Erro ao salvar horário:", err)
            alert("Erro ao salvar: " + (err.message || "Erro desconhecido"))
        }
    }

    function openEditModal(sched: ClassSchedule) {
        setEditId(sched.id)
        setFormClassId(sched.classId)
        setFormDisciplineId(sched.disciplineId)
        setFormDay(sched.dayOfWeek)
        setFormTimeStart(sched.timeStart)
        setFormTimeEnd(sched.timeEnd)
        setFormProfessor(sched.professorName || "none")
        setFormLessonsCount(sched.lessonsCount)
        setFormWorkload(sched.workload)
        setFormStartDate(sched.startDate || "")
        setFormEndDate(sched.endDate || "")
        setModalOpen(true)
    }

    function openAddModal(day?: string) {
        setEditId(null)
        setFormClassId(activeClassId === "all" ? "" : activeClassId)
        setFormDisciplineId("")
        setFormDay(day || "segunda")
        setFormTimeStart("19:00")
        setFormTimeEnd("21:00")
        setFormProfessor("none")
        setFormLessonsCount(1)
        setFormWorkload(0)
        setFormStartDate("")
        setFormEndDate("")
        setModalOpen(true)
    }

    async function handleDelete() {
        if (deleteId) {
            await deleteClassSchedule(deleteId)
            setDeleteId(null)
            loadData()
        }
    }

    // Filtragem e Agrupamento
    const filteredSchedules = useMemo(() => {
        if (activeClassId === "all") return schedules
        return schedules.filter(s => s.classId === activeClassId)
    }, [schedules, activeClassId])

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Quadro de Horários</h2>
                    <p className="text-sm text-muted-foreground">
                        Gerencie as aulas, horários e professores de cada turma.
                    </p>
                </div>
                <Button onClick={() => openAddModal()}>
                    <Plus className="h-4 w-4 mr-2" /> Agendar Aula
                </Button>
            </div>

            {/* Class Filter */}
            {classes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-muted/50 p-2 rounded-xl border border-border">
                    <span className="text-sm font-medium ml-2 mr-1">Filtrar Turma:</span>
                    <button
                        onClick={() => setActiveClassId("all")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeClassId === "all" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}
                    >
                        Todas as Turmas
                    </button>
                    {classes.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveClassId(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeClassId === c.id ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="py-12 text-center text-muted-foreground">Carregando horários...</div>
            ) : filteredSchedules.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
                    <CalendarDays className="h-10 w-10 mx-auto opacity-30 mb-3" />
                    <p className="text-sm">Nenhuma aula agendada para esta visão.</p>
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => openAddModal()}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Fazer primeiro agendamento
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {DAYS_OF_WEEK.map(day => {
                        const dayScheds = filteredSchedules.filter(s => s.dayOfWeek === day.value)
                        if (dayScheds.length === 0 && activeClassId !== "all") return null // Esconde dias vazios se filtrado

                        return (
                            <div key={day.value} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                                <div className="bg-primary/5 px-4 py-3 border-b border-border flex items-center justify-between">
                                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        {day.label}
                                    </h3>
                                    <span className="text-xs bg-background border border-border px-2 py-0.5 rounded-full font-medium">
                                        {dayScheds.length} aula{dayScheds.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                <div className="p-3 flex-1 flex flex-col gap-3">
                                    {dayScheds.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground italic text-sm">
                                            Livre
                                        </div>
                                    ) : (
                                        dayScheds.sort((a, b) => a.timeStart.localeCompare(b.timeStart)).map(sched => {
                                            const disc = disciplines.find(d => d.id === sched.disciplineId)
                                            const cls = classes.find(c => c.id === sched.classId)

                                            return (
                                                <div key={sched.id} className="group relative border border-border bg-background rounded-xl p-3 hover:border-primary/40 transition-colors">
                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(sched)}
                                                            className="h-6 w-6 rounded flex items-center justify-center bg-card border border-border hover:bg-muted text-muted-foreground"
                                                            title="Editar Agendamento"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(sched.id)}
                                                            className="h-6 w-6 rounded flex items-center justify-center bg-card border border-destructive/30 hover:bg-destructive/10 text-destructive"
                                                            title="Excluir Agendamento"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-primary mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {sched.timeStart.substring(0, 5)} - {sched.timeEnd.substring(0, 5)}
                                                        </div>
                                                        {sched.startDate && (
                                                            <div className="flex items-center gap-1 opacity-70">
                                                                <CalendarDays className="h-3 w-3" />
                                                                {new Date(sched.startDate + "T00:00:00").toLocaleDateString('pt-BR')}
                                                                {sched.endDate && ` a ${new Date(sched.endDate + "T00:00:00").toLocaleDateString('pt-BR')}`}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h4 className="font-bold text-sm leading-tight pr-6 mb-1">
                                                        {disc?.name || "Disciplina Removida"}
                                                    </h4>

                                                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-2">
                                                        <span className="flex items-center gap-1.5">
                                                            <Users className="h-3 w-3" /> Turma: {cls?.name || "Turma Apagada"}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <BookOpen className="h-3 w-3" /> Prof: {sched.professorName}
                                                        </span>
                                                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                                                            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-md font-bold">
                                                                {sched.lessonsCount} {sched.lessonsCount === 1 ? 'aula' : 'aulas'}
                                                            </span>
                                                            <span className="font-mono font-bold text-foreground">
                                                                CH: {sched.workload}h
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                                {activeClassId !== "all" && (
                                    <div className="p-3 border-t border-border bg-muted/20">
                                        <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed" onClick={() => openAddModal(day.value)}>
                                            <Plus className="h-3 w-3 mr-1" /> Adicionar neste dia
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal Nova Aula */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editId ? 'Editar Agendamento' : 'Agendar Aula'}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-4 py-2">

                        <div className="flex flex-col gap-1.5">
                            <Label>Turma *</Label>
                            <Select value={formClassId} onValueChange={setFormClassId}>
                                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Disciplina *</Label>
                            <Select value={formDisciplineId} onValueChange={setFormDisciplineId}>
                                <SelectTrigger><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
                                <SelectContent>
                                    {disciplines.length === 0 && <SelectItem value="none" disabled>Nenhuma disciplina cadastrada</SelectItem>}
                                    {disciplines.map(d => (
                                        <SelectItem key={d.id} value={d.id} className="h-auto whitespace-normal">
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Dia da Semana *</Label>
                                <Select value={formDay} onValueChange={setFormDay}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Professor *</Label>
                                <Select value={formProfessor} onValueChange={setFormProfessor}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Outro / Sem atribuição</SelectItem>
                                        <SelectItem value={MASTER_CREDENTIALS.name}>{MASTER_CREDENTIALS.name}</SelectItem>
                                        {professors.map(p => (
                                            <SelectItem key={p.id} value={p.name} className="h-auto whitespace-normal">
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Quantidade de Aulas *</Label>
                                <Input type="number" min={1} value={formLessonsCount} onChange={e => setFormLessonsCount(Number(e.target.value))} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Carga Horária (Calculada)</Label>
                                <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 flex items-center font-mono font-bold text-primary">
                                    {formWorkload}h
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Horário de Início *</Label>
                                <Input type="time" value={formTimeStart} onChange={e => setFormTimeStart(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Horário de Término *</Label>
                                <Input type="time" value={formTimeEnd} onChange={e => setFormTimeEnd(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Data de Início</Label>
                                <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Data Final</Label>
                                <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
                            </div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={!formClassId || !formDisciplineId || !formTimeStart || !formTimeEnd}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Deletar */}
            <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja apagar este horário do quadro? Esta ação não excluirá a disciplina nem a turma.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
