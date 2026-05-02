"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  FileText, BookOpen, Settings, BarChart3, Download, LogOut,
  Plus, Pencil, Trash2, Eye, EyeOff, Trophy, Clock, CheckCircle2,
  ShieldCheck, Sparkles, AlertCircle, ChevronRight, ChevronLeft, Shuffle, Check, ListChecks, Search, HelpCircle, Variable,
  ArrowUp, ArrowDown, RefreshCw, List, Globe, Lock, Loader2, Image as ImageIcon,
  GraduationCap, Layout, PenTool, CheckCircle, Smartphone
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
  getDisciplines, getQuestionsByDiscipline, addAssessment, updateAssessment,
  PROFESSOR_CREDENTIALS,
} from "@/lib/store"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, name: "Identidade", icon: FileText, desc: "Título e Disciplina" },
  { id: 2, name: "Arquitetura", icon: PenTool, desc: "Formatos e Pontuação" },
  { id: 3, name: "Curadoria", icon: List, desc: "Seleção de Questões" },
  { id: 4, name: "Visualização", icon: Eye, desc: "Preview Final" },
]

const FORMAT_LABELS: Record<QuestionType, string> = {
  "multiple-choice": "Múltipla Escolha",
  "true-false": "Verdadeiro ou Falso",
  discursive: "Discursiva",
  "fill-in-the-blank": "Lacunas",
  "incorrect-alternative": "Alternativa Incorreta",
  matching: "Associação",
}

type SelectionMode = "auto" | "manual"

interface Props {
  open: boolean
  assessment?: Assessment | null
  onClose: () => void
  onSave: () => void
}

