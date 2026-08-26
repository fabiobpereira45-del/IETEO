"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Sparkles,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  UploadCloud,
  FileText,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Eye,
  PlusCircle,
  GraduationCap,
  MessageSquare,
  ListChecks,
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  ShieldCheck,
  FolderDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type Discipline,
  type QuestionType,
  addQuestionsBatch,
  addAssessment,
  uid
} from "@/lib/store"
import { cn } from "@/lib/utils"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  id?: string
  type: QuestionType
  text: string
  choices: { id: string; text: string }[]
  pairs?: { id: string; left: string; right: string }[]
  correctAnswer: string
  explanation?: string
  bloomLevel?: number
  difficulty?: "facil" | "medio" | "dificil" | string
  points?: number
}

interface Props {
  disciplines: Discipline[]
  onQuestionsAdded: (assessmentCreated?: boolean) => void
  defaultDisciplineId?: string
}

// ─── Constants & Metadata ─────────────────────────────────────────────────────

const BLOOM_LEVELS = [
  { level: 1, label: "Lembrar", desc: "Citar fatos, versículos e termos teológicos" },
  { level: 2, label: "Compreender", desc: "Interpretar e sintetizar conceitos doutrinários" },
  { level: 3, label: "Aplicar", desc: "Aplicar a teologia em ética e vida pastoral" },
  { level: 4, label: "Analisar", desc: "Distinguir correntes e refutar distorções" },
  { level: 5, label: "Avaliar", desc: "Julgar argumentos sob o rigor bíblico" },
  { level: 6, label: "Criar", desc: "Formular sínteses exegéticas e propostas de ensino" },
]

const TYPE_CONFIG: Record<
  QuestionType,
  { label: string; icon: any; color: string; desc: string }
> = {
  "multiple-choice": {
    label: "Múltipla Escolha",
    icon: ListChecks,
    color: "bg-blue-500/10 text-blue-700 border-blue-200 dark:border-blue-800/40",
    desc: "4 ou 5 alternativas com apenas 1 correta"
  },
  "true-false": {
    label: "Verdadeiro ou Falso",
    icon: CheckCircle2,
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-800/40",
    desc: "Afirmações precisas com justificativa"
  },
  "discursive": {
    label: "Dissertativa / Subjetiva",
    icon: MessageSquare,
    color: "bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800/40",
    desc: "Questões abertas com espelho de correção"
  },
  "incorrect-alternative": {
    label: "Alternativa Incorreta",
    icon: X,
    color: "bg-rose-500/10 text-rose-700 border-rose-200 dark:border-rose-800/40",
    desc: "Assinalar a única opção teologicamente errada"
  },
  "fill-in-the-blank": {
    label: "Completar Lacunas",
    icon: BrainCircuit,
    color: "bg-cyan-500/10 text-cyan-700 border-cyan-200 dark:border-cyan-800/40",
    desc: "Sentença doutrinária com termos para preencher"
  },
  "matching": {
    label: "Relacionar Colunas",
    icon: Layers,
    color: "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:border-indigo-800/40",
    desc: "Pares conceituais (termo x definição)"
  }
}

