"use client"

import { useEffect, useState, useCallback } from "react"
import { Archive, ArchiveRestore, CheckCircle2, Download, Eye, EyeOff, FileCheck, FileText, Link2, Pencil, Plus, Save, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
    type Assessment, type StudentSubmission, type Question, type Discipline, updateAssessment, deleteAssessment,
    getAssessments, getSubmissions, getQuestions, getDisciplines
} from "@/lib/store"
import { printBlankAssessmentPDF, printAnswerKeyPDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import { AssessmentBuilder } from "@/components/assessment-builder"
import { cn } from "@/lib/utils"

interface Props {
  isMaster: boolean
}

export function AssessmentsTab({ isMaster }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const loadData = useCallback(async () => {
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
        console.error("Error loading assessments data:", err)
    } finally {
        setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAssessments = assessments.filter(a => a.archived === showArchived)
  const active = assessments.find(a => !a.archived && a.isPublished) || assessments.find(a => !a.archived)

  const [localOpenAt, setLocalOpenAt] = useState<string | null>(null)
  const [localCloseAt, setLocalCloseAt] = useState<string | null>(null)

  useEffect(() => {
    if (active) {
      setLocalOpenAt(active.openAt)
      setLocalCloseAt(active.closeAt)
    }
  }, [active?.id])

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Carregando provas...</p>
          </div>
      )
  }

  function handleCopyLink(a: Assessment) {
    const url = `${window.location.origin}/prova?id=${a.id}`
    navigator.clipboard.writeText(url)
    setCopiedId(a.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  async function handleDelete() {
    if (deleteId) {
      await deleteAssessment(deleteId)
      loadData()
      setDeleteId(null)
    }
  }

  async function handleTogglePublish(a: Assessment) {
    await updateAssessment(a.id, { isPublished: !a.isPublished })
    loadData()
  }

  async function handleToggleArchive(a: Assessment) {
    await updateAssessment(a.id, { archived: !a.archived })
    loadData()
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
    loadData()
  }

  async function handleShuffleToggle() {
    if (!active) return
    await updateAssessment(active.id, { shuffleVariants: !active.shuffleVariants })
    loadData()
  }

  async function handleReleaseResultsToggle() {
    if (!active) return
    await updateAssessment(active.id, { releaseResults: !active.releaseResults })
    loadData()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center glass rounded-2xl p-6 premium-shadow">
        <div>
          <h2 className="text-xl font-bold font-serif text-foreground">Gerenciamento de Provas</h2>
          <p className="text-muted-foreground text-sm">Crie, edite e acompanhe o status de suas avaliações</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className={cn("rounded-xl border-border", showArchived && "bg-primary/10 text-primary border-primary/20")}
          >
            {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showArchived ? "Ver Ativas" : "Ver Arquivadas"}
          </Button>
          <Button onClick={() => { setEditingAssessment(null); setBuilderOpen(true) }} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5 mr-1.5" /> Criar Nova Prova
          </Button>
        </div>
      </div>

      {active && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col gap-6 shadow-sm relative overflow-hidden premium-shadow">
          <div className="absolute top-0 left-0 w-1.5 h-full premium-gradient" />
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-xl">Configurações da Prova Ativa</h3>
            <p className="text-sm text-primary font-medium">{active.title}</p>
          </div>
          <p className="text-sm text-muted-foreground">A prova mais recente é considerada a prova ativa do sistema.</p>

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

      {filteredAssessments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm">{showArchived ? "Nenhuma prova arquivada." : "Nenhuma prova ativa encontrada."}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAssessments.map((a) => {
            const disc = disciplines.find((d) => d.id === a.disciplineId)
            const subCount = submissions.filter(s => s.assessmentId === a.id).length
            return (
              <div key={a.id} className={cn(
                "bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
                a.archived && "opacity-75 bg-muted/30 border-dashed"
              )}>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {a.isPublished ? "Publicada" : "Rascunho"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.modality === "private" ? "bg-primary/10 text-primary" : "bg-blue-50 text-blue-600"}`}>
                      {a.modality === "private" ? "🔒 Privada" : "🌐 Pública"}
                    </span>
                    {a.archived && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        📦 ARQUIVADA
                      </span>
                    )}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-8 px-2 sm:px-3 text-xs", a.archived && "text-primary hover:bg-primary/10")}
                    onClick={() => handleToggleArchive(a)}
                    title={a.archived ? "Desarquivar" : "Arquivar"}
                  >
                    {a.archived ? <ArchiveRestore className="h-3.5 w-3.5 sm:mr-1" /> : <Archive className="h-3.5 w-3.5 sm:mr-1" />}
                    <span className="hidden sm:inline">{a.archived ? "Restaurar" : "Arquivar"}</span>
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
          onSave={() => loadData()}
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

