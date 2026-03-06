"use client"

import { useEffect, useState } from "react"
import {
  Plus, Pencil, Trash2, ShieldCheck, User, Eye, EyeOff, X, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type ProfessorAccount,
  getProfessorAccounts, addProfessorAccount, updateProfessorAccount, deleteProfessorAccount,
  MASTER_CREDENTIALS,
} from "@/lib/store"

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  email: string
  password: string
  role: "master" | "professor"
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
            onChange={(e) => set("role", e.target.value as "master" | "professor")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="professor">Professor</option>
            <option value="master">Administrador (Master)</option>
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
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function refresh() {
    setAccounts(await getProfessorAccounts())
  }

  useEffect(() => { refresh() }, [])

  async function handleAdd(data: FormState) {
    if (data.email.toLowerCase() === MASTER_CREDENTIALS.email) {
      return
    }

    try {
      setAdding(false)
      // Call our API route to use the Service Role Key
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

      // We still save locally for UI rendering if needed, or rely purely on Supabase.
      // Keeping local sync for compatibility with existing app flow:
      await addProfessorAccount({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      await refresh()
    } catch (e: any) {
      alert("Falha na criação: " + e.message)
    }
  }

  async function handleEdit(id: string, data: FormState) {
    await updateProfessorAccount(id, {
      name: data.name,
      email: data.email,
      role: data.role,
      ...(data.password ? { password: data.password } : {}),
    })
    setEditingId(null)
    await refresh()
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

      {/* Other professors */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Professores cadastrados
          </h3>
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar professor
            </Button>
          )}
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
          <div className="flex flex-col gap-2">
            {accounts.map((account) => (
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
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors group">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${account.role === "master" ? "bg-primary/20" : "bg-muted"
                      }`}>
                      {account.role === "master"
                        ? <ShieldCheck className="h-4 w-4 text-primary" />
                        : <User className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${account.role === "master"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                      }`}>
                      {account.role === "master" ? "Master" : "Professor"}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => { setEditingId(account.id); setAdding(false) }}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(account.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  )
}