const AI_PLATFORMS = [
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    badge: "OpenAI GPT-4o",
    desc: "Excelente para interpretação de PDFs e JSON estruturado",
    color: "hover:border-emerald-500/50 hover:bg-emerald-500/5"
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    badge: "Anthropic Sonnet",
    desc: "Maior capacidade para apostilas extensas e rigor exegético",
    color: "hover:border-orange-500/50 hover:bg-orange-500/5"
  },
  {
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    badge: "DeepSeek R1 / V3",
    desc: "Raciocínio lógico e estruturação de dados impecável",
    color: "hover:border-blue-500/50 hover:bg-blue-500/5"
  },
  {
    name: "Google Gemini",
    url: "https://gemini.google.com",
    badge: "Gemini 1.5 Pro",
    desc: "Leitura nativa ultrarrápida de PDFs e documentos",
    color: "hover:border-indigo-500/50 hover:bg-indigo-500/5"
  }
]

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AIQuestionGenerator({ disciplines, onQuestionsAdded, defaultDisciplineId }: Props) {
  const [activeTab, setActiveTab] = useState<"prompt" | "import">("prompt")
  
  // Parâmetros de Configuração
  const [disciplineId, setDisciplineId] = useState(defaultDisciplineId || disciplines[0]?.id || "")
  const [difficulty, setDifficulty] = useState("Intermediário (Graduação Teológica)")
  const [bloomLevel, setBloomLevel] = useState<number>(3)
  const [count, setCount] = useState<number>(5)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(["multiple-choice", "true-false"])
  const [hasCustomMaterial, setHasCustomMaterial] = useState<boolean>(true)
  const [customMaterialNotes, setCustomMaterialNotes] = useState<string>("")
  const [theologicalFocus, setTheologicalFocus] = useState<string>("")
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(1)

  // Estado da Cópia
  const [copied, setCopied] = useState(false)

  // Estado de Importação / Parser
  const [rawInput, setRawInput] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (defaultDisciplineId) {
      setDisciplineId(defaultDisciplineId)
    }
  }, [defaultDisciplineId])

  const selectedDisciplineName = useMemo(() => {
    return disciplines.find(d => d.id === disciplineId)?.name || "Teologia Geral"
  }, [disciplines, disciplineId])

  // ─── Gerador Dinâmico do Super-Prompt ───────────────────────────────────────
  
  const generatedPrompt = useMemo(() => {
    const typesFormatted = selectedTypes
      .map(t => `- ${TYPE_CONFIG[t].label}: (${TYPE_CONFIG[t].desc})`)
      .join("\n")

    const bloomInfo = BLOOM_LEVELS.find(b => b.level === bloomLevel)

    let prompt = `Você é um eminente Doutor em Teologia e Pedagogo Acadêmico especializado na elaboração de avaliações de alto rigor para seminários e faculdades teológicas.

SUA MISSÃO:
Gerar exatamente ${count} questões teológicas acadêmicas de excelência para a disciplina "${selectedDisciplineName}".

PARÂMETROS DE AVALIAÇÃO:
1. Disciplina: ${selectedDisciplineName}
2. Nível de Profundidade: ${difficulty}
3. Nível Cognitivo (Taxonomia de Bloom): Nível ${bloomLevel} - ${bloomInfo?.label} (${bloomInfo?.desc})
4. Quantidade Total de Questões: ${count}
5. Formatos de Questão Requeridos:
${typesFormatted}
`

    if (hasCustomMaterial) {
      prompt += `\nIMPORTANTE — ANEXO DE MATERIAL DIDÁTICO DO PROFESSOR:
Estou enviando em anexo (ou fornecendo o texto de) um material didático próprio (PDF, slides PPTX, apostila Word ou documento de aula).
Toda a base conceitual, definições doutrinárias, passagens bíblicas citadas e exegese das questões DEVEM SER EXTRAÍDAS ESTRITAMENTE do material fornecido em anexo.\n`
    }

    if (theologicalFocus.trim()) {
      prompt += `\nDIRECIONAMENTO TEOLÓGICO ESPECÍFICO:
"${theologicalFocus.trim()}"\n`
    }

    prompt += `
DIRETRIZES DE QUALIDADE ACADÊMICA:
- Todas as passagens bíblicas devem incluir referência exata (Livro Capítulo:Versículo).
- Múltipla Escolha: O enunciado deve ser claro. 4 alternativas (A a D) ou 5 alternativas (A a E), com distratores plausíveis baseados em confusões teológicas ou heresias históricas documentadas.
- Verdadeiro ou Falso: Afirmações sem ambiguidade com fundamentação teológica clara.
- Cada questão deve conter uma justificativa exegética/teológica detalhada (explanation).

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
Para que nosso sistema importe as questões automaticamente para o Banco de Questões, você DEVE responder EXCLUSIVAMENTE em formato JSON VÁLIDO (sem comentários adicionais fora do bloco JSON), conforme o seguinte schema exato:

\`\`\`json
{
  "questions": [
    {
      "type": "multiple-choice",
      "text": "Enunciado claro e bem fundamentado da questão...",
      "choices": [
        { "id": "A", "text": "Primeira alternativa" },
        { "id": "B", "text": "Segunda alternativa (Correta)" },
        { "id": "C", "text": "Terceira alternativa" },
        { "id": "D", "text": "Quarta alternativa" }
      ],
      "correctAnswer": "B",
      "explanation": "Fundamentação teológica e referência bíblica (ex: Romanos 3:24-26)",
      "bloomLevel": ${bloomLevel},
      "difficulty": "medio"
    },
    {
      "type": "true-false",
      "text": "Afirmação doutrinária a ser julgada...",
      "choices": [
        { "id": "V", "text": "Verdadeiro" },
        { "id": "F", "text": "Falso" }
      ],
      "correctAnswer": "V",
      "explanation": "Justificativa bíblica da veracidade ou falsidade da proposição.",
      "bloomLevel": ${bloomLevel},
      "difficulty": "medio"
    }
  ]
}
\`\`\`

Tipos aceitos no campo "type":
- "multiple-choice" (para Múltipla Escolha)
- "true-false" (para Verdadeiro ou Falso, correctAnswer deve ser "V" ou "F", ou "true"/"false")
- "discursive" (para Dissertativa, choices pode ser vazio e correctAnswer contém o espelho/pontos esperados)
- "incorrect-alternative" (para assinalar a incorreta)
- "fill-in-the-blank" (para completar lacunas)
- "matching" (para relacionar colunas, use o array "pairs": [{"id": "1", "left": "Termo", "right": "Definição"}])

Responda SOMENTE com o JSON contendo as ${count} questões formatadas.`

    return prompt
  }, [selectedDisciplineName, count, difficulty, bloomLevel, selectedTypes, hasCustomMaterial, theologicalFocus])

  // ─── Manipulação do Prompt (Copiar) ─────────────────────────────────────────

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error("Erro ao copiar para clipboard:", err)
    }
  }

  const toggleType = (t: QuestionType) => {
    setSelectedTypes(prev => {
      if (prev.includes(t)) {
        if (prev.length === 1) return prev // Não permite desmarcar todos
        return prev.filter(item => item !== t)
      } else {
        return [...prev, t]
      }
    })
  }

  // ─── Parser Inteligente de Questões (Importação) ────────────────────────────

  const handleParseInput = () => {
    setParseError(null)
    setSaveSuccessMessage(null)

    if (!rawInput.trim()) {
      setParseError("Por favor, cole o texto ou JSON retornado pela IA.")
      return
    }

    try {
      let cleaned = rawInput.trim()

      // Remover markdown code blocks ```json ... ``` ou ``` ... ```
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
      if (jsonMatch && jsonMatch[1]) {
        cleaned = jsonMatch[1].trim()
      } else {
        // Tenta encontrar o primeiro '{' ou '[' e o último '}' ou ']'
        const firstBracket = cleaned.indexOf("{")
        const firstSquare = cleaned.indexOf("[")
        let startIdx = -1

        if (firstBracket !== -1 && firstSquare !== -1) {
          startIdx = Math.min(firstBracket, firstSquare)
        } else {
          startIdx = firstBracket !== -1 ? firstBracket : firstSquare
        }

        if (startIdx !== -1) {
          const lastBracket = cleaned.lastIndexOf("}")
          const lastSquare = cleaned.lastIndexOf("]")
          const endIdx = Math.max(lastBracket, lastSquare)

          if (endIdx > startIdx) {
            cleaned = cleaned.slice(startIdx, endIdx + 1)
          }
        }
      }

      const parsed = JSON.parse(cleaned)
      let rawList: any[] = []

      if (Array.isArray(parsed)) {
        rawList = parsed
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        rawList = parsed.questions
      } else if (parsed.questoes && Array.isArray(parsed.questoes)) {
        rawList = parsed.questoes
      } else if (parsed.data && Array.isArray(parsed.data)) {
        rawList = parsed.data
      } else {
        throw new Error("Não foi possível encontrar a lista de questões no JSON.")
      }

      if (rawList.length === 0) {
        throw new Error("O JSON foi lido, mas nenhuma questão foi identificada.")
      }

      // Normalizar as questões para o schema do IETEO
      const normalized: ParsedQuestion[] = rawList.map((q, idx) => {
        let type: QuestionType = "multiple-choice"
        if (q.type && TYPE_CONFIG[q.type as QuestionType]) {
          type = q.type as QuestionType
        } else if (q.tipo) {
          if (q.tipo.includes("verdadeiro") || q.tipo === "tf") type = "true-false"
          else if (q.tipo.includes("dissert") || q.tipo === "subjetiva") type = "discursive"
          else if (q.tipo.includes("incorret")) type = "incorrect-alternative"
          else if (q.tipo.includes("lacuna")) type = "fill-in-the-blank"
          else if (q.tipo.includes("coluna") || q.tipo.includes("relacionar")) type = "matching"
        }

        // Normalização de escolhas / choices
        let choices: { id: string; text: string }[] = []
        if (Array.isArray(q.choices)) {
          choices = q.choices.map((c: any, cIdx: number) => {
            if (typeof c === "string") {
              const letter = String.fromCharCode(65 + cIdx)
              return { id: letter, text: c }
            }
            return {
              id: c.id ? String(c.id).trim() : String.fromCharCode(65 + cIdx),
              text: c.text || c.texto || ""
            }
          })
        } else if (Array.isArray(q.alternativas)) {
          choices = q.alternativas.map((c: any, cIdx: number) => ({
            id: c.letra || c.id || String.fromCharCode(65 + cIdx),
            text: typeof c === "string" ? c : c.texto || c.text || ""
          }))
        } else if (type === "true-false") {
          choices = [
            { id: "V", text: "Verdadeiro" },
            { id: "F", text: "Falso" }
          ]
        }

        // Resposta correta
        let correctAnswer = String(q.correctAnswer || q.respostaCorreta || q.gabarito || choices[0]?.id || "A").trim()
        if (type === "true-false") {
          if (correctAnswer.toLowerCase() === "true" || correctAnswer.toLowerCase() === "verdadeiro") correctAnswer = "V"
          if (correctAnswer.toLowerCase() === "false" || correctAnswer.toLowerCase() === "falso") correctAnswer = "F"
        }

        // Pares para matching
        let pairs: { id: string; left: string; right: string }[] | undefined
        if (Array.isArray(q.pairs)) {
          pairs = q.pairs.map((p: any, pIdx: number) => ({
            id: String(p.id || pIdx + 1),
            left: p.left || p.colunaA || p.termo || "",
            right: p.right || p.colunaB || p.definicao || ""
          }))
        }

        return {
          id: uid(),
          type,
          text: q.text || q.pergunta || q.enunciado || `Questão ${idx + 1}`,
          choices,
          pairs,
          correctAnswer,
          explanation: q.explanation || q.justificativa || q.exegese || null,
          bloomLevel: q.bloomLevel || bloomLevel,
          difficulty: q.difficulty || "medio",
          points: pointsPerQuestion
        }
      })

      setParsedQuestions(normalized)
      setSelectedIndices(new Set(normalized.map((_, i) => i)))
    } catch (err: any) {
      console.error("Erro ao analisar JSON:", err)
      setParseError(`Erro no formato dos dados: ${err.message || "Certifique-se de que o texto colado contém o JSON gerado pela IA."}`)
    }
  }

  // ─── Salvar / Migrar para o Banco ──────────────────────────────────────────

  const handleSaveToBank = async (createAssessmentReady = false) => {
    if (selectedIndices.size === 0) {
      setParseError("Selecione pelo menos uma questão para migrar.")
      return
    }

    setSaving(true)
    setParseError(null)

    try {
      const selectedList = parsedQuestions.filter((_, idx) => selectedIndices.has(idx))
      
      const payload = selectedList.map(q => {
        // Assegurar IDs de choices únicos para o schema do IETEO
        const choicesWithUid = q.choices.map(c => ({
          id: c.id,
          text: c.text
        }))

        return {
          disciplineId,
          type: q.type,
          text: q.text,
          choices: choicesWithUid,
          pairs: q.pairs,
          correctAnswer: q.correctAnswer,
          points: pointsPerQuestion
        }
      })

      const insertedIds = await addQuestionsBatch(payload)

      if (createAssessmentReady && insertedIds.length > 0) {
        await addAssessment({
          title: `Avaliação - ${selectedDisciplineName}`,
          disciplineId,
          professor: "Coordenação Teológica",
          institution: "Instituto de Ensino Teológico - IETEO",
          questionIds: insertedIds,
          pointsPerQuestion: pointsPerQuestion,
          totalPoints: insertedIds.length * pointsPerQuestion,
          isPublished: false,
          openAt: null,
          closeAt: null,
          rules: "Leia atentamente cada enunciado e fundamente as respostas com rigor bíblico.",
          modality: "public"
        })
      }

      setSaveSuccessMessage(
        createAssessmentReady
          ? `🎉 ${insertedIds.length} questões migradas e Avaliação criada com sucesso!`
          : `🎉 ${insertedIds.length} questões migradas com sucesso para o Banco de Questões!`
      )

      // Notificar o container superior
      setTimeout(() => {
        onQuestionsAdded(createAssessmentReady)
      }, 1200)

    } catch (err: any) {
      console.error("Erro ao salvar no banco:", err)
      setParseError(`Falha ao salvar no banco de questões: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ─── Alternar Seleção ───────────────────────────────────────────────────────

  const toggleSelectQuestion = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIndices(new Set(parsedQuestions.map((_, i) => i)))
  }

  const clearAll = () => {
    setSelectedIndices(new Set())
  }

  const removeQuestion = (idx: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== idx))
    setSelectedIndices(prev => {
      const next = new Set<number>()
      prev.forEach(val => {
        if (val < idx) next.add(val)
        else if (val > idx) next.add(val - 1)
      })
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      {/* ─── Header Principal ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <BrainCircuit className="h-64 w-64 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Motor Teológico de Alta Precisão
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100">
              Gerador de Questões Teológicas por IA
            </h2>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Crie prompts teológicos profundos com apoio de materiais próprios (PDF/Word/Slides), gere em IAs de ponta e migre automaticamente as questões para o seu banco.
            </p>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center min-w-[90px]">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bloom</span>
              <span className="text-lg font-black text-amber-400">{bloomLevel}/6</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center min-w-[90px]">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Formatos</span>
              <span className="text-lg font-black text-emerald-400">{selectedTypes.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navegação por Abas (2 Etapas) ─── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto h-12 rounded-2xl bg-muted/60 p-1 mb-6">
          <TabsTrigger
            value="prompt"
            className="rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            1. Configurar & Prompt
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <FolderDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            2. Colar & Migrar {parsedQuestions.length > 0 && `(${parsedQuestions.length})`}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 1: GERADOR & COPIADOR DO SUPER-PROMPT
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="prompt" className="space-y-8 mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Coluna Esquerda: Configurações de Entrada */}
            <div className="lg:col-span-6 space-y-6">
              {/* Card 1: Contexto da Disciplina e Nível */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Disciplina & Nível Acadêmico</h3>
                    <p className="text-xs text-muted-foreground">Defina a qual matéria as questões pertencerão</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" /> Disciplina de Destino
                    </Label>
                    <select
                      value={disciplineId}
                      onChange={(e) => setDisciplineId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-input bg-background px-3.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      {disciplines.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.semesterName ? `(${d.semesterName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Profundidade</Label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        <option value="Básico (Escola Bíblica / Fundamentos)">Básico (EBD / Membros)</option>
                        <option value="Intermediário (Graduação Teológica)">Intermediário (Bacharel)</option>
                        <option value="Avançado (Pós-Graduação / Seminário)">Avançado (Mestrado / Exegese)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nível de Bloom</Label>
                      <select
                        value={bloomLevel}
                        onChange={(e) => setBloomLevel(Number(e.target.value))}
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {BLOOM_LEVELS.map(b => (
                          <option key={b.level} value={b.level}>
                            Nível {b.level}: {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qtd. de Questões</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                        className="h-10 rounded-xl font-bold text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pontos por Questão</Label>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={pointsPerQuestion}
                        onChange={(e) => setPointsPerQuestion(Number(e.target.value) || 1)}
                        className="h-10 rounded-xl font-bold text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Material Próprio & Foco Específico */}
              <div className="rounded-3xl border border-amber-200/60 dark:border-amber-900/30 bg-amber-500/[0.03] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/40 dark:border-amber-900/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Material de Apoio Próprio</h3>
                      <p className="text-xs text-muted-foreground">Instruções para anexo de PDF, PPTX ou Word</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCustomMaterial}
                      onChange={(e) => setHasCustomMaterial(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {hasCustomMaterial && (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        O prompt incluirá ordens estritas para a IA externa **ler o arquivo que você anexar no chat (PDF, Word ou Slides)** e gerar o questionário baseado exclusivamente nele.
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Foco Temático / Instrução Adicional (Opcional)
                  </Label>
                  <Input
                    placeholder="Ex: Focar no capítulo 3 sobre Soteriologia Reformada e Justificação..."
                    value={theologicalFocus}
                    onChange={(e) => setTheologicalFocus(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              {/* Card 3: Formatos de Questão Desejados */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Formatos de Questão</h3>
                    <p className="text-xs text-muted-foreground">Selecione quais tipos deseja compor no prompt</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(TYPE_CONFIG) as QuestionType[]).map((t) => {
                    const cfg = TYPE_CONFIG[t]
                    const isSelected = selectedTypes.includes(t)
                    const Icon = cfg.icon

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        className={cn(
                          "flex flex-col items-center text-center p-3 rounded-2xl border-2 transition-all duration-200 relative group",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40"
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center mb-2 transition-transform",
                            isSelected ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-bold leading-tight">{cfg.label}</span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Preview do Super-Prompt & Atalhos de IA */}
            <div className="lg:col-span-6 space-y-6">
              {/* Card de Visualização do Prompt */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4 flex flex-col h-full">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Copy className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">Super-Prompt Gerado</h3>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleCopyPrompt}
                    className={cn(
                      "rounded-xl font-bold text-xs h-9 px-4 transition-all duration-300",
                      copied
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Super-Prompt
                      </>
                    )}
                  </Button>
                </div>

                {/* Prompt Preview Box */}
                <div className="relative flex-1 min-h-[260px] max-h-[380px] rounded-2xl bg-muted/40 border border-border/60 p-4 font-mono text-[11px] text-muted-foreground overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
                  {generatedPrompt}
                </div>

                {/* Plataformas de IA Externa - Atalhos de 1-Clique */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Escolha onde gerar:
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Clique para abrir em nova aba</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {AI_PLATFORMS.map((platform) => (
                      <a
                        key={platform.name}
                        href={platform.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background transition-all duration-200 group",
                          platform.color
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {platform.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{platform.badge}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Botão de Avanço para a Próxima Etapa */}
                <div className="pt-4 border-t border-border/60">
                  <Button
                    onClick={() => setActiveTab("import")}
                    variant="outline"
                    className="w-full h-12 rounded-2xl font-bold border-2 hover:bg-primary/5 hover:border-primary text-primary transition-all flex items-center justify-center gap-2"
                  >
                    Já copiou e gerou na IA? Ir para Importação
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 2: COLAR, VALIDAR & MIGRAR PARA O BANCO
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="import" className="space-y-6 mt-0 focus-visible:outline-none">
          {/* Caixa de Entrada e Processamento */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <FolderDown className="h-5 w-5 text-blue-600" />
                  Colar Resposta da IA Externa
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cole o resultado gerado pelo ChatGPT, Claude, DeepSeek ou Gemini abaixo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRawInput("")}
                  disabled={!rawInput}
                  className="rounded-xl text-xs h-9"
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={handleParseInput}
                  disabled={!rawInput.trim()}
                  className="rounded-xl font-bold text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Processar e Extrair Questões
                </Button>
              </div>
            </div>

            <Textarea
              placeholder={`Cole aqui o JSON retornado pela IA externa...\n\nExemplo:\n{\n  "questions": [\n    {\n      "type": "multiple-choice",\n      "text": "Qual é a ênfase central da Soteriologia em Romanos?",\n      "choices": [\n        { "id": "A", "text": "A justificação somente pela fé através da graça" },\n        { "id": "B", "text": "A salvação pelas obras da lei mosaica" }\n      ],\n      "correctAnswer": "A",\n      "explanation": "Romanos 3:28 e 5:1 fundamentam a justificação pela fé."\n    }\n  ]\n}`}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="font-mono text-xs min-h-[180px] max-h-[300px] rounded-2xl bg-muted/20 border-border resize-y"
            />

            {parseError && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {saveSuccessMessage && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Lista de Questões Extraídas com Preview Interativo */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Barra de Ações da Lista */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/40 border border-border/80">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                    {selectedIndices.size}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {parsedQuestions.length} questões prontas para importação
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Disciplina: <span className="font-semibold text-foreground">{selectedDisciplineName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="rounded-xl text-xs h-8 font-semibold"
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    className="rounded-xl text-xs h-8 font-semibold"
                  >
                    Desmarcar
                  </Button>
                </div>
              </div>

              {/* Cards das Questões */}
              <div className="grid grid-cols-1 gap-4">
                {parsedQuestions.map((q, idx) => {
                  const isSelected = selectedIndices.has(idx)
                  const typeMeta = TYPE_CONFIG[q.type] || TYPE_CONFIG["multiple-choice"]
                  const TypeIcon = typeMeta.icon

                  return (
                    <div
                      key={q.id || idx}
                      className={cn(
                        "rounded-3xl border-2 p-5 transition-all duration-200",
                        isSelected
                          ? "border-primary/60 bg-card shadow-sm"
                          : "border-border/50 bg-muted/10 opacity-70"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox de Seleção */}
                        <button
                          type="button"
                          onClick={() => toggleSelectQuestion(idx)}
                          className={cn(
                            "mt-1 h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background hover:border-primary/50"
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </button>

                        {/* Conteúdo da Questão */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Badges de Cabeçalho */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-black uppercase text-muted-foreground/80">
                                #{idx + 1}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider inline-flex items-center gap-1",
                                  typeMeta.color
                                )}
                              >
                                <TypeIcon className="h-3 w-3" />
                                {typeMeta.label}
                              </span>
                              {q.bloomLevel && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground uppercase">
                                  Bloom {q.bloomLevel}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeQuestion(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors"
                              title="Remover questão da lista"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Enunciado */}
                          <p className="text-sm font-semibold text-foreground leading-relaxed">
                            {q.text}
                          </p>

                          {/* Alternativas / Opções */}
                          {q.type === "multiple-choice" || q.type === "incorrect-alternative" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {q.choices.map((c) => {
                                const isCorrect = c.id === q.correctAnswer
                                return (
                                  <div
                                    key={c.id}
                                    className={cn(
                                      "flex items-start gap-2 p-2.5 rounded-xl text-xs border transition-colors",
                                      isCorrect
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold"
                                        : "bg-muted/30 border-border/50 text-muted-foreground"
                                    )}
                                  >
                                    <span className="font-mono font-bold opacity-70">{c.id})</span>
                                    <span className="flex-1">{c.text}</span>
                                    {isCorrect && (
                                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : q.type === "true-false" ? (
                            <div className="flex items-center gap-3 pt-1">
                              <div
                                className={cn(
                                  "px-3 py-1 rounded-xl text-xs font-bold border",
                                  q.correctAnswer === "V" || q.correctAnswer === "true"
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                )}
                              >
                                Gabarito: {q.correctAnswer === "V" || q.correctAnswer === "true" ? "Verdadeiro" : "Falso"}
                              </div>
                            </div>
                          ) : q.type === "matching" && q.pairs ? (
                            <div className="grid grid-cols-1 gap-1.5 pt-1">
                              {q.pairs.map((p, pIdx) => (
                                <div
                                  key={p.id || pIdx}
                                  className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50 text-xs"
                                >
                                  <span className="font-semibold text-foreground">{p.left}</span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    {p.right}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                              <span className="font-bold text-foreground">Espelho da Resposta: </span>
                              {q.correctAnswer}
                            </div>
                          )}

                          {/* Justificativa / Fundamentação Bíblica */}
                          {q.explanation && (
                            <div className="mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground/90 italic flex items-start gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span>{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Barra de Ação Fixa Inferior */}
              <div className="sticky bottom-4 z-40 bg-background/95 backdrop-blur-xl border border-border p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {selectedIndices.size} questões selecionadas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Destino: {selectedDisciplineName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleSaveToBank(false)}
                    disabled={selectedIndices.size === 0 || saving}
                    className="flex-1 sm:flex-none h-12 rounded-2xl px-6 font-bold border-2 hover:bg-muted"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Salvar no Banco de Questões
                  </Button>
                  <Button
                    onClick={() => handleSaveToBank(true)}
                    disabled={selectedIndices.size === 0 || saving}
                    className="flex-1 sm:flex-none h-12 rounded-2xl px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Salvar e Criar Prova
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
