"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Pencil, Trash2, Quote, EyeOff, Eye, ArrowUp, ArrowDown, Camera, X, Link2, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  type Testimonial,
  getTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  uploadAvatar,
} from "@/lib/store"
import { uid } from "@/lib/store"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

export function TestimonialsTab() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [polo, setPolo] = useState("")
  const [quote, setQuote] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem válida.")
    if (file.size > 2 * 1024 * 1024) return toast.error("A imagem deve ter no máximo 2MB.")
    setUploadingPhoto(true)
    try {
      const url = await uploadAvatar(file, editing?.id || uid(), "testimonials")
      setPhotoUrl(url)
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function load() {
    setLoading(true)
    const data = await getTestimonials(false)
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setName(""); setRole(""); setPolo(""); setQuote(""); setPhotoUrl(null); setIsPublished(true)
    setModalOpen(true)
  }

  function openEdit(t: Testimonial) {
    setEditing(t)
    setName(t.name); setRole(t.role || ""); setPolo(t.polo || ""); setQuote(t.quote)
    setPhotoUrl(t.photoUrl || null); setIsPublished(t.isPublished)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim() || !quote.trim()) {
      toast.error("Nome e depoimento são obrigatórios.")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateTestimonial(editing.id, {
          name: name.trim(), role: role.trim(), polo: polo.trim(),
          quote: quote.trim(), photoUrl, isPublished,
        })
        toast.success("Depoimento atualizado!")
      } else {
        await addTestimonial({
          name: name.trim(), role: role.trim(), polo: polo.trim(),
          quote: quote.trim(), photoUrl, isPublished, order: items.length,
        })
        toast.success("Depoimento adicionado!")
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTestimonial(deleteId)
      toast.success("Depoimento removido.")
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message)
    }
  }

  async function togglePublished(t: Testimonial) {
    await updateTestimonial(t.id, { isPublished: !t.isPublished })
    load()
  }

  const [linkCopied, setLinkCopied] = useState(false)
  function copyLink() {
    const url = `${window.location.origin}/depoimento`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  async function move(t: Testimonial, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((x) => x.id === t.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      updateTestimonial(t.id, { order: other.order }),
      updateTestimonial(other.id, { order: t.order }),
    ])
    load()
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Depoimentos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os depoimentos exibidos na página inicial. Foto é opcional — sem ela, aparece um avatar com as iniciais.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink} className="gap-2">
            {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
            {linkCopied ? "Link copiado!" : "Copiar link para alunos"}
          </Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Depoimento</Button>
        </div>
      </div>

      <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-sm text-muted-foreground">
        Compartilhe o link acima com os alunos (WhatsApp, e-mail etc). Eles preenchem o depoimento e a foto (opcional)
        num formulário simples, sem precisar de login. Toda submissão cai aqui como <strong>"Aguardando revisão"</strong> —
        você decide se publica.
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Quote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum depoimento cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Enquanto isso, a página inicial mostra um conteúdo de exemplo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...items].sort((a, b) => a.order - b.order).map((t) => (
            <div key={t.id} className="rounded-2xl border-2 border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/30 bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                  ) : initials(t.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{[t.role, t.polo].filter(Boolean).join(" • ")}</p>
                </div>
                {!t.isPublished && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                    <Clock className="h-3 w-3" /> Aguardando revisão
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground italic line-clamp-3">"{t.quote}"</p>
              <div className="flex items-center gap-1 pt-2 border-t border-border mt-auto">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(t, -1)} title="Mover para cima"><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(t, 1)} title="Mover para baixo"><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePublished(t)} title={t.isPublished ? "Ocultar" : "Publicar"}>
                  {t.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => openEdit(t)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive ml-auto" onClick={() => setDeleteId(t.id)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Depoimento" : "Novo Depoimento"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-xl bg-muted flex items-center justify-center relative">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">{initials(name || "?")}</span>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                {photoUrl && !uploadingPhoto && (
                  <button type="button" onClick={() => setPhotoUrl(null)} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow" title="Remover foto">
                    <X className="h-3 w-3" />
                  </button>
                )}
                <label className="absolute bottom-0 right-0 p-2 bg-accent text-accent-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer">
                  <Camera className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                </label>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground -mt-2">Foto opcional. Sem foto, aparece um avatar com as iniciais.</p>
            <div className="flex flex-col gap-1.5">
              <Label>Nome do Aluno *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Turma / Situação</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Turma Presencial" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Polo</Label>
                <Input value={polo} onChange={(e) => setPolo(e.target.value)} placeholder="Ex: Polo Salvador" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Depoimento *</Label>
              <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={4} placeholder="O que o aluno disse sobre o curso..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Publicado na página inicial
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir depoimento?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
