"use client"

import { BookOpen, GraduationCap, LayoutDashboard } from "lucide-react"

interface AssessmentHeaderProps {
  studentName?: string
  studentEmail?: string
  onAdminClick?: () => void
  onStudentAreaClick?: () => void
}

export function AssessmentHeader({ studentName, studentEmail, onAdminClick, onStudentAreaClick }: AssessmentHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-primary text-primary-foreground shadow-md">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-widest">
                Instituto de Ensino Teológico - IETEO
              </p>
              <p className="text-sm font-bold leading-tight text-primary-foreground">
                Curso de Teologia
              </p>
            </div>
          </div>

          {/* Course Info */}
          <div className="hidden sm:flex flex-col items-center text-center">
            <p className="text-xs text-primary-foreground/70 uppercase tracking-widest">Disciplina</p>
            <p className="text-sm font-semibold text-primary-foreground">Livros Poéticos</p>
          </div>

          {/* Professor + Admin Link */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="flex items-center gap-1.5 text-primary-foreground/70">
                <GraduationCap className="h-3.5 w-3.5" />
                <p className="text-xs uppercase tracking-widest">Professor</p>
              </div>
              <p className="text-sm font-semibold text-primary-foreground">Pb. Fábio Barreto</p>
            </div>
            <button
              onClick={onAdminClick}
              className="flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-3 py-1.5 text-xs font-medium text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
              title="Painel do Professor"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Painel</span>
            </button>
            {onStudentAreaClick && (
              <button
                onClick={onStudentAreaClick}
                className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors"
                title="Painel do Aluno"
              >
                <span className="hidden sm:inline">Área do Aluno</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Info Bar */}
        {studentName && (
          <div className="mt-2 border-t border-primary-foreground/20 pt-2 flex items-center justify-between">
            <p className="text-xs text-primary-foreground/80">
              Aluno: <span className="font-semibold text-primary-foreground">{studentName}</span>
            </p>
            {studentEmail && (
              <p className="text-xs text-primary-foreground/60">{studentEmail}</p>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
