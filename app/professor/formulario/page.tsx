"use client"

import { Suspense, useEffect, useState } from "react"
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
  Layers
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
  getProfessorAccountById, 
  getProfessorDisciplines, 
  setProfessorFamiliarDisciplines 
} from "@/lib/store"

function ProfessorFormContent() {
  const searchParams = useSearchParams()
  const professorId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [professor, setProfessor] = useState<ProfessorAccount | null>(null)
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function loadData() {
      if (!professorId) {
        setError("Link inválido. O identificador do professor não foi fornecido.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [prof, semList, discList, profDiscs] = await Promise.all([
          getProfessorAccountById(professorId),
          getSemesters(),
          getDisciplines(),
          getProfessorDisciplines(professorId)
        ])

        if (!prof) {
          setError("Professor não encontrado ou cadastro inativo.")
          setLoading(false)
          return
        }

        setProfessor(prof)
        setSemesters(semList.sort((a, b) => (a.order || 0) - (b.order || 0)))
        setDisciplines(discList.sort((a, b) => (a.order || 0) - (b.order || 0)))
        setSelectedDisciplineIds(profDiscs.map(pd => pd.disciplineId))
      } catch (err: any) {
        console.error("Erro ao carregar dados do professor:", err)
        setError("Ocorreu um erro ao carregar o formulário. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [professorId])

  function toggleDiscipline(id: string) {
    setSelectedDisciplineIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
    if (savedSuccess) setSavedSuccess(false)
  }

  function selectAllInSemester(semesterId: string) {
    const semesterDiscs = disciplines.filter(d => d.semesterId === semesterId)
    const semesterDiscIds = semesterDiscs.map(d => d.id)
    const allSelected = semesterDiscIds.every(id => selectedDisciplineIds.includes(id))

    if (allSelected) {
      setSelectedDisciplineIds(prev => prev.filter(id => !semesterDiscIds.includes(id)))
    } else {
      setSelectedDisciplineIds(prev => Array.from(new Set([...prev, ...semesterDiscIds])))
    }
    if (savedSuccess) setSavedSuccess(false)
  }

  async function handleSave() {
    if (!professorId) return

    try {
      setSaving(true)
      await setProfessorFamiliarDisciplines(professorId, selectedDisciplineIds)
      setSavedSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      console.error("Erro ao salvar:", err)
      alert("Erro ao salvar preferências: " + (err.message || "Tente novamente."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Carregando formulário...</p>
      </div>
    )
  }

  if (error || !professor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-2xl p-6 text-center shadow-lg">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Atenção</h2>
          <p className="text-sm text-muted-foreground mb-6">{error || "Não foi possível carregar este formulário."}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // Filter disciplines based on search
  const filteredDisciplines = disciplines.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-24">
      {/* Top Banner Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm backdrop-blur-md bg-card/90">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">IETEO</h1>
              <p className="text-xs text-muted-foreground">Mapeamento de Familiaridade Docente</p>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
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
        {/* Welcome Card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Cadastro de Afinidade de Disciplinas
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Paz do Senhor, Professor(a) <span className="text-primary">{professor.name}</span>!
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Selecione abaixo todas as disciplinas da nossa grade teológica com as quais você se <strong>identifica</strong>, 
              possui <strong>familiaridade acadêmica</strong> ou interesse em ministrar. 
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
              <h3 className="text-sm font-bold text-green-800 dark:text-green-300">Suas disciplinas foram salvas com sucesso!</h3>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                A coordenação do IETEO já tem acesso às suas {selectedDisciplineIds.length} disciplinas indicadas. Se desejar fazer alterações, basta selecionar novamente e clicar em salvar.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome da disciplina..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-card rounded-xl"
            />
          </div>

          <div className="text-xs text-muted-foreground text-right sm:text-left self-center font-medium">
            Total na grade: {disciplines.length} disciplinas
          </div>
        </div>

        {/* Disciplines Grouped by Semester */}
        <div className="space-y-6">
          {groupedBySemester.map(({ semester, disciplines: semDiscs }) => {
            const allSelected = semDiscs.every(d => selectedDisciplineIds.includes(d.id))
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
                            {isSelected && <CheckCircle2 className="h-4 w-4" />}
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
                          {isSelected && <CheckCircle2 className="h-4 w-4" />}
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
              <p className="text-sm font-medium">Nenhuma disciplina encontrada para "{searchQuery}".</p>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-xs">
                Limpar busca
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Floating/Fixed Save Bar */}
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-30">
          <div className="bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total selecionado</p>
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
      </main>
    </div>
  )
}

export default function ProfessorFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Carregando formulário do professor...</p>
      </div>
    }>
      <ProfessorFormContent />
    </Suspense>
  )
}