export function AssessmentBuilder({ open, assessment, onClose, onSave }: Props) {
  // Navigation
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Identity
  const [title, setTitle] = useState("")
  const [disciplineId, setDisciplineId] = useState("")
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [logoBase64, setLogoBase64] = useState("")
  const [rules, setRules] = useState("")
  const [modality, setModality] = useState<"public" | "private">("public")

  // Step 2: Architecture
  const [formats, setFormats] = useState<QuestionType[]>(["multiple-choice"])
  const [questionCount, setQuestionCount] = useState(10)
  const [pointsPerQuestion, setPointsPerQuestion] = useState(1)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0)
  const [shuffleVariants, setShuffleVariants] = useState(true)

  // Step 3: Curadoria
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("auto")
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  // ─── Initialization ───

  useEffect(() => {
    if (!open) return
    async function init() {
      const discs = await getDisciplines()
      setDisciplines(discs)

      if (assessment) {
        setTitle(assessment.title)
        setDisciplineId(assessment.disciplineId)
        setLogoBase64(assessment.logoBase64 ?? "")
        setRules(assessment.rules ?? "")
        setModality(assessment.modality ?? "public")
        setPointsPerQuestion(assessment.pointsPerQuestion)
        setTimeLimitMinutes(assessment.timeLimitMinutes ?? 0)
        setQuestionCount(assessment.questionIds.length)
        setSelectedIds(new Set(assessment.questionIds))
        setShuffleVariants(assessment.shuffleVariants ?? true)
      } else {
        // Reset to defaults
        setTitle("")
        setDisciplineId(discs[0]?.id ?? "")
        setLogoBase64("")
        setRules("")
        setModality("public")
        setFormats(["multiple-choice"])
        setQuestionCount(10)
        setPointsPerQuestion(1)
        setTimeLimitMinutes(0)
        setSelectionMode("auto")
        setSelectedIds(new Set())
        setShuffleVariants(true)
      }
      setStep(1)
    }
    init()
  }, [open, assessment])

  // ─── Logic ───

  useEffect(() => {
    if (!disciplineId) return
    async function loadQs() {
      let qs = await getQuestionsByDiscipline(disciplineId)
      if (formats.length > 0) {
        qs = qs.filter((q) => formats.includes(q.type))
      }
      setAvailableQuestions(qs)
    }
    loadQs()
  }, [disciplineId, formats])

  const handleAutoSelect = useCallback(() => {
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(questionCount, shuffled.length))
    setSelectedIds(new Set(picked.map((q) => q.id)))
  }, [availableQuestions, questionCount])

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < questionCount) next.add(id)
      return next
    })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setLogoBase64(event.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleNext = () => {
    if (step === 3 && selectionMode === "auto") {
      handleAutoSelect()
    }
    setStep((s) => s + 1)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const finalIds = [...selectedIds]
      const totalPoints = finalIds.length * pointsPerQuestion
      const selectedDisc = disciplines.find((d) => d.id === disciplineId)

      const payload = {
        title: title.trim(),
        disciplineId,
        professor: selectedDisc?.professorName || PROFESSOR_CREDENTIALS.name,
        logoBase64,
        rules: rules.trim(),
        questionIds: finalIds,
        pointsPerQuestion,
        totalPoints,
        modality,
        timeLimitMinutes: timeLimitMinutes > 0 ? timeLimitMinutes : null,
        shuffleVariants,
      }

      if (assessment) {
        await updateAssessment(assessment.id, payload)
      } else {
        await addAssessment({
          ...payload,
          institution: "Instituto de Ensino Teológico - IETEO",
          openAt: null,
          closeAt: null,
          isPublished: true,
        })
      }
      onSave()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setSaving(false)
    }
  }

  // ─── Render Helpers ───

  const filteredQuestions = availableQuestions.filter(q => 
    q.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedDisc = disciplines.find((d) => d.id === disciplineId)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl rounded-[2rem]">
        {/* Header with Step Indicator */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/40 p-8">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-serif font-black tracking-tight">{assessment ? "Refinar Avaliação" : "Nova Obra Acadêmica"}</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Divine Assessment Architect</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-rose-500/10 hover:text-rose-500">
                <X className="h-5 w-5" />
              </Button>
           </div>

           <div className="flex items-center gap-4">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="flex-1 group">
                   <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                        step === s.id ? "bg-primary text-primary-foreground scale-110 shadow-primary/20" :
                        step > s.id ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                      </div>
                      <div className="hidden md:block">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest leading-none", step === s.id ? "text-primary" : "text-muted-foreground/60")}>Passo 0{s.id}</p>
                        <p className={cn("text-xs font-bold", step === s.id ? "text-foreground" : "text-muted-foreground")}>{s.name}</p>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className={cn("hidden lg:block flex-1 h-0.5 ml-4 rounded-full", step > s.id ? "bg-emerald-500/30" : "bg-border/50")} />
                      )}
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            
            {/* Step 1: Identidade */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <PenTool className="h-3 w-3" /> Título da Avaliação
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Exegese das Epístolas Paulinas"
                      className="h-14 rounded-2xl border-2 text-lg font-serif font-bold focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Disciplina Correspondente</Label>
                       <Select value={disciplineId} onValueChange={setDisciplineId}>
                          <SelectTrigger className="h-12 rounded-2xl border-2 font-bold">
                            <SelectValue placeholder="Selecione a disciplina" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                             {disciplines.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Branding Institucional</Label>
                       <div className="flex items-center gap-3">
                          <label className="flex-1 h-12 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-all bg-muted/30">
                             <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                             <span className="text-xs font-bold text-muted-foreground uppercase">{logoBase64 ? "Alterar Logo" : "Upload Logo"}</span>
                             <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                          {logoBase64 && (
                            <div className="h-12 w-12 rounded-2xl border-2 p-1 overflow-hidden">
                               <img src={logoBase64} className="h-full w-full object-contain" alt="Logo" />
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Modalidade de Acesso</Label>
                    <div className="grid grid-cols-2 gap-4">
                       <button
                         onClick={() => setModality("public")}
                         className={cn(
                           "flex items-center gap-4 p-5 rounded-[1.5rem] border-2 transition-all group",
                           modality === "public" ? "border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/5" : "border-border hover:border-emerald-500/30"
                         )}
                       >
                         <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all", modality === "public" ? "bg-emerald-500 text-white rotate-6" : "bg-muted text-muted-foreground")}>
                            <Globe className="h-6 w-6" />
                         </div>
                         <div className="text-left">
                            <p className="font-bold text-sm">Pública</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Acesso via link direto</p>
                         </div>
                       </button>

                       <button
                         onClick={() => setModality("private")}
                         className={cn(
                           "flex items-center gap-4 p-5 rounded-[1.5rem] border-2 transition-all group",
                           modality === "private" ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-border hover:border-primary/30"
                         )}
                       >
                         <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all", modality === "private" ? "bg-primary text-white -rotate-6" : "bg-muted text-muted-foreground")}>
                            <Lock className="h-6 w-6" />
                         </div>
                         <div className="text-left">
                            <p className="font-bold text-sm">Privada</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Só alunos matriculados</p>
                         </div>
                       </button>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Regras e Instruções</Label>
                    <Textarea
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      placeholder="Ex: É permitido o uso da Bíblia ARA para consulta..."
                      className="rounded-2xl border-2 min-h-[120px] resize-none"
                    />
                 </div>
              </div>
            )}

            {/* Step 2: Arquitetura */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Ecossistema de Questões</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                       {(Object.keys(FORMAT_LABELS) as QuestionType[]).map(f => {
                         const isSelected = formats.includes(f)
                         return (
                           <button
                             key={f}
                             onClick={() => setFormats(prev => isSelected ? prev.filter(x => x !== f) : [...prev, f])}
                             className={cn(
                               "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
                               isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/20"
                             )}
                           >
                             <span className={cn("text-[10px] font-black uppercase tracking-widest text-center", isSelected ? "text-primary" : "text-muted-foreground")}>
                                {FORMAT_LABELS[f]}
                             </span>
                           </button>
                         )
                       })}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Quantidade</Label>
                       <Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="h-12 rounded-xl border-2 font-black text-center text-lg" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Pontos / Q</Label>
                       <Input type="number" step={0.1} value={pointsPerQuestion} onChange={(e) => setPointsPerQuestion(Number(e.target.value))} className="h-12 rounded-xl border-2 font-black text-center text-lg" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Tempo (min)</Label>
                       <Input type="number" value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Number(e.target.value))} className="h-12 rounded-xl border-2 font-black text-center text-lg" />
                    </div>
                 </div>

                 <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                          <Shuffle className="h-6 w-6" />
                       </div>
                       <div>
                          <p className="font-bold text-sm">Shuffle Engine</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Randomizar ordem para cada aluno</p>
                       </div>
                    </div>
                    <button
                      onClick={() => setShuffleVariants(!shuffleVariants)}
                      className={cn("h-8 w-14 rounded-full transition-all flex items-center px-1", shuffleVariants ? "bg-primary" : "bg-muted")}
                    >
                      <div className={cn("h-6 w-6 rounded-full bg-white shadow-md transition-all", shuffleVariants ? "translate-x-6" : "translate-x-0")} />
                    </button>
                 </div>
              </div>
            )}

            {/* Step 3: Curadoria */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="flex gap-4">
                    <button
                      onClick={() => setSelectionMode("auto")}
                      className={cn(
                        "flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                        selectionMode === "auto" ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-border"
                      )}
                    >
                      <Sparkles className={cn("h-8 w-8", selectionMode === "auto" ? "text-primary" : "text-muted-foreground")} />
                      <div className="text-center">
                         <p className="font-bold text-sm">Seleção Inteligente</p>
                         <p className="text-[10px] text-muted-foreground font-medium uppercase">O Agente escolhe as melhores</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectionMode("manual")}
                      className={cn(
                        "flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                        selectionMode === "manual" ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-border"
                      )}
                    >
                      <HandMetal className={cn("h-8 w-8", selectionMode === "manual" ? "text-primary" : "text-muted-foreground")} />
                      <div className="text-center">
                         <p className="font-bold text-sm">Curadoria Manual</p>
                         <p className="text-[10px] text-muted-foreground font-medium uppercase">Você seleciona uma a uma</p>
                      </div>
                    </button>
                 </div>

                 {selectionMode === "manual" && (
                    <div className="space-y-4">
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar no banco de questões..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 pl-11 rounded-2xl border-2"
                          />
                       </div>

                       <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                          {filteredQuestions.length === 0 ? (
                            <div className="text-center py-10 opacity-40">Nenhuma questão encontrada.</div>
                          ) : (
                            filteredQuestions.map((q, i) => {
                              const isSelected = selectedIds.has(q.id)
                              const isDisabled = !isSelected && selectedIds.size >= questionCount
                              return (
                                <button
                                  key={q.id}
                                  disabled={isDisabled}
                                  onClick={() => toggleQuestion(q.id)}
                                  className={cn(
                                    "text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4",
                                    isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
                                    isDisabled && "opacity-40 grayscale"
                                  )}
                                >
                                  <div className={cn("mt-1 h-5 w-5 rounded-lg border-2 flex items-center justify-center", isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30")}>
                                     {isSelected && <Check className="h-3 w-3" />}
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                                        Q{i + 1} • {FORMAT_LABELS[q.type]}
                                     </p>
                                     <p className="text-sm font-medium leading-relaxed">{q.text}</p>
                                  </div>
                                </button>
                              )
                            })
                          )}
                       </div>
                    </div>
                 )}

                 {selectionMode === "auto" && (
                    <div className="p-8 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
                       <div className="h-16 w-16 bg-primary text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20 animate-pulse">
                          <Shuffle className="h-8 w-8" />
                       </div>
                       <div>
                          <p className="text-xl font-serif font-black">Algoritmo Pronto</p>
                          <p className="text-sm text-muted-foreground font-medium max-w-[280px] mx-auto">
                             O sistema selecionará automaticamente <strong>{questionCount}</strong> questões do banco para você revisar no próximo passo.
                          </p>
                       </div>
                    </div>
                 )}
              </div>
            )}

            {/* Step 4: Visualização */}
            {step === 4 && (
              <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
                 <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/10 text-slate-900 overflow-hidden border border-slate-200">
                    <div className="bg-slate-50 border-b border-slate-200 p-8 flex flex-col items-center text-center gap-4">
                       {logoBase64 && <img src={logoBase64} className="h-20 w-20 object-contain" alt="Logo" />}
                       <div>
                          <h1 className="text-xl font-serif font-black uppercase tracking-tighter">Instituto de Ensino Teológico - IETEO</h1>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">{title}</p>
                       </div>
                    </div>

                    <div className="p-8 space-y-8">
                       <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor</p>
                             <p className="text-sm font-bold">{selectedDisc?.professorName || PROFESSOR_CREDENTIALS.name}</p>
                          </div>
                          <div className="space-y-1 text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontuação</p>
                             <p className="text-sm font-bold">10.0 Pontos Máximos</p>
                          </div>
                       </div>

                       <div className="space-y-10">
                          {(() => {
                            let previewIds = [...selectedIds]
                            if (selectionMode === "auto" && previewIds.length === 0) {
                               previewIds = availableQuestions.slice(0, questionCount).map(q => q.id)
                            }
                            const previewQs = previewIds.map(id => availableQuestions.find(q => q.id === id)).filter(Boolean) as Question[]
                            
                            return previewQs.map((q, idx) => (
                              <div key={q.id} className="space-y-4">
                                 <div className="flex items-start gap-4">
                                    <span className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black shrink-0">{idx + 1}</span>
                                    <div className="space-y-4 flex-1">
                                       <p className="text-base font-serif font-bold text-slate-800 leading-tight">{q.text}</p>
                                       
                                       {q.type === 'multiple-choice' && (
                                          <div className="space-y-2">
                                             {q.choices.map((c, ci) => (
                                               <div key={c.id} className="flex items-center gap-3 text-sm text-slate-600">
                                                  <div className="h-5 w-5 rounded border-2 border-slate-200 shrink-0" />
                                                  <span className="font-bold opacity-60">({String.fromCharCode(97 + ci)})</span>
                                                  <span>{c.text}</span>
                                               </div>
                                             ))}
                                          </div>
                                       )}

                                       {q.type === 'true-false' && (
                                          <div className="flex gap-8 text-sm font-bold text-slate-400">
                                             <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 rounded-full border-2 border-slate-200" /> ( ) Verdadeiro
                                             </div>
                                             <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 rounded-full border-2 border-slate-200" /> ( ) Falso
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                            ))
                          })()}
                       </div>
                    </div>
                 </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-muted/30 border-t border-border/40 p-6 flex items-center justify-between">
           <Button
             variant="ghost"
             onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
             className="rounded-xl px-6 font-bold uppercase tracking-widest text-xs"
           >
             {step === 1 ? "Cancelar" : "Voltar"}
           </Button>

           <div className="flex items-center gap-3">
              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={step === 1 ? !title || !disciplineId : step === 2 ? formats.length === 0 : (selectionMode === 'manual' && selectedIds.size < questionCount)}
                  className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Continuar <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Publicar Obra
                </Button>
              )}
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function X(props: any) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function HandMetal(props: any) {
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
      <path d="M18 12V10a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M14 10V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10" />
      <path d="M10 14V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
      <path d="M10 14 5 7L3 9l7 13h8a2 2 0 0 0 2-2v-6c0-1.1-.9-2-2-2v0a2 2 0 0 0-2 2v2" />
    </svg>
  )
}
