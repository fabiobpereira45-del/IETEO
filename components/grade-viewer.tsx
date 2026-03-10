"use client"

import { useState, useEffect } from "react"
import { X, BookOpen, Users, Clock, ChevronDown, ChevronUp, Calendar, DollarSign, Wallet } from "lucide-react"
import { getClasses, getSemesters, getDisciplines, getFinancialSettings, getClassSchedules, type ClassRoom, type Semester, type Discipline, type FinancialSettings, type ClassSchedule } from "@/lib/store"

const SHIFT_LABEL: Record<string, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    evening: "Noite",
    ead: "EAD/Online",
}

const DAY_LABEL: Record<string, string> = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
}

interface GradeViewerProps {
    onClose: () => void
}

export function GradeViewer({ onClose }: GradeViewerProps) {
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [financial, setFinancial] = useState<FinancialSettings | null>(null)
    const [schedules, setSchedules] = useState<ClassSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [openSem, setOpenSem] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            const [cls, sems, discs, fin, scheds] = await Promise.all([
                getClasses(), getSemesters(), getDisciplines(), getFinancialSettings(), getClassSchedules()
            ])
            setClasses(cls)
            setSemesters(sems)
            setDisciplines(discs)
            setFinancial(fin)
            setSchedules(scheds)
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
                            {/* Turmas e Quadro de Horários */}
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Turmas Disponíveis e Horários
                                </h3>
                                {classes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">Nenhuma turma cadastrada.</p>
                                ) : (
                                    <div className="grid gap-3">
                                        {classes.map(c => {
                                            const classSchedules = schedules.filter(s => s.classId === c.id)
                                            return (
                                                <div key={c.id} className="flex flex-col bg-muted/50 rounded-xl px-4 py-3 border border-border">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold text-foreground text-base">{c.name}</p>
                                                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                                                {c.dayOfWeek && (
                                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <Calendar className="h-3 w-3" />{DAY_LABEL[c.dayOfWeek] || c.dayOfWeek}
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Clock className="h-3 w-3" />{SHIFT_LABEL[c.shift] || c.shift}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-accent">{c.maxStudents}</p>
                                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">vagas</p>
                                                        </div>
                                                    </div>

                                                    {classSchedules.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-border/50">
                                                            <p className="text-xs font-semibold text-muted-foreground mb-2">Quadro de Horários:</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {classSchedules.map(sched => {
                                                                    const d = disciplines.find(dsc => dsc.id === sched.disciplineId)
                                                                    return (
                                                                        <div key={sched.id} className="flex flex-col bg-background border border-border rounded-lg p-2 text-xs">
                                                                            <span className="font-semibold text-foreground truncate">{d?.name || 'Disciplina Mapeada'}</span>
                                                                            <div className="flex justify-between items-center mt-1 text-muted-foreground">
                                                                                <span>Prof. {sched.professorName}</span>
                                                                                <span>{sched.timeStart} - {sched.timeEnd} ({DAY_LABEL[sched.dayOfWeek] || sched.dayOfWeek})</span>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* Informações Financeiras */}
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" /> Valores do Curso
                                </h3>
                                {financial ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 border border-border">
                                            <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                                                <Wallet className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Taxa de Matrícula</p>
                                                <p className="text-xl font-bold text-foreground">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financial.enrollmentFee)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 border border-border">
                                            <div className="h-10 w-10 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0">
                                                <DollarSign className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mensalidade ({financial.totalMonths}x)</p>
                                                <p className="text-xl font-bold text-foreground">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financial.monthlyFee)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Valores não configurados.</p>
                                )}
                            </section>

                            {/* Disciplinas por Semestre e Dia */}
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Grade por Semestre e Dia da Semana
                                </h3>
                                {semesters.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">Nenhuma grade cadastrada.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {semesters.map(sem => {
                                            const semDiscs = disciplines.filter(d => d.semesterId === sem.id)
                                            const isOpen = openSem === sem.id
                                            const DAY_ORDER = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]
                                            const DAY_LABEL_MAP: Record<string, string> = {
                                                segunda: "Segunda-feira", terca: "Terça-feira", quarta: "Quarta-feira",
                                                quinta: "Quinta-feira", sexta: "Sexta-feira", sabado: "Sábado"
                                            }
                                            const usedDays = [...new Set(semDiscs.map(d => d.dayOfWeek).filter(Boolean) as string[])]
                                                .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
                                            return (
                                                <div key={sem.id} className="border border-border rounded-xl overflow-hidden">
                                                    <button
                                                        onClick={() => setOpenSem(isOpen ? null : sem.id)}
                                                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                                    >
                                                        <span className="font-semibold text-sm">{sem.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">{semDiscs.length} disciplina{semDiscs.length !== 1 ? "s" : ""}</span>
                                                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </div>
                                                    </button>
                                                    {isOpen && (
                                                        semDiscs.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground px-4 py-3 italic">Nenhuma disciplina neste semestre.</p>
                                                        ) : (
                                                            <div className="divide-y divide-border">
                                                                {usedDays.map(day => {
                                                                    const dayDiscs = semDiscs.filter(d => d.dayOfWeek === day)
                                                                    return (
                                                                        <div key={day}>
                                                                            <div className="px-4 py-1.5 bg-muted/20">
                                                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                                                    {DAY_LABEL_MAP[day] ?? day}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground ml-2">({dayDiscs.length})</span>
                                                                            </div>
                                                                            {dayDiscs.map(d => (
                                                                                <div key={d.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                                                                                    <BookOpen className="h-3.5 w-3.5 text-accent shrink-0" />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <span className="text-sm font-medium">{d.name}</span>
                                                                                        {d.professorName && <span className="text-xs text-muted-foreground ml-2">— {d.professorName}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )
                                                                })}
                                                                {semDiscs.some(d => !d.dayOfWeek) && (
                                                                    <div>
                                                                        <div className="px-4 py-1.5 bg-amber-50/60">
                                                                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Sem dia definido</span>
                                                                        </div>
                                                                        {semDiscs.filter(d => !d.dayOfWeek).map(d => (
                                                                            <div key={d.id} className="px-4 py-2.5 flex items-center gap-3">
                                                                                <BookOpen className="h-3.5 w-3.5 text-accent shrink-0" />
                                                                                <span className="text-sm">{d.name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
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
