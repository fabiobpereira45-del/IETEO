"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  Save, 
  Loader2, 
  AlertCircle,
  Layers,
  UserCheck,
  User,
  ChevronDown,
  RefreshCw,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  type Discipline, 
  type Semester, 
  type ProfessorAccount, 
  getDisciplines, 
  getSemesters, 
  getProfessorAccounts, 
  getProfessorDisciplines, 
  setProfessorFamiliarDisciplines 
} from "@/lib/store"

function ProfessorFormContent() {
  const searchParams = useSearchParams()
  const initialProfId = searchParams.get("id")

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingDisciplines, setLoadingDisciplines] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [professors, setProfessors] = useState<ProfessorAccount[]>([])
  const [selectedProfessorId, setSelectedProfessorId] = useState<string>("")
  const [professorFilter, setProfessorFilter] = useState<string>("")

  const [semesters, setSemesters] = useState<Semester[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [allDisciplinesList, setAllDisciplinesList] = useState<Discipline[]>([])
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<string[]>([])
  const [disciplineSearch, setDisciplineSearch] = useState("")

  // Initial load: fetch active professors, semesters, disciplines
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingInitial(true)
        const [profList, semList, discList] = await Promise.all([
          getProfessorAccounts(),
          getSemesters(),
          getDisciplines()
        ])

        const activeProfs = (profList || [])
          .filter(p => p.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

        // Exibir apenas semestres do modo presencial
        const presencialSemesters = (semList || [])
          .filter(s => (s.modality || "presencial") === "presencial")
          .sort((a, b) => (a.order || 0) - (b.order || 0))

        const presencialSemIds = new Set(presencialSemesters.map(s => s.id))

        // Exibir apenas as disciplinas da grade presencial (sem repetições)
        const presencialDisciplinesRaw = (discList || [])
          .filter(d => d.semesterId && presencialSemIds.has(d.semesterId))
          .sort((a, b) => (a.order || 0) - (b.order || 0))

        // Garantir unicidade estrita por nome
        const seenNames = new Set<string>()
        const presencialDisciplines: Discipline[] = []
        for (const disc of presencialDisciplinesRaw) {
          const norm = disc.name.trim().toLowerCase()
          if (!seenNames.has(norm)) {
            seenNames.add(norm)
            presencialDisciplines.push(disc)
          }
        }

        setProfessors(activeProfs)
        setSemesters(presencialSemesters)
        setDisciplines(presencialDisciplines)
        setAllDisciplinesList(discList || [])

        // Pre-select if initialProfId is valid
        if (initialProfId && activeProfs.some(p => p.id === initialProfId)) {
          setSelectedProfessorId(initialProfId)
          try {
            setLoadingDisciplines(true)
            const profDiscs = await getProfessorDisciplines(initialProfId)
            const linkedIds = profDiscs.map(pd => pd.disciplineId)
            const validSelectedIds = new Set<string>()
            linkedIds.forEach(id => {
              const direct = presencialDisciplines.find(d => d.id === id)
              if (direct) {
                validSelectedIds.add(direct.id)
              } else {
                const raw = (discList || []).find(d => d.id === id)
                if (raw) {
                  const match = presencialDisciplines.find(
                    pd => pd.name.trim().toLowerCase() === raw.name.trim().toLowerCase()
                  )
                  if (match) validSelectedIds.add(match.id)
                }
              }
            })
            setSelectedDisciplineIds(Array.from(validSelectedIds))
          } catch (e) {
            console.error("Erro ao carregar afinidades iniciais:", e)
          } finally {
            setLoadingDisciplines(false)
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados iniciais:", err)
        setError("Ocorreu um erro ao carregar o formulário. Por favor, tente recarregar a página.")
      } finally {
        setLoadingInitial(false)
      }
    }

    loadInitialData()
  }, [initialProfId])

  // Handle professor change
  async function handleSelectProfessor(profId: string) {
    setSelectedProfessorId(profId)
    setSavedSuccess(false)

    if (!profId) {
      setSelectedDisciplineIds([])
      return
    }

    try {
      setLoadingDisciplines(true)
      const profDiscs = await getProfessorDisciplines(profId)
      const linkedIds = profDiscs.map(pd => pd.disciplineId)
      const validSelectedIds = new Set<string>()
      linkedIds.forEach(id => {
        const direct = disciplines.find(d => d.id === id)
        if (direct) {
          validSelectedIds.add(direct.id)
        } else {
          const raw = allDisciplinesList.find(d => d.id === id)
          if (raw) {
            const match = disciplines.find(
              pd => pd.name.trim().toLowerCase() === raw.name.trim().toLowerCase()
            )
            if (match) validSelectedIds.add(match.id)
          }
        }
      })
      setSelectedDisciplineIds(Array.from(validSelectedIds))
    } catch (err) {
      console.error("Erro ao buscar afinidades do professor:", err)
    } finally {
      setLoadingDisciplines(false)
    }
  }

  const selectedProfessor = useMemo(() => {
    return professors.find(p => p.id === selectedProfessorId) || null
  }, [professors, selectedProfessorId])

  // Filter professors for quick search if needed
  const filteredProfessors = useMemo(() => {
    if (!professorFilter.trim()) return professors
    const q = professorFilter.toLowerCase()
    return professors.filter(p => p.name.toLowerCase().includes(q))
  }, [professors, professorFilter])

  function toggleDiscipline(id: string) {
    setSelectedDisciplineIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
    if (savedSuccess) setSavedSuccess(false)
  }

  function selectAllInSemester(semesterId: string) {
    const semesterDiscs = disciplines.filter(d => d.semesterId === semesterId)
    const semesterDiscIds = semesterDiscs.map(d => d.id)
    const allSelected = semesterDiscIds.length > 0 && semesterDiscIds.every(id => selectedDisciplineIds.includes(id))

    if (allSelected) {
      setSelectedDisciplineIds(prev => prev.filter(id => !semesterDiscIds.includes(id)))
    } else {
      setSelectedDisciplineIds(prev => Array.from(new Set([...prev, ...semesterDiscIds])))
    }
    if (savedSuccess) setSavedSuccess(false)
  }

  async function handleSave() {
    if (!selectedProfessorId) {
      alert("Por favor, selecione o seu nome antes de salvar.")
      return
    }

    try {
      setSaving(true)
      await setProfessorFamiliarDisciplines(selectedProfessorId, selectedDisciplineIds)
      setSavedSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      console.error("Erro ao salvar:", err)
      alert("Erro ao salvar preferências: " + (err.message || "Tente novamente."))
    } finally {
      setSaving(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Carregando formulário docente...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-2xl p-6 text-center shadow-lg">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Atenção</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // Filter disciplines based on search
  const filteredDisciplines = disciplines.filter(d => 
    d.name.toLowerCase().includes(disciplineSearch.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(disciplineSearch.toLowerCase()))
  )

  // Group by semester
  const groupedBySemester = semesters.map(sem => {
    const discs = filteredDisciplines.filter(d => d.semesterId === sem.id)
    return {
      semester: sem,
      disciplines: discs
    }
  }).filter(group => group.disciplines.length > 0)

  // Unassigned disciplines
  const unassigned = filteredDisciplines.filter(d => !d.semesterId)

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-28">
      {/* Top Banner Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm backdrop-blur-md bg-card/90">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">IETEO</h1>
              <p className="text-xs text-muted-foreground">Mapeamento de Afinidades Docentes</p>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !selectedProfessorId}
            className="shadow-sm font-semibold flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar Escolhas
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Professor Selection Section */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <label htmlFor="professor-select" className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" /> 1. Identificação do Docente
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione o seu nome na lista abaixo para carregar sua grade e registrar suas preferências
              </p>
            </div>
            {selectedProfessor && (
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium self-start sm:self-auto bg-primary/10 text-primary border-primary/20">
                Professor selecionado
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Quick Search filter for professor name if many */}
            {professors.length > 5 && (
              <div className="relative sm:col-span-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filtrar por nome..."
                  value={professorFilter}
                  onChange={(e) => setProfessorFilter(e.target.value)}
                  className="pl-9 h-12 bg-background rounded-xl text-sm"
                />
              </div>
            )}

            {/* Dropdown Selector */}
            <div className={`relative ${professors.length > 5 ? "sm:col-span-2" : "sm:col-span-3"}`}>
              <select
                id="professor-select"
                value={selectedProfessorId}
                onChange={(e) => handleSelectProfessor(e.target.value)}
                className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="">
                  -- Clique para escolher o seu nome ({filteredProfessors.length} disponíveis) --
                </option>
                {filteredProfessors.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} {prof.role === "master" ? " (Master)" : ""}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* State: No professor selected yet */}
        {!selectedProfessor && (
          <div className="bg-card border border-dashed border-border rounded-2xl p-8 sm:p-12 text-center shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <User className="h-7 w-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
              Selecione o seu nome no campo acima
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Para visualizar a grade de disciplinas e indicar suas afinidades acadêmicas, selecione seu nome na lista de professores cadastrados no topo da página.
            </p>
          </div>
        )}

        {/* State: Professor selected */}
        {selectedProfessor && (
          <>
            {/* Welcome & Instructions Card */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />
              
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mapeamento de Afinidade Docente
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Paz do Senhor, Professor(a) <span className="text-primary">{selectedProfessor.name}</span>!
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Selecione abaixo todas as disciplinas da nossa grade teológica com as quais você se <strong>identifica</strong>, 
                  possui <strong>familiaridade acadêmica</strong> ou interesse em lecionar. 
                  Estas informações ficarão registradas para consulta da coordenação pedagógica.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
                    {selectedDisciplineIds.length} disciplina{selectedDisciplineIds.length === 1 ? "" : "s"} selecionada{selectedDisciplineIds.length === 1 ? "" : "s"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">• Clique nas disciplinas para marcar ou desmarcar</span>
                </div>
              </div>
            </div>

            {/* Success Alert Banner */}
            {savedSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-green-800 dark:text-green-300">Suas preferências foram salvas com sucesso!</h3>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    A coordenação do IETEO já tem acesso às suas {selectedDisciplineIds.length} disciplinas indicadas para <strong>{selectedProfessor.name}</strong>. Se desejar alterar futuramente, basta acessar esta página novamente e salvar as alterações.
                  </p>
                </div>
              </div>
            )}

            {/* Disciplines Loading State */}
            {loadingDisciplines ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Carregando afinidades de {selectedProfessor.name}...</p>
              </div>
            ) : (
              <>
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome da disciplina..."
                      value={disciplineSearch}
                      onChange={(e) => setDisciplineSearch(e.target.value)}
                      className="pl-10 h-10 bg-card rounded-xl"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground text-right sm:text-left self-center font-medium">
                    Total na grade presencial: {disciplines.length} disciplinas
                  </div>
                </div>

                {/* Disciplines Grouped by Semester */}
                <div className="space-y-6">
                  {groupedBySemester.map(({ semester, disciplines: semDiscs }) => {
                    const allSelected = semDiscs.length > 0 && semDiscs.every(d => selectedDisciplineIds.includes(d.id))
                    const selectedCount = semDiscs.filter(d => selectedDisciplineIds.includes(d.id)).length

                    return (
                      <div key={semester.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                        {/* Semester Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="text-sm sm:text-base font-bold text-foreground">
                                {semester.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {selectedCount} de {semDiscs.length} selecionadas
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => selectAllInSemester(semester.id)}
                            className="text-xs h-8 text-primary hover:bg-primary/10 font-medium"
                          >
                            {allSelected ? "Desmarcar todas" : "Selecionar todas do semestre"}
                          </Button>
                        </div>

                        {/* Disciplines Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {semDiscs.map((discipline) => {
                            const isSelected = selectedDisciplineIds.includes(discipline.id)
                            return (
                              <div
                                key={discipline.id}
                                onClick={() => toggleDiscipline(discipline.id)}
                                className={`group relative flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                                  isSelected
                                    ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                                    : "bg-background border-border hover:border-primary/40 hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold leading-tight ${isSelected ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"}`}>
                                      {discipline.name}
                                    </p>
                                    {discipline.applicationMonth && discipline.applicationYear && (
                                      <p className="text-[11px] text-muted-foreground mt-1">
                                        Período: {discipline.applicationMonth}/{discipline.applicationYear}
                                      </p>
                                    )}
                                  </div>

                                  <div
                                    className={`h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isSelected
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/30 bg-background group-hover:border-primary"
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                </div>

                                {discipline.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2">
                                    {discipline.description}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Unassigned disciplines if any */}
                  {unassigned.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="border-b border-border pb-3">
                        <h3 className="text-sm sm:text-base font-bold text-foreground">Outras Disciplinas</h3>
                        <p className="text-xs text-muted-foreground">{unassigned.length} disciplinas</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {unassigned.map((discipline) => {
                          const isSelected = selectedDisciplineIds.includes(discipline.id)
                          return (
                            <div
                              key={discipline.id}
                              onClick={() => toggleDiscipline(discipline.id)}
                              className={`group relative flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                                isSelected
                                  ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                                  : "bg-background border-border hover:border-primary/40 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-semibold leading-tight ${isSelected ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"}`}>
                                  {discipline.name}
                                </p>
                                <div
                                  className={`h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/30 bg-background group-hover:border-primary"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {groupedBySemester.length === 0 && unassigned.length === 0 && (
                    <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
                      <BookOpen className="h-10 w-10 mx-auto opacity-30 mb-3" />
                      <p className="text-sm font-medium">Nenhuma disciplina encontrada para "{disciplineSearch}".</p>
                      <Button variant="ghost" size="sm" onClick={() => setDisciplineSearch("")} className="mt-2 text-xs">
                        Limpar busca
                      </Button>
                    </div>
                  )}
                </div>

                {/* Bottom Floating Save Bar */}
                <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-30">
                  <div className="bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Professor: <strong>{selectedProfessor.name}</strong></p>
                      <p className="text-sm font-bold text-foreground">
                        {selectedDisciplineIds.length} disciplina{selectedDisciplineIds.length === 1 ? "" : "s"} marcada{selectedDisciplineIds.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <Button 
                      size="lg" 
                      onClick={handleSave} 
                      disabled={saving}
                      className="font-bold px-6 shadow-md"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" /> Confirmar e Salvar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function ProfessorFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Carregando formulário docente...</p>
      </div>
    }>
      <ProfessorFormContent />
    </Suspense>
  )
}
