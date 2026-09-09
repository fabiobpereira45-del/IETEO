"use client"

import { useState, useEffect } from "react"
import { AssessmentForm } from "@/components/assessment-form"
import { AssessmentResult } from "@/components/assessment-result"
import {
    getAssessments,
    getDisciplines,
    getStudentGrades,
    getGradeSettings,
    calculateGlobalAverage,
    type Assessment,
    type StudentSubmission,
    type Discipline,
    type StudentSession,
    type StudentGrade,
    type GradeSettings,
} from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { BookOpenCheck, CheckCircle2, ArrowRight, Loader2, CalendarDays, Lock, FileText, ShieldAlert } from "lucide-react"

interface Props {
    studentId: string
    studentName: string
    studentEmail: string
    studentDoc?: string
}

type ViewState = "list" | "taking" | "result"

export function StudentAssessmentView({ studentId, studentName, studentEmail, studentDoc }: Props) {
    const [assessments, setAssessments] = useState<Assessment[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
    const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
    const [gradeSettings, setGradeSettings] = useState<GradeSettings | null>(null)

    const [loading, setLoading] = useState(true)
    const [viewState, setViewState] = useState<ViewState>("list")
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
    const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null)

    const supabase = createClient()

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [a, d, allGrades, settings] = await Promise.all([
                    getAssessments(),
                    getDisciplines(),
                    getStudentGrades(),
                    getGradeSettings(),
                ])

                // Fetch submissions for this student's ID (Strict Isolation)
                const { data: subsData } = await supabase
                    .from('student_submissions')
                    .select('*')
                    .eq('student_id', studentId)

                const subs: StudentSubmission[] = (subsData || []).map((row: any) => ({
                    id: row.id,
                    assessmentId: row.assessment_id,
                    studentId: row.student_id,
                    studentName: row.student_name,
                    studentEmail: row.student_email,
                    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
                    score: row.score,
                    totalPoints: row.total_points,
                    percentage: row.percentage,
                    timeElapsedSeconds: row.time_elapsed_seconds,
                    submittedAt: row.submitted_at,
                    createdAt: row.created_at,
                }))

                // Filter official grades for this student
                const myGrades = allGrades.filter(g => {
                    const idMatch = !!(studentId && (g.studentId === studentId || g.student_id === studentId))
                    const cleanDoc = studentDoc?.replace(/\D/g, '') || ""
                    const cleanIdentifier = g.studentIdentifier?.replace(/\D/g, '') || ""
                    const docMatch = !!(cleanDoc && cleanIdentifier && cleanDoc === cleanIdentifier)
                    const emailMatch = !!(g.studentIdentifier && studentEmail && g.studentIdentifier.toLowerCase().trim() === studentEmail.toLowerCase().trim())
                    const rawIdentMatch = !!(g.studentIdentifier && (g.studentIdentifier === studentDoc || g.studentIdentifier === studentId))
                    return idMatch || docMatch || emailMatch || rawIdentMatch
                })

                setAssessments(a.filter(ass => ass.isPublished))
                setDisciplines(d)
                setSubmissions(subs)
                setStudentGrades(myGrades)
                setGradeSettings(settings)
            } catch (err) {
                console.error("Error loading assessments", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [studentId, studentEmail, supabase])

    /**
     * Computes a student's average for a given discipline.
     * Returns null if no official grade record exists for this discipline.
     */
    const getAverageForDiscipline = (disciplineId: string): number | null => {
        if (!gradeSettings) return null
        const grade = studentGrades.find(g => g.disciplineId === disciplineId)
        if (!grade) return null
        return parseFloat(calculateGlobalAverage(grade, gradeSettings))
    }

    /**
     * Resolves whether a Final Exam is accessible to the current student.
     * Returns: "available" | "blocked_approved" | "blocked_no_grade"
     */
    const getFinalExamStatus = (ass: Assessment): "available" | "blocked_approved" | "blocked_no_grade" => {
        const avg = getAverageForDiscipline(ass.disciplineId)
        if (avg === null) return "blocked_no_grade"
        if (avg >= 7.0) return "blocked_approved"
        return "available"
    }

    const handleStart = (ass: Assessment) => {
        setSelectedAssessment(ass)
        setViewState("taking")
    }

    const handleViewResult = (ass: Assessment, sub: StudentSubmission) => {
        setSelectedAssessment(ass)
        setSelectedSubmission(sub)
        setViewState("result")
    }

    const handleCompleteTest = (sub: StudentSubmission) => {
        setSubmissions(prev => [...prev.filter(s => s.id !== sub.id), sub])
        setSelectedSubmission(sub)
        setViewState("result")
    }

    const handleBackToList = () => {
        setViewState("list")
        setSelectedAssessment(null)
        setSelectedSubmission(null)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 opacity-50">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (viewState === "taking" && selectedAssessment) {
        const session: StudentSession = {
            studentId,
            name: studentName,
            email: studentEmail,
            assessmentId: selectedAssessment.id,
            startedAt: new Date().toISOString()
        }
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4">
                    <Button variant="ghost" onClick={handleBackToList} className="text-muted-foreground">
                        ← Voltar para Lista de Provas
                    </Button>
                </div>
                <AssessmentForm session={session} onSubmit={handleCompleteTest} />
            </div>
        )
    }

    if (viewState === "result" && selectedSubmission) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AssessmentResult submission={selectedSubmission} onBack={handleBackToList} />
            </div>
        )
    }

    const now = new Date()

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-2">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 bg-accent/10 rounded-full flex items-center justify-center">
                        <BookOpenCheck className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-lg">Central de Avaliações</h3>
                        <p className="text-sm text-muted-foreground">Acesse as provas disponíveis para o seu curso.</p>
                    </div>
                </div>
            </div>

            {assessments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-border border-dashed rounded-xl bg-card/50">
                    <FileText className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    <p>Nenhuma avaliação disponível no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {assessments.map(ass => {
                        const disc = disciplines.find(d => d.id === ass.disciplineId)
                        const sub = submissions.find(s => s.assessmentId === ass.id)

                        const isOpen = (!ass.openAt || new Date(ass.openAt) <= now)
                        const isClosed = (ass.closeAt && new Date(ass.closeAt) < now)
                        const isTakeable = isOpen && !isClosed

                        // Final exam access control
                        const finalExamStatus = ass.isFinalExam ? getFinalExamStatus(ass) : null
                        const isFinalExamBlocked = finalExamStatus === "blocked_approved" || finalExamStatus === "blocked_no_grade"

                        return (
                            <div key={ass.id} className={`bg-card border rounded-xl p-5 shadow-sm transition-colors flex flex-col h-full ${
                                ass.isFinalExam
                                    ? isFinalExamBlocked
                                        ? "border-muted/60 opacity-75"
                                        : "border-amber-300 hover:border-amber-400"
                                    : "border-border hover:border-accent/40"
                            }`}>
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-bold text-foreground text-lg line-clamp-2 leading-tight">{ass.title}</h4>
                                            {ass.isFinalExam && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-tighter shrink-0">
                                                    <ShieldAlert className="h-3 w-3" /> Prova Final
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-accent font-medium">{disc?.name ?? "Geral"} • Prof. {ass.professor}</p>
                                    </div>
                                    {sub ? (
                                        <div className="bg-green-100 text-green-700 p-2 rounded-full shrink-0" title="Prova Realizada">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    ) : isFinalExamBlocked ? (
                                        <div className="bg-muted text-muted-foreground p-2 rounded-full shrink-0" title="Prova Bloqueada">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                    ) : !isTakeable ? (
                                        <div className="bg-muted text-muted-foreground p-2 rounded-full shrink-0" title="Prova Fechada">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground mb-4">
                                    <span className="bg-muted px-2.5 py-1 rounded-md">{ass.questionIds.length} Questões</span>
                                    <span className="bg-muted px-2.5 py-1 rounded-md">{ass.totalPoints.toFixed(1)} pts</span>
                                    {ass.closeAt && (
                                        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                                            <CalendarDays className="h-3.5 w-3.5" /> Até {new Date(ass.closeAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    )}
                                </div>

                                {/* Final Exam info block */}
                                {ass.isFinalExam && !sub && (
                                    <div className={`mb-3 p-3 rounded-xl border text-[11px] font-medium flex items-start gap-2 ${
                                        finalExamStatus === "blocked_approved"
                                            ? "bg-green-50 border-green-200 text-green-800"
                                            : finalExamStatus === "blocked_no_grade"
                                            ? "bg-muted/50 border-border text-muted-foreground"
                                            : "bg-amber-50 border-amber-200 text-amber-800"
                                    }`}>
                                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            {finalExamStatus === "blocked_approved" && (
                                                <>Você foi <strong>aprovado(a)</strong> nesta disciplina (média {getAverageForDiscipline(ass.disciplineId)?.toFixed(2)}). A Prova Final está disponível apenas para alunos com média abaixo de 7.0.</>
                                            )}
                                            {finalExamStatus === "blocked_no_grade" && (
                                                <>Aguardando lançamento de nota pelo professor. A Prova Final será liberada após a confirmação da sua média.</>
                                            )}
                                            {finalExamStatus === "available" && (
                                                <>Sua média atual ({getAverageForDiscipline(ass.disciplineId)?.toFixed(2)}) está abaixo do mínimo (7.0). Você tem acesso à Prova Final de Recuperação.</>
                                            )}
                                        </span>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-border/50">
                                    {sub ? (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between group"
                                            onClick={() => handleViewResult(ass, sub)}
                                        >
                                            <span>Ver Resultado</span>
                                            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </Button>
                                    ) : isFinalExamBlocked ? (
                                        <Button variant="secondary" disabled className="w-full">
                                            <Lock className="h-4 w-4 mr-2" />
                                            {finalExamStatus === "blocked_approved" ? "Aprovado — Prova Final Indisponível" : "Aguardando Lançamento de Nota"}
                                        </Button>
                                    ) : isTakeable ? (
                                        <Button
                                            className={`w-full justify-between group ${ass.isFinalExam ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-accent hover:bg-accent/90 text-accent-foreground"}`}
                                            onClick={() => handleStart(ass)}
                                        >
                                            <span className="font-bold">{ass.isFinalExam ? "Fazer Prova Final" : "Fazer Prova"}</span>
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    ) : (
                                        <Button variant="secondary" disabled className="w-full">
                                            {isClosed ? "Avaliação Encerrada" : "Aguardando Liberação"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
