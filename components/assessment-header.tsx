"use client"

import { BookOpen, LayoutDashboard, User, ClipboardList } from "lucide-react"

interface AssessmentHeaderProps {
  studentName?: string
  studentEmail?: string
  onAdminClick?: () => void
  onStudentAreaClick?: () => void
  onEnrollClick?: () => void
}

export function AssessmentHeader({
  studentName,
  studentEmail,
  onAdminClick,
  onStudentAreaClick,
  onEnrollClick
}: AssessmentHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-primary text-primary-foreground shadow-md">
      <div className="mx-auto max-w-[1400px] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm shrink-0 overflow-hidden">
              <img src="/ieteo-logo.jpg" alt="IETEO" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-widest hidden sm:block">
                Instituto de Ensino Teológico - IETEO
              </p>
              <p className="text-sm font-bold leading-tight text-primary-foreground">
                Curso de Teologia
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onEnrollClick && (
              <button
                onClick={onEnrollClick}
                className="flex items-center gap-1.5 rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm"
                title="Fazer Matrícula"
              >
                <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Matrícula</span>
              </button>
            )}
            {onAdminClick && (
              <button
                onClick={onAdminClick}
                className="flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-3 py-1.5 text-xs font-medium text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
                title="Painel do Professor"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Painel do Professor</span>
              </button>
            )}
            {onStudentAreaClick && (
              <button
                onClick={onStudentAreaClick}
                className="flex items-center gap-1.5 rounded-md bg-white/20 text-white border border-white/30 px-3 py-1.5 text-xs font-bold hover:bg-white/30 transition-colors"
                title="Área do Aluno"
              >
                <User className="h-3.5 w-3.5 shrink-0" />
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
