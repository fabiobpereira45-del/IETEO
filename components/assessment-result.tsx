"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  Minus, 
  BookOpenCheck, 
  AlertTriangle,
  ChevronLeft,
  Share2,
  Trophy,
  History,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getAssessmentById, getQuestionsByDiscipline, getDisciplines, getSubmissionsByAssessment,
  type StudentSubmission, type Assessment, type Question, type Discipline,
} from "@/lib/store"
import { printStudentPDF } from "@/lib/pdf"
import { cn } from "@/lib/utils"

interface Props {
  submission: StudentSubmission
  onBack?: () => void
}

export function AssessmentResult({ submission, onBack }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [disc, setDisc] = useState<Discipline | null>(null)
  const [classAverageScore, setClassAverageScore] = useState<number>(submission.score)
  const [classSubmissions, setClassSubmissions] = useState<StudentSubmission[]>([])
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const [a, subs] = await Promise.all([
        getAssessmentById(submission.assessmentId),
        getSubmissionsByAssessment(submission.assessmentId)
      ])
      if (!mounted) return
      setAssessment(a)
      if (a) {
        const [allQs, allDs] = await Promise.all([
          getQuestionsByDiscipline(a.disciplineId),
          getDisciplines()
        ])
        if (!mounted) return
        setQuestions(allQs.filter(q => a.questionIds.includes(q.id)))
        setDisc(allDs.find(d => d.id === a.disciplineId) || null)
      }
      setClassSubmissions(subs)
      if (subs.length > 0) {
        setClassAverageScore(subs.reduce((acc, curr) => acc + curr.score, 0) / subs.length)
      }
      setIsInitializing(false)
    }
    load()
    return () => { mounted = false }
  }, [submission.assessmentId, submission.score])

  const passed = submission.percentage >= 60

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}min ${s}s`
    if (m > 0) return `${m}min ${s}s`
    return `${s}s`
  }

  const formatDate = (iso: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso))
  }

  const handlePDF = () => {
    if (!assessment) return
    printStudentPDF({ submission, assessment, questions })
  }

  const resultsReleased = assessment?.releaseResults === true

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
        <Trophy className="h-12 w-12 animate-bounce text-primary/40 mb-6" />
        <p className="text-xl font-serif font-medium text-primary animate-pulse">Processando seus méritos acadêmicos...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in zoom-in-95 duration-700">
      
      {/* Celebration / Result Hero */}
      <div className={cn(
        "relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 text-center shadow-2xl border-b-8 transition-all duration-1000",
        !resultsReleased 
          ? "bg-gradient-to-br from-secondary to-secondary/50 text-secondary-foreground border-secondary/20" 
          : passed 
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/20" 
            : "bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground border-destructive/20"
      )}>
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-black rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className={cn(
            "flex h-24 w-24 items-center justify-center rounded-[2rem] shadow-xl transition-transform duration-700 hover:rotate-12",
            resultsReleased ? "bg-white/20 backdrop-blur-md" : "bg-black/10"
          )}>
            {resultsReleased ? (
              passed ? <Trophy className="h-12 w-12 text-white" /> : <Award className="h-12 w-12 text-white" />
            ) : (
              <Clock className="h-12 w-12 text-foreground/50" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-sm font-black uppercase tracking-[0.3em] opacity-70">
              {resultsReleased ? (passed ? "Parabéns, Aluno!" : "Avaliação Concluída") : "Aguardando Resultados"}
            </h1>
            {resultsReleased ? (
              <>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-7xl sm:text-8xl font-serif font-black tracking-tighter tabular-nums">
                    {submission.score.toFixed(1)}
                  </span>
                  <div className="text-left flex flex-col leading-none">
                    <span className="text-xl font-bold opacity-80">de</span>
                    <span className="text-2xl font-black opacity-90">{submission.totalPoints.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-lg font-medium opacity-80 font-serif italic max-w-xs mx-auto">
                  {passed 
                    ? "Sua dedicação aos estudos teológicos rendeu excelentes frutos." 
                    : "Continue firme em sua jornada de conhecimento bíblico."}
                </p>
              </>
            ) : (
              <h2 className="text-2xl font-serif font-bold mt-4 px-6">
                Sua prova foi enviada com sucesso e está aguardando a liberação das notas.
              </h2>
            )}
          </div>

          {resultsReleased && (
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="h-4 w-4" />
                {submission.percentage}% de Acerto
              </div>
              {classSubmissions.length > 1 && (
                <div className="bg-black/10 backdrop-blur-sm border border-black/5 px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Média: {classAverageScore.toFixed(1)}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 mt-4">
            {resultsReleased && (
              <Button
                onClick={handlePDF}
                className="bg-white text-primary hover:bg-white/90 rounded-2xl px-8 h-14 font-black shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95"
              >
                <Download className="h-5 w-5 mr-2" />
                BAIXAR CERTIFICADO
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl px-6 h-14 font-bold backdrop-blur-sm"
            >
              <Share2 className="h-5 w-5 mr-2" />
              IMPRIMIR
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText, label: "Disciplina", value: disc?.name || "Geral", sub: `Prof. ${assessment?.professor}` },
          { icon: History, label: "Finalizado em", value: formatDate(submission.submittedAt), sub: "Envio Eletrônico" },
          { icon: Clock, label: "Tempo de Prova", value: formatTime(submission.timeElapsedSeconds), sub: "Dedicação total" },
        ].map((item, i) => (
          <div key={i} className="bg-card border-2 border-border/50 rounded-3xl p-6 shadow-sm transition-all hover:border-primary/20 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-lg font-bold font-serif leading-tight">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {resultsReleased && (
        <div className="space-y-8 pt-8">
          <div className="flex items-center gap-4 px-2">
            <div className="h-1 bg-border flex-1 rounded-full" />
            <h2 className="text-xl font-serif font-black flex items-center gap-2 shrink-0">
              <BookOpenCheck className="h-6 w-6 text-primary" />
              Revisão de Desempenho
            </h2>
            <div className="h-1 bg-border flex-1 rounded-full" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {questions.map((q, idx) => {
              const studentAns = submission.answers.find((a) => a.questionId === q.id)
              const isDiscursive = q.type === "discursive"
              const isCorrect = !isDiscursive && studentAns?.answer === q.correctAnswer

              const studentLabel = isDiscursive
                ? (studentAns?.answer || "Sem resposta")
                : q.type === "true-false"
                  ? (studentAns?.answer === "true" ? "Verdadeiro" : studentAns?.answer === "false" ? "Falso" : "—")
                  : q.choices.find((c) => c.id === studentAns?.answer)?.text ?? "Não respondida"

              const correctLabel = q.type === "true-false"
                ? (q.correctAnswer === "true" ? "Verdadeiro" : "Falso")
                : q.choices.find((c) => c.id === q.correctAnswer)?.text

              return (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-[2rem] border-2 p-6 sm:p-8 transition-all shadow-sm",
                    isDiscursive ? "border-border bg-card" :
                      isCorrect ? "border-emerald-500/20 bg-emerald-500/[0.03]" :
                        "border-rose-500/20 bg-rose-500/[0.03]"
                  )}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                      isDiscursive ? "bg-secondary text-muted-foreground" :
                        isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {isDiscursive ? <Minus className="h-6 w-6" /> : isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                            Questão {idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-primary">
                            {assessment?.pointsPerQuestion ?? 1} Ponto
                          </span>
                        </div>
                        <p className="text-lg font-serif font-bold text-foreground leading-snug">{q.text}</p>
                      </div>

                      <div className="space-y-3">
                        {isDiscursive ? (
                          <div className="rounded-2xl bg-secondary/30 p-5 text-sm italic text-foreground border-l-4 border-primary/20">
                            "{studentLabel}"
                          </div>
                        ) : q.type === "fill-in-the-blank" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                              const matches = q.text.match(/\[\[(.*?)\]\]/g)
                              if (!matches) return null
                              const correctWords = matches.map(m => m.slice(2, -2).trim())
                              let studentData: Record<string, string> = {}
                              try { studentData = JSON.parse(studentAns?.answer || "{}") } catch { }

                              return correctWords.map((word, wIdx) => {
                                const studentWord = studentData[`blank_${wIdx}`] || "—"
                                const isWordCorrect = studentWord.trim().toLowerCase() === word.trim().toLowerCase()
                                return (
                                  <div key={wIdx} className={cn(
                                    "flex flex-col p-4 rounded-xl border-2 transition-all",
                                    isWordCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
                                  )}>
                                    <span className="text-[10px] font-black uppercase opacity-40 mb-1">Lacuna {wIdx + 1}</span>
                                    <div className="flex items-center gap-2">
                                      <span className={cn("text-base font-bold", isWordCorrect ? "text-emerald-700" : "text-rose-700")}>
                                        {studentWord}
                                      </span>
                                      {!isWordCorrect && (
                                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                          Correto: {word}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        ) : q.type === "matching" && q.pairs ? (
                          <div className="space-y-2">
                            {(() => {
                              let studentData: Record<string, string> = {}
                              try { studentData = JSON.parse(studentAns?.answer || "{}") } catch { }

                              return q.pairs.map((p) => {
                                const studentRight = studentData[p.id] || "—"
                                const isPairCorrect = studentRight === p.right
                                return (
                                  <div key={p.id} className={cn(
                                    "flex items-center justify-between gap-4 p-3 rounded-xl border-2 transition-all",
                                    isPairCorrect ? "border-emerald-500/10 bg-emerald-500/5" : "border-rose-500/10 bg-rose-500/5"
                                  )}>
                                    <span className="text-xs font-bold text-muted-foreground flex-1">{p.left}</span>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className={cn("px-3 py-1 rounded-full text-xs font-black", isPairCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                        {studentRight}
                                      </div>
                                      {!isPairCorrect && (
                                        <div className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                                          {p.right}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className={cn(
                              "flex-1 p-4 rounded-2xl border-2",
                              isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
                            )}>
                              <span className="text-[10px] font-black uppercase opacity-40 block mb-1">Sua Resposta</span>
                              <span className={cn("text-base font-bold", isCorrect ? "text-emerald-700" : "text-rose-700")}>
                                {studentLabel}
                              </span>
                            </div>
                            {!isCorrect && correctLabel && (
                              <div className="flex-1 p-4 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5">
                                <span className="text-[10px] font-black uppercase opacity-40 block mb-1">Correto</span>
                                <span className="text-base font-bold text-emerald-700">
                                  {correctLabel}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {onBack && (
        <div className="flex justify-center pt-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="group rounded-2xl h-14 px-8 font-bold text-muted-foreground hover:text-primary transition-all"
          >
            <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Sair e Voltar ao Início
          </Button>
        </div>
      )}
    </div>
  )
}
