"use client"

import { useState } from "react"
import { MapPin, ChevronRight, Church, BookOpen, Sparkles, CheckCircle2, ArrowRight } from "lucide-react"
import { type Polo, POLOS } from "@/lib/store"

// ─── Props ────────────────────────────────────────────────────────────────────

interface PoloSelectorProps {
  onSelect: (polo: Polo) => void
}

// ─── Polo Card ────────────────────────────────────────────────────────────────

function PoloCard({
  polo,
  selected,
  onSelect,
}: {
  polo: Polo
  selected: boolean
  onSelect: () => void
}) {
  const isChapada = polo.id === "polo-chapada"

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      style={
        selected
          ? { borderColor: polo.color, boxShadow: `0 0 0 2px ${polo.color}40, 0 20px 40px ${polo.color}25` }
          : undefined
      }
      className={`
        group relative w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-300
        hover:scale-[1.02] hover:-translate-y-1
        ${selected ? "border-current" : "border-border hover:border-border/60"}
        bg-card
      `}
    >
      {/* Color bar top */}
      <div
        className="h-1.5 w-full transition-all duration-300"
        style={{ background: `linear-gradient(90deg, ${polo.color}, ${polo.colorSecondary})` }}
      />

      {/* Glow bg on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${polo.color}12, transparent 70%)` }}
      />

      {/* Selected overlay */}
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${polo.color}08, transparent 60%)` }}
        />
      )}

      <div className="relative p-6 md:p-8">
        {/* Check icon */}
        {selected && (
          <div
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: polo.color }}
          >
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Icon badge */}
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${polo.color}, ${polo.colorSecondary})` }}
        >
          {isChapada ? (
            <Sparkles className="h-7 w-7 text-white" />
          ) : (
            <Church className="h-7 w-7 text-white" />
          )}
        </div>

        {/* Name & city */}
        <h2 className="text-xl md:text-2xl font-black text-foreground mb-1 leading-tight">
          {polo.name}
        </h2>

        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: polo.color }} />
          <span className="text-sm font-medium text-muted-foreground">{polo.city}</span>
        </div>

        {polo.description && (
          <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">{polo.description}</p>
        )}

        {/* CTA */}
        <div
          className="flex items-center gap-2 text-sm font-bold transition-all duration-200 group-hover:gap-3"
          style={{ color: polo.color }}
        >
          <span>Selecionar este polo</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PoloSelector({ onSelect }: PoloSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)

  const activePolo = POLOS.find((p) => p.id === selected && p.isActive) ?? null

  function handleConfirm() {
    if (!activePolo) return
    setEntering(true)
    // Brief delay for exit animation feel
    setTimeout(() => onSelect(activePolo), 350)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div
        className={`
          w-full max-w-3xl transition-all duration-350
          ${entering ? "opacity-0 -translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"}
        `}
      >
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-2xl ring-4 ring-primary/20">
                <img src="/ieteo-logo.jpg" alt="IETEO" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] uppercase tracking-widest font-bold text-primary">
            <BookOpen className="h-3 w-3" />
            Instituto de Ensino Teológico
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
            Selecione seu <span className="text-primary">polo</span>
          </h1>
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Escolha a unidade do IETEO mais próxima de você para continuar.
          </p>
        </div>

        {/* Polo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {POLOS.filter((p) => p.isActive).map((polo) => (
            <PoloCard
              key={polo.id}
              polo={polo}
              selected={selected === polo.id}
              onSelect={() => setSelected(polo.id)}
            />
          ))}
        </div>

        {/* Confirm Button */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!activePolo || entering}
            style={
              activePolo
                ? {
                    background: `linear-gradient(135deg, ${activePolo.color}, ${activePolo.colorSecondary})`,
                    boxShadow: `0 8px 32px ${activePolo.color}40`,
                  }
                : undefined
            }
            className={`
              flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all duration-300
              ${activePolo
                ? "text-white scale-100 hover:scale-105 hover:-translate-y-0.5 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              }
            `}
          >
            {entering ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar no {activePolo?.name ?? "Polo"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          "Veritas • Sapientia • Fides" — IETEO 2026
        </p>
      </div>
    </div>
  )
}
