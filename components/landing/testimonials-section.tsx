"use client"

import { Quote } from "lucide-react"
import { TESTIMONIALS } from "@/lib/testimonials-data"
import { ScrollReveal } from "@/components/landing/scroll-reveal"

export function TestimonialsSection() {
  return (
    <div>
      <ScrollReveal>
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] uppercase tracking-widest font-bold text-accent mb-2">
            Depoimentos
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">O que dizem nossos alunos</h2>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <ScrollReveal key={t.id} delay={i * 100}>
            <div className="relative h-full rounded-2xl bg-maroon-dark bg-gradient-to-br from-[#450a0a] to-[#7f1d1d] text-white p-6 shadow-lg border border-white/10 flex flex-col justify-between">
              <Quote className="h-8 w-8 text-accent/50 mb-3" />
              <p className="text-sm md:text-base text-white/90 italic leading-relaxed flex-1">
                "{t.quote}"
              </p>
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="font-bold text-sm">{t.name}</p>
                <p className="text-xs text-white/60">{t.role} • {t.polo}</p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
