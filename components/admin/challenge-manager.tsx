"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Sparkles, 
  Search, 
  Filter, 
  LayoutGrid, 
  List,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Scroll,
  Dna, 
  MessageSquare,
  Wand2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import { AIChallengeGenerator } from "./ai-challenge-generator"
import { 
  getChallenges, 
  addChallenge, 
  updateChallenge, 
  deleteChallenge, 
  getDisciplines,
  type Challenge, 
  type ChallengeType, 
  type Discipline 
} from "@/lib/store"

const CHALLENGE_TYPES: { value: ChallengeType; label: string; icon: any }[] = [
  { value: "riddle", label: "Enigma Bíblico", icon: HelpCircle },
  { value: "quiz", label: "Quiz Rápido", icon: List },
  { value: "decoding", label: "Decifrar Versículo", icon: Dna },
  { value: "reflection", label: "Reflexão Relâmpago", icon: MessageSquare },
]

export function ChallengeManager() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  
  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    disciplineId: "",
    week: 1,
    type: "riddle" as ChallengeType,
    points: 20,
    isActive: true,
    correctAnswer: "",
    content: ""
  })

  useEffect(() => {
    async function load() {
      const [allChs, allDs] = await Promise.all([
        getChallenges(),
        getDisciplines()
      ])
      setChallenges(allChs)
      setDisciplines(allDs)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = challenges.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase())
    const matchesDisc = selectedDiscipline === "all" || c.disciplineId === selectedDiscipline
    return matchesSearch && matchesDisc
  })

  function openCreate() {
    setEditingChallenge(null)
    setForm({
      title: "",
      description: "",
      disciplineId: disciplines[0]?.id || "",
      week: (challenges.length > 0 ? Math.max(...challenges.map(c => c.week)) + 1 : 1),
      type: "riddle",
      points: 20,
      isActive: true,
      correctAnswer: "",
      content: ""
    })
    setIsModalOpen(true)
  }

  function openEdit(c: Challenge) {
    setEditingChallenge(c)
    setForm({
      title: c.title,
      description: c.description,
      disciplineId: c.disciplineId,
      week: c.week,
      type: c.type,
      points: c.points,
      isActive: c.isActive,
      correctAnswer: c.correctAnswer || "",
      content: typeof c.content === 'string' ? c.content : JSON.stringify(c.content)
    })
    setIsModalOpen(true)
  }

  async function handleSave() {
    try {
      setSaving(true)
      const payload = {
        ...form,
        content: form.type === 'quiz' ? JSON.parse(form.content || '[]') : form.content
      }

      if (editingChallenge) {
        await updateChallenge(editingChallenge.id, payload)
      } else {
        await addChallenge(payload)
      }
      
      // Refresh
      const allChs = await getChallenges()
      setChallenges(allChs)
      setIsModalOpen(false)
    } catch (error: any) {
      console.error(error)
      alert("Erro ao salvar: " + (error.message || "Verifique o console para mais detalhes."))
    } finally {
      setSaving(false)
    }
  }

  function handleAutoFill() {
    const text = form.content
    if (!text) return

    // Regex patterns for AI output
    const titleMatch = text.match(/Título:\s*(.*)/i)
    const enigmaMatch = text.match(/(?:Enigma|Desafio|Versículo):\s*([\s\S]*?)(?=\nResposta:|$)/i)
    const answerMatch = text.match(/Resposta:\s*(.*)/i)

    const updates: Partial<typeof form> = {}

    if (titleMatch?.[1]) updates.title = titleMatch[1].trim()
    if (enigmaMatch?.[1]) updates.description = enigmaMatch[1].trim()
    if (answerMatch?.[1]) updates.correctAnswer = answerMatch[1].trim()

    if (Object.keys(updates).length > 0) {
      setForm(prev => ({ ...prev, ...updates }))
    } else {
      alert("Não foi possível identificar os campos. Certifique-se de que o texto segue o formato da IA (Título:, Enigma:, Resposta:).")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta missão?")) return
    await deleteChallenge(id)
    setChallenges(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Jornada do Conhecimento
          </h2>
          <p className="text-muted-foreground text-sm">Gerencie os desafios e missões semanais dos alunos.</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Nova Missão
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título ou descrição..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border/40 focus:border-primary/40"
          />
        </div>
        <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
          <SelectTrigger className="w-full md:w-64 rounded-xl border-border/40">
            <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
            <SelectValue placeholder="Todas as Disciplinas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Disciplinas</SelectItem>
            {disciplines.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(challenge => {
          const disc = disciplines.find(d => d.id === challenge.disciplineId)
          const TypeIcon = CHALLENGE_TYPES.find(t => t.value === challenge.type)?.icon || HelpCircle

          return (
            <div key={challenge.id} className="group relative bg-card rounded-[2rem] border-2 border-border/50 p-6 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                  challenge.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <TypeIcon className="h-6 w-6" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(challenge)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(challenge.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-primary uppercase tracking-widest">
                    Semana {challenge.week}
                  </span>
                  {!challenge.isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive uppercase tracking-widest flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Inativo
                    </span>
                  )}
                </div>
                <h3 className="font-bold font-serif text-lg leading-snug line-clamp-1">{challenge.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {challenge.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[140px]">
                  {disc?.name || "Sem Disciplina"}
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-primary">
                  {challenge.points} <span className="text-[10px] opacity-50 uppercase">XP</span>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full mx-auto flex items-center justify-center opacity-40">
              <Scroll className="h-10 w-10" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhuma missão encontrada para esta busca.</p>
            <Button variant="outline" onClick={openCreate} className="rounded-xl">
              Criar primeira missão agora
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <DialogTitle className="text-2xl font-serif">{editingChallenge ? "Editar Missão" : "Criar Nova Missão"}</DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAIModalOpen(true)}
              className="rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all gap-2 h-8 px-4"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Gerar com IA
            </Button>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disciplina *</Label>
                <Select value={form.disciplineId} onValueChange={(v) => setForm({...form, disciplineId: v})}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semana *</Label>
                <Input 
                  type="number" 
                  value={form.week} 
                  onChange={(e) => setForm({...form, week: Number(e.target.value)})}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Desafio *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHALLENGE_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({...form, type: t.value})}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                      form.type === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/20"
                    )}
                  >
                    <t.icon className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título da Missão *</Label>
              <Input 
                value={form.title} 
                onChange={(e) => setForm({...form, title: e.target.value})}
                placeholder="Ex: O Mistério das Cartas Paulinas"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição / Instruções *</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="O que o aluno deve fazer?"
                className="rounded-xl h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo do Desafio (Enigma ou Perguntas) *</Label>
                {form.content && !form.content.startsWith('[') && (
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={handleAutoFill}
                    className="h-6 text-[10px] font-bold text-primary hover:bg-primary/10 flex items-center gap-1 px-2 rounded-lg"
                  >
                    <Sparkles className="h-3 w-3" /> Analisar e Preencher Campos
                  </Button>
                )}
              </div>
              <Textarea 
                value={form.content} 
                onChange={(e) => setForm({...form, content: e.target.value})}
                placeholder={form.type === 'quiz' ? 'Cole o JSON das perguntas ou digite aqui...' : 'Escreva o enigma ou código aqui...'}
                className="rounded-xl h-32 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resposta Correta (Se houver)</Label>
                <Input 
                  value={form.correctAnswer} 
                  onChange={(e) => setForm({...form, correctAnswer: e.target.value})}
                  placeholder="A resposta exata..."
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Pontos (XP)</Label>
                <Input 
                  type="number" 
                  value={form.points} 
                  onChange={(e) => setForm({...form, points: Number(e.target.value)})}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="is-active"
                checked={form.isActive}
                onChange={(e) => setForm({...form, isActive: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is-active" className="cursor-pointer">Ativar missão imediatamente</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              onClick={handleSave} 
              className="rounded-xl px-8 shadow-lg"
              disabled={!form.title || !form.description || !form.content || !form.disciplineId || saving}
            >
              {saving ? "Salvando..." : (editingChallenge ? "Salvar Alterações" : "Criar Missão")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Modal */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-6">
          <AIChallengeGenerator disciplines={disciplines} />
          <div className="pt-4 flex justify-end">
            <Button variant="outline" onClick={() => setIsAIModalOpen(false)} className="rounded-xl px-8">Fechar Assistente</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
