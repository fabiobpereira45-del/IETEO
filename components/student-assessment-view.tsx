"use client"

import { useState, useEffect } from "react"
import { AssessmentForm } from "@/components/assessment-form"
import { AssessmentResult } from "@/components/assessment-result"
import {
    getAssessments,
    getDisciplines,
    type Assessment,
    type StudentSubmission,
    type Discipline,
    type StudentSession
} from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { BookOpenCheck, CheckCircle2, ArrowRight, Loader2, CalendarDays, Lock, FileText } from "lucide-react"

interface Props {
    studentId: string
    studentName: string
    studentEmail: string
    studentDoc?: string
}

type ViewState = "list" | "taking" | "result"

export function StudentAssessmentView({ studentName, studentEmail, studentDoc }: Props) {
    const [assessments, setAssessments] = useState<Assessment[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([])

    const [loading, setLoading] = useState(true)
    const [viewState, setViewState] = useState<ViewState>("list")
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
    const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null)

    const supabase = createClient()

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [a, d] = await Promise.all([getAssessments(), getDisciplines()])

                // Fetch submissions for this student's email
                const { data: subsData } = await supabase
                    .from('student_submissions')
                    .select('*')
                    .eq('student_email', studentEmail)

                const subs: StudentSubmission[] = (subsData || []).map(row => ({
                    id: row.id,
                    assessmentId: row.assessment_id,
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

                setAssessments(a.filter(ass => ass.isPublished))
                setDisciplines(d)
                setSubmissions(subs)
            } catch (err) {
                console.error("Error loading assessments", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [studentEmail, supabase])

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
        // Add to local state and show result
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

                        return (
                            <div key={ass.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-accent/40 transition-colors flex flex-col h-full">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-foreground text-lg line-clamp-2 leading-tight mb-1">{ass.title}</h4>
                                        <p className="text-sm text-accent font-medium">{disc?.name ?? "Geral"} • Prof. {ass.professor}</p>
                                    </div>
                                    {sub ? (
                                        <div className="bg-green-100 text-green-700 p-2 rounded-full shrink-0" title="Prova Realizada">
                                            <CheckCircle2 className="h-5 w-5" />
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
                                    ) : isTakeable ? (
                                        <Button
                                            className="w-full justify-between bg-accent hover:bg-accent/90 text-accent-foreground group"
                                            onClick={() => handleStart(ass)}
                                        >
                                            <span className="font-bold">Fazer Prova</span>
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
