"use client"

import { useState, useRef } from "react"
import { Camera, Loader2, CheckCircle2, X, Quote } from "lucide-react"

export default function DepoimentoPage() {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [polo, setPolo] = useState("")
  const [quote, setQuote] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A foto deve ter no máximo 2MB.")
      return
    }
    setError(null)
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !quote.trim()) {
      setError("Preencha seu nome e o depoimento.")
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("role", role.trim())
      formData.append("polo", polo.trim())
      formData.append("quote", quote.trim())
      if (photo) formData.append("photo", photo)

      const res = await fetch("/api/testimonials/submit", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao enviar depoimento.")

      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-black text-foreground">Obrigado pelo seu depoimento!</h1>
          <p className="text-muted-foreground">
            Recebemos sua mensagem. Ela será revisada pela nossa equipe antes de aparecer no site.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8 space-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] uppercase tracking-widest font-bold text-accent">
            Depoimentos
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Conte sua experiência no IETEO
          </h1>
          <p className="text-muted-foreground text-sm">
            Seu relato pode inspirar outras pessoas a começar essa jornada também.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card border-2 border-border rounded-3xl p-6 md:p-8 shadow-lg">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-xl bg-muted flex items-center justify-center">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Sua foto" className="w-full h-full object-cover" />
                ) : (
                  <Quote className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                  className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-accent text-accent-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer">
                <Camera className="h-4 w-4" />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground -mt-3">Foto opcional</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Seu nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Silva"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Turma / Situação</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Turma Presencial"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Polo</label>
              <input
                value={polo}
                onChange={(e) => setPolo(e.target.value)}
                placeholder="Ex: Polo Salvador"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Seu depoimento *</label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={5}
              placeholder="Conte como o curso tem ajudado na sua caminhada e no seu ministério..."
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar Depoimento
          </button>
        </form>
      </div>
    </div>
  )
}
