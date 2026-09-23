"use client"

import { useEffect, useState } from "react"
import { GraduationCap } from "lucide-react"
import { getProfessorAccounts, type ProfessorAccount } from "@/lib/store"
import { ScrollReveal } from "@/components/landing/scroll-reveal"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function ProfessorsShowcase() {
  const [professors, setProfessors] = useState<ProfessorAccount[]>([])

  useEffect(() => {
    getProfessorAccounts().then((list) => {
      setProfessors(list.filter((p) => p.role === "professor" && p.active !== false))
    })
  }, [])

  if (professors.length === 0) return null

  return (
    <div>
      <ScrollReveal>
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] uppercase tracking-widest font-bold text-accent mb-2">
              Corpo Docente
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Nossos Professores</h2>
            <p className="text-muted-foreground">Formação sólida, guiada por quem vive a Palavra</p>
          </div>
        </div>
      </ScrollReveal>

      <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible snap-x snap-mandatory">
        {professors.map((prof, i) => (
          <ScrollReveal key={prof.id} delay={i * 80} className="shrink-0 w-[220px] md:w-auto snap-start">
            <div className="group rounded-2xl border-2 border-border bg-card p-5 text-center shadow-md hover:shadow-xl hover:border-accent/40 hover:-translate-y-1 transition-all h-full flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-accent/20 bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
                  {prof.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={prof.avatar_url} alt={prof.name} className="w-full h-full object-cover" />
                  ) : (
                    initials(prof.name)
                  )}
                </div>
                <GraduationCap className="absolute -bottom-1 -right-1 h-6 w-6 text-accent bg-card rounded-full p-1 border-2 border-card" />
              </div>
              <h3 className="font-bold text-foreground leading-tight">{prof.name}</h3>
              {prof.bio && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{prof.bio}</p>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
