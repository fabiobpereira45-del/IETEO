"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, AlertTriangle, Clock, BookOpenCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  getAssessmentById, getQuestionsByDiscipline, saveDraftAnswers, getDraftAnswers,
  saveSubmission, calculateScore, clearStudentSession, getDisciplines,
  type StudentSession, type StudentAnswer, type StudentSubmission, uid,
  type Assessment, type Question, type Discipline,
} from "@/lib/store"
import { cn } from "@/lib/utils"

interface Props {
  session: StudentSession
  onSubmit: (sub: StudentSubmission) => void
}

export function AssessmentForm({ session, onSubmit }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [disc, setDisc] = useState<Discipline | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [answers, setAnswers] = useState<StudentAnswer[]>(() => getDraftAnswers())
  const [showConfirm, setShowConfirm] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<Date>(new Date(session.startedAt))

  useEffect(() => {
    let mounted = true
    async function load() {
      const a = await getAssessmentById(session.assessmentId)
      if (!mounted) return
      setAssessment(a)
      if (a) {
        const [allQs, allDs] = await Promise.all([
          getQuestionsByDiscipline(a.disciplineId),
          getDisciplines()
        ])
        if (!mounted) return
        const selectedQs = a.questionIds.map(id => allQs.find(q => q.id === id)).filter(Boolean) as Question[]
        setQuestions(selectedQs)
        setDisc(allDs.find(d => d.id === a.disciplineId) || null)
      }
      setIsInitializing(false)
    }
    load()
    return () => { mounted = false }
  }, [session.assessmentId])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isInitializing || !assessment?.closeAt) return
    const ms = new Date(assessment.closeAt).getTime() - Date.now()
    if (ms <= 0) { handleFinalize(); return }
    const t = setTimeout(() => handleFinalize(), ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment, isInitializing])

  const getAnswer = (questionId: string) =>
    answers.find((a) => a.questionId === questionId)?.answer ?? ""

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId)
      const updated = answer ? [...filtered, { questionId, answer }] : filtered
      saveDraftAnswers(updated)
      return updated
    })
  }, [])

  const handleFinalize = useCallback(async () => {
    if (!assessment) return
    const elapsedSecs = Math.floor((Date.now() - startedAt.current.getTime()) / 1000)
    const { score, totalPoints, percentage } = calculateScore(answers, questions, assessment.pointsPerQuestion)

    const sub: StudentSubmission = {
      id: uid(),
      assessmentId: assessment.id,
      studentName: session.name,
      studentEmail: session.email,
      answers,
      score,
      totalPoints,
      percentage,
      submittedAt: new Date().toISOString(),
      timeElapsedSeconds: elapsedSecs,
    }
    await saveSubmission(sub)
    clearStudentSession()
    onSubmit(sub)
  }, [answers, assessment, questions, session, onSubmit])

  if (isInitializing) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground animate-pulse">Carregando avaliação...</div>
  }

  if (!assessment) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
        Avaliação não encontrada. Por favor, recarregue a página.
      </div>
    )
  }

  const answered = answers.length
  const progress = Math.round((answered / questions.length) * 100)

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Assessment Info Header */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 sm:p-6 shadow-md border-b-4 border-accent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm shrink-0">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <div>
              {assessment.institution && (
                <div className="mb-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/90 border border-white/20">
                    {assessment.institution}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-serif font-bold leading-tight text-white/95">{assessment.title}</h2>
              <p className="mt-1 text-xs text-primary-foreground/80 font-medium tracking-wide">
                {disc?.name ?? "Disciplina Geral"} <span className="mx-1 opacity-50">•</span> Prof. {assessment.professor}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 bg-black/10 sm:bg-transparent p-2 sm:p-0 rounded-lg w-full sm:w-auto flex sm:block items-center justify-between">
            <div className="text-sm font-bold text-white/95">{assessment.totalPoints.toFixed(1)} pts</div>
            <div className="text-xs text-primary-foreground/70 sm:mt-0.5">{questions.length} questões</div>
          </div>
        </div>
      </div>

      {/* Sticky progress bar */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur border-b border-border pb-3 -mx-4 px-4 pt-1">
        <div className="flex items-center justify-between mb-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{answered}</span>
            <span>de</span>
            <span className="font-semibold text-foreground">{questions.length}</span>
            <span>respondidas</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-mono font-semibold text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(elapsed)}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-5">
        {questions.map((q, idx) => {
          const selected = getAnswer(q.id)
          const isAnswered = !!selected
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-2xl border bg-card p-6 shadow-sm transition-all",
                isAnswered ? "border-accent/40 ring-1 ring-accent/20" : "border-border"
              )}
            >
              <div className="flex items-start gap-3 mb-5">
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isAnswered ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
                )}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {q.type === "multiple-choice" ? "Múltipla Escolha" : q.type === "true-false" ? "Verdadeiro ou Falso" : "Discursiva"}
                      {" "}· {assessment.pointsPerQuestion} pt
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-foreground font-medium text-pretty">{q.text}</p>
                </div>
              </div>

              {/* Multiple choice */}
              {q.type === "multiple-choice" && (
                <div className="flex flex-col gap-2">
                  {q.choices.map((choice, ci) => {
                    const isSelected = selected === choice.id
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleAnswer(q.id, choice.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-accent bg-accent/10 text-foreground font-medium"
                            : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:bg-accent/5 hover:text-foreground"
                        )}
                      >
                        <span className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border transition-all",
                          isSelected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-secondary text-secondary-foreground"
                        )}>
                          {String.fromCharCode(65 + ci)}
                        </span>
                        <span className="leading-relaxed">{choice.text}</span>
                        {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-accent" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* True / False */}
              {q.type === "true-false" && (
                <div className="flex gap-3">
                  {[
                    { val: "true", label: "Verdadeiro" },
                    { val: "false", label: "Falso" },
                  ].map(({ val, label }) => {
                    const isSelected = selected === val
                    return (
                      <button
                        key={val}
                        onClick={() => handleAnswer(q.id, val)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                          isSelected
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-muted-foreground"
                        )}
                      >
                        {label}
                        {isSelected && <CheckCircle2 className="inline ml-2 h-4 w-4" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Discursive */}
              {q.type === "discursive" && (
                <Textarea
                  placeholder="Digite sua resposta aqui..."
                  rows={4}
                  value={selected}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  className="resize-y"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Finalize button */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Pronto para finalizar?</p>
          <p className="text-sm text-muted-foreground">
            {answered < questions.length
              ? `Você deixou ${questions.length - answered} questão(ões) sem resposta.`
              : "Todas as questões foram respondidas."}
          </p>
        </div>
        <Button
          onClick={() => setShowConfirm(true)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6 h-11 text-base w-full sm:w-auto"
        >
          Finalizar Avaliação
        </Button>
      </div>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                <AlertTriangle className="h-6 w-6 text-accent" />
              </div>
            </div>
            <DialogTitle className="text-center">Confirmar envio</DialogTitle>
            <DialogDescription className="text-center">
              Após finalizar, suas respostas serão bloqueadas e não poderão ser alteradas.{" "}
              {answered < questions.length && (
                <strong>Você ainda tem {questions.length - answered} questão(ões) sem resposta.</strong>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Revisar respostas</Button>
            <Button
              onClick={() => { setShowConfirm(false); handleFinalize() }}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            >
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
