"use client"

import { useState, useEffect } from "react"
import { Mail, User, ArrowRight, BookOpenCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getActiveAssessment,
  hasStudentSubmitted,
  saveStudentSession,
  getQuestionsByDiscipline,
  getDisciplines,
  type Assessment,
  type Question,
  type Discipline,
  type StudentSession,
} from "@/lib/store"

interface Props {
  onLogin: (session: StudentSession) => void
}

export function StudentLogin({ onLogin }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [disc, setDisc] = useState<Discipline | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let mounted = true
    async function init() {
      const a = await getActiveAssessment()
      if (!mounted) return
      setAssessment(a)
      if (a) {
        const [allQs, allDs] = await Promise.all([
          getQuestionsByDiscipline(a.disciplineId),
          getDisciplines()
        ])
        if (!mounted) return
        setQuestions(allQs.filter(q => a.questionIds.includes(q.id)))
        setDisc(allDs.find(d => d.id === a.disciplineId) || null)
      }
      setIsInitializing(false)
    }
    init()
    return () => { mounted = false }
  }, [])

  async function processLogin(isQuery: boolean) {
    setError(null)

    const trimName = name.trim()
    const trimEmail = email.trim().toLowerCase()

    if (trimName.length < 3) {
      setError("Informe seu nome completo (mínimo 3 caracteres).")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError("Informe um e-mail válido.")
      return
    }

    setLoading(true)

    if (!assessment) {
      setError("A avaliação não está disponível no momento. Aguarde o professor publicá-la.")
      setLoading(false)
      return
    }

    const submitted = await hasStudentSubmitted(trimEmail, assessment.id)

    if (isQuery && !submitted) {
      setError("Nenhuma avaliação finalizada foi encontrada para este e-mail.")
      setLoading(false)
      return
    }

    if (!isQuery && submitted) {
      setError("Este e-mail já foi utilizado. Para consultar sua nota, clique em 'Ver Resultado Anterior'.")
      setLoading(false)
      return
    }

    const session: StudentSession = {
      name: trimName,
      email: trimEmail,
      assessmentId: assessment.id,
      startedAt: new Date().toISOString(),
    }
    saveStudentSession(session)
    onLogin(session)
    setLoading(false)
  }

  // Assessment info for the hero card

  const hasDiscursive = questions.some((q) => q.type === "discursive")
  const hasTrueFalse = questions.some((q) => q.type === "true-false")
  const hasMultiple = questions.some((q) => q.type === "multiple-choice")
  const formats = [
    hasMultiple && "Múltipla Escolha",
    hasTrueFalse && "V/F",
    hasDiscursive && "Discursiva",
  ].filter(Boolean).join(" · ")

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Hero Card */}
      {assessment ? (
        <div className="w-full rounded-2xl bg-primary text-primary-foreground p-8 flex flex-col items-center gap-4 text-center shadow-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-balance">{assessment.title}</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">
              {disc?.name ?? "Teologia"} · {assessment.professor}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-primary-foreground/80 border-t border-primary-foreground/20 pt-4 w-full">
            <span>{assessment.questionIds.length} questão{assessment.questionIds.length !== 1 ? "ões" : ""}</span>
            <span>·</span>
            <span>{assessment.totalPoints.toFixed(1)} pts no total</span>
            {formats && <><span>·</span><span>{formats}</span></>}
          </div>
        </div>
      ) : (
        <div className="w-full rounded-2xl bg-muted border border-border p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-50" />
          <p className="font-semibold text-foreground">Nenhuma avaliação disponível</p>
          <p className="text-sm text-muted-foreground">Aguarde o professor publicar a avaliação para acessá-la.</p>
        </div>
      )}

      {/* Login Form */}
      <div className="w-full rounded-2xl bg-card text-card-foreground border border-border shadow-sm p-8">
        <h2 className="text-lg font-semibold mb-1">Identifique-se para começar</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Informe seus dados abaixo. Cada e-mail pode submeter a avaliação apenas uma vez.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); processLogin(false) }} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="student-name" className="text-sm font-medium">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="student-name"
                placeholder="Ex: Maria da Silva"
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="student-email" className="text-sm font-medium">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="student-email"
                type="email"
                placeholder="seu@email.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              type="submit"
              disabled={loading || !assessment}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-11 text-base flex-1"
            >
              Iniciar Avaliação
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !assessment}
              onClick={() => processLogin(true)}
              className="h-11 font-medium sm:w-[200px]"
            >
              Ver Resultado Anterior
            </Button>
          </div>
        </form>
      </div>

      <p className="text-xs text-muted-foreground text-center text-balance">
        Suas respostas são salvas automaticamente a cada questão marcada. Em caso de interrupção, basta acessar novamente com o mesmo e-mail.
      </p>
    </div>
  )
}
