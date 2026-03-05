"use client"

import { useState, useEffect } from "react"
import { Download, CheckCircle2, XCircle, Clock, Award, Minus, BookOpenCheck } from "lucide-react"
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

  function formatTime(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}min ${s}s`
    if (m > 0) return `${m}min ${s}s`
    return `${s}s`
  }

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso))
  }

  function handlePDF() {
    if (!assessment) return
    printStudentPDF({ submission, assessment, questions })
  }

  // Build answer key (gabarito) — only for non-discursive
  const gabaritoItems = questions
    .filter((q) => q.type !== "discursive")
    .map((q, i) => {
      const globalIdx = questions.findIndex((gq) => gq.id === q.id)
      const studentAns = submission.answers.find((a) => a.questionId === q.id)
      const isCorrect = studentAns?.answer === q.correctAnswer
      const correctLabel = q.type === "true-false"
        ? (q.correctAnswer === "true" ? "Verdadeiro" : "Falso")
        : q.choices.find((c) => c.id === q.correctAnswer)?.text ?? "—"
      return { num: globalIdx + 1, text: q.text, correctLabel, isCorrect }
    })

  if (isInitializing) {
    return <div className="p-10 text-center text-muted-foreground animate-pulse">Carregando resultado...</div>
  }

  const resultsReleased = assessment?.releaseResults === true

  return (
    <div className="flex flex-col gap-6">
      {/* Assessment Info Header */}
      {assessment && (
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
      )}

      {/* Score card */}
      <div className={cn(
        "rounded-2xl p-8 text-center shadow-lg flex flex-col items-center gap-4",
        !resultsReleased ? "bg-secondary text-secondary-foreground" : passed ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
      )}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <Award className={cn("h-8 w-8", resultsReleased ? "text-white" : "text-foreground/80")} />
        </div>
        <div>
          <p className="text-sm font-medium opacity-80 uppercase tracking-wider mb-1">Avaliação Concluída</p>
          {resultsReleased ? (
            <>
              <p className="text-5xl font-bold font-serif">{submission.score.toFixed(1)}</p>
              <p className="text-lg opacity-80">de {submission.totalPoints.toFixed(1)} pontos</p>
            </>
          ) : (
            <p className="text-lg font-semibold mt-2 px-4">Os resultados desta prova ainda não foram liberados.</p>
          )}
        </div>

        {resultsReleased && (
          <div className="rounded-full px-4 py-1.5 text-sm font-semibold bg-white/20 text-white flex flex-col items-center">
            <span>{submission.percentage}% de acerto · {passed ? "Aprovado" : "Reprovado"}</span>
            {classSubmissions.length > 1 && (
              <span className="text-xs font-medium opacity-90 mt-0.5">Média da turma: {classAverageScore.toFixed(1)} pt{classAverageScore !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {resultsReleased && (
          <Button
            variant="outline"
            onClick={handlePDF}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white mt-2"
          >
            <Download className="h-4 w-4 mr-2" />
            Salvar como PDF
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Aluno</p>
          <p className="text-sm font-semibold text-foreground">{submission.studentName}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Envio</p>
          <p className="text-sm font-semibold text-foreground">{formatDate(submission.submittedAt)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tempo Total</p>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{formatTime(submission.timeElapsedSeconds)}</p>
          </div>
        </div>
      </div>

      {resultsReleased && (
        <>
          {/* Question review */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Revisão das Respostas</h2>
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
                    "rounded-xl border p-5 bg-card",
                    isDiscursive ? "border-border" :
                      isCorrect ? "border-green-200 bg-green-50/50" :
                        "border-red-200 bg-red-50/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {isDiscursive ? (
                      <Minus className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    ) : isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Questão {idx + 1} · {assessment?.pointsPerQuestion ?? 1} pt
                        {isDiscursive && " · Correção manual"}
                      </p>
                      <p className="text-sm font-medium text-foreground leading-relaxed mb-3 text-pretty">{q.text}</p>

                      {isDiscursive ? (
                        <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                          {studentLabel}
                        </div>
                      ) : (
                        <>
                          <p className={cn("text-xs", isCorrect ? "text-green-700" : "text-red-600")}>
                            Sua resposta: <strong>{studentLabel}</strong>
                          </p>
                          {!isCorrect && correctLabel && (
                            <p className="text-xs text-green-700 mt-1">
                              Resposta correta: <strong>{correctLabel}</strong>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Gabarito table */}
          {gabaritoItems.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40">
                <h2 className="font-semibold text-foreground text-sm">Gabarito Oficial</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase w-12">Nº</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Questão</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Resposta Correta</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase w-20">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {gabaritoItems.map(({ num, text, correctLabel, isCorrect }) => (
                    <tr key={num} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-muted-foreground">{num}</td>
                      <td className="px-4 py-2.5 text-foreground text-xs max-w-xs truncate">{text}</td>
                      <td className="px-4 py-2.5 text-green-700 font-semibold text-xs">{correctLabel}</td>
                      <td className="px-4 py-2.5 text-center">
                        {isCorrect
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          : <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {onBack && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto font-medium"
          >
            Sair e Voltar ao Início
          </Button>
        </div>
      )}
    </div>
  )
}
