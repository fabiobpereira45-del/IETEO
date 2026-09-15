"use client"

import { useEffect, useState } from "react"
import {
  Plus, Pencil, Trash2, ShieldCheck, User, Eye, EyeOff, X, Check, CheckCircle2, XCircle, Download,
  BookOpen, Link2, Share2, Copy, Sparkles, ExternalLink, Search, Layers, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  type ProfessorAccount, type Discipline, type ProfessorDiscipline, type Semester,
  getProfessorAccounts, addProfessorAccount, updateProfessorAccount, deleteProfessorAccount,
  getDisciplines, getSemesters, getProfessorDisciplines, getAllProfessorDisciplines,
  setProfessorFamiliarDisciplines, MASTER_CREDENTIALS,
} from "@/lib/store"
import { printProfessorsPDF } from "@/lib/pdf"

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  email: string
  password: string
  role: "master" | "professor" | "secretary"
  active?: boolean
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "professor" }

function ProfessorForm({
  initial,
  isEdit,
  onSave,
  onCancel,
}: {
  initial?: FormState
  isEdit?: boolean
  onSave: (data: FormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")

  function set(key: keyof FormState, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError("Nome é obrigatório.")
    if (!form.email.trim() || !form.email.includes("@")) return setError("E-mail inválido.")
    if (!isEdit && form.password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.")
    if (isEdit && form.password && form.password.length < 6) return setError("A nova senha deve ter no mínimo 6 caracteres.")
    setError("")
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Nome completo</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex: Pr. João Silva"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="professor@ibad.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{isEdit ? "Nova senha (deixe vazio para manter)" : "Senha"}</Label>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={isEdit ? "••••••••" : "Min. 6 caracteres"}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Função</Label>
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value as "master" | "professor" | "secretary")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="professor">Professor</option>
            <option value="master">Administrador (Master)</option>
            <option value="secretary">Secretário(a)</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1.5" /> Cancelar
        </Button>
        <Button type="submit">
          <Check className="h-4 w-4 mr-1.5" /> {isEdit ? "Salvar alterações" : "Adicionar professor"}
        </Button>
      </div>
    </form>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfessorManager() {
  const [accounts, setAccounts] = useState<ProfessorAccount[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [profDisciplines, setProfDisciplines] = useState<ProfessorDiscipline[]>([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [affinityProfId, setAffinityProfId] = useState<string | null>(null)
  const [copiedGlobal, setCopiedGlobal] = useState(false)

  async function refresh() {
    const [accs, discs, pDiscs] = await Promise.all([
      getProfessorAccounts(),
      getDisciplines(),
      getAllProfessorDisciplines(),
    ])
    setAccounts(accs)
    setDisciplines(discs)
    setProfDisciplines(pDiscs)
  }

  useEffect(() => { refresh() }, [])

  async function handleAdd(data: FormState) {
    if (data.email.toLowerCase() === MASTER_CREDENTIALS.email) {
      return
    }

    try {
      setAdding(false)
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role
        })
      })

      if (!res.ok) {
        const err = await res.json()
        alert("Erro ao criar professor no Supabase: " + (err.error || "Desconhecido"))
      }

      await addProfessorAccount({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      await refresh()
    } catch (e: any) {
      console.error("Falha na criação:", e)
      alert("Falha na criação: " + (e.message || "Erro desconhecido"))
    }
  }

  async function handleEdit(id: string, data: FormState) {
    try {
      await updateProfessorAccount(id, {
        name: data.name,
        email: data.email,
        role: data.role,
        ...(data.password ? { password: data.password } : {}),
      })
      setEditingId(null)
      await refresh()
    } catch (e: any) {
      console.error("Erro ao salvar professor:", e)
      alert("Erro ao salvar alterações: " + (e.message || "Verifique sua conexão e tente novamente"))
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    const acc = accounts.find(a => a.id === deleteId)
    try {
      if (acc && acc.email !== MASTER_CREDENTIALS.email) {
        await fetch(`/api/admin/users?email=${encodeURIComponent(acc.email)}`, { method: "DELETE" })
      }
      await deleteProfessorAccount(deleteId)
      setDeleteId(null)
      await refresh()
    } catch (e: any) {
      alert("Falha ao excluir: " + e.message)
    }
  }

  function handleCopyGlobalLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/professor/formulario`
    navigator.clipboard.writeText(url)
    setCopiedGlobal(true)
    setTimeout(() => {
      setCopiedGlobal(false)
    }, 2500)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Master account (readonly) */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Conta Master (imutável)
        </h3>
        <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{MASTER_CREDENTIALS.name}</p>
            <p className="text-xs text-muted-foreground">{MASTER_CREDENTIALS.email}</p>
          </div>
          <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
            Master
          </span>
        </div>
      </div>

      {/* Link Único de Afinidades Docentes */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/25 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Link Único para Professores
          </div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            Formulário Geral de Afinidades Docentes
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Envie este <strong>link único</strong> para todos os professores. Na página, cada docente seleciona seu próprio nome e indica as disciplinas de seu interesse.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleCopyGlobalLink}
            className={`text-xs font-semibold gap-1.5 transition-all ${
              copiedGlobal 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {copiedGlobal ? (
              <>
                <Check className="h-3.5 w-3.5" /> Link Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copiar Link Único
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="text-xs font-medium border-border hover:bg-muted"
          >
            <a href="/professor/formulario" target="_blank" rel="noopener noreferrer" className="gap-1.5 inline-flex items-center">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              Abrir Formulário
            </a>
          </Button>
        </div>
      </div>

      {/* Other professors */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Professores cadastrados
            </h3>
            <p className="text-xs text-muted-foreground">
              Consulte e gerencie as disciplinas de afinidade/familiaridade de cada professor
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              const [p, a, d] = await Promise.all([getProfessorAccounts(), getAllProfessorDisciplines(), getDisciplines()])
              printProfessorsPDF(p, a, d)
            }} className="border-primary text-primary hover:bg-primary/10">
              <Download className="h-4 w-4 mr-1.5" /> Exportar PDF
            </Button>
            {!adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar professor
              </Button>
            )}
          </div>
        </div>

        {adding && (
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-semibold text-foreground mb-4">Novo professor</p>
            <ProfessorForm
              onSave={handleAdd}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {accounts.length === 0 && !adding ? (
          <div className="py-8 text-center text-muted-foreground">
            <User className="h-10 w-10 mx-auto opacity-25 mb-3" />
            <p className="text-sm">Nenhum professor cadastrado ainda.</p>
            <p className="text-xs mt-1">Clique em "Adicionar professor" para começar.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map((account) => {
              const familiarDisciplines = profDisciplines
                .filter(pd => pd.professorId === account.id)
                .map(pd => disciplines.find(d => d.id === pd.disciplineId))
                .filter(Boolean) as Discipline[]

              return (
                <div key={account.id}>
                  {editingId === account.id ? (
                    <div className="border border-border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-semibold text-foreground mb-4">Editar professor</p>
                      <ProfessorForm
                        isEdit
                        initial={{
                          name: account.name,
                          email: account.email,
                          password: "",
                          role: account.role,
                        }}
                        onSave={(data) => handleEdit(account.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3.5 border border-border bg-card hover:bg-muted/30 transition-all">
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 ${
                          account.role === "master" ? "bg-primary/20" : "bg-muted"
                        }`}>
                          {account.role === "master"
                            ? <ShieldCheck className="h-5 w-5 text-primary" />
                            : <User className="h-5 w-5 text-muted-foreground" />
                          }
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-bold truncate ${account.active === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {account.name}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${account.active === false
                              ? "bg-destructive/10 text-destructive"
                              : "bg-green-500/10 text-green-600"
                            }`}>
                              {account.active === false ? "Inativo" : "Ativo"}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${account.role === "master"
                              ? "bg-primary/15 text-primary"
                              : account.role === "secretary"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-muted text-muted-foreground"
                            }`}>
                              {account.role === "master" ? "Master" : account.role === "secretary" ? "Secretário(a)" : "Professor"}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground truncate">{account.email}</p>

                          {/* Familiar Disciplines Badges */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mr-0.5">
                              <BookOpen className="h-3 w-3 text-primary" /> Afinidades ({familiarDisciplines.length}):
                            </span>
                            {familiarDisciplines.length > 0 ? (
                              familiarDisciplines.map(d => (
                                <span 
                                  key={d.id} 
                                  className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-medium"
                                  title={d.description || d.name}
                                >
                                  {d.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Nenhuma disciplina indicada ainda
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto justify-end">
                        {/* Affinity Modal Trigger */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-primary hover:bg-primary/10"
                          onClick={() => setAffinityProfId(account.id)}
                          title="Consultar / Indicar Disciplinas de Afinidade"
                        >
                          <Sparkles className="h-4 w-4 mr-1 text-primary" />
                          <span className="text-xs">Afinidades</span>
                        </Button>

                        {/* Active/Inactive Toggle */}
                        <Button
                          size="sm" variant="ghost" className={`h-8 w-8 p-0 ${account.active === false ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}
                          onClick={() => handleEdit(account.id, { ...account, active: account.active === false ? true : false, password: "" })}
                          title={account.active === false ? "Ativar" : "Desativar"}
                        >
                          {account.active === false ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </Button>

                        {/* Edit Button */}
                        <Button
                          size="sm" variant="ghost" className="h-8 w-8 p-0"
                          onClick={() => { setEditingId(account.id); setAdding(false) }}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(account.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir professor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este professor? Ele perderá o acesso ao painel imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disciplines Affinity Dialog */}
      <Dialog open={!!affinityProfId} onOpenChange={(o) => !o && setAffinityProfId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg">
                Disciplinas de Afinidade — {accounts.find(a => a.id === affinityProfId)?.name}
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registro para consulta pedagógica. Marque as disciplinas com as quais o professor possui familiaridade.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            {affinityProfId && (
              <ProfessorDisciplineManager 
                professorId={affinityProfId} 
                professorName={accounts.find(a => a.id === affinityProfId)?.name || "Professor"}
                onSaved={() => refresh()} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProfessorDisciplineManager({ 
  professorId, 
  professorName,
  onSaved 
}: { 
  professorId: string
  professorName: string
  onSaved?: () => void 
}) {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState("")

  async function loadData() {
    setLoading(true)
    const [allDiscs, allSems, linked] = await Promise.all([
      getDisciplines(),
      getSemesters(),
      getProfessorDisciplines(professorId)
    ])
    setDisciplines(allDiscs.sort((a, b) => (a.order || 0) - (b.order || 0)))
    setSemesters(allSems.sort((a, b) => (a.order || 0) - (b.order || 0)))
    setSelectedIds(linked.map(l => l.disciplineId))
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [professorId])

  function toggleDiscipline(disciplineId: string) {
    setSelectedIds(prev => 
      prev.includes(disciplineId) ? prev.filter(id => id !== disciplineId) : [...prev, disciplineId]
    )
  }

  function toggleSemester(semesterId: string) {
    const semDiscs = disciplines.filter(d => d.semesterId === semesterId)
    const semIds = semDiscs.map(d => d.id)
    const allSelected = semIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !semIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...semIds])))
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await setProfessorFamiliarDisciplines(professorId, selectedIds)
      if (onSaved) onSaved()
      alert("Afinidades do professor atualizadas com sucesso!")
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCopyGlobalLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/professor/formulario`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Carregando disciplinas...</span>
      </div>
    )
  }

  const filteredDisciplines = disciplines.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  )

  const grouped = semesters.map(sem => ({
    semester: sem,
    disciplines: filteredDisciplines.filter(d => d.semesterId === sem.id)
  })).filter(g => g.disciplines.length > 0)

  const unassigned = filteredDisciplines.filter(d => !d.semesterId)

  return (
    <div className="space-y-4">
      {/* Share Box Helper */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Mapeamento de afinidades
          </p>
          <p className="text-[11px] text-muted-foreground">
            Você pode indicar as afinidades de <strong>{professorName}</strong> aqui, ou o docente pode preenchê-las pelo link único geral de professores.
          </p>
        </div>

        <Button 
          type="button" 
          size="sm" 
          variant="outline" 
          onClick={handleCopyGlobalLink}
          className={`h-8 text-xs font-semibold gap-1.5 ${copied ? "bg-green-500/10 text-green-600 border-green-500/30" : "border-primary/40 text-primary hover:bg-primary/10"}`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Link Copiado!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copiar Link Geral
            </>
          )}
        </Button>
      </div>

      {/* Search and Summary */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome da disciplina..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Badge variant="secondary" className="text-xs py-1 px-3">
          {selectedIds.length} selecionada{selectedIds.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Disciplines Grouped */}
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {grouped.map(({ semester, disciplines: semDiscs }) => {
          const allSelected = semDiscs.every(d => selectedIds.includes(d.id))
          const count = semDiscs.filter(d => selectedIds.includes(d.id)).length

          return (
            <div key={semester.id} className="border border-border rounded-xl p-3.5 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> {semester.name} ({count}/{semDiscs.length})
                </span>
                <button
                  type="button"
                  onClick={() => toggleSemester(semester.id)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {allSelected ? "Desmarcar todas" : "Marcar todas"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {semDiscs.map(d => {
                  const isSelected = selectedIds.includes(d.id)
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleDiscipline(d.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-all text-xs ${
                        isSelected 
                          ? "bg-primary/10 border-primary text-primary font-semibold" 
                          : "bg-background border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span className="truncate pr-2">{d.name}</span>
                      <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 bg-background"
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {unassigned.length > 0 && (
          <div className="border border-border rounded-xl p-3.5 bg-muted/20 space-y-3">
            <span className="text-xs font-bold text-foreground">Outras Disciplinas</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unassigned.map(d => {
                const isSelected = selectedIds.includes(d.id)
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDiscipline(d.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-all text-xs ${
                      isSelected 
                        ? "bg-primary/10 border-primary text-primary font-semibold" 
                        : "bg-background border-border hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="truncate pr-2">{d.name}</span>
                    <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 bg-background"
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Save Button Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {selectedIds.length} disciplina{selectedIds.length === 1 ? "" : "s"} selecionada{selectedIds.length === 1 ? "" : "s"} para {professorName}
        </span>
        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={saving}
          className="font-semibold text-xs h-9 px-4"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Salvando...
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar Afinidades
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
