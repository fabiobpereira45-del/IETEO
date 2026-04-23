"use client"

import { useEffect, useState } from "react"
import {
  Sparkles, BookOpen, Hash, ListChecks, Loader2, Check,
  ChevronDown, ChevronUp, Plus, AlertCircle, X, MessageSquare, Settings2,
  Key, Cpu, Copy, Terminal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIAssistantChat } from "./ai-assistant-chat"
import {
  type Discipline, type Question, type QuestionType,
  addQuestion, uid,
} from "@/lib/store"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  type: QuestionType
  text: string
  choices: { id: string; text: string }[]
  pairs?: { id: string; left: string; right: string }[]
  correctAnswer: string
  explanation: string | null
}

interface Props {
  disciplines: Discipline[]
  onQuestionsAdded: (assessmentCreated?: boolean) => void
  defaultDisciplineId?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  "multiple-choice": "Múltipla Escolha",
  "true-false": "Verdadeiro ou Falso",
  "discursive": "Discursiva",
  "incorrect-alternative": "Escolha a Incorreta",
  "fill-in-the-blank": "Completar Lacunas",
  "matching": "Relacionar Colunas"
}

const TYPE_COLORS: Record<QuestionType, string> = {
  "multiple-choice": "bg-blue-100 text-blue-700",
  "true-false": "bg-amber-100 text-amber-700",
  "discursive": "bg-purple-100 text-purple-700",
  "incorrect-alternative": "bg-red-100 text-red-700",
  "fill-in-the-blank": "bg-cyan-100 text-cyan-700",
  "matching": "bg-indigo-100 text-indigo-700"
}

// ─── Single question preview card ────────────────────────────────────────────

