"use client"

import { Users, CalendarDays, Clock, BookOpen, GraduationCap } from "lucide-react"
import type { ClassRoom, StudentProfile, ClassSchedule, Discipline, StudentGrade } from "@/lib/store"
import { cn } from "@/lib/utils"

const DAY_LABEL: Record<string, string> = {
    monday: "Segunda-feira", tuesday: "Terça-feira", wednesday: "Quarta-feira",
    thursday: "Quinta-feira", friday: "Sexta-feira", saturday: "Sábado", sunday: "Domingo"
}
const SHIFT_LABEL: Record<string, string> = {
    morning: "Manhã", afternoon: "Tarde", evening: "Noite", ead: "EAD/Online"
}

interface ClassInfoTabProps {
    myClass: ClassRoom | null
    classmates: StudentProfile[]
    mySchedules: ClassSchedule[]
    disciplines: Discipline[]
    officialGrades: StudentGrade[]
}

export function ClassInfoTab({ myClass, classmates, mySchedules, disciplines, officialGrades }: ClassInfoTabProps) {
    return (
        <div className="animate-in fade-in slide-in-from-right-2 duration-500">
            <div className="bg-white border border-border/50 rounded-3xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8 pb-8 border-b border-border/50">
                    <div>
                        <h3 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Users className="h-8 w-8 text-accent" /> {myClass?.name || "Turma Geral"}
                        </h3>
                        <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground font-medium">
                            <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                <CalendarDays className="h-4 w-4 text-primary" /> {myClass?.dayOfWeek ? DAY_LABEL[myClass.dayOfWeek] : "EAD Flexível"}
                            </span>
                            <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                <Clock className="h-4 w-4 text-primary" /> {myClass?.shift ? SHIFT_LABEL[myClass.shift] : "Online"}
                            </span>
                        </div>
                    </div>

                    {/* Meus Colegas de Classe */}
                    {classmates.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">Estudando comigo ({classmates.length})</p>
                            <div className="flex -space-x-3 overflow-hidden">
                                {classmates.slice(0, 5).map(c => (
                                    <div key={c.id} className="inline-block h-10 w-10 rounded-full ring-4 ring-white bg-slate-200 overflow-hidden" title={c.name}>
                                        {c.avatar_url ? (
                                            <img src={c.avatar_url} alt={c.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                {c.name.substring(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {classmates.length > 5 && (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white ring-4 ring-white">
                                        +{classmates.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-12">
                    {/* Seção 1: Disciplina em Foco */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[2px] text-amber-600 mb-6 flex items-center gap-4">
                            <span>Disciplina em Foco (Mês Atual)</span>
                            <div className="h-px bg-amber-200 flex-1" />
                        </h4>
                        
                        {(() => {
                            const now = new Date()
                            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0')
                            const currentYear = now.getFullYear().toString()
                            
                            const featuredSchedules = mySchedules.filter(s => {
                                const disc = disciplines.find(d => d.id === s.disciplineId)
                                return disc?.applicationMonth === currentMonth && disc?.applicationYear === currentYear
                            })

                            if (featuredSchedules.length === 0) {
                                return (
                                    <div className="p-8 bg-slate-50 border border-border border-dashed rounded-3xl text-center text-muted-foreground italic text-sm">
                                        Nenhuma disciplina específica destacada para este mês ({new Date().toLocaleString('pt-br', { month: 'long' })}).
                                    </div>
                                )
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {featuredSchedules.map(sched => {
                                        const disc = disciplines.find(d => d.id === sched.disciplineId)
                                        return (
                                            <div key={sched.id} className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-4 py-1.5 uppercase rounded-bl-2xl tracking-widest animate-pulse">
                                                    Em Curso
                                                </div>
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="h-12 w-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                                                        <BookOpen className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-2xl font-black text-foreground leading-tight">{disc?.name || "Disciplina"}</p>
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                                {disc?.applicationMonth}/{disc?.applicationYear}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-amber-700 font-bold uppercase tracking-tighter">
                                                            {DAY_LABEL[sched.dayOfWeek] || sched.dayOfWeek} — {sched.timeStart} às {sched.timeEnd}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-muted-foreground font-medium bg-white/50 p-3 rounded-xl border border-amber-100 mb-4">
                                                    <GraduationCap className="h-5 w-5 text-amber-500" />
                                                    <span>Prof. {sched.professorName && sched.professorName !== "Sem Professor" ? sched.professorName : (disc?.professorName || "Docente Central")}</span>
                                                </div>
                                                {disc?.description && (
                                                    <div className="text-xs text-muted-foreground bg-amber-50/50 p-3 rounded-xl border border-dotted border-amber-200/50 italic leading-relaxed">
                                                        <span className="font-bold text-amber-800 not-italic block mb-1 uppercase text-[9px]">Carga Horária / Informações:</span>
                                                        {disc.description}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>

                    {/* Seção 2: Mural da Turma / Horários Completos */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground mb-6 flex items-center gap-4">
                            <span>Histórico e Próximas Disciplinas</span>
                            <div className="h-px bg-border flex-1" />
                        </h4>
                        
                        {mySchedules.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 border border-border border-dashed rounded-3xl">
                                <CalendarDays className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium italic">Nenhum horário cadastrado.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {mySchedules.map(sched => {
                                    const disc = disciplines.find(d => d.id === sched.disciplineId)
                                    const grade = officialGrades.find(g => g.disciplineId === sched.disciplineId)
                                    
                                    const totalGrade = grade ? (
                                        (grade.examGrade || 0) + (grade.worksGrade || 0) + (grade.seminarGrade || 0) + (grade.participationBonus || 0) + (grade.attendanceScore || 0)
                                    ) : 0
                                    const divisor = (grade?.customDivisor && grade.customDivisor > 0) ? grade.customDivisor : 1
                                    const average = grade ? totalGrade / divisor : null
                                    
                                    const isCurrentMonth = disc?.description?.toLowerCase().includes(new Date().toLocaleString('pt-br', { month: 'long' }).toLowerCase())
                                    if (isCurrentMonth) return null // Skip as it's already in the highlight section

                                    return (
                                        <div key={sched.id} className="bg-white border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group opacity-85 hover:opacity-100 italic">
                                            <div className="bg-slate-100 text-slate-500 font-bold px-3 py-1.5 rounded-lg text-xs inline-block mb-4 tracking-tighter uppercase">
                                                {DAY_LABEL[sched.dayOfWeek] || sched.dayOfWeek}
                                            </div>
                                            <p className="font-bold text-lg text-foreground mb-1 line-clamp-1 leading-tight">{disc?.name || "Disciplina"}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
                                                <GraduationCap className="h-3 w-3 opacity-40" /> {sched.professorName && sched.professorName !== "Sem Professor" ? sched.professorName : (disc?.professorName || "Docente Central")}
                                            </p>

                                            <div className="mt-4 pt-4 border-t border-dashed border-border/60">
                                                {average !== null ? (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Status:</span>
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                            average >= 7 ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                                                        )}>
                                                            {average >= 7 ? "Aprovado" : "Reprovado"}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between opacity-40">
                                                        <span className="text-[9px] uppercase font-bold text-slate-400">Pendente</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Seção 3: Colegas de Classe */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground mb-6 flex items-center gap-4">
                            <span>Meus Colegas de Classe</span>
                            <div className="h-px bg-border flex-1" />
                        </h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {classmates.map(student => (
                                <div key={student.id} className="bg-white border border-border p-4 rounded-2xl flex flex-col items-center text-center group hover:shadow-md transition-all">
                                    <div className="h-16 w-16 rounded-full bg-slate-100 mb-3 border-2 border-slate-50 overflow-hidden relative group-hover:scale-105 transition-transform">
                                        {student.avatar_url ? (
                                            <img src={student.avatar_url} alt={student.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-lg font-bold text-slate-400">
                                                {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-foreground line-clamp-1">{student.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">Acadêmico</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
