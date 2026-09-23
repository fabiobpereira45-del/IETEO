"use client"

import { useEffect, useState } from "react"
import { BookOpen, Layers, Clock3, ArrowRight } from "lucide-react"
import { getSemesters, getDisciplines, type Semester, type Discipline } from "@/lib/store"
import { usePolo } from "@/lib/polo-context"

export function CurriculumHighlight({ onViewGrade }: { onViewGrade: () => void }) {
  const { polo } = usePolo()
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])

  useEffect(() => {
    Promise.all([getSemesters(), getDisciplines()]).then(([s, d]) => {
      setSemesters(s)
      setDisciplines(d)
    })
  }, [])

  const scoped = polo?.id ? semesters.filter((s) => !s.poloId || s.poloId === polo.id) : semesters
  const scopedIds = new Set(scoped.map((s) => s.id))
  const scopedDisciplines = disciplines.filter((d) => d.semesterId && scopedIds.has(d.semesterId))
  const modalities = new Set(scoped.map((s) => s.modality || "presencial"))

  const stats = [
    { icon: Layers, label: "Semestres", value: scoped.length || "—" },
    { icon: BookOpen, label: "Disciplinas", value: scopedDisciplines.length || "—" },
    { icon: Clock3, label: "Modalidades", value: modalities.size || "—" },
  ]

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-lg">
      <div className="flex-1 space-y-4">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] uppercase tracking-widest font-bold text-accent">
          Grade Curricular
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
          Um percurso teológico completo, passo a passo
        </h2>
        <p className="text-muted-foreground max-w-lg">
          Conheça todas as disciplinas, semestres e cronograma do curso — presencial ou EAD —
          antes mesmo de se matricular.
        </p>
        <button
          onClick={onViewGrade}
          className="group inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold rounded-full px-6 py-3 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all"
        >
          Ver Grade Completa
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-muted/40 border border-border p-5 min-w-[100px]"
            >
              <Icon className="h-6 w-6 text-accent" />
              <span className="text-2xl font-black text-foreground tabular-nums">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold text-center">
                {stat.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
