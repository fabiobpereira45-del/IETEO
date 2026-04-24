"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  BookOpenCheck, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  HelpCircle,
  Hash,
  LayoutGrid
} from "lucide-react"
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
  const [currentIndex, setCurrentIndex] = useState(0)
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
  }, [assessment, isInitializing, handleFinalize])

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

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const progress = questions.length > 0 ? Math.round((answers.length / questions.length) * 100) : 0

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
        <Clock className="h-12 w-12 animate-spin text-primary mb-6" />
        <p className="text-xl font-serif font-medium text-primary animate-pulse">Preparando sua avaliação sagrada...</p>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center glass rounded-3xl m-4 border-destructive/20 shadow-xl">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-bold font-serif">Avaliação não encontrada</h2>
        <p className="text-muted-foreground mt-3 max-w-md mx-auto">
          O link pode ter expirado ou o ID informado está incorreto.
        </p>
        <Button className="mt-8 px-8 py-6 text-lg rounded-2xl premium-shadow" onClick={() => window.location.href = "/"}>
          Voltar ao Início
        </Button>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const isSummary = currentIndex === questions.length

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
      <PortraitGuard />

      {/* Modern Header Navigation */}
      <div className="sticky top-[73px] z-50 -mx-4 px-4 bg-background/80 backdrop-blur-xl border-b border-border/40 pb-4">
        <div className="flex flex-col gap-4">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <h2 className="text-sm font-bold font-serif line-clamp-1">{assessment.title}</h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {disc?.name} • Prof. {assessment.professor}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-500",
                timeLeft !== null && timeLeft < 300 
                  ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" 
                  : "bg-primary/5 text-primary border-primary/10"
              )}>
                <Clock className="h-3.5 w-3.5" />
                {timeLeft !== null ? formatTime(timeLeft) : formatTime(elapsed)}
              </div>
              
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-primary/20">
                {assessment.totalPoints.toFixed(1)} pts
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="rounded-xl h-10 w-10 p-0 sm:w-auto sm:px-4 shrink-0 transition-transform active:scale-95"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <div className="flex-1 bg-secondary/30 rounded-xl h-10 px-4 flex items-center justify-center relative overflow-hidden group">
              <div 
                className="absolute inset-0 bg-primary/5 transition-all duration-1000" 
                style={{ width: `${progress}%` }} 
              />
              <span className="relative text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                Questão {Math.min(currentIndex + 1, questions.length)} de {questions.length}
              </span>
            </div>

            <Button
              variant={isSummary ? "default" : "outline"}
              size="sm"
              disabled={isSummary}
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className={cn(
                "rounded-xl h-10 w-10 p-0 sm:w-auto sm:px-4 shrink-0 transition-all active:scale-95",
                isLastQuestion && "bg-accent hover:bg-accent/90 text-accent-foreground border-accent"
              )}
            >
              <span className="hidden sm:inline">{isLastQuestion ? "Revisar" : "Próxima"}</span>
              <ChevronRight className="h-4 w-4 sm:ml-2" />
            </Button>
          </div>
          
          <Progress value={progress} className="h-1 px-1 bg-secondary/50" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[50vh] flex flex-col items-center justify-center pt-8">
        {!isSummary && currentQuestion ? (
          <div key={currentQuestion.id} className="w-full space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
            {/* Question Header */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest">
                <Hash className="h-3 w-3" />
                Questão {currentIndex + 1} • {assessment.pointsPerQuestion} Ponto
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold leading-tight text-foreground text-pretty">
                {currentQuestion.text}
              </h3>
            </div>

            {/* Question Interaction Area */}
            <div className="w-full max-w-2xl mx-auto">
              {/* Multiple Choice */}
              {currentQuestion.type === "multiple-choice" && (
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.choices.map((choice, ci) => {
                    const isSelected = getAnswer(currentQuestion.id) === choice.id
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleAnswer(currentQuestion.id, choice.id)}
                        className={cn(
                          "group relative flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 hover:shadow-md active:scale-[0.98]",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/5 ring-4 ring-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold transition-all duration-300",
                          isSelected ? "bg-primary text-primary-foreground rotate-6" : "bg-secondary text-secondary-foreground"
                        )}>
                          {String.fromCharCode(65 + ci)}
                        </div>
                        <span className={cn(
                          "text-base leading-relaxed flex-1 transition-colors",
                          isSelected ? "text-primary font-semibold" : "text-foreground/80 group-hover:text-foreground"
                        )}>
                          {choice.text}
                        </span>
                        {isSelected && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <CheckCircle2 className="h-6 w-6 text-primary animate-in zoom-in duration-300" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* True / False */}
              {currentQuestion.type === "true-false" && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { val: "true", label: "Verdadeiro", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
                    { val: "false", label: "Falso", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-500/10", border: "border-rose-500/30" },
                  ].map(({ val, label, icon: Icon, color, bg, border }) => {
                    const isSelected = getAnswer(currentQuestion.id) === val
                    return (
                      <button
                        key={val}
                        onClick={() => handleAnswer(currentQuestion.id, val)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-4 py-12 rounded-3xl border-2 transition-all duration-300 active:scale-95",
                          isSelected
                            ? `${border} ${bg} shadow-xl shadow-black/5 ring-4 ring-primary/5`
                            : "border-border bg-card hover:border-primary/20 hover:bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isSelected ? `${bg} ${color} scale-110 rotate-12` : "bg-secondary text-muted-foreground"
                        )}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <span className={cn(
                          "text-xl font-bold font-serif transition-colors",
                          isSelected ? color : "text-muted-foreground"
                        )}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Discursive */}
              {currentQuestion.type === "discursive" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Textarea
                      placeholder="Sua resposta fundamentada aqui..."
                      rows={8}
                      value={getAnswer(currentQuestion.id)}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="resize-none rounded-3xl p-6 text-lg border-2 focus:border-primary transition-all shadow-inner bg-secondary/10"
                    />
                    <div className="absolute right-4 bottom-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                      Campo de texto livre
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground italic">
                    Dica: Seja claro e objetivo em sua argumentação teológica.
                  </p>
                </div>
              )}

              {/* Enhanced Fill in the Blanks */}
              {currentQuestion.type === "fill-in-the-blank" && (
                <div className="rounded-3xl border-2 border-primary/10 bg-gradient-to-br from-card to-secondary/20 p-8 shadow-xl">
                  <div className="text-xl leading-loose text-foreground/90 font-serif text-center">
                    {(() => {
                      const parts = currentQuestion.text.split(/(\[\[.*?\]\])/g)
                      let blankIdx = 0
                      let currentData: Record<string, string> = {}
                      try { currentData = JSON.parse(getAnswer(currentQuestion.id)) } catch { }
                      
                      return parts.map((part, pi) => {
                        if (part.startsWith("[[") && part.endsWith("]]")) {
                          const idx = blankIdx++
                          const key = `blank_${idx}`
                          return (
                            <span key={pi} className="inline-block relative group mx-1">
                              <input
                                type="text"
                                value={currentData[key] || ""}
                                onChange={(e) => handleSubAnswer(currentQuestion.id, key, e.target.value)}
                                className={cn(
                                  "px-3 py-1 border-b-4 bg-transparent focus:outline-none transition-all text-primary font-bold min-w-[120px] text-center placeholder:text-muted-foreground/30",
                                  currentData[key] ? "border-primary" : "border-primary/20 focus:border-primary"
                                )}
                                placeholder="preencher..."
                              />
                            </span>
                          )
                        }
                        return <span key={pi}>{part}</span>
                      })
                    })()}
                  </div>
                  <div className="mt-8 flex justify-center">
                    <div className="px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest border border-primary/10">
                      Complete as lacunas acima
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Matching */}
              {currentQuestion.type === "matching" && currentQuestion.pairs && (
                <div className="space-y-4">
                  {(() => {
                    let currentData: Record<string, string> = {}
                    try { currentData = JSON.parse(getAnswer(currentQuestion.id)) } catch { }
                    const allRights = [...new Set(currentQuestion.pairs.map(p => p.right))].sort()

                    return (
                      <div className="grid grid-cols-1 gap-4">
                        {currentQuestion.pairs.map((p, pi) => (
                          <div key={p.id} className="group flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex-1 flex items-center gap-4">
                              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                {pi + 1}
                              </div>
                              <div className="text-base font-medium font-serif leading-tight">{p.left}</div>
                            </div>
                            
                            <div className="hidden sm:flex text-primary/30 group-hover:text-primary transition-colors">
                              <ChevronRight className="h-5 w-5" />
                            </div>

                            <div className="w-full sm:w-72">
                              <Select
                                value={currentData[p.id] || ""}
                                onValueChange={(val: string) => handleSubAnswer(currentQuestion.id, p.id, val)}
                              >
                                <SelectTrigger className="h-12 rounded-xl border-2 focus:ring-primary focus:ring-offset-0 bg-secondary/5">
                                  <SelectValue placeholder="Selecione o par..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {allRights.map((r, ri) => (
                                    <SelectItem key={ri} value={r} className="rounded-lg py-3">{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Summary View */
          <div className="w-full max-w-3xl space-y-8 animate-in zoom-in-95 fade-in duration-500 pb-12">
            <div className="text-center space-y-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-2 shadow-inner">
                <LayoutGrid className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-serif font-bold">Revisão Final</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Confira se todas as questões foram respondidas antes de enviar sua avaliação definitiva.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {questions.map((q, i) => {
                const answered = !!getAnswer(q.id)
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                      answered 
                        ? "border-primary/30 bg-primary/5 text-primary" 
                        : "border-border bg-card text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    <span className="text-sm font-bold opacity-50 mb-1">Questão</span>
                    <span className="text-3xl font-serif font-black">{i + 1}</span>
                    <div className={cn(
                      "mt-3 h-1.5 w-1.5 rounded-full transition-all",
                      answered ? "bg-primary scale-150" : "bg-muted-foreground/30 group-hover:bg-primary/30"
                    )} />
                  </button>
                )
              })}
            </div>

            <div className="rounded-3xl border-2 border-primary/20 bg-primary/5 p-8 text-center space-y-6 shadow-xl shadow-primary/5">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-primary">Status da Avaliação</p>
                <p className="text-sm text-muted-foreground">
                  {answers.length} de {questions.length} questões respondidas.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(0)}
                  className="rounded-2xl h-14 px-8 border-2 font-bold transition-all hover:bg-background"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Recomeçar Revisão
                </Button>
                
                <Button
                  onClick={() => setShowConfirm(true)}
                  className="rounded-2xl h-14 px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Agora
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <HelpCircle className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-serif font-bold">Deseja concluir?</DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-medium">
              Ao confirmar, suas respostas serão seladas e enviadas para correção. 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </div>
          
          <div className="p-8 space-y-3">
            {answers.length < questions.length && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-bold mb-4">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Atenção: Você ainda tem {questions.length - answers.length} questões em branco!
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => { setShowConfirm(false); handleFinalize() }}
                className="rounded-2xl h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
              >
                Sim, enviar avaliação
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowConfirm(false)} 
                className="rounded-2xl h-14 font-medium text-muted-foreground hover:bg-secondary/50"
              >
                Não, voltar para revisão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
