"use client"

import { useEffect, useState } from "react"
import {
  Users, FileText, BookOpen, Settings, BarChart3, Download, LogOut,
  Plus, Pencil, Trash2, Eye, EyeOff, Trophy, CheckCircle2, Link2,
  ShieldCheck, Loader2, DollarSign, MessageSquare, CalendarCheck, GraduationCap, XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type Assessment, type StudentSubmission, type Question, type Discipline,
  getAssessments, updateAssessment, deleteAssessment,
  getSubmissions, deleteSubmission, updateSubmissionScore,
  getQuestions, getDisciplines, clearProfessorSession, MASTER_CREDENTIALS,
  getProfessorSession,
} from "@/lib/store"
import { printStudentPDF, printBlankAssessmentPDF } from "@/lib/pdf"
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

type Tab = "overview" | "students" | "submissions" | "questions" | "assessments" | "professors" | "semesters" | "materials" | "financial" | "settings" | "chat" | "attendance" | "classes"

interface Props {
  onLogout: () => void
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ assessments, submissions, questions }: { assessments: Assessment[]; submissions: StudentSubmission[]; questions: Question[] }) {
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
                      {isMaster && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100" title="Editar Nota" onClick={() => startEditingScore(sub)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
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

function AssessmentsTab({ assessments, submissions, questions, disciplines, onRefresh }: { assessments: Assessment[]; submissions: StudentSubmission[]; questions: Question[]; disciplines: Discipline[]; onRefresh: () => void }) {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
                  <Button size="sm" variant="ghost" className="h-8 px-2 sm:px-3 text-xs" onClick={() => handleTogglePublish(a)}>
                    {a.isPublished ? <EyeOff className="h-3.5 w-3.5 sm:mr-1" /> : <Eye className="h-3.5 w-3.5 sm:mr-1" />}
                    <span className="hidden sm:inline">{a.isPublished ? "Despublicar" : "Publicar"}</span>
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
  onRefresh: (showLoading?: boolean) => void
  onLogout: () => void
}) {
  const active = assessments[0]
  const supabase = createClient()
  const [migrating, setMigrating] = useState(false)
  const session = typeof window !== "undefined" ? getProfessorSession() : null
  const isMaster = session?.role === "master"

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

  async function handleToggle() {
    if (!active) return
    await updateAssessment(active.id, { isPublished: !active.isPublished })
    onRefresh(false)
  }

  async function handleSchedule(field: "openAt" | "closeAt", value: string) {
    if (!active) return
    await updateAssessment(active.id, { [field]: value ? new Date(value).toISOString() : null })
    onRefresh(false)
  }

  async function handleShuffleToggle() {
    if (!active) return
    await updateAssessment(active.id, { shuffleVariants: !active.shuffleVariants })
    onRefresh(false)
  }

  async function handleReleaseResultsToggle() {
    if (!active) return
    await updateAssessment(active.id, { releaseResults: !active.releaseResults })
    onRefresh(false)
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
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex flex-col gap-5 flex-1 max-w-xl">
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
                  <div className={`w-4 h-4 rounded-full bg-primary-foreground transform transition-transform ${active.isPublished ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <div className="text-sm font-medium">Modelos de Provas Multíplas (A, B, C)</div>
                  <div className="text-xs text-muted-foreground">Ativa criação de provas embaralhadas ao gerar PDF</div>
                </div>
                <button
                  onClick={handleShuffleToggle}
                  className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${active.shuffleVariants ? "bg-primary" : "bg-muted-foreground/40"}`}
                  aria-pressed={active.shuffleVariants}
                >
                  <div className={`w-4 h-4 rounded-full bg-primary-foreground transform transition-transform ${active.shuffleVariants ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <div className="text-sm font-medium">Liberar Resultados para os Alunos</div>
                  <div className="text-xs text-muted-foreground">Exibe nota e gabarito na tela final do aluno</div>
                </div>
                <button
                  onClick={handleReleaseResultsToggle}
                  className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${active.releaseResults ? "bg-primary" : "bg-muted-foreground/40"}`}
                  aria-pressed={active.releaseResults}
                >
                  <div className={`w-4 h-4 rounded-full bg-primary-foreground transform transition-transform ${active.releaseResults ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Fix local timezone format for datetime-local */}
              {(() => {
                const toLocalDatetimeStr = (isoString: string | null) => {
                  if (!isoString) return ""
                  const d = new Date(isoString)
                  const pad = (n: number) => n.toString().padStart(2, '0')
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                }
                return (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Abertura Automática (Opcional)</Label>
                      <Input
                        type="datetime-local"
                        value={toLocalDatetimeStr(active.openAt)}
                        onChange={(e) => handleSchedule("openAt", e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Fechamento Automático (Opcional)</Label>
                      <Input
                        type="datetime-local"
                        value={toLocalDatetimeStr(active.closeAt)}
                        onChange={(e) => handleSchedule("closeAt", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">Crie e ative uma prova na aba Provas.</div>
          )}

          {/* Migration Tool */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-1">Migração de Dados</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Transfira provas, alunos e questões criadas anteriormente (no localhost) para o banco em nuvem atual (Supabase Vercel).
            </p>
            <Button
              variant="secondary"
              onClick={handleMigrateLocalData}
              disabled={migrating}
              className="w-full bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
            >
              {migrating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Migrar Dados Locais (LocalStorage)
            </Button>
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
    { id: "questions", label: "Banco de Questões", icon: <BookOpen className="h-4 w-4" /> },
    { id: "assessments", label: "Provas", icon: <FileText className="h-4 w-4" /> },
    { id: "materials", label: "Biblioteca (PDFs)", icon: <BookOpen className="h-4 w-4" /> },
    { id: "semesters", label: "Grade Curricular", icon: <BookOpen className="h-4 w-4" />, masterOnly: true },
    { id: "classes", label: "Turmas", icon: <GraduationCap className="h-4 w-4" />, masterOnly: true },
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
          <div>
            <p className="text-xs text-primary-foreground/70 uppercase tracking-widest font-sans">
              Instituto de Ensino Teológico - IETEO
            </p>
            <h1 className="text-xl font-bold font-serif">Painel do Professor</h1>
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
            {tab === "students" && <StudentManager />}
            {tab === "submissions" && <SubmissionsTab assessments={assessments} allSubmissions={submissions} questions={questions} onRefresh={refresh} isMaster={isMaster} />}
            {tab === "questions" && <QuestionBank />}
            {tab === "assessments" && <AssessmentsTab assessments={assessments} submissions={submissions} questions={questions} disciplines={disciplines} onRefresh={refresh} />}
            {tab === "materials" && <StudyMaterialManager />}
            {tab === "semesters" && <SemesterManager />}
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
