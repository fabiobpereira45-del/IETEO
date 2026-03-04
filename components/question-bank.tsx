"use client"

import { useEffect, useState } from "react"
import {
  Plus, Pencil, Trash2, ChevronRight, BookOpen, CheckSquare, AlignLeft, X, Check, Sparkles, Upload
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  type Discipline, type Question, type QuestionType, type Choice,
  getDisciplines, addDiscipline, updateDiscipline, deleteDiscipline,
  getQuestionsByDiscipline, addQuestion, updateQuestion, deleteQuestion, uid,
} from "@/lib/store"
import { AIQuestionGenerator } from "./ai-question-generator"

// ─── Type Labels ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  "multiple-choice": "Múltipla Escolha",
  "true-false": "Verdadeiro ou Falso",
  discursive: "Discursiva",
}

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  "multiple-choice": <CheckSquare className="h-3.5 w-3.5" />,
  "true-false": <Check className="h-3.5 w-3.5" />,
  discursive: <AlignLeft className="h-3.5 w-3.5" />,
}

// ─── Discipline Modal ─────────────────────────────────────────────────────────

function DisciplineModal({
  open, discipline, onClose, onSave,
}: {
  open: boolean
  discipline: Discipline | null
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      setName(discipline?.name ?? "")
      setDescription(discipline?.description ?? "")
    }
  }, [open, discipline])

  async function handleSave() {
    if (!name.trim()) return
    if (discipline) {
      await updateDiscipline(discipline.id, { name: name.trim(), description: description.trim() || undefined })
    } else {
      await addDiscipline(name.trim(), description.trim() || undefined)
    }
    onSave()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{discipline ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disc-name">Nome *</Label>
            <Input
              id="disc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Livros Históricos"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disc-desc">Descrição</Label>
            <Input
              id="disc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Josué, Juízes, Rute..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Question Modal ───────────────────────────────────────────────────────────

function QuestionModal({
  open, question, disciplineId, onClose, onSave,
}: {
  open: boolean
  question: Question | null
  disciplineId: string
  onClose: () => void
  onSave: () => void
}) {
  const [type, setType] = useState<QuestionType>("multiple-choice")
  const [text, setText] = useState("")
  const [choices, setChoices] = useState<Choice[]>([
    { id: uid(), text: "" },
    { id: uid(), text: "" },
    { id: uid(), text: "" },
    { id: uid(), text: "" },
  ])
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [points, setPoints] = useState(1)

  useEffect(() => {
    if (!open) return
    if (question) {
      setType(question.type)
      setText(question.text)
      setChoices(
        question.choices.length > 0
          ? question.choices
          : [{ id: uid(), text: "" }, { id: uid(), text: "" }, { id: uid(), text: "" }, { id: uid(), text: "" }]
      )
      setCorrectAnswer(question.correctAnswer)
      setPoints(question.points)
    } else {
      setType("multiple-choice")
      setText("")
      setChoices([
        { id: uid(), text: "" },
        { id: uid(), text: "" },
        { id: uid(), text: "" },
        { id: uid(), text: "" },
      ])
      setCorrectAnswer("")
      setPoints(1)
    }
  }, [open, question])

  function handleTypeChange(t: QuestionType) {
    setType(t)
    setCorrectAnswer("")
  }

  function handleChoiceText(id: string, value: string) {
    setChoices((prev) => prev.map((c) => (c.id === id ? { ...c, text: value } : c)))
  }

  function addChoice() {
    setChoices((prev) => [...prev, { id: uid(), text: "" }])
  }

  function removeChoice(id: string) {
    if (choices.length <= 2) return
    setChoices((prev) => prev.filter((c) => c.id !== id))
    if (correctAnswer === id) setCorrectAnswer("")
  }

  function isValid() {
    if (!text.trim()) return false
    if (type === "multiple-choice") {
      const filled = choices.filter((c) => c.text.trim())
      return filled.length >= 2 && !!correctAnswer
    }
    if (type === "true-false") return !!correctAnswer
    return true // discursive
  }

  async function handleSave() {
    if (!isValid()) return
    const data = {
      disciplineId,
      type,
      text: text.trim(),
      choices: type === "multiple-choice" ? choices.filter((c) => c.text.trim()) : [],
      correctAnswer: type === "discursive" ? "" : correctAnswer,
      points,
    }
    if (question) {
      await updateQuestion(question.id, data)
    } else {
      await addQuestion(data)
    }
    onSave()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Editar Questão" : "Nova Questão"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          {/* Type + Points */}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label>Tipo de Questão *</Label>
              <Select value={type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 flex flex-col gap-1.5">
              <Label>Pontos *</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Question text */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-text">Enunciado *</Label>
            <Textarea
              id="q-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite o enunciado da questão..."
              rows={3}
            />
          </div>

          {/* Multiple choice options */}
          {type === "multiple-choice" && (
            <div className="flex flex-col gap-2">
              <Label>Alternativas * <span className="text-muted-foreground font-normal text-xs">(marque a correta)</span></Label>
              {choices.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectAnswer(c.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${correctAnswer === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                      }`}
                    aria-label={`Marcar alternativa ${i + 1} como correta`}
                  >
                    {correctAnswer === c.id && <Check className="h-3 w-3" />}
                  </button>
                  <span className="text-xs font-bold text-muted-foreground w-4">{String.fromCharCode(65 + i)}</span>
                  <Input
                    value={c.text}
                    onChange={(e) => handleChoiceText(c.id, e.target.value)}
                    placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(c.id)}
                    disabled={choices.length <= 2}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                    aria-label="Remover alternativa"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {choices.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addChoice} className="self-start mt-1">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar alternativa
                </Button>
              )}
            </div>
          )}

          {/* True/False */}
          {type === "true-false" && (
            <div className="flex flex-col gap-2">
              <Label>Resposta Correta *</Label>
              <div className="flex gap-3">
                {["true", "false"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCorrectAnswer(val)}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${correctAnswer === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                      }`}
                  >
                    {val === "true" ? "Verdadeiro" : "Falso"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Discursive note */}
          {type === "discursive" && (
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Questões discursivas não possuem gabarito automático. A correção deve ser feita manualmente pelo professor.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid()}>Salvar Questão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkImportModal({
  open, disciplineId, onClose, onSave,
}: {
  open: boolean
  disciplineId: string
  onClose: () => void
  onSave: () => void
}) {
  const [text, setText] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setText("")
      setError("")
    }
  }, [open])

  async function handleImport() {
    if (!text.trim()) return
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
    let addedCount = 0

    try {
      for (const line of lines) {
        if (line.toLowerCase().startsWith("pergunta;")) continue

        const parts = line.split(";")
        if (parts.length >= 6) {
          const [qText, a, b, c, d, correctLetter] = parts
          const choices = [
            { id: uid(), text: a.trim() },
            { id: uid(), text: b.trim() },
            { id: uid(), text: c.trim() },
            { id: uid(), text: d.trim() },
          ]
          let correctId = choices[0].id
          const letter = correctLetter.trim().toUpperCase()
          if (letter === "B") correctId = choices[1].id
          else if (letter === "C") correctId = choices[2].id
          else if (letter === "D") correctId = choices[3].id

          await addQuestion({
            disciplineId,
            type: "multiple-choice",
            text: qText.trim(),
            choices,
            correctAnswer: correctId,
            points: 1,
          })
          addedCount++
        }
      }
      if (addedCount > 0) {
        onSave()
        onClose()
      } else {
        setError("Nenhuma questão válida encontrada. Verifique o uso de ponto e vírgula (;)")
      }
    } catch (err) {
      setError("Erro ao processar as questões. Verifique o formato.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Lote de Questões</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 text-left">
            Cole as questões no formato CSV (separado por ponto e vírgula):<br />
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs border border-border mt-2 inline-block">
              Pergunta; Alternativa A; Alternativa B; Alternativa C; Alternativa D; Letra Correta
            </code>
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {error && <div className="text-destructive text-sm font-semibold">{error}</div>}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Exemplo:\nEm que ano o Brasil foi descoberto?; 1492; 1500; 1532; 1822; B\nQual o primeiro livro da Bíblia?; Gênesis; Êxodo; Levítico; Números; A`}
            className="font-mono text-sm h-64 whitespace-pre"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!text.trim()}>Importar Questões</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuestionBank() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})

  // Modals
  const [discModal, setDiscModal] = useState(false)
  const [editingDisc, setEditingDisc] = useState<Discipline | null>(null)
  const [deleteDiscId, setDeleteDiscId] = useState<string | null>(null)

  const [qModal, setQModal] = useState(false)
  const [editingQ, setEditingQ] = useState<Question | null>(null)
  const [deleteQId, setDeleteQId] = useState<string | null>(null)

  const [aiModal, setAiModal] = useState(false)
  const [importModal, setImportModal] = useState(false)

  async function reload(discIdToSelect?: string) {
    const discs = await getDisciplines()
    setDisciplines(discs)

    const counts: Record<string, number> = {}
    for (const d of discs) {
      const qs = await getQuestionsByDiscipline(d.id)
      counts[d.id] = qs.length
    }
    setQuestionCounts(counts)

    let toSelect = selectedDiscipline
    if (discIdToSelect) {
      toSelect = discs.find((d) => d.id === discIdToSelect) || null
    } else if (selectedDiscipline) {
      toSelect = discs.find((d) => d.id === selectedDiscipline.id) || null
    }

    if (!toSelect && discs.length > 0) {
      toSelect = discs[0]
    }

    setSelectedDiscipline(toSelect)

    if (toSelect) {
      const qs = await getQuestionsByDiscipline(toSelect.id)
      setQuestions(qs)
    } else {
      setQuestions([])
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleSelectDisc(d: Discipline) {
    setSelectedDiscipline(d)
    const qs = await getQuestionsByDiscipline(d.id)
    setQuestions(qs)
  }

  async function handleDeleteDisc(id: string) {
    await deleteDiscipline(id)
    await reload()
    setDeleteDiscId(null)
  }

  async function handleDeleteQ(id: string) {
    await deleteQuestion(id)
    if (selectedDiscipline) {
      reload(selectedDiscipline.id)
    }
    setDeleteQId(null)
  }

  const discToDelete = disciplines.find((d) => d.id === deleteDiscId)
  const qToDelete = questions.find((q) => q.id === deleteQId)

  return (
    <div className="flex h-full min-h-[600px] gap-0 rounded-xl border border-border overflow-hidden bg-card">
      {/* Left: Disciplines */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-border bg-muted/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Disciplinas</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => { setEditingDisc(null); setDiscModal(true) }}
            aria-label="Nova disciplina"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {disciplines.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma disciplina cadastrada
            </div>
          ) : (
            disciplines.map((d) => {
              const count = questionCounts[d.id]
              const active = selectedDiscipline?.id === d.id
              return (
                <div
                  key={d.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                  onClick={() => handleSelectDisc(d)}
                >
                  <BookOpen className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{count === undefined ? "Carregando" : count} questão{count !== 1 ? "ões" : ""}</p>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                  <div className={`flex-shrink-0 flex gap-0.5 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingDisc(d); setDiscModal(true) }}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Editar disciplina"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteDiscId(d.id) }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Excluir disciplina"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Questions */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <span className="text-sm font-semibold text-foreground">
              {selectedDiscipline ? selectedDiscipline.name : "Selecione uma disciplina"}
            </span>
            {selectedDiscipline?.description && (
              <p className="text-xs text-muted-foreground">{selectedDiscipline.description}</p>
            )}
          </div>
          {selectedDiscipline && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                onClick={() => setAiModal(true)}
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> Gerar com IA
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportModal(true)}
              >
                <Upload className="h-4 w-4 mr-1.5" /> Importar Lote
              </Button>
              <Button
                size="sm"
                onClick={() => { setEditingQ(null); setQModal(true) }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nova Questão
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {!selectedDiscipline ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <BookOpen className="h-10 w-10 opacity-30" />
              <p className="text-sm">Selecione uma disciplina para ver suas questões</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <AlignLeft className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma questão cadastrada nesta disciplina</p>
              <Button size="sm" variant="outline" onClick={() => { setEditingQ(null); setQModal(true) }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar primeira questão
              </Button>
            </div>
          ) : (
            questions.map((q, i) => (
              <div
                key={q.id}
                className="group flex items-start gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${q.type === "multiple-choice" ? "bg-blue-100 text-blue-700" :
                      q.type === "true-false" ? "bg-amber-100 text-amber-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                      {TYPE_ICONS[q.type]}
                      {TYPE_LABELS[q.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
                  {q.type === "multiple-choice" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.choices.map((c) => (
                        <span
                          key={c.id}
                          className={`text-xs px-2 py-0.5 rounded ${c.id === q.correctAnswer
                            ? "bg-green-100 text-green-700 font-semibold"
                            : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {c.id === q.correctAnswer && <Check className="inline h-3 w-3 mr-0.5" />}
                          {c.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === "true-false" && (
                    <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                      Gabarito: {q.correctAnswer === "true" ? "Verdadeiro" : "Falso"}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => { setEditingQ(q); setQModal(true) }}
                    aria-label="Editar questão"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteQId(q.id)}
                    aria-label="Excluir questão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Discipline Modal */}
      <DisciplineModal
        open={discModal}
        discipline={editingDisc}
        onClose={() => setDiscModal(false)}
        onSave={reload}
      />

      {/* Question Modal */}
      {selectedDiscipline && (
        <QuestionModal
          open={qModal}
          question={editingQ}
          disciplineId={selectedDiscipline.id}
          onClose={() => setQModal(false)}
          onSave={() => {
            if (selectedDiscipline) reload(selectedDiscipline.id)
          }}
        />
      )}

      {/* AI Generator Modal */}
      <Dialog open={aiModal} onOpenChange={setAiModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border max-h-[90vh]">
          <VisuallyHidden>
            <DialogTitle>Gerador de Questões com IA</DialogTitle>
          </VisuallyHidden>
          <div className="overflow-y-auto max-h-[90vh]">
            <AIQuestionGenerator
              disciplines={disciplines}
              onQuestionsAdded={() => {
                setAiModal(false)
                if (selectedDiscipline) {
                  reload(selectedDiscipline.id)
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <BulkImportModal
        open={importModal}
        disciplineId={selectedDiscipline?.id ?? ""}
        onClose={() => setImportModal(false)}
        onSave={() => {
          if (selectedDiscipline) reload(selectedDiscipline.id)
        }}
      />

      {/* Delete Discipline Confirm */}
      <AlertDialog open={!!deleteDiscId} onOpenChange={(o) => !o && setDeleteDiscId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir disciplina</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{discToDelete?.name}</strong>? Todas as questões vinculadas a esta disciplina também serão excluídas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDiscId && handleDeleteDisc(deleteDiscId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Question Confirm */}
      <AlertDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteQId && handleDeleteQ(deleteQId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
