"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, AlertTriangle, Clock, BookOpenCheck, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  getAssessmentById, getQuestionsByDiscipline, saveDraftAnswers, getDraftAnswers,
  saveSubmission, calculateScore, clearStudentSession, getDisciplines,
  type StudentSession, type StudentAnswer, type StudentSubmission, uid,
  type Assessment, type Question, type Discipline,
} from "@/lib/store"
import { cn } from "@/lib/utils"

function PortraitGuard() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center lg:hidden portrait:hidden">
      <div className="mb-6 flex animate-bounce h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <RotateCcw className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold mb-2 font-serif text-primary">Modo Retrato Recomendado</h2>
      <p className="text-muted-foreground text-sm max-w-[280px]">
        Para uma melhor experiência e visualização das questões durante a prova, por favor gire seu dispositivo para o <strong>modo retrato</strong>.
      </p>
    </div>
  )
}

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
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [focusLostCount, setFocusLostCount] = useState(0)
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
        let selectedQs = a.questionIds.map(id => allQs.find(q => q.id === id)).filter(Boolean) as Question[]
        
        // Shuffle questions and choices if enabled
        if (a.shuffleVariants) {
          selectedQs = [...selectedQs].sort(() => Math.random() - 0.5)
          selectedQs = selectedQs.map(q => {
            if (q.type === "multiple-choice" && q.choices) {
              return { ...q, choices: [...q.choices].sort(() => Math.random() - 0.5) }
            }
            return q
          })
        }
        
        setQuestions(selectedQs)
        setDisc(allDs.find(d => d.id === a.disciplineId) || null)

        // Initialize timer
        if (a.timeLimitMinutes) {
          const totalSecs = a.timeLimitMinutes * 60
          const currentElapsed = Math.floor((Date.now() - startedAt.current.getTime()) / 1000)
          setTimeLeft(Math.max(0, totalSecs - currentElapsed))
        }
      }
      setIsInitializing(false)
    }
    load()
    return () => { mounted = false }
  }, [session.assessmentId])

  const handleFinalize = useCallback(async () => {
    if (!assessment) return
    const elapsedSecs = Math.floor((Date.now() - startedAt.current.getTime()) / 1000)
    const { score, totalPoints, percentage } = calculateScore(answers, questions, assessment.pointsPerQuestion)

    const sub: StudentSubmission = {
      id: uid(),
      assessmentId: assessment.id,
      studentId: session.studentId,
      studentName: session.name,
      studentEmail: session.email,
      answers,
      score,
      totalPoints,
      percentage,
      submittedAt: new Date().toISOString(),
      timeElapsedSeconds: elapsedSecs,
      focusLostCount,
    }
    await saveSubmission(sub)
    clearStudentSession()
    onSubmit(sub)
  }, [answers, assessment, questions, session, onSubmit, focusLostCount])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current.getTime()) / 1000))
      setTimeLeft(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(interval)
          handleFinalize()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [handleFinalize])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusLostCount(prev => prev + 1)
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
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

  const handleSubAnswer = useCallback((questionId: string, key: string, value: string) => {
    setAnswers((prev) => {
      const existing = prev.find(a => a.questionId === questionId)
      let currentData: Record<string, string> = {}
      if (existing) {
        try { currentData = JSON.parse(existing.answer) } catch { }
      }
      currentData[key] = value
      const answerStr = JSON.stringify(currentData)
      
      const filtered = prev.filter((a) => a.questionId !== questionId)
      const updated = [...filtered, { questionId, answer: answerStr }]
      saveDraftAnswers(updated)
      return updated
    })
  }, [])


  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
        <Clock className="h-10 w-10 animate-pulse text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-serif animate-pulse">Preparando sua avaliação...</p>
      </div>
    )
  }

  if (!assessment) {
    console.error("Assessment not found for ID:", session.assessmentId)
    return (
      <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center glass rounded-3xl m-4 border-destructive/20 shadow-xl">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl sm:text-3xl font-bold font-serif">Avaliação não encontrada</h2>
        <p className="text-muted-foreground mt-3 max-w-md mx-auto">
          O link pode ter expirado ou o ID informado está incorreto. 
          <span className="block mt-1 text-xs opacity-50 font-mono">ID: {session.assessmentId}</span>
        </p>
        <Button className="mt-8 px-8 py-6 text-lg rounded-2xl premium-shadow" onClick={() => window.location.href = "/"}>
          Voltar ao Início
        </Button>
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
    <div className="space-y-6">
      <PortraitGuard />
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
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-mono font-semibold transition-colors",
            timeLeft !== null && timeLeft < 300 ? "text-red-500 animate-pulse" : "text-muted-foreground"
          )}>
            <Clock className="h-4 w-4" />
            {timeLeft !== null ? (
              <span title="Tempo restante">-{formatTime(timeLeft)}</span>
            ) : (
              formatTime(elapsed)
            )}
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

              {/* Fill in the Blanks */}
              {q.type === "fill-in-the-blank" && (
                <div className="text-base leading-relaxed text-foreground bg-secondary/20 p-4 rounded-xl border border-secondary/30">
                  {(() => {
                    const parts = q.text.split(/(\[\[.*?\]\])/g)
                    let blankIdx = 0
                    let currentData: Record<string, string> = {}
                    try { currentData = JSON.parse(selected) } catch { }
                    
                    return parts.map((part, pi) => {
                      if (part.startsWith("[[") && part.endsWith("]]")) {
                        const idx = blankIdx++
                        const key = `blank_${idx}`
                        return (
                          <input
                            key={pi}
                            type="text"
                            value={currentData[key] || ""}
                            onChange={(e) => handleSubAnswer(q.id, key, e.target.value)}
                            className="mx-1 px-2 py-0.5 border-b-2 border-primary bg-background focus:outline-none focus:border-accent min-w-[80px] text-center"
                            placeholder="..."
                          />
                        )
                      }
                      return <span key={pi}>{part}</span>
                    })
                  })()}
                </div>
              )}

              {/* Matching */}
              {q.type === "matching" && q.pairs && (
                <div className="flex flex-col gap-3">
                  {(() => {
                    let currentData: Record<string, string> = {}
                    try { currentData = JSON.parse(selected) } catch { }

                    // We shuffle the right side once or use fixed. 
                    // To keep it simple, we just show choices as a Select.
                    const allRights = q.pairs.map(p => p.right).sort()

                    return q.pairs.map((p, pi) => (
                      <div key={p.id} className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border border-border bg-background">
                        <div className="flex-1 text-sm font-medium">{p.left}</div>
                        <div className="hidden sm:block text-muted-foreground">→</div>
                        <div className="w-full sm:w-64">
                          <Select
                            value={currentData[p.id] || ""}
                            onValueChange={(val: string) => handleSubAnswer(q.id, p.id, val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione a correspondência" />
                            </SelectTrigger>
                            <SelectContent>
                              {allRights.map((r, ri) => (
                                <SelectItem key={ri} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
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
