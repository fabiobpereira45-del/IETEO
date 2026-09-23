"use client"

import { useEffect, useRef, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { ClipboardList, BookOpen, Users, MessageSquareQuote, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type HighlightSlide = {
  id: string
  eyebrow: string
  title: string
  description: string
  cta: string
  icon: React.ElementType
  gradient: string
  onClick: () => void
}

export function HighlightsCarousel({ slides }: { slides: HighlightSlide[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  useEffect(() => {
    if (!api || paused) return
    timerRef.current = setInterval(() => {
      if (api.canScrollNext()) api.scrollNext()
      else api.scrollTo(0)
    }, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [api, paused])

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {slides.map((slide) => {
            const Icon = slide.icon
            return (
              <CarouselItem key={slide.id}>
                <button
                  onClick={slide.onClick}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-3xl p-8 md:p-12 text-left shadow-xl border border-white/10 text-white min-h-[220px] flex flex-col justify-between transition-transform hover:scale-[1.01]",
                    slide.gradient
                  )}
                >
                  <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/5 blur-3xl group-hover:bg-white/10 transition-colors" />
                  <div className="relative z-10 flex items-start justify-between gap-6">
                    <div className="space-y-3 max-w-xl">
                      <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/70">
                        {slide.eyebrow}
                      </span>
                      <h3 className="text-2xl md:text-3xl font-extrabold leading-tight">{slide.title}</h3>
                      <p className="text-white/80 text-sm md:text-base max-w-md">{slide.description}</p>
                    </div>
                    <Icon className="h-12 w-12 md:h-16 md:w-16 text-white/30 shrink-0" />
                  </div>
                  <div className="relative z-10 inline-flex items-center gap-2 text-sm font-bold text-white bg-white/10 group-hover:bg-white/20 transition-colors rounded-full px-4 py-2 w-fit mt-6">
                    {slide.cta}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>

      <div className="flex items-center justify-center gap-2 mt-4">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            aria-label={`Ir para o slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              current === i ? "w-8 bg-accent" : "w-1.5 bg-border hover:bg-accent/40"
            )}
          />
        ))}
      </div>
    </div>
  )
}
