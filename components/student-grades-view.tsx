"use client"

import { useEffect, useState } from "react"
import { FileText, Award, CalendarCheck, Loader2 } from "lucide-react"
import {
    type Discipline, type Semester, type StudentSubmission, type Attendance, type Assessment,
    getDisciplines, getSemesters, getSubmissions, getAttendances, getAssessments
} from "@/lib/store"

interface Props {
    studentId: string
    studentEmail: string
}

export function StudentGradesView({ studentId, studentEmail }: Props) {
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
    const [assessments, setAssessments] = useState<Assessment[]>([])
    const [attendances, setAttendances] = useState<Attendance[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const [d, sem, sub, allAsses] = await Promise.all([
                getDisciplines(),
                getSemesters(),
                getSubmissions(),
                getAssessments()
            ])

            setDisciplines(d)
            setSemesters(sem)
            setAssessments(allAsses)

            // Filter submissions for this student
            const mySubs = sub.filter(s => s.studentEmail === studentEmail)
            setSubmissions(mySubs)

            // Fetch attendances across all disciplines for this student
            // In a real app we would have an endpoint getAttendancesByStudent
            // Here we will fetch all attendances for the disciplines the student is enrolled in (or just all and filter)
            // Since our getAttendances expects a disciplineId, we need to fetch for all disciplines.
            const attPromises = d.map(disc => getAttendances(disc.id))
            const allAttsArray = await Promise.all(attPromises)
            const flatAtts = allAttsArray.flat().filter(a => a.studentId === studentId)

            setAttendances(flatAtts)
            setLoading(false)
        }

        loadData()
    }, [studentId, studentEmail])

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    // Calculate overall stats
    const totalSubmissions = submissions.length
    let globalScore = 0
    let globalTotal = 0
    submissions.forEach(s => {
        globalScore += s.score
        globalTotal += s.totalPoints
    })
    const globalPercentage = globalTotal > 0 ? Math.round((globalScore / globalTotal) * 100) : 0

    const totalClasses = attendances.length
    const totalPresent = attendances.filter(a => a.isPresent).length
    const attendancePercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 100

    // Group by Semester -> Discipline
    // For each discipline, get its assessment and submission

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desempenho Geral */}
                <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Aproveitamento Geral (Provas)</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold font-serif">{globalPercentage}%</h3>
                            <p className="text-xs text-muted-foreground">({totalSubmissions} provas realizadas)</p>
                        </div>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Award className="h-6 w-6" />
                    </div>
                </div>

                {/* Frequência Geral */}
                <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Frequência Geral</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold font-serif">{attendancePercentage}%</h3>
                            <p className="text-xs text-muted-foreground">({totalPresent} presenças em {totalClasses} aulas)</p>
                        </div>
                    </div>
                    <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                        <CalendarCheck className="h-6 w-6" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <h3 className="text-xl font-bold font-serif text-foreground border-b border-border pb-2">Boletim Detalhado</h3>

                {semesters.length === 0 ? (
                    <p className="text-muted-foreground italic text-sm">Nenhum semestre cadastrado.</p>
                ) : (
                    semesters.sort((a, b) => a.order - b.order).map(sem => {
                        const semDisciplines = disciplines.filter(d => d.semesterId === sem.id)
                        if (semDisciplines.length === 0) return null

                        return (
                            <div key={sem.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-muted px-4 py-3 border-b border-border">
                                    <h4 className="font-semibold text-foreground">{sem.name}</h4>
                                </div>

                                <div className="divide-y divide-border">
                                    {semDisciplines.map(disc => {
                                        // Find assessments for this discipline
                                        const discAssessments = assessments.filter(a => a.disciplineId === disc.id)
                                        // Find submissions
                                        const discSubmissions = submissions.filter(s => discAssessments.some(a => a.id === s.assessmentId))

                                        // Grades avg for discipline
                                        let discScore = 0
                                        let discTotal = 0
                                        discSubmissions.forEach(s => { discScore += s.score; discTotal += s.totalPoints })
                                        const discPercentage = discTotal > 0 ? Math.round((discScore / discTotal) * 100) : null

                                        // Attendance for discipline
                                        const discAtt = attendances.filter(a => a.disciplineId === disc.id)
                                        const discPresent = discAtt.filter(a => a.isPresent).length
                                        const discAttPct = discAtt.length > 0 ? Math.round((discPresent / discAtt.length) * 100) : null

                                        return (
                                            <div key={disc.id} className="px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                                                <div className="flex-1">
                                                    <h5 className="font-medium text-foreground">{disc.name}</h5>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Prof. {disc.professorName || "N/A"}</p>
                                                </div>

                                                <div className="flex gap-4 md:gap-8 items-center bg-background md:bg-transparent p-3 md:p-0 rounded-lg border md:border-none border-border">

                                                    <div className="flex flex-col md:items-end">
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Aproveitamento</span>
                                                        {discPercentage !== null ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${discPercentage >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {discPercentage}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground italic">-</span>
                                                        )}
                                                    </div>

                                                    <div className="h-8 w-px bg-border hidden md:block" />

                                                    <div className="flex flex-col md:items-end">
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Frequência</span>
                                                        {discAttPct !== null ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${discAttPct >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {discAttPct}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground italic">-</span>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
