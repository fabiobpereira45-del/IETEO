"use client"

import { useEffect, useState } from "react"
import {
  Users, FileText, BookOpen, Settings, BarChart3, Download, LogOut,
  Plus, Pencil, Trash2, Eye, EyeOff, Trophy, Clock, CheckCircle2,
  ShieldCheck, Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type Assessment, type StudentSubmission,
  getAssessments, updateAssessment, deleteAssessment,
  getSubmissions, getSubmissionsByAssessment, deleteSubmission,
  getQuestions, getDisciplines, clearProfessorSession, MASTER_CREDENTIALS,
  getProfessorSession,
} from "@/lib/store"
import { printStudentPDF, printBlankAssessmentPDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import { QuestionBank } from "@/components/question-bank"
import { AssessmentBuilder } from "@/components/assessment-builder"
import { ProfessorManager } from "@/components/professor-manager"
import { createClient } from "@/lib/supabase/client"

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

function gradeBg(pct: number) {
  if (pct >= 70) return "bg-green-100 text-green-700"
  if (pct >= 50) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

function gradeColor(pct: number) {
  if (pct >= 70) return "text-green-600"
  if (pct >= 50) return "text-amber-600"
  return "text-red-600"
}

type Tab = "overview" | "students" | "questions" | "assessments" | "professors" | "settings"

interface Props {
  onLogout: () => void
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ assessments, submissions }: { assessments: Assessment[]; submissions: StudentSubmission[] }) {
  const questions = getQuestions()
  const totalStudents = submissions.length
  const avgScore = totalStudents > 0
    ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / totalStudents)
    : 0
  const passing = submissions.filter((s) => s.percentage >= 70).length

  const activeAssessment = assessments[0]
  const activeSubs = activeAssessment ? getSubmissionsByAssessment(activeAssessment.id) : []
  const activeQuestions = activeAssessment
    ? activeAssessment.questionIds.map((id) => questions.find((q) => q.id === id)).filter(Boolean)
    : []

  const questionStats = (activeQuestions as ReturnType<typeof questions.find>[]).map((q) => {
    if (!q) return null
    const total = activeSubs.length
    const correct = activeSubs.filter((s) => s.answers.find((a) => a.questionId === q.id)?.answer === q.correctAnswer).length
    return {
      text: q.text.slice(0, 40) + (q.text.length > 40 ? "…" : ""),
      correct,
      total,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }).filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  )
}

// ─── Students Tab ─────────────────────────────────────────────────────────────

