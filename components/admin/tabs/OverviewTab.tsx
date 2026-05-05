"use client"

import { useState, useEffect } from "react"
import { BarChart3, BookOpen, Download, FileText, GraduationCap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { 
    type Assessment, type StudentSubmission, type Question, type Discipline,
    getAssessments, getSubmissions, getQuestions, getDisciplines
} from "@/lib/store"
import { printOverviewPDF } from "@/lib/pdf"

export function OverviewTab() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
        setLoading(true)
        try {
            const [a, s, q, d] = await Promise.all([
                getAssessments(),
                getSubmissions(),
                getQuestions(),
                getDisciplines()
            ])
            setAssessments(a)
            setSubmissions(s)
            setQuestions(q)
            setDisciplines(d)
        } catch (err) {
            console.error("Error loading overview data:", err)
        } finally {
            setLoading(false)
        }
    }
    loadData()
  }, [])

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Carregando estatísticas...</p>
          </div>
      )
  }

  const totalStudents = submissions.length
  const avgScore = totalStudents > 0
    ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / totalStudents)
    : 0
  const passing = submissions.filter((s) => s.percentage >= 70).length

  const activeAssessment = assessments[0]
  const activeSubs = activeAssessment ? submissions.filter(s => s.assessmentId === activeAssessment.id) : []
  const activeQuestions = activeAssessment
    ? activeAssessment.questionIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean)
    : []

  const questionStats = (activeQuestions as ReturnType<typeof questions.find>[]).map((q) => {
    if (!q) return null
    const total = activeSubs.length
    const correct = activeSubs.filter((s) => s.answers.find((a) => a.questionId === q.id)?.answer === q.correctAnswer).length
    return {
      text: q.text.slice(0, 40) + (q.text.length > 40 ? "…" : ""),
      fullText: q.text,
      correct,
      errors: total - correct,
      total,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }).filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center glass rounded-2xl p-6 premium-shadow">
        <div>
          <h2 className="text-xl font-bold font-serif text-foreground">Visão Geral</h2>
          <p className="text-muted-foreground text-sm">Resumo de desempenho e estatísticas</p>
        </div>
        <Button
          variant="outline"
          onClick={() => printOverviewPDF({ assessments, submissions, questions })}
          className="rounded-xl"
        >
          <Download className="h-4 w-4 mr-2" /> Baixar Relatório PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Questões no Banco", value: questions.length, icon: <BookOpen className="h-5 w-5" />, color: "text-orange" },
          { label: "Provas Criadas", value: assessments.length, icon: <FileText className="h-5 w-5" />, color: "text-navy" },
          { label: "Total de Disciplinas", value: disciplines.length, icon: <GraduationCap className="h-5 w-5" />, color: "text-purple-600" },
          { label: "Média Global (Banco)", value: totalStudents > 0 ? `${avgScore}%` : "N/A", icon: <BarChart3 className="h-5 w-5" />, color: "text-primary" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-2xl p-6 hover-lift premium-shadow group">
            <div className={`${color} mb-4 p-3 rounded-xl bg-muted group-hover:bg-white transition-colors w-12 h-12 flex items-center justify-center`}>{icon}</div>
            <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
            <div className="text-sm font-medium text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {questionStats.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 premium-shadow">
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Acertos por Questão — {activeAssessment?.title}
          </h3>
          <div className="flex flex-col gap-3">
            {questionStats.map((stat, i) => {
              if (!stat) return null
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stat.pct}%`,
                        background: stat.pct >= 70 ? "#16a34a" : stat.pct >= 50 ? "#d97706" : "#dc2626",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right flex-shrink-0">{stat.pct}%</span>
                  <span className="text-xs text-muted-foreground w-32 truncate hidden md:block">{stat.text}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 ml-2 flex-shrink-0"
                    onClick={() => setSelectedQuestion({ ...stat, number: i + 1 })}
                  >
                    Visualizar
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {assessments.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm">Nenhuma prova criada. Acesse a aba <strong>Provas</strong> para começar.</p>
        </div>
      )}

      <Dialog open={!!selectedQuestion} onOpenChange={(o) => (!o ? setSelectedQuestion(null) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Questão {selectedQuestion?.number}</DialogTitle>
            <DialogDescription>Detalhes do desempenho na questão</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{selectedQuestion?.fullText}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-semibold uppercase">Acertos</p>
                <p className="text-2xl font-bold text-green-700">{selectedQuestion?.correct}</p>
                <p className="text-xs text-green-600">{selectedQuestion?.pct}%</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-xs text-red-600 font-semibold uppercase">Erros</p>
                <p className="text-2xl font-bold text-red-700">{selectedQuestion?.errors}</p>
                <p className="text-xs text-red-600">{selectedQuestion ? (100 - selectedQuestion.pct) : 0}%</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-semibold uppercase">Total</p>
                <p className="text-2xl font-bold text-blue-700">{selectedQuestion?.total}</p>
                <p className="text-xs text-blue-600">Respostas</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

