"use client"

import { useEffect, useState, useRef } from "react"
import {
  Sparkles, BookOpen, Hash, ListChecks, Loader2, Check,
  ChevronDown, ChevronUp, Plus, AlertCircle, X, MessageSquare, Settings2,
  Key, Cpu, Copy, Terminal, FileText, BrainCircuit, GraduationCap, 
  Layers, Zap, Info, ShieldCheck, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIAssistantChat } from "./ai-assistant-chat"
import {
  type Discipline, type Question, type QuestionType,
  addQuestion, addQuestionsBatch, addAssessment, uid,
} from "@/lib/store"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  type: QuestionType
  text: string
  choices: { id: string; text: string }[]
  pairs?: { id: string; left: string; right: string }[]
  correctAnswer: string
  explanation: string | null
  bloomLevel?: number // 1-6
  difficulty?: "facil" | "medio" | "dificil"
}

interface Props {
  disciplines: Discipline[]
  onQuestionsAdded: (assessmentCreated?: boolean) => void
  defaultDisciplineId?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOM_LEVELS = [
  { level: 1, label: "Lembrar", desc: "Reconhecer e citar fatos e conceitos bíblicos." },
  { level: 2, label: "Compreender", desc: "Interpretar e resumir parágrafos teológicos." },
  { level: 3, label: "Aplicar", desc: "Usar a doutrina em situações práticas ou casos." },
  { level: 4, label: "Analisar", desc: "Distinguir entre diferentes posições teológicas." },
  { level: 5, label: "Avaliar", desc: "Julgar o valor de uma afirmação baseada em evidências." },
  { level: 6, label: "Criar", desc: "Sintetizar novos insights a partir de várias fontes." },
]

const TYPE_LABELS: Record<QuestionType, string> = {
  "multiple-choice": "Múltipla Escolha",
  "true-false": "Verdadeiro ou Falso",
  "discursive": "Dissertativa / Subjetiva",
  "incorrect-alternative": "Alternativa Incorreta",
  "fill-in-the-blank": "Completar Lacunas",
  "matching": "Relacionar Colunas"
}

const TYPE_COLORS: Record<QuestionType, string> = {
  "multiple-choice": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "true-false": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "discursive": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "incorrect-alternative": "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "fill-in-the-blank": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "matching": "bg-amber-500/10 text-amber-600 border-amber-500/20"
}

// ─── Components ───────────────────────────────────────────────────────────────

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
      className={cn(
        "group border-2 rounded-2xl transition-all duration-300 overflow-hidden",
        selected
          ? "border-primary bg-primary/[0.02] shadow-lg shadow-primary/5"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-4 p-5">
        {/* Selection Marker */}
        <button
          onClick={onToggle}
          className={cn(
            "mt-1 flex-shrink-0 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
            selected
              ? "bg-primary border-primary text-primary-foreground scale-110 rotate-3 shadow-md"
              : "border-border bg-background group-hover:border-primary/50"
          )}
        >
          {selected && <Check className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Q{index + 1}</span>
            <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider", TYPE_COLORS[q.type])}>
              {TYPE_LABELS[q.type]}
            </span>
            {q.bloomLevel && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-secondary text-secondary-foreground border border-border uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3" /> Bloom {q.bloomLevel}
              </span>
            )}
          </div>

          <p className="text-base font-medium text-foreground leading-relaxed mb-4">{q.text}</p>

          {/* Type-Specific Content */}
          <div className="space-y-2">
            {q.type === "multiple-choice" && q.choices.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-start gap-3 text-sm rounded-xl px-4 py-2.5 transition-colors",
                  c.id === q.correctAnswer
                    ? "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 font-semibold"
                    : "bg-muted/40 text-muted-foreground border border-transparent"
                )}
              >
                <span className="opacity-50 mt-0.5">{String.fromCharCode(65 + i)})</span>
                <span>{c.text}</span>
              </div>
            ))}

            {q.type === "true-false" && (
              <div className="flex gap-2">
                <div className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold border",
                  q.correctAnswer === "true" 
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                )}>
                  Gabarito: {q.correctAnswer === "true" ? "Verdadeiro" : "Falso"}
                </div>
              </div>
            )}

            {q.type === "matching" && q.pairs && (
              <div className="grid grid-cols-1 gap-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                {q.pairs.map((p, i) => (
                  <div key={p.id} className="flex flex-col sm:flex-row gap-2 text-xs">
                    <div className="flex-1 p-2 rounded-lg bg-background border border-border">{p.left}</div>
                    <div className="flex items-center justify-center px-2 text-primary/40">→</div>
                    <div className="flex-1 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 font-medium">{p.right}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Explanation / Theological Rationale */}
          {q.explanation && (
            <div className="mt-5 border-t border-border/50 pt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs font-bold text-primary/80 hover:text-primary uppercase tracking-widest"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expanded ? "Ocultar Exegese" : "Ver Fundamentação Teológica"}
              </button>
              {expanded && (
                <div className="mt-3 bg-primary/5 rounded-xl p-4 text-sm text-foreground/80 leading-relaxed italic border border-primary/10 animate-in fade-in slide-in-from-top-1">
                  {q.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AIQuestionGenerator({ disciplines, onQuestionsAdded, defaultDisciplineId }: Props) {
  // State
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
  const [file, setFile] = useState<File | null>(null)
  const [sourceDetails, setSourceDetails] = useState("")
  
  // Refs for auto-scroll
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultDisciplineId) setDisciplineId(defaultDisciplineId)
    if (typeof window !== "undefined") {
      try {
        setAiProvider(localStorage.getItem("teologia_aiProvider") || "groq")
        setApiKey(localStorage.getItem("teologia_apiKey") || "")
      } catch (e) {
        console.warn("Storage access failed", e)
      }
    }
  }, [defaultDisciplineId])

  const handleProviderChange = (val: string) => {
    setAiProvider(val)
    try {
      localStorage.setItem("teologia_aiProvider", val)
    } catch (e) {}
  }

  const handleApiKeyChange = (val: string) => {
    setApiKey(val)
    try {
      localStorage.setItem("teologia_apiKey", val)
    } catch (e) {}
  }

  const toggleType = (t: QuestionType) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("Por favor, insira sua Chave de API nas configurações abaixo.")
      return
    }
    setLoading(true)
    setError(null)
    setGenerated([])
    
    try {
      const formData = new FormData()
      const selectedDisc = disciplines.find(d => d.id === disciplineId)
      formData.append("discipline", selectedDisc?.name ?? disciplineId)
      formData.append("count", count.toString())
      formData.append("types", JSON.stringify(types))
      formData.append("sourceDetails", sourceDetails)
      formData.append("audience", audience)
      formData.append("difficulty", difficulty)
      formData.append("aiProvider", aiProvider)
      formData.append("apiKey", apiKey)
      if (file) formData.append("file", file)

      const res = await fetch("/api/generate-questions", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Erro ao conectar com o Agente Teológico.")
      }

      const data = await res.json()
      const qs: GeneratedQuestion[] = data.questions ?? []
      setGenerated(qs)
      setSelected(new Set(qs.map((_, i) => i)))
      
      // Smooth scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (createAssessment = false) => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      const toSave = generated.filter((_, i) => selected.has(i))
      const questionsData = toSave.map(q => ({
        disciplineId,
        type: q.type,
        text: q.text,
        choices: q.choices,
        pairs: q.pairs,
        correctAnswer: q.correctAnswer,
        points: pointsPerQuestion,
      }))

      const savedIds = await addQuestionsBatch(questionsData)

      if (createAssessment && savedIds.length > 0) {
        await addAssessment({
          id: uid(),
          title: `Avaliação - ${disciplines.find(d => d.id === disciplineId)?.name}`,
          disciplineId,
          professor: "IA Teológica Expert",
          institution: "IETEO",
          questionIds: savedIds,
          pointsPerQuestion: pointsPerQuestion,
          totalPoints: savedIds.length * pointsPerQuestion,
          isPublished: false,
          modality: "public",
          rules: "Use os conceitos discutidos em sala de aula para fundamentar suas respostas.",
        })
      }

      setGenerated([])
      onQuestionsAdded(createAssessment)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ─── Hero Section ─── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-primary p-8 text-white shadow-2xl shadow-primary/20">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BrainCircuit className="h-40 w-40" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="h-3 w-3" /> Motor de Inteligência Teológica
            </div>
            <h2 className="text-3xl font-serif font-bold">Divine Assessment Architect</h2>
            <p className="text-white/80 text-sm max-w-md font-medium">
              Transforme seus materiais didáticos em avaliações acadêmicas de alto rigor teológico em segundos.
            </p>
          </div>
          <div className="flex gap-2">
             <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold opacity-60 uppercase">Bloom</span>
                <span className="text-xl font-black">1-6</span>
             </div>
             <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold opacity-60 uppercase">Tipos</span>
                <span className="text-xl font-black">6+</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ─── Sidebar Configuration (Left) ─── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Identity & Context */}
          <div className="glass-card rounded-3xl p-6 space-y-5 border border-border/50 shadow-xl shadow-black/5">
             <div className="flex items-center gap-3 border-b border-border/40 pb-4 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                   <GraduationCap className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Contexto Acadêmico</h3>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <BookOpen className="h-3 w-3" /> Disciplina Foco
                   </Label>
                   <select
                     value={disciplineId}
                     onChange={(e) => setDisciplineId(e.target.value)}
                     className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm font-semibold focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                   >
                     {disciplines.map((d) => (
                       <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Complexidade</Label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full h-10 rounded-xl border-2 border-border bg-background px-3 text-xs font-bold focus:border-primary transition-all outline-none"
                      >
                        <option value="Básico">Básico</option>
                        <option value="Intermediário">Intermediário</option>
                        <option value="Avançado">Avançado</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nº Questões</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="h-10 rounded-xl border-2 font-bold text-center"
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Source Material */}
          <div className="glass-card rounded-3xl p-6 space-y-5 border border-border/50 shadow-xl shadow-black/5 bg-primary/5">
             <div className="flex items-center gap-3 border-b border-primary/10 pb-4 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                   <FileText className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-primary">Fonte de Extração</h3>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Anexo de Referência (PDF/Word)</Label>
                   <div className="relative group">
                      <div className="absolute inset-0 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 group-hover:border-primary/40 transition-colors pointer-events-none flex items-center justify-center">
                         {!file ? <span className="text-[10px] font-bold text-primary/40">ARRASTE OU CLIQUE AQUI</span> : <span className="text-[10px] font-bold text-primary truncate px-4">{file.name}</span>}
                      </div>
                      <Input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="opacity-0 h-12 cursor-pointer"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Direcionamento (Opcional)</Label>
                   <Input
                     placeholder="Ex: Focar no capítulo 3, página 45..."
                     value={sourceDetails}
                     onChange={(e) => setSourceDetails(e.target.value)}
                     className="h-10 rounded-xl border-2 bg-background/50"
                   />
                </div>
             </div>
          </div>

          {/* AI Settings */}
          <div className="glass-card rounded-3xl p-6 space-y-5 border border-border/50 shadow-xl shadow-black/5">
             <div className="flex items-center gap-3 border-b border-border/40 pb-4 mb-2">
                <div className="h-8 w-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
                   <Settings2 className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Motor de Inferência</h3>
             </div>

             <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                      Provider {aiProvider === 'groq' && <span className="text-[9px] bg-emerald-500 text-white px-1.5 rounded">Rápido</span>}
                   </Label>
                   <select
                     value={aiProvider}
                     onChange={(e) => handleProviderChange(e.target.value)}
                     className="w-full h-10 rounded-xl border-2 border-border bg-background px-3 text-xs font-bold outline-none"
                   >
                     <option value="groq">Groq (Llama 3.3)</option>
                     <option value="openai">OpenAI (GPT-4o)</option>
                     <option value="google">Google (Gemini 1.5)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">API Key Privada</Label>
                   <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        className="h-10 pl-9 rounded-xl border-2 text-xs"
                      />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* ─── Main Area: Formats & Execution (Right) ─── */}
        <div className="lg:col-span-7 space-y-6">
           {/* Question Formats Selector */}
           <div className="glass-card rounded-3xl p-8 border border-border/50 shadow-xl shadow-black/5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <div className="space-y-1">
                    <h3 className="text-xl font-bold font-serif">Estrutura da Avaliação</h3>
                    <p className="text-xs text-muted-foreground font-medium">Selecione os tipos de questões que o agente deve compor.</p>
                 </div>
                 <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Zap className="h-6 w-6" />
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => {
                  const isSelected = types.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300",
                        isSelected 
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                          : "border-border bg-card hover:border-primary/20"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-500",
                        isSelected ? "bg-primary text-primary-foreground rotate-12 scale-110" : "bg-muted text-muted-foreground"
                      )}>
                        {t === 'multiple-choice' && <ListChecks className="h-5 w-5" />}
                        {t === 'true-false' && <CheckCircle2 className="h-5 w-5" />}
                        {t === 'discursive' && <MessageSquare className="h-5 w-5" />}
                        {t === 'fill-in-the-blank' && <Zap className="h-5 w-5" />}
                        {t === 'matching' && <Layers className="h-5 w-5" />}
                        {t === 'incorrect-alternative' && <X className="h-5 w-5" />}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest text-center leading-tight",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {TYPE_LABELS[t]}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-auto space-y-6">
                 {error && (
                   <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm animate-in shake-in-1">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span className="font-bold">{error}</span>
                   </div>
                 )}

                 <Button
                   onClick={handleGenerate}
                   disabled={loading || types.length === 0}
                   className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                 >
                   {loading ? (
                     <>
                        <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                        ARQUITETANDO QUESTÕES...
                     </>
                   ) : (
                     <>
                        <Sparkles className="h-6 w-6 mr-3" />
                        GERAR PROVA AGORA
                     </>
                   )}
                 </Button>
                 
                 <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg" className="h-4" alt="OpenAI" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" className="h-4" alt="Gemini" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Llama 3.3 Powered</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* ─── Results Area ─── */}
      {generated.length > 0 && (
        <div ref={resultsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="flex items-center justify-between border-b-2 border-border pb-4">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                   <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                   <h3 className="text-2xl font-serif font-bold">Questões Geradas</h3>
                   <p className="text-sm text-muted-foreground font-medium">Revise o rigor doutrinário e a pedagogia antes de salvar.</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set(generated.map((_, i) => i)))} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-9">
                   Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-9">
                   Limpar
                </Button>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             {generated.map((q, i) => (
               <QuestionPreviewCard
                 key={i}
                 q={q}
                 index={i}
                 selected={selected.has(i)}
                 onToggle={() => {
                   const next = new Set(selected)
                   if (next.has(i)) next.delete(i)
                   else next.add(i)
                   setSelected(next)
                 }}
               />
             ))}
          </div>

          <div className="sticky bottom-6 z-[60] bg-background/80 backdrop-blur-xl border border-border/50 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto ring-1 ring-black/5">
             <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                   {selected.size}
                </div>
                <p className="text-sm font-bold">Questões selecionadas para o banco.</p>
             </div>
             
             <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={selected.size === 0 || saving}
                  className="flex-1 sm:flex-none h-12 rounded-2xl px-6 font-bold border-2 transition-all"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Só no Banco
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={selected.size === 0 || saving}
                  className="flex-1 sm:flex-none h-12 rounded-2xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Publicar Prova Direto
                </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
