"use client"

import { useEffect, useState } from "react"
import {
  Users, FileText, BookOpen, Settings, BarChart3, Download, LogOut,
  Plus, Pencil, Trash2, Eye, EyeOff, Trophy, CheckCircle2, Link2, FileCheck,
  ShieldCheck, Loader2, DollarSign, MessageSquare, CalendarCheck, GraduationCap, XCircle, ArrowLeft, Building2, UserCircle, Briefcase, Send, PlaySquare, CalendarDays, KeyRound, Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  type Assessment, type StudentSubmission, type Question, type Discipline, type StudentGrade, type StudentProfile,
  getAssessments, updateAssessment, deleteAssessment,
  getSubmissions, deleteSubmission, updateSubmissionScore,
  getQuestions, getDisciplines, clearProfessorSession, MASTER_CREDENTIALS,
  getProfessorSession, getStudentGrades, saveStudentGrade, deleteStudentGrade, getStudents, updateProfessorAccount,
} from "@/lib/store"
import { printStudentPDF, printBlankAssessmentPDF, printCompiledSubmissionsPDF, printOverviewPDF, printAnswerKeyPDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import { QuestionBank } from "@/components/question-bank"
import { AssessmentBuilder } from "@/components/assessment-builder"
import { ProfessorManager } from "@/components/professor-manager"
import { SemesterManager } from "@/components/semester-manager"
import { StudyMaterialManager } from "@/components/study-material-manager"
import { FinancialConfig } from "@/components/financial-config"
import { FinancialManager } from "@/components/financial-manager"
import { ProfessorChatView } from "@/components/professor-chat-view"
import { AttendanceManager } from "@/components/attendance-manager"
import { ClassManager } from "@/components/class-manager"
import { StudentManager } from "@/components/student-manager"
import { ClassScheduleManager } from "@/components/class-schedule-manager"
import { createClient } from "@/lib/supabase/client"
import { GradesManager } from "@/components/grades-manager"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m${sec.toString().padStart(2, "0")}s`
}

type Tab = "overview" | "students" | "grades" | "submissions" | "questions" | "assessments" | "professors" | "semesters" | "class_schedules" | "materials" | "financial" | "settings" | "chat" | "attendance" | "classes"

interface Props {
  onLogout: () => void
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ assessments, submissions, questions }: { assessments: Assessment[]; submissions: StudentSubmission[]; questions: Question[] }) {
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
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
      <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold font-serif text-foreground">Visão Geral</h2>
          <p className="text-muted-foreground text-sm">Resumo de desempenho e estatísticas</p>
        </div>
        <Button
          variant="outline"
          onClick={() => printOverviewPDF({ assessments, submissions, questions })}
          className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
        >
          <Download className="h-4 w-4 mr-2" /> Baixar Relatório PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Alunos Avaliados", value: totalStudents, icon: <Users className="h-5 w-5" />, color: "text-primary" },
          { label: "Média Geral", value: `${avgScore}%`, icon: <BarChart3 className="h-5 w-5" />, color: avgScore >= 70 ? "text-green-600" : "text-amber-600" },
          { label: "Aprovados (≥70%)", value: passing, icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-600" },
          { label: "Provas Criadas", value: assessments.length, icon: <FileText className="h-5 w-5" />, color: "text-primary" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className={`${color} mb-2`}>{icon}</div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {questionStats.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">
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

// ─── Submissions Tab (Old StudentsTab) ────────────────────────────────────────

function SubmissionsTab({ assessments, allSubmissions, questions, onRefresh, isMaster }: {
  assessments: Assessment[]
  allSubmissions: StudentSubmission[]
  questions: Question[]
  onRefresh: () => void
  isMaster: boolean
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(assessments[0]?.id ?? "")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<number>(0)
  const [isSavingScore, setIsSavingScore] = useState(false)

  const submissions = allSubmissions
    .filter((s) => s.assessmentId === selectedAssessmentId)
    .sort((a, b) => b.percentage - a.percentage)

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId)

  const averageScore = submissions.length > 0
    ? submissions.reduce((acc, curr) => acc + curr.score, 0) / submissions.length
    : 0

  function handlePDF(sub: StudentSubmission) {
    if (!selectedAssessment) return
    const qs = selectedAssessment.questionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter(Boolean) as typeof questions
    printStudentPDF({ submission: sub, assessment: selectedAssessment, questions: qs })
  }

  async function handleDelete() {
    if (deleteId) {
      await deleteSubmission(deleteId)
      onRefresh()
      setDeleteId(null)
    }
  }

  function startEditingScore(sub: StudentSubmission) {
    setEditingSubId(sub.id)
    setEditScore(sub.score)
  }

  async function saveScore(sub: StudentSubmission) {
    if (editScore < 0 || editScore > sub.totalPoints) {
      return alert(`A nota deve estar entre 0 e ${sub.totalPoints}`)
    }
    setIsSavingScore(true)
    try {
      await updateSubmissionScore(sub.id, editScore, sub.totalPoints)
      setEditingSubId(null)
      onRefresh()
    } catch (err: any) {
      alert("Erro ao salvar nota: " + err.message)
    } finally {
      setIsSavingScore(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {assessments.length > 0 && (
        <div className="flex items-center gap-3">
          {assessments.length > 1 && (
            <>
              <Label className="text-sm whitespace-nowrap">Prova:</Label>
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedAssessment) {
                printCompiledSubmissionsPDF({ submissions, assessment: selectedAssessment, questions })
              }
            }}
            className="ml-auto"
            disabled={submissions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" /> Baixar PDF Compilado
          </Button>
        </div>
      )}

      {selectedAssessment && submissions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Envios Totais</p>
              <p className="text-2xl font-bold">{submissions.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Média da Turma</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">/ {selectedAssessment.totalPoints.toFixed(1)} pts</p>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm">Nenhum aluno enviou esta prova ainda.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Aluno</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Nota</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Tempo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Enviado em</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => (
                <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-semibold">
                    {i === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{sub.studentName}</div>
                    <div className="text-xs text-muted-foreground">{sub.studentEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingSubId === sub.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={sub.totalPoints}
                          className="w-16 border border-input rounded px-2 py-1 text-sm text-center"
                          value={editScore}
                          onChange={(e) => setEditScore(parseFloat(e.target.value) || 0)}
                          disabled={isSavingScore}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => saveScore(sub)} disabled={isSavingScore}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setEditingSubId(null)} disabled={isSavingScore}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className={`px-2 py-0.5 rounded flex items-center justify-center font-bold font-mono text-sm max-w-[80px] mx-auto ` + (sub.percentage >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {sub.score.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell text-muted-foreground">
                    {formatTime(sub.timeElapsedSeconds)}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell text-muted-foreground">
                    {formatDate(sub.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Baixar PDF" onClick={() => handlePDF(sub)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100" title="Editar Nota" onClick={() => startEditingScore(sub)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir Envio" onClick={() => setDeleteId(sub.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir envio</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja apagar a resposta deste aluno? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Assessments Tab ──────────────────────────────────────────────────────────

function AssessmentsTab({ assessments, submissions, questions, disciplines, onRefresh, isMaster }: { assessments: Assessment[]; submissions: StudentSubmission[]; questions: Question[]; disciplines: Discipline[]; onRefresh: () => void; isMaster: boolean }) {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const active = assessments[0]

  const [localOpenAt, setLocalOpenAt] = useState<string | null>(null)
  const [localCloseAt, setLocalCloseAt] = useState<string | null>(null)

  useEffect(() => {
    if (active) {
      setLocalOpenAt(active.openAt)
      setLocalCloseAt(active.closeAt)
    }
  }, [active?.id]) // Re-align if active assessment changes

  function handleCopyLink(a: Assessment) {
    const url = `${window.location.origin}/prova?id=${a.id}`
    navigator.clipboard.writeText(url)
    setCopiedId(a.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  async function handleDelete() {
    if (deleteId) {
      await deleteAssessment(deleteId)
      onRefresh()
      setDeleteId(null)
    }
  }

  async function handleTogglePublish(a: Assessment) {
    await updateAssessment(a.id, { isPublished: !a.isPublished })
    onRefresh()
  }

  function handlePrint(a: Assessment) {
    printBlankAssessmentPDF({ assessment: a, questions })
  }

  async function handleUpdateSchedule() {
    if (!active) return
    await updateAssessment(active.id, {
      openAt: localOpenAt ? new Date(localOpenAt).toISOString() : null,
      closeAt: localCloseAt ? new Date(localCloseAt).toISOString() : null
    })
    onRefresh()
  }

  async function handleShuffleToggle() {
    if (!active) return
    await updateAssessment(active.id, { shuffleVariants: !active.shuffleVariants })
    onRefresh()
  }

  async function handleReleaseResultsToggle() {
    if (!active) return
    await updateAssessment(active.id, { releaseResults: !active.releaseResults })
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-sm mb-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-foreground">Gerenciamento de Provas</h2>
          <p className="text-muted-foreground text-sm">Crie e edite avaliações</p>
        </div>
        <Button onClick={() => { setEditingAssessment(null); setBuilderOpen(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Prova
        </Button>
      </div>

      {active && (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h3 className="font-semibold text-foreground text-lg mb-1">Configurações Especiais da Prova Ativa: <span className="font-normal">{active.title}</span></h3>
          <p className="text-sm text-muted-foreground mb-2">A prova mais recente é considerada a prova ativa do sistema.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <div className="text-sm font-medium">Modelos de Provas (A, B, C)</div>
                  <div className="text-xs text-muted-foreground">Cria versões embaralhadas no PDF</div>
                </div>
                <button
                  onClick={handleShuffleToggle}
                  className={`flex-shrink-0 w-10 h-5 rounded-full transition-colors ${active.shuffleVariants ? "bg-primary" : "bg-muted-foreground/30"}`}
                  aria-pressed={active.shuffleVariants}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-primary-foreground transform transition-transform shadow-sm ${active.shuffleVariants ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <div className="text-sm font-medium">Liberar Resultados</div>
                  <div className="text-xs text-muted-foreground">Exibe nota e gabarito ao aluno</div>
                </div>
                <button
                  onClick={handleReleaseResultsToggle}
                  className={`flex-shrink-0 w-10 h-5 rounded-full transition-colors ${active.releaseResults ? "bg-primary" : "bg-muted-foreground/30"}`}
                  aria-pressed={active.releaseResults}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-primary-foreground transform transition-transform shadow-sm ${active.releaseResults ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            {(() => {
              const toLocalDatetimeStr = (isoString: string | null) => {
                if (!isoString) return ""
                const d = new Date(isoString)
                const pad = (n: number) => n.toString().padStart(2, '0')
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
              }
              return (
                <div className="space-y-4 bg-muted/40 p-4 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between py-1 mb-2 border-b border-border/30">
                    <div>
                      <div className="text-sm font-bold">Status da Prova</div>
                      <div className="text-xs text-muted-foreground">{active.isPublished ? "Aberta para novos alunos" : "Bloqueada para novos alunos"}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={active.isPublished ? "destructive" : "default"}
                      className="h-8 font-bold"
                      onClick={() => handleTogglePublish(active)}
                    >
                      {active.isPublished ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                      {active.isPublished ? "Bloquear" : "Desbloquear"}
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Abertura Automática (Opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={toLocalDatetimeStr(localOpenAt)}
                      onChange={(e) => setLocalOpenAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className="text-sm h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Fechamento Automático (Opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={toLocalDatetimeStr(localCloseAt)}
                      onChange={(e) => setLocalCloseAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className="text-sm h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2 h-8 text-xs font-bold"
                    variant="outline"
                    onClick={handleUpdateSchedule}
                    disabled={localOpenAt === active.openAt && localCloseAt === active.closeAt}
                  >
                    <Save className="h-3 w-3 mr-1" /> Salvar Agendamento
                  </Button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm">Nenhuma prova criada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assessments.map((a) => {
            const disc = disciplines.find((d) => d.id === a.disciplineId)
            const subCount = submissions.filter(s => s.assessmentId === a.id).length
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {a.isPublished ? "Publicada" : "Rascunho"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.modality === "private" ? "bg-primary/10 text-primary" : "bg-blue-50 text-blue-600"}`}>
                      {a.modality === "private" ? "🔒 Privada" : "🌐 Pública"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                    <span>{disc?.name ?? "Disciplina removida"}</span>
                    <span>{a.questionIds.length} questão{a.questionIds.length !== 1 ? "ões" : ""}</span>
                    <span>{a.totalPoints.toFixed(1)} pts</span>
                    <span>{subCount} resposta{subCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border mt-2 sm:mt-0 justify-end">
                  <Button size="sm" variant="ghost"
                    className={`h-8 px-2 text-xs ${copiedId === a.id ? "text-green-600" : "text-muted-foreground"}`}
                    title="Copiar link da prova" onClick={() => handleCopyLink(a)}>
                    {copiedId === a.id ? <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1" /> : <Link2 className="h-3.5 w-3.5 sm:mr-1" />}
                    <span className="hidden sm:inline">{copiedId === a.id ? "Copiado!" : "Link"}</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Imprimir Prova em Branco" onClick={() => handlePrint(a)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Baixar Gabarito em PDF" onClick={() => printAnswerKeyPDF({ assessment: a, questions })}>
                    <FileCheck className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 sm:px-3 text-xs" onClick={() => handleTogglePublish(a)}>
                    {a.isPublished ? <EyeOff className="h-3.5 w-3.5 sm:mr-1" /> : <Eye className="h-3.5 w-3.5 sm:mr-1" />}
                    <span className="hidden sm:inline">{a.isPublished ? "Despublicar" : "Publicar"}</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    onClick={() => { setEditingAssessment(a); setBuilderOpen(true) }} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {isMaster && (
                    <Button size="sm" variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(a.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ErrorBoundary>
        <AssessmentBuilder
          open={builderOpen}
          assessment={editingAssessment}
          onClose={() => setBuilderOpen(false)}
          onSave={onRefresh}
        />
      </ErrorBoundary>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prova</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta prova? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ assessments, onRefresh, onLogout }: {
  assessments: Assessment[]
  onRefresh: (showLoading?: boolean) => void
  onLogout: () => void
}) {
  const active = assessments[0]
  const supabase = createClient()
  const [migrating, setMigrating] = useState(false)
  const session = typeof window !== "undefined" ? getProfessorSession() : null
  const isMaster = session?.role === "master"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setName(user.user_metadata?.full_name || "")
        setEmail(user.email || "")
      }
    }
    fetchUserInfo()
  }, [])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return alert("O nome não pode estar vazio.")
    if (!email.trim() || !email.includes("@")) return alert("E-mail inválido.")
    if (password && password.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.")

    setIsUpdatingProfile(true)
    try {
      // 1. Update Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        email: email.trim(),
        password: password ? password : undefined,
        data: { full_name: name.trim() }
      })

      if (authError) throw authError

      // 2. Update local professor_accounts table for consistency
      if (session?.professorId) {
        await updateProfessorAccount(session.professorId, {
          name: name.trim(),
          email: email.trim(),
          ...(password ? { password } : {})
        })
      }

      alert("Perfil atualizado com sucesso!")
      setPassword("") // Clear password field
      onRefresh()
    } catch (err: any) {
      alert("Erro ao atualizar perfil: " + err.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function handleMigrateLocalData() {
    if (!confirm("Certeza que deseja migrar os dados antigos criados localmente para a Nuvem (Supabase)?")) return;
    setMigrating(true)
    try {
      const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || "[]")
      const d = getLocal("ibad_disciplines_v2")
      const q = getLocal("ibad_question_bank")
      const a = getLocal("ibad_assessments")
      const s = getLocal("ibad_submissions_v2")

      if (d.length > 0) {
        await supabase.from("disciplines").upsert(d.map((item: any) => ({
          id: item.id, name: item.name, description: item.description, created_at: item.createdAt || new Date().toISOString()
        })))
      }
      if (q.length > 0) {
        await supabase.from("questions").upsert(q.map((item: any) => ({
          id: item.id, discipline_id: item.disciplineId, type: item.type, text: item.text, choices: item.choices, correct_answer: item.correctAnswer, points: item.points, created_at: item.createdAt || new Date().toISOString()
        })))
      }
      if (a.length > 0) {
        await supabase.from("assessments").upsert(a.map((item: any) => ({
          id: item.id, title: item.title, discipline_id: item.disciplineId, professor: item.professor, institution: item.institution, question_ids: item.questionIds, points_per_question: item.pointsPerQuestion, total_points: item.totalPoints, open_at: item.openAt || null, close_at: item.closeAt || null, is_published: item.isPublished || false, shuffle_variants: item.shuffleVariants || false, logo_base64: item.logoBase64 || null, rules: item.rules || null, created_at: item.createdAt || new Date().toISOString()
        })))
      }
      if (s.length > 0) {
        await supabase.from("student_submissions").upsert(s.map((item: any) => ({
          id: item.id, assessment_id: item.assessmentId, student_name: item.studentName, student_email: item.studentEmail, answers: item.answers, score: item.score, total_points: item.totalPoints, percentage: item.percentage, submitted_at: item.submittedAt || new Date().toISOString(), time_elapsed_seconds: item.timeElapsedSeconds || 0
        })))
      }

      onRefresh()
      alert("Migração Concluída com Sucesso!")
    } catch (err: any) {
      alert("Erro ao migrar dados: " + err.message)
    }
    setMigrating(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold font-serif text-foreground">Configurações do Sistema</h2>
        <p className="text-muted-foreground text-sm">Gerencie preferências e configurações gerais da plataforma.</p>
      </div>

      {isMaster && (
        <FinancialConfig />
      )}

      {/* Legacy Settings content logic - keeping the migration tool for now */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Management Section */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <UserCircle className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Meu Perfil</h3>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nome Completo</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-password">Nova Senha (opcional)</Label>
              <Input
                id="profile-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-10"
              />
              <p className="text-[10px] text-muted-foreground">Deixe em branco para não alterar a senha atual.</p>
            </div>
            <Button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full h-10 font-bold bg-primary hover:bg-primary/90 transition-all"
            >
              {isUpdatingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações do Perfil
            </Button>
          </form>
        </div>

        {/* System & Migration Section */}
        <div className="space-y-6">
          {isMaster && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-accent">
                <Download className="h-5 w-5" />
                <h3 className="font-bold text-foreground">Migração de Dados</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Transfira provas, alunos e questões criadas anteriormente no navegador para o banco de dados oficial.
              </p>
              <Button
                variant="outline"
                onClick={handleMigrateLocalData}
                disabled={migrating}
                className="w-full border-accent/20 text-accent hover:bg-accent/5"
              >
                {migrating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Migrar LocalStorage
              </Button>
            </div>
          )}

          <div className="bg-muted/30 border border-border/50 rounded-xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Informações Técnicas</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Versão do Sistema:</span>
                <span className="font-mono font-medium">v1.2.0-cloud</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status do Banco:</span>
                <span className="text-green-600 font-medium">Conectado (Supabase)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tipo de Acesso:</span>
                <span className="font-medium">{isMaster ? "Administrador Master" : "Professor"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("overview")
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState("")
  const [userEmail, setUserEmail] = useState("")

  // Detect if current session is master
  const session = typeof window !== "undefined" ? getProfessorSession() : null
  const isMaster = session?.role === "master"
  const supabase = createClient()

  async function refresh(showLoading: boolean = true) {
    if (showLoading) setLoading(true)
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
    if (showLoading) setLoading(false)
  }

  async function handleLogout() {
    clearProfessorSession()
    await supabase.auth.signOut()
    onLogout()
  }

  useEffect(() => {
    refresh()

    // Fetch current user from Supabase
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUsername(user.user_metadata?.full_name || "Professor")
        setUserEmail(user.email || "")
      } else if (session?.professorId === "master") {
        setUsername(MASTER_CREDENTIALS.name)
        setUserEmail(MASTER_CREDENTIALS.email)
      }
    }
    fetchUser()
  }, [supabase.auth, session?.professorId])

  const tabs: { id: Tab; label: string; icon: React.ReactNode; masterOnly?: boolean }[] = [
    { id: "overview", label: "Visão Geral", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "students", label: "Alunos", icon: <Users className="h-4 w-4" /> },
    { id: "grades", label: "Notas e Diários", icon: <GraduationCap className="h-4 w-4" /> },
    { id: "questions", label: "Banco de Questões", icon: <BookOpen className="h-4 w-4" /> },
    { id: "assessments", label: "Provas", icon: <FileText className="h-4 w-4" /> },
    { id: "submissions", label: "Respostas de Provas", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "materials", label: "Biblioteca (PDFs)", icon: <BookOpen className="h-4 w-4" /> },
    { id: "semesters", label: "Grade Curricular", icon: <BookOpen className="h-4 w-4" /> },
    { id: "class_schedules", label: "Quadro de Horários", icon: <CalendarCheck className="h-4 w-4" /> },
    { id: "classes", label: "Turmas", icon: <GraduationCap className="h-4 w-4" /> },
    { id: "attendance", label: "Frequência", icon: <CalendarCheck className="h-4 w-4" /> },
    { id: "chat", label: "Chat Alunos", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "financial", label: "Financeiro", icon: <DollarSign className="h-4 w-4" />, masterOnly: true },
    { id: "professors", label: "Professores", icon: <ShieldCheck className="h-4 w-4" />, masterOnly: true },
    { id: "settings", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
  ]

  const visibleTabs = tabs.filter((t) => !t.masterOnly || isMaster)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground border-b border-primary/80">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-0 h-auto"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Voltar</span>
            </Button>
            <div className="h-8 w-px bg-primary-foreground/20 hidden sm:block" />
            <div>
              <p className="text-xs text-primary-foreground/70 uppercase tracking-widest font-sans">
                Instituto de Ensino Teológico - IETEO
              </p>
              <h1 className="text-xl font-bold font-serif">Painel do Professor</h1>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-4 justify-end">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  {isMaster && (
                    <span className="text-xs bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full font-semibold">
                      Master
                    </span>
                  )}
                  <p className="text-sm font-semibold">{username || "Professor"}</p>
                </div>
                <p className="text-xs text-primary-foreground/70">{userEmail}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 px-3 text-primary-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex flex-wrap gap-1 mb-6 bg-muted rounded-xl p-1">
          {visibleTabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 opacity-50">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Carregando dados da nuvem...</p>
          </div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab assessments={assessments} submissions={submissions} questions={questions} />}
            {tab === "students" && <StudentManager isMaster={isMaster} />}
            {tab === "grades" && <GradesManager isMaster={isMaster} />}
            {tab === "submissions" && <SubmissionsTab assessments={assessments} allSubmissions={submissions} questions={questions} onRefresh={refresh} isMaster={isMaster} />}
            {tab === "questions" && <QuestionBank isMaster={isMaster} />}
            {tab === "assessments" && <AssessmentsTab assessments={assessments} submissions={submissions} questions={questions} disciplines={disciplines} onRefresh={refresh} isMaster={isMaster} />}
            {tab === "materials" && <StudyMaterialManager />}
            {tab === "semesters" && <SemesterManager isMaster={isMaster} />}
            {tab === "class_schedules" && isMaster && <ClassScheduleManager />}
            {tab === "attendance" && <AttendanceManager />}
            {tab === "classes" && isMaster && <ClassManager />}
            {tab === "chat" && <ProfessorChatView />}
            {tab === "financial" && <FinancialManager />}
            {tab === "professors" && isMaster && <ProfessorManager />}
            {tab === "settings" && <SettingsTab assessments={assessments} onRefresh={refresh} onLogout={onLogout} />}
          </>
        )}
      </div>
    </div>
  )
}
