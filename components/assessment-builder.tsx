"use client"

import { useEffect, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Shuffle, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  type Discipline, type Question, type QuestionType, type Assessment,
  getDisciplines, getQuestionsByDiscipline, addAssessment, updateAssessment, getQuestions,
  PROFESSOR_CREDENTIALS,
} from "@/lib/store"

type SelectionMode = "auto" | "manual"
type AssessmentFormat = QuestionType | "mixed"

const FORMAT_LABELS: Record<AssessmentFormat, string> = {
  "multiple-choice": "Múltipla Escolha",
  "true-false": "Verdadeiro ou Falso",
  discursive: "Discursiva",
  mixed: "Mista (todos os tipos)",
}

interface Props {
  open: boolean
  assessment?: Assessment | null // if set, editing mode
  onClose: () => void
  onSave: () => void
}

export function AssessmentBuilder({ open, assessment, onClose, onSave }: Props) {
  const [step, setStep] = useState(1)

  // Step 1
  const [title, setTitle] = useState("")
  const [disciplineId, setDisciplineId] = useState("")
  const [disciplines, setDisciplines] = useState<Discipline[]>([])

  // Step 2
  const [format, setFormat] = useState<AssessmentFormat>("multiple-choice")
  const [questionCount, setQuestionCount] = useState(10)
  const [pointsPerQuestion, setPointsPerQuestion] = useState(1)

  // Step 3
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("auto")
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    const discs = getDisciplines()
    setDisciplines(discs)

    if (assessment) {
      // Edit mode
      setTitle(assessment.title)
      setDisciplineId(assessment.disciplineId)
      setPointsPerQuestion(assessment.pointsPerQuestion)
      setQuestionCount(assessment.questionIds.length)
      setSelectedIds(new Set(assessment.questionIds))
      setStep(1)
    } else {
      // Create mode
      setTitle("")
      setDisciplineId(discs[0]?.id ?? "")
      setFormat("multiple-choice")
      setQuestionCount(10)
      setPointsPerQuestion(1)
      setSelectionMode("auto")
      setSelectedIds(new Set())
      setStep(1)
    }
  }, [open, assessment])

  useEffect(() => {
    if (!disciplineId) return
    let qs = getQuestionsByDiscipline(disciplineId)
    if (format !== "mixed") {
      qs = qs.filter((q) => q.type === format)
    }
    setAvailableQuestions(qs)
  }, [disciplineId, format])

  function handleAutoSelect() {
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(questionCount, shuffled.length))
    setSelectedIds(new Set(picked.map((q) => q.id)))
  }

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < questionCount) next.add(id)
      return next
    })
  }

  function canProceedStep1() {
    return title.trim().length > 0 && disciplineId.length > 0
  }

  function canProceedStep2() {
    return questionCount >= 1 && pointsPerQuestion > 0
  }

  function canProceedStep3() {
    if (selectionMode === "auto") return true
    return selectedIds.size === questionCount
  }

  function handleNext() {
    if (step === 2 && selectionMode === "auto") {
      handleAutoSelect()
    }
    setStep((s) => s + 1)
  }

  function handleSave() {
    let finalIds = [...selectedIds]
    if (selectionMode === "auto") {
      const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
      finalIds = shuffled.slice(0, Math.min(questionCount, shuffled.length)).map((q) => q.id)
    }

    const totalPoints = finalIds.length * pointsPerQuestion

    if (assessment) {
      updateAssessment(assessment.id, {
        title: title.trim(),
        disciplineId,
        questionIds: finalIds,
        pointsPerQuestion,
        totalPoints,
      })
    } else {
      addAssessment({
        title: title.trim(),
        disciplineId,
        professor: PROFESSOR_CREDENTIALS.name,
        institution: "IBAD — Núcleo Cosme de Fárias",
        questionIds: finalIds,
        pointsPerQuestion,
        totalPoints,
        openAt: null,
        closeAt: null,
        isPublished: false,
      })
    }

    onSave()
    onClose()
  }

  const totalPoints = questionCount * pointsPerQuestion
  const selectedDisc = disciplines.find((d) => d.id === disciplineId)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{assessment ? "Editar Prova" : "Criar Nova Prova"}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                step > s ? "bg-primary text-primary-foreground" :
                step === s ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={`text-xs font-medium ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Título e Disciplina" : s === 2 ? "Formato" : "Questões"}
              </span>
              {s < 3 && <div className={`h-px flex-1 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Step 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-5 px-1">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assess-title">Título da Prova *</Label>
                <Input
                  id="assess-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Avaliação Bimestral — Livros Poéticos"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Disciplina *</Label>
                <Select value={disciplineId} onValueChange={setDisciplineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDisc?.description && (
                  <p className="text-xs text-muted-foreground">{selectedDisc.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-5 px-1">
              <div className="flex flex-col gap-1.5">
                <Label>Formato das Questões *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FORMAT_LABELS) as AssessmentFormat[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`text-left p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        format === f
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label htmlFor="q-count">Número de Questões *</Label>
                  <Input
                    id="q-count"
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {availableQuestions.length} questão{availableQuestions.length !== 1 ? "ões" : ""} disponíveis
                  </p>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label htmlFor="pts-q">Pontos por Questão *</Label>
                  <Input
                    id="pts-q"
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={pointsPerQuestion}
                    onChange={(e) => setPointsPerQuestion(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Total: {totalPoints.toFixed(1)} pts</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-4 px-1">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectionMode("auto")}
                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    selectionMode === "auto"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Shuffle className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-semibold">Automático</div>
                    <div className="text-xs font-normal text-muted-foreground">Seleção aleatória do banco</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("manual")}
                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    selectionMode === "manual"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <List className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-semibold">Manual</div>
                    <div className="text-xs font-normal text-muted-foreground">Escolha as questões</div>
                  </div>
                </button>
              </div>

              {selectionMode === "manual" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Selecione exatamente <strong>{questionCount}</strong> questão{questionCount !== 1 ? "ões" : ""} ({selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""})
                    </p>
                    {availableQuestions.length > questionCount && (
                      <Button size="sm" variant="outline" onClick={handleAutoSelect}>
                        <Shuffle className="h-3.5 w-3.5 mr-1.5" /> Sortear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {availableQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhuma questão disponível para este formato e disciplina.
                      </p>
                    ) : (
                      availableQuestions.map((q, i) => {
                        const checked = selectedIds.has(q.id)
                        const disabled = !checked && selectedIds.size >= questionCount
                        return (
                          <label
                            key={q.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              checked ? "border-primary bg-primary/5" :
                              disabled ? "border-border opacity-40 cursor-not-allowed" :
                              "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              checked ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}>
                              {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleQuestion(q.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-muted-foreground mr-2">Q{i + 1}</span>
                              <span className="text-sm">{q.text}</span>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {selectionMode === "auto" && (
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  {Math.min(questionCount, availableQuestions.length)} questão{Math.min(questionCount, availableQuestions.length) !== 1 ? "ões" : ""} será{Math.min(questionCount, availableQuestions.length) !== 1 ? "ão" : ""} selecionada{Math.min(questionCount, availableQuestions.length) !== 1 ? "s" : ""} aleatoriamente do banco de {availableQuestions.length} questão{availableQuestions.length !== 1 ? "ões" : ""} disponíveis.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step === 1 ? onClose() : setStep((s) => s - 1)}
          >
            {step === 1 ? "Cancelar" : <><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>}
          </Button>
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 ? !canProceedStep1() : !canProceedStep2()}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={selectionMode === "manual" && !canProceedStep3()}>
              <Check className="h-4 w-4 mr-1.5" />
              {assessment ? "Salvar Alterações" : "Criar Prova"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