function QuestionPreviewCard({
  q,
  index,
  selected,
  onToggle,
}: {
  q: GeneratedQuestion
  index: number
  selected: boolean
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`border rounded-xl transition-colors ${selected
        ? "border-primary bg-primary/5"
        : "border-border bg-card hover:border-primary/50"
        }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${selected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border bg-background"
            }`}
          aria-label={selected ? "Desselecionar questão" : "Selecionar questão"}
        >
          {selected && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.type]}`}>
              {TYPE_LABELS[q.type]}
            </span>
          </div>

          <p className="text-sm text-foreground leading-relaxed">{q.text}</p>

          {/* Choices (múltipla escolha) */}
          {q.type === "multiple-choice" && q.choices.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {q.choices.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${c.id === q.correctAnswer
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-muted/50 text-muted-foreground"
                    }`}
                >
                  {c.id === q.correctAnswer && (
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                  )}
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* True/False */}
          {q.type === "true-false" && (
            <div className="mt-3">
              <span className={`text-sm px-3 py-1.5 rounded-lg font-semibold ${q.correctAnswer === "true"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                Resposta: {q.correctAnswer === "true" ? "Verdadeiro" : "Falso"}
              </span>
            </div>
          )}

          {/* Discursive */}
          {q.type === "discursive" && (
            <p className="mt-2 text-xs text-muted-foreground italic">
              Questão discursiva — correção manual pelo professor
            </p>
          )}

          {/* Fill in the blank */}
          {q.type === "fill-in-the-blank" && (
            <div className="mt-3">
              <span className="text-sm px-3 py-1.5 rounded-lg font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                Gabarito (Lacunas): {q.correctAnswer}
              </span>
            </div>
          )}

          {/* Matching Pairs */}
          {q.type === "matching" && q.pairs && q.pairs.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 bg-muted/30 p-3 rounded-lg border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Gabarito das Colunas:</p>
              {q.pairs.map((p, i) => (
                <div key={p.id} className="flex flex-col sm:flex-row gap-2 text-sm text-foreground">
                  <span className="font-medium min-w-[30px]">{i + 1}.</span>
                  <div className="flex-1 rounded p-1.5 bg-background border">{p.left}</div>
                  <span className="hidden sm:block text-muted-foreground">→</span>
                  <div className="flex-1 rounded p-1.5 bg-green-50 border border-green-200">{p.right}</div>
                </div>
              ))}
            </div>
          )}

          {/* Explanation toggle */}
          {q.explanation && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Ocultar fundamentação" : "Ver fundamentação teológica"}
            </button>
          )}
          {expanded && q.explanation && (
            <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-foreground leading-relaxed">
              {q.explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIQuestionGenerator({ disciplines, onQuestionsAdded, defaultDisciplineId }: Props) {
  const [disciplineId, setDisciplineId] = useState(defaultDisciplineId || disciplines[0]?.id || "")
  const [count, setCount] = useState(5)
  const [types, setTypes] = useState<QuestionType[]>(["multiple-choice", "true-false"])
  const [pointsPerQuestion, setPointsPerQuestion] = useState(1)
  const [audience, setAudience] = useState("Seminário Teológico / Graduação")
  const [difficulty, setDifficulty] = useState("Intermediário")
  const [aiProvider, setAiProvider] = useState("groq")
  const [apiKey, setApiKey] = useState("")

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sourceDetails, setSourceDetails] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (defaultDisciplineId) {
      setDisciplineId(defaultDisciplineId)
    }
    if (typeof window !== "undefined") {
      const savedProvider = localStorage.getItem("teologia_aiProvider") || "groq"
      setAiProvider(savedProvider)
    }
  }, [defaultDisciplineId])

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setAiProvider(val)
    if (typeof window !== "undefined") {
      localStorage.setItem("teologia_aiProvider", val)
    }
  }

  const selectedDiscipline = disciplines.find((d) => d.id === disciplineId)

  function toggleType(t: QuestionType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(generated.map((_, i) => i)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  function handleCopyPrompt() {
    const selectedDisc = disciplines.find((d) => d.id === disciplineId)
    const discName = selectedDisc?.name || disciplineId
    
    const typesList = types.map((t) => TYPE_LABELS[t]).join(", ")
    
    const promptText = `Atue como um Especialista em Teologia e Avaliação Acadêmica.
Preciso que você crie exatamente ${count} questão(ões) para a disciplina de "${discName}".

Público-Alvo: ${audience}
Nível de Dificuldade: ${difficulty}
Modalidades das questões solicitadas: ${typesList}.

Diretrizes obrigatórias:
1. Retorne as questões em formato CSV rigoroso, separando as colunas por ponto e vírgula (;).
2. O formato de cada linha deve ser: Pergunta; Alternativa A; Alternativa B; Alternativa C; Alternativa D; Letra Correta.
3. Não inclua numeração antes da pergunta.
4. Para questões que não sejam de Múltipla Escolha, adapte o formato, mas mantenha as 6 colunas. Ex para V/F: Pergunta; Verdadeiro; Falso; ; ; Letra Correta.
5. Não adicione nenhum texto introdutório, explicações ou notas no final. Apenas o conteúdo do CSV.

${sourceDetails ? `\nBASE DE CONHECIMENTO / CONTEXTO OBRIGATÓRIO:\n${sourceDetails}\n` : ""}
Gere as questões agora.`

    navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  async function handleGenerate() {
    if (!disciplineId) return
    if (types.length === 0) {
      setError("Selecione ao menos uma modalidade.")
      return
    }
    setLoading(true)
    setError(null)
    setGenerated([])
    setSelected(new Set())
    setSaved(false)

    try {
      const formData = new FormData()
      formData.append("discipline", selectedDiscipline?.name ?? disciplineId)
      formData.append("count", count.toString())
      formData.append("types", JSON.stringify(types))
      formData.append("sourceDetails", sourceDetails)
      formData.append("audience", audience)
      formData.append("difficulty", difficulty)
      formData.append("aiProvider", aiProvider)
      formData.append("apiKey", apiKey)

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("O arquivo selecionado é muito grande (máximo 10MB). Por favor, use um PDF menor ou remova imagens pesadas.")
        }
        formData.append("file", file)
      }

      const res = await fetch("/api/generate-questions", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("O arquivo enviado excede o limite do servidor (Vercel geralmente limita a 4.5MB). Tente um arquivo menor.")
        }
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Erro no servidor (${res.status}).`)
      }

      const data = await res.json()
      const qs: GeneratedQuestion[] = data.questions ?? []
      setGenerated(qs)
      setSelected(new Set(qs.map((_, i) => i)))
    } catch (e: any) {
      setError(e.message || "Erro ao gerar questões.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(createAssessment = false) {
    if (selected.size === 0) return
    setSaving(true)
    setError(null)

    try {
      const toSave = generated.filter((_, i) => selected.has(i))
      const savedIds: string[] = []

      for (const q of toSave) {
        const result = await addQuestion({
          disciplineId,
          type: q.type,
          text: q.text,
          choices: q.choices,
          pairs: q.pairs,
          correctAnswer: q.correctAnswer,
          points: pointsPerQuestion,
        })
        savedIds.push(result.id)
      }

      if (createAssessment && savedIds.length > 0) {
        const { addAssessment } = await import("@/lib/store")
        await addAssessment({
          title: `Avaliação que o professor irá editar`,
          disciplineId,
          professor: "IA Teológica",
          institution: "IETEO",
          questionIds: savedIds,
          pointsPerQuestion: pointsPerQuestion,
          totalPoints: savedIds.length * pointsPerQuestion,
          openAt: null,
          closeAt: null,
          isPublished: false,
          shuffleVariants: true,
          rules: "Avaliação gerada automaticamente por IA.",
          modality: "public"
        })
      }

      setSaved(true)
      setGenerated([])
      setSelected(new Set())
      onQuestionsAdded(createAssessment)
    } catch (e: any) {
      setError(`Erro ao salvar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Agente IA Teológico</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Especialista em Teologia. Gere questões automaticamente ou converse com o assistente para preparar seus materiais.
          </p>
        </div>
      </div>

      <Tabs defaultValue="automatic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl mb-4">
          <TabsTrigger value="automatic" className="rounded-lg data-[state=active]:accent-gradient data-[state=active]:text-white transition-all py-2 gap-2 text-xs sm:text-sm">
            <Settings2 className="h-4 w-4" /> Automático
          </TabsTrigger>
          <TabsTrigger value="prompt" className="rounded-lg data-[state=active]:accent-gradient data-[state=active]:text-white transition-all py-2 gap-2 text-xs sm:text-sm">
            <Terminal className="h-4 w-4" /> Gerar Prompt
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-lg data-[state=active]:accent-gradient data-[state=active]:text-white transition-all py-2 gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" /> Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automatic" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Configuração Básica */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4 transition-all hover:border-primary/20">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">Configuração Básica</h4>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Disciplina Correspondente</Label>
                      <select
                        value={disciplineId}
                        onChange={(e) => setDisciplineId(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      >
                        {disciplines.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Quantidade de Questões</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="h-9 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Nível e Público */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4 transition-all hover:border-primary/20">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">Perfil Pedagógico</h4>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Adequação / Público-Alvo</Label>
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      >
                        <option value="Escola Bíblica (Membros Gerais)">Escola Bíblica (Básico)</option>
                        <option value="Seminário Teológico / Graduação">Seminário Teológico (Normal)</option>
                        <option value="Pós-Graduação / Especialização">Pós / Especialização (Intenso)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Complexidade Exigida</Label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      >
                        <option value="Básico">Básico</option>
                        <option value="Intermediário">Intermediário</option>
                        <option value="Avançado">Avançado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Base de Conhecimento */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between border-b border-primary/10 pb-3 mb-1 relative z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm text-primary-foreground/80 text-foreground">Base de Conhecimento Alvo</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tracking-wide">Opcional</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Arquivo de Referência</Label>
                    <p className="text-[11px] text-muted-foreground mb-1 leading-tight">Envie PDF, PPTX ou Imagem contendo o assunto.</p>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".pdf,.pptx,.ppt,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="text-xs cursor-pointer h-9 file:text-xs file:mr-3 file:bg-primary/10 file:text-primary file:border-0 file:rounded file:px-2 file:py-1 hover:file:bg-primary/20 transition-all font-medium"
                      />
                    </div>
                    {file && (
                      <p className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1 mt-1 truncate">
                        <Check className="h-3 w-3 flex-shrink-0" /> Anexado: {file.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recorte de Estudo</Label>
                    <p className="text-[11px] text-muted-foreground mb-1 leading-tight">Direciona a IA para uma página ou tema específico.</p>
                    <Input
                      placeholder="Ex: Pág 10 a 15, Cap 2, Unidade IV..."
                      value={sourceDetails}
                      onChange={(e) => setSourceDetails(e.target.value)}
                      className="text-sm h-9 bg-background/50 backdrop-blur-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 3.5 Opções de IA e Credenciais */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4 transition-all hover:border-primary/20">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
                  <Cpu className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm text-foreground">Motor de IA</h4>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Provedor de Inteligência Artificial</Label>
                  <select
                    value={aiProvider}
                    onChange={handleProviderChange}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    <option value="groq">Groq (Llama 3)</option>
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="google">Google (Gemini)</option>
                  </select>
                </div>
              </div>

              {/* 4. Formato das Questões */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4 transition-all hover:border-primary/20">
                <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">Dinâmica das Questões</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor em Pontos</Label>
                    <Input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.5}
                      value={pointsPerQuestion}
                      onChange={(e) => setPointsPerQuestion(Number(e.target.value))}
                      className="w-16 h-7 text-xs text-center font-bold px-1"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Selecione Modalidades Autorizadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${types.includes(t)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:bg-muted"
                          }`}
                      >
                        {TYPE_LABELS[t]} {types.includes(t) && <Check className="inline-block w-3 h-3 ml-1 mb-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Erros e Botão CTA */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 border border-destructive/20 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading || saving || !disciplineId || types.length === 0}
                  className="h-12 px-6 rounded-full font-semibold shadow-lg shadow-primary/20 w-full sm:w-auto"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Elaborando prova detalhada...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Gerar Base de Avaliação com IA
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loading && (
              <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">O agente está elaborando as questões...</p>
                <p className="text-xs text-center max-w-xs">
                  Consultando base teológica e gerando questões academicamente rigorosas para "{selectedDiscipline?.name}"
                </p>
              </div>
            )}

            {saved && !generated.length && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800">
                <Check className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">Operação realizada com sucesso!</p>
                <button onClick={() => setSaved(false)} className="ml-auto">
                  <X className="h-4 w-4 opacity-60 hover:opacity-100" />
                </button>
              </div>
            )}

            {generated.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {generated.length} questão{generated.length !== 1 ? "ões" : ""} gerada{generated.length !== 1 ? "s" : ""}
                    {selected.size > 0 && (
                      <span className="text-muted-foreground font-normal">
                        {" "}— {selected.size} selecionada{selected.size !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
                      Selecionar todas
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={deselectAll}>
                      Limpar seleção
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {generated.map((q, i) => (
                    <QuestionPreviewCard
                      key={i}
                      q={q}
                      index={i}
                      selected={selected.has(i)}
                      onToggle={() => toggleSelect(i)}
                    />
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 flex-grow">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={selected.size === 0 || saving}
                    className="flex-1 sm:flex-none"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Guardar no banco
                  </Button>
                  <Button
                    onClick={() => handleSave(true)}
                    disabled={selected.size === 0 || saving}
                    className="flex-1 sm:flex-none accent-gradient text-white border-none"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Guardar e Gerar Prova
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="prompt" className="animate-in fade-in duration-300">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Perfil da Avaliação */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-sm text-foreground">Perfil da Avaliação</h4>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Disciplina</Label>
                    <select
                      value={disciplineId}
                      onChange={(e) => setDisciplineId(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary"
                    >
                      {disciplines.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Público-Alvo</Label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary"
                    >
                      <option value="Escola Bíblica (Membros Gerais)">Escola Bíblica (Básico)</option>
                      <option value="Seminário Teológico / Graduação">Seminário Teológico (Normal)</option>
                      <option value="Pós-Graduação / Especialização">Pós / Especialização (Intenso)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Complexidade e Volume */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-sm text-foreground">Complexidade e Volume</h4>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nível Exigido</Label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground font-medium w-full outline-none focus:border-primary"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Qtd. de Questões</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="h-10 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Conteúdo e Modalidades */}
            <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
                <ListChecks className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-sm text-foreground">Conteúdo e Modalidades</h4>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Modalidades das Questões</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${types.includes(t)
                        ? "bg-purple-700 text-white border-purple-700 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-purple-300 hover:bg-purple-50"
                        }`}
                    >
                      {TYPE_LABELS[t]} {types.includes(t) && <Check className="inline-block w-3.5 h-3.5 ml-1 mb-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recorte ou Assunto Específico (Opcional)</Label>
                <textarea
                  placeholder="Cole aqui um texto base, capítulos do livro ou temas específicos que a IA deve abordar..."
                  value={sourceDetails}
                  onChange={(e) => setSourceDetails(e.target.value)}
                  className="min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 resize-y"
                />
                <p className="text-[11px] text-muted-foreground italic mt-1">Dica: Quanto mais contexto você fornecer, melhor será a questão gerada.</p>
              </div>
            </div>

            {/* CTA Generate Prompt */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
              <div>
                <h4 className="font-bold text-base text-foreground">Tudo pronto?</h4>
                <p className="text-sm text-muted-foreground">Copie o prompt configurado e leve-o para sua IA.</p>
              </div>
              <Button 
                onClick={handleCopyPrompt} 
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-12 px-6 shadow-md shadow-purple-600/20 w-full sm:w-auto"
              >
                {copied ? <Check className="h-5 w-5 mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                {copied ? "Copiado!" : "Gerar e Copiar Prompt"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="animate-in fade-in slide-in-from-right-4 duration-300">
          <AIAssistantChat selectedDiscipline={selectedDiscipline} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
