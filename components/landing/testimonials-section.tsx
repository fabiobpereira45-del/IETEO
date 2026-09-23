"use client"

import { useEffect, useState } from "react"
import { Quote } from "lucide-react"
import { TESTIMONIALS as PLACEHOLDER_TESTIMONIALS } from "@/lib/testimonials-data"
import { getTestimonials, type Testimonial } from "@/lib/store"
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

export function TestimonialsSection() {
  const [items, setItems] = useState<Testimonial[] | null>(null)

  useEffect(() => {
    getTestimonials(true).then((data) => setItems(data))
  }, [])

  // While loading, or if the admin hasn't added any real testimonial yet, fall back to placeholders.
  const list: { id: string; name: string; role?: string; polo?: string; quote: string; photoUrl?: string | null }[] =
    items === null
      ? PLACEHOLDER_TESTIMONIALS
      : items.length > 0
        ? items
        : PLACEHOLDER_TESTIMONIALS

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
        {list.map((t, i) => (
          <ScrollReveal key={t.id} delay={i * 100}>
            <div className="relative h-full rounded-2xl bg-maroon-dark bg-gradient-to-br from-[#450a0a] to-[#7f1d1d] text-white p-6 shadow-lg border border-white/10 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/40 bg-accent/20 flex items-center justify-center font-black text-sm shrink-0">
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    initials(t.name)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{t.name}</p>
                  <p className="text-xs text-white/60 truncate">{[t.role, t.polo].filter(Boolean).join(" • ")}</p>
                </div>
                <Quote className="h-6 w-6 text-accent/40 ml-auto shrink-0" />
              </div>
              <p className="text-sm md:text-base text-white/90 italic leading-relaxed flex-1">
                "{t.quote}"
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
