"use client"

import { useEffect, useState } from "react"
import {
  Users, FileText, BookOpen, Settings, BarChart3, Download, LogOut,
  Plus, Pencil, Trash2, Eye, EyeOff, Trophy, Clock, CheckCircle2,
  ShieldCheck, Sparkles, AlertCircle, ChevronRight, ChevronLeft, Shuffle, Check, ListChecks, Search, HelpCircle, Variable,
  ArrowUp, ArrowDown, RefreshCw, List
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
type AssessmentFormat = QuestionType | "mixed" | "objective-only"

const FORMAT_LABELS: Record<AssessmentFormat, string> = {
  "multiple-choice": "Múltipla Escolha",
  "true-false": "Verdadeiro ou Falso",
  "objective-only": "Múltipla Escolha + V/F",
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
  const [logoBase64, setLogoBase64] = useState("")
  const [rules, setRules] = useState("")

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
    let mounted = true

    async function init() {
      const discs = await getDisciplines()
      if (!mounted) return
      setDisciplines(discs)

      if (assessment) {
        setTitle(assessment.title)
        setDisciplineId(assessment.disciplineId)
        setLogoBase64(assessment.logoBase64 ?? "")
        setRules(assessment.rules ?? "")
        setPointsPerQuestion(assessment.pointsPerQuestion)
        setQuestionCount(assessment.questionIds.length)
        setSelectedIds(new Set(assessment.questionIds))
        setStep(1)
      } else {
        setTitle("")
        setDisciplineId(discs[0]?.id ?? "")
        setLogoBase64("")
        setRules("")
        setFormat("multiple-choice")
        setQuestionCount(10)
        setPointsPerQuestion(1)
        setSelectionMode("auto")
        setSelectedIds(new Set())
        setStep(1)
      }
    }
    init()

    return () => { mounted = false }
  }, [open, assessment])

  useEffect(() => {
    if (!disciplineId) return
    let mounted = true
    async function loadQs() {
      let qs = await getQuestionsByDiscipline(disciplineId)
      if (!mounted) return
      if (format === "objective-only") {
        qs = qs.filter((q) => q.type === "multiple-choice" || q.type === "true-false")
      } else if (format !== "mixed") {
        qs = qs.filter((q) => q.type === format)
      }
      setAvailableQuestions(qs)
    }
    loadQs()

    return () => { mounted = false }
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

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setLogoBase64(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function canProceedStep2() {
    return questionCount >= 1 && pointsPerQuestion > 0
  }

  function canProceedStep3() {
    if (selectionMode === "auto") return true
    return selectedIds.size === questionCount
  }

  function handleNext() {
    if (step === 3 && selectionMode === "auto") {
      handleAutoSelect()
    }
    setStep((s) => s + 1)
  }

  function moveQuestion(index: number, direction: 'up' | 'down') {
    const arr = [...selectedIds]
    if (direction === 'up' && index > 0) {
      const temp = arr[index - 1]
      arr[index - 1] = arr[index]
      arr[index] = temp
      setSelectedIds(new Set(arr))
    } else if (direction === 'down' && index < arr.length - 1) {
      const temp = arr[index + 1]
      arr[index + 1] = arr[index]
      arr[index] = temp
      setSelectedIds(new Set(arr))
    }
  }

  function swapQuestionRandomly(idToReplace: string) {
    const arr = [...selectedIds]
    const unselected = availableQuestions.filter(q => !selectedIds.has(q.id))
    if (unselected.length === 0) {
      alert("Não há mais questões disponíveis no banco desta disciplina para realizar a troca.")
      return
    }
    const replacement = unselected[Math.floor(Math.random() * unselected.length)]
    const index = arr.indexOf(idToReplace)
    if (index !== -1) {
      arr[index] = replacement.id
      setSelectedIds(new Set(arr))
    }
  }

  function removeQuestionPreview(idToRemove: string) {
    const arr = [...selectedIds]
    const index = arr.indexOf(idToRemove)
    if (index !== -1) {
      arr.splice(index, 1)
      setSelectedIds(new Set(arr))
      // Decrease question_count as well to match reality
      setQuestionCount(prev => Math.max(1, prev - 1))
    }
  }

  async function handleSave() {
    // We already selected IDs asynchronously when moving to step 4, so selectedIds holds the exact preview.
    const finalIds = [...selectedIds]

    const totalPoints = finalIds.length * pointsPerQuestion

    if (assessment) {
      await updateAssessment(assessment.id, {
        title: title.trim(),
        disciplineId,
        logoBase64,
        rules: rules.trim(),
        questionIds: finalIds,
        pointsPerQuestion,
        totalPoints,
      })
    } else {
      await addAssessment({
        title: title.trim(),
        disciplineId,
        professor: PROFESSOR_CREDENTIALS.name,
        institution: "Instituto de Ensino Teológico - IETEO",
        logoBase64,
        rules: rules.trim(),
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
        <div className="flex items-center gap-2 px-1 py-4 sm:py-2 flex-wrap sm:flex-nowrap">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1 min-w-[120px]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${step > s ? "bg-primary text-primary-foreground" :
                step === s ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={`text-[11px] sm:text-xs font-medium ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Título" : s === 2 ? "Formato" : s === 3 ? "Questões" : "Visualizar"}
              </span>
              {s < 4 && <div className={`hidden sm:block h-px flex-1 ${step > s ? "bg-primary" : "bg-border"}`} />}
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assess-logo">Logo da Instituição (Opcional)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="assess-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  {logoBase64 && (
                    <div className="w-10 h-10 border rounded-md overflow-hidden flex items-center justify-center bg-muted">
                      <img src={logoBase64} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Esta imagem aparecerá apenas no cabeçalho ao imprimir a prova física.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assess-rules">Regras da Prova (Opcional)</Label>
                <Textarea
                  id="assess-rules"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Ex: Não é permitido o uso de celular..."
                  className="resize-none h-20"
                />
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
                      className={`text-left p-3 rounded-lg border-2 text-sm font-medium transition-colors ${format === f
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
                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${selectionMode === "auto"
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
                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${selectionMode === "manual"
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
                  <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
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
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" :
                              disabled ? "border-border opacity-40 cursor-not-allowed" :
                                "border-border hover:border-primary/40"
                              }`}
                          >
                            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? "border-primary bg-primary" : "border-muted-foreground"
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
                              <div className="flex items-center mb-1">
                                <span className="text-xs font-semibold text-muted-foreground mr-2">Q{i + 1}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {FORMAT_LABELS[q.type as AssessmentFormat] || q.type}
                                </span>
                              </div>
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

          {/* Step 4 */}
          {step === 4 && (
            <div className="flex flex-col px-1">
              <div className="bg-white border rounded shadow-sm text-black p-6 md:p-8 max-h-[60vh] overflow-y-auto">
                {/* Cabeçalho */}
                <div className="flex items-center gap-4 border-b-2 border-black pb-4 mb-6">
                  {logoBase64 && (
                    <img src={logoBase64} alt="Logo" className="w-20 h-20 object-contain" />
                  )}
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wide">Instituto de Ensino Teológico — IETEO</h1>
                    <p className="text-sm font-semibold uppercase mt-1">
                      Avaliação {selectedDisc ? `— ${selectedDisc.name}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm mb-6 border-b border-gray-300 pb-4">
                  <div className="flex gap-2">
                    <span className="font-semibold whitespace-nowrap">Aluno (a):</span>
                    <div className="border-b border-black flex-1" />
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold whitespace-nowrap">Data:</span>
                    <div className="border-b border-black w-24" />
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold whitespace-nowrap">Professor:</span>
                    <span className="flex-1 truncate">{PROFESSOR_CREDENTIALS.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold whitespace-nowrap">Nota:</span>
                    <div className="border-b border-black w-24" />
                  </div>
                </div>

                {rules && (
                  <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50/50">
                    <h3 className="text-xs font-bold uppercase mb-2 text-gray-500">Regras & Instruções</h3>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{rules}</p>
                  </div>
                )}

                <div className="flex flex-col gap-6">
                  {(() => {
                    let previewIds = [...selectedIds]
                    if (selectionMode === "auto") {
                      // We generate a deterministic preview based on random but we should lock it so it doesn't shuffle on every render
                      // To simplify, if it's auto and we reached step 4, we just show the first `questionCount` available questions if selectedIds is empty or we re-pick
                      if (previewIds.length === 0) {
                        previewIds = availableQuestions.slice(0, questionCount).map(q => q.id)
                      }
                    }
                    const previewQs = previewIds.map(id => availableQuestions.find(q => q.id === id)).filter(Boolean) as Question[]

                    return previewQs.map((q, idx) => (
                      <div key={idx} className="flex flex-col gap-2 relative border border-gray-200 rounded-md p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-end gap-1 mb-2 border-b border-gray-100 pb-2">
                          <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} className="p-1 px-2 flex items-center gap-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30 border text-xs font-medium" title="Mover para Cima">
                            <ArrowUp className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Subir</span>
                          </button>
                          <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === previewQs.length - 1} className="p-1 px-2 flex items-center gap-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30 border text-xs font-medium" title="Mover para Baixo">
                            <ArrowDown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Descer</span>
                          </button>
                          <button onClick={() => swapQuestionRandomly(q.id)} className="p-1 px-2 flex items-center gap-1 hover:bg-blue-50 rounded text-blue-600 border border-blue-200 ml-auto transition-colors text-xs font-medium" title="Trocar por outra (Aleatório)">
                            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Trocar</span>
                          </button>
                          <button onClick={() => removeQuestionPreview(q.id)} className="p-1 px-2 flex items-center gap-1 hover:bg-red-50 hover:text-red-600 rounded text-red-500 border border-red-200 transition-colors text-xs font-medium" title="Excluir Questão">
                            <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Excluir</span>
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-gray-700">{idx + 1}.</span>
                          <span className="text-sm font-medium text-gray-900 leading-relaxed">{q.text}</span>
                        </div>
                        {q.type === "multiple-choice" && (
                          <div className="flex flex-col gap-2 ml-6 mt-1">
                            {q.choices.map((c, cIdx) => {
                              const letter = String.fromCharCode(97 + cIdx)
                              return (
                                <div key={c.id} className="flex items-start gap-2 text-sm">
                                  <span className="font-semibold">({letter})</span>
                                  <span>{c.text}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {q.type === "true-false" && (
                          <div className="flex gap-4 ml-6 mt-1 text-sm">
                            <span>( ) V</span>
                            <span>( ) F</span>
                          </div>
                        )}
                        {q.type === "discursive" && (
                          <div className="mt-3 ml-6 space-y-4">
                            <div className="border-b border-gray-300 w-full" />
                            <div className="border-b border-gray-300 w-full" />
                            <div className="border-b border-gray-300 w-full" />
                          </div>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) onClose()
              else if (step === 4 && selectionMode === "auto") setStep(2) // Skip manual picker step if auto
              else setStep((s) => s - 1)
            }}
          >
            {step === 1 ? "Cancelar" : <><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>}
          </Button>
          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 ? !canProceedStep1() : step === 2 ? !canProceedStep2() : (selectionMode === "manual" && !canProceedStep3())}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-1.5" />
              {assessment ? "Salvar Alterações" : "Publicar Prova"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