function StudentsTab({ assessments, allSubmissions, onRefresh }: {
  assessments: Assessment[]
  allSubmissions: StudentSubmission[]
  onRefresh: () => void
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(assessments[0]?.id ?? "")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const questions = getQuestions()

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

  function handleDelete() {
    if (deleteId) { deleteSubmission(deleteId); onRefresh(); setDeleteId(null) }
  }

  return (
    <div className="flex flex-col gap-4">
      {assessments.length > 1 && (
        <div className="flex items-center gap-3">
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
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${gradeBg(sub.percentage)}`}>
                      {sub.score.toFixed(1)} / {sub.totalPoints.toFixed(1)}
                    </span>
                    <div className={`text-xs font-semibold mt-0.5 ${gradeColor(sub.percentage)}`}>{sub.percentage}%</div>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground hidden md:table-cell">
                    <Clock className="h-3.5 w-3.5 inline mr-1 opacity-60" />
                    {formatTime(sub.timeElapsedSeconds)}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground text-xs hidden lg:table-cell">
                    {formatDate(sub.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePDF(sub)} title="Baixar PDF">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(sub.id)} title="Excluir"
                      >
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
            <AlertDialogTitle>Excluir resultado</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o resultado deste aluno? Esta ação não pode ser desfeita.</AlertDialogDescription>
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

function AssessmentsTab({ assessments, onRefresh }: { assessments: Assessment[]; onRefresh: () => void }) {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const disciplines = getDisciplines()
  const questions = getQuestions()

  function handleDelete() {
    if (deleteId) { deleteAssessment(deleteId); onRefresh(); setDeleteId(null) }
  }

  function handleTogglePublish(a: Assessment) {
    updateAssessment(a.id, { isPublished: !a.isPublished })
    onRefresh()
  }

  function handlePrint(a: Assessment) {
    printBlankAssessmentPDF({ assessment: a, questions })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingAssessment(null); setBuilderOpen(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Prova
        </Button>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm">Nenhuma prova criada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assessments.map((a) => {
            const disc = disciplines.find((d) => d.id === a.disciplineId)
            const subCount = getSubmissionsByAssessment(a.id).length
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      }`}>
                      {a.isPublished ? "Publicada" : "Rascunho"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>{disc?.name ?? "Disciplina removida"}</span>
                    <span>{a.questionIds.length} questão{a.questionIds.length !== 1 ? "ões" : ""}</span>
                    <span>{a.totalPoints.toFixed(1)} pts totais</span>
                    <span>{subCount} resposta{subCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Imprimir Prova em Branco" onClick={() => handlePrint(a)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={() => handleTogglePublish(a)}>
                    {a.isPublished ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                    {a.isPublished ? "Despublicar" : "Publicar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    onClick={() => { setEditingAssessment(a); setBuilderOpen(true) }} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(a.id)} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
  onRefresh: () => void
  onLogout: () => void
}) {
  const active = assessments[0]
  const supabase = createClient()

  async function handleLogout() {
    clearProfessorSession()
    await supabase.auth.signOut()
    onLogout()
  }

  function handleToggle() {
    if (!active) return
    updateAssessment(active.id, { isPublished: !active.isPublished })
    onRefresh()
  }

  function handleSchedule(field: "openAt" | "closeAt", value: string) {
    if (!active) return
    updateAssessment(active.id, { [field]: value ? new Date(value).toISOString() : null })
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      {active ? (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
          <h3 className="font-semibold text-foreground">Prova Ativa: {active.title}</h3>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="text-sm font-medium">Aberta para alunos</div>
              <div className="text-xs text-muted-foreground">Alunos podem acessar e enviar respostas</div>
            </div>
            <button
              onClick={handleToggle}
              className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${active.isPublished ? "bg-primary" : "bg-muted-foreground/40"}`}
              aria-pressed={active.isPublished}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${active.isPublished ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="text-sm font-medium">Variações Múltiplas</div>
              <div className="text-xs text-muted-foreground">Gerar Tipos A, B e C embaralhadas na impressão</div>
            </div>
            <button
              onClick={() => {
                if (!active) return
                updateAssessment(active.id, { shuffleVariants: !active.shuffleVariants })
                onRefresh()
              }}
              className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${active.shuffleVariants ? "bg-primary" : "bg-muted-foreground/40"}`}
              aria-pressed={active.shuffleVariants}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${active.shuffleVariants ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="open-at">Abertura agendada</Label>
              <Input
                id="open-at"
                type="datetime-local"
                defaultValue={active.openAt ? active.openAt.slice(0, 16) : ""}
                onBlur={(e) => handleSchedule("openAt", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="close-at">Encerramento agendado</Label>
              <Input
                id="close-at"
                type="datetime-local"
                defaultValue={active.closeAt ? active.closeAt.slice(0, 16) : ""}
                onBlur={(e) => handleSchedule("closeAt", e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
          Nenhuma prova criada. Acesse a aba <strong>Provas</strong> para criar a primeira.
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-1">Conta do Professor</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {MASTER_CREDENTIALS.name} — {MASTER_CREDENTIALS.email}
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sair do painel
        </Button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("overview")
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [username, setUsername] = useState("")
  const [userEmail, setUserEmail] = useState("")

  // Detect if current session is master
  const session = typeof window !== "undefined" ? getProfessorSession() : null
  const isMaster = session?.role === "master"
  const supabase = createClient()

  function refresh() {
    setAssessments(getAssessments())
    setSubmissions(getSubmissions())
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
    { id: "questions", label: "Banco de Questões", icon: <BookOpen className="h-4 w-4" /> },
    { id: "assessments", label: "Provas", icon: <FileText className="h-4 w-4" /> },
    { id: "professors", label: "Professores", icon: <ShieldCheck className="h-4 w-4" />, masterOnly: true },
    { id: "settings", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
  ]

  const visibleTabs = tabs.filter((t) => !t.masterOnly || isMaster)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground border-b border-primary/80">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-primary-foreground/70 uppercase tracking-widest font-sans">
              Instituto de Ensino Teológico - IETEO
            </p>
            <h1 className="text-xl font-bold font-serif">Painel do Professor</h1>
          </div>
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-2 justify-end">
              {isMaster && (
                <span className="text-xs bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full font-semibold">
                  Master
                </span>
              )}
              <p className="text-sm font-semibold">{username || "Professor"}</p>
            </div>
            <p className="text-xs text-primary-foreground/70">{userEmail}</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 overflow-x-auto">
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
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab assessments={assessments} submissions={submissions} />}
        {tab === "students" && <StudentsTab assessments={assessments} allSubmissions={submissions} onRefresh={refresh} />}
        {tab === "questions" && <QuestionBank />}
        {tab === "assessments" && <AssessmentsTab assessments={assessments} onRefresh={refresh} />}
        {tab === "professors" && isMaster && <ProfessorManager />}
        {tab === "settings" && <SettingsTab assessments={assessments} onRefresh={refresh} onLogout={onLogout} />}
      </div>
    </div>
  )
}
