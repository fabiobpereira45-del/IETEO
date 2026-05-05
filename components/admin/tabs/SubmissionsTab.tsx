"use client"

import { useState, useEffect, useCallback } from "react"
import { BarChart3, CheckCircle2, Download, FileText, Pencil, Trophy, Trash2, Users, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
    type Assessment, type StudentSubmission, type Question, deleteSubmission, updateSubmissionScore,
    getAssessments, getSubmissions, getQuestions
} from "@/lib/store"
import { printStudentPDF, printCompiledSubmissionsPDF, printSubmissionsTablePDF } from "@/lib/pdf"
import { formatDate, formatTime } from "../admin-utils"
import { cn } from "@/lib/utils"

interface Props {
  isMaster: boolean
}

export function SubmissionsTab({ isMaster }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [allSubmissions, setAllSubmissions] = useState<StudentSubmission[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedAssessmentId, setSelectedAssessmentId] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<number>(0)
  const [isSavingScore, setIsSavingScore] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
        const [a, s, q] = await Promise.all([
            getAssessments(),
            getSubmissions(),
            getQuestions()
        ])
        setAssessments(a)
        setAllSubmissions(s)
        setQuestions(q)
        if (a.length > 0 && !selectedAssessmentId) {
            setSelectedAssessmentId(a[0].id)
        }
    } catch (err) {
        console.error("Error loading submissions data:", err)
    } finally {
        setLoading(false)
    }
  }, [selectedAssessmentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const submissions = allSubmissions
    .filter((s) => s.assessmentId === selectedAssessmentId)
    .sort((a, b) => b.percentage - a.percentage)

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId)

  const averageScore = submissions.length > 0
    ? submissions.reduce((acc, curr) => acc + curr.score, 0) / submissions.length
    : 0

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Carregando envios...</p>
          </div>
      )
  }

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
      loadData()
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
      loadData()
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedAssessment) {
                printSubmissionsTablePDF({ submissions, assessment: selectedAssessment })
              }
            }}
            disabled={submissions.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" /> Baixar Tabela de Notas
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
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Alertas</th>
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
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {(sub.focusLostCount ?? 0) > 0 ? (
                      <div className={cn("flex items-center justify-center gap-1", (sub.focusLostCount ?? 0) > 3 ? "text-red-500 font-bold" : "text-amber-500")}>
                        <XCircle className="h-3 w-3" />
                        <span>{sub.focusLostCount}</span>
                      </div>
                    ) : (
                      <span className="text-green-500 text-xs">Nenhum</span>
                    )}
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
            <AlertDialogHeader>Tem certeza que deseja apagar a resposta deste aluno? Esta ação não pode ser desfeita.</AlertDialogHeader>
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

