"use client"

import { useState, useEffect } from "react"
import { Mail, User, ArrowRight, BookOpenCheck, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import {
  getActiveAssessment,
  hasStudentSubmitted,
  saveStudentSession,
  getQuestionsByDiscipline,
  getDisciplines,
  getSubmissionByEmailAndAssessment,
  type Assessment,
  type Question,
  type Discipline,
  type StudentSession,
  type StudentSubmission,
} from "@/lib/store"

interface Props {
  onLogin: (session: StudentSession) => void
  onResult?: (submission: StudentSubmission) => void
  onBack?: () => void
  preloadedAssessmentId?: string
}

export function StudentLogin({ onLogin, onResult, onBack, preloadedAssessmentId }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotMsg, setForgotMsg] = useState("")
  const [forgotErr, setForgotErr] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [disc, setDisc] = useState<Discipline | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const a = await getActiveAssessment(preloadedAssessmentId)
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
      } catch (err: any) {
        console.error("Init error:", err)
        setInitError(err.message || "Erro desconhecido ao carregar avaliação")
      } finally {
        if (mounted) setIsInitializing(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [preloadedAssessmentId])

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    window.open("https://wa.me/5571987483103?text=Olá, esqueci minha senha de estudante e gostaria de recuperá-la.", "_blank")
  }

  async function processLogin(isQuery: boolean) {
    setError(null)
    const trimName = name.trim()
    const trimEmail = email.trim().toLowerCase()
    if (trimName.length < 3) { setError("Informe seu nome completo (mínimo 3 caracteres)."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) { setError("Informe um e-mail válido."); return }
    setLoading(true)
    if (!assessment) {
      setError("Não foi possível carregar a avaliação.")
      setLoading(false); return
    }
    const now = new Date()
    const isTakeable = assessment.isPublished &&
      (!assessment.openAt || new Date(assessment.openAt) <= now) &&
      (!assessment.closeAt || new Date(assessment.closeAt) >= now)

    const submitted = await hasStudentSubmitted(trimEmail, assessment.id)

    if (!isQuery && !isTakeable) {
      setError("Esta avaliação está encerrada ou não disponível para novos envios.")
      setLoading(false); return
    }

    if (isQuery && !submitted) {
      setError("Nenhuma avaliação finalizada foi encontrada para este e-mail.")
      setLoading(false); return
    }
    if (!isQuery && submitted) {
      setError("Este e-mail já foi utilizado. Para consultar sua nota, clique em 'Ver Resultado Anterior'.")
      setLoading(false); return
    }

    // ── Ver resultado: fetch submission and show result directly ──────────────
    if (isQuery && submitted) {
      const sub = await getSubmissionByEmailAndAssessment(trimEmail, assessment.id)
      if (!sub) {
        setError("Não foi possível carregar o resultado. Tente novamente.")
        setLoading(false); return
      }
      setLoading(false)
      if (onResult) onResult(sub)
      return
    }

    // ── Normal login: start assessment ────────────────────────────────────────
    const session: StudentSession = { name: trimName, email: trimEmail, assessmentId: assessment.id, startedAt: new Date().toISOString() }
    saveStudentSession(session)
    onLogin(session)
    setLoading(false)
  }

  const hasDiscursive = questions.some(q => q.type === "discursive")
  const hasTrueFalse = questions.some(q => q.type === "true-false")
  const hasMultiple = questions.some(q => q.type === "multiple-choice")
  const formats = [hasMultiple && "Múltipla Escolha", hasTrueFalse && "V/F", hasDiscursive && "Discursiva"].filter(Boolean).join(" · ")

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const now = new Date()
  const isTakeable = assessment ? assessment.isPublished &&
    (!assessment.openAt || new Date(assessment.openAt) <= now) &&
    (!assessment.closeAt || new Date(assessment.closeAt) >= now) : false

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Hero Card */}
      {assessment ? (
        <div className="w-full rounded-2xl bg-gradient-to-br from-primary to-maroon-light text-primary-foreground p-8 flex flex-col items-center gap-5 text-center shadow-lg border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-accent shadow-xl border border-white/20 p-2">
            <img src="/ieteo-logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="relative z-10">
            {assessment.institution && (
              <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest border border-accent/30 backdrop-blur-sm">
                  {assessment.institution}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-balance leading-tight">{assessment.title}</h1>
            <p className="mt-2 text-primary-foreground/70 text-sm font-medium">
              {disc?.name ?? "Disciplina Geral"} <span className="mx-1.5 opacity-30">•</span> Prof. {assessment.professor}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-primary-foreground/60 border-t border-white/10 pt-5 w-full">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
              <span>{assessment.questionIds.length} Questões</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
              <span>{assessment.totalPoints.toFixed(1)} Pontos</span>
            </div>
            {formats && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                <span>{formats}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full rounded-2xl bg-muted border border-border p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-50" />
          <p className="font-semibold text-foreground">Nenhuma avaliação disponível</p>
          <p className="text-sm text-muted-foreground">
            {initError ? `Erro: ${initError}` : "Aguarde o professor publicar a avaliação para acessá-la."}
          </p>
        </div>
      )}

      {/* Login Form or Forgot Password */}
      <div className="w-full rounded-2xl bg-card text-card-foreground border border-border shadow-sm p-8">
        {isForgot ? (
          <>
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm leading-relaxed">
                <span className="font-semibold block mb-1">Recuperar Acesso:</span>
                A recuperação de senha para alunos matriculados é feita exclusivamente pela nossa Secretaria via WhatsApp, pois utilizamos identificadores de sistema.
              </div>

              <a href="https://wa.me/5571987483103?text=Olá, esqueci minha senha de estudante e gostaria de recuperá-la." target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold h-12 rounded-lg transition-colors shadow-sm">
                <CheckCircle2 className="h-5 w-5" /> Falar com a Secretaria
              </a>

              <button type="button" onClick={() => setIsForgot(false)} className="text-sm text-primary hover:underline text-center">← Voltar</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-1">Identifique-se para começar</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">Informe seus dados abaixo. Cada e-mail pode submeter a avaliação apenas uma vez.</p>
            <form onSubmit={e => { e.preventDefault(); processLogin(false) }} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="student-name" className="text-sm font-medium">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="student-name" placeholder="Ex: Maria da Silva" className="pl-9" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="student-email" className="text-sm font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="student-email" type="email" placeholder="seu@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Button type="submit" disabled={loading || !assessment || !isTakeable} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-11 text-base flex-1">
                  {isTakeable ? "Iniciar Avaliação" : "Avaliação Encerrada"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" disabled={loading || !assessment} onClick={() => processLogin(true)} className="h-11 font-medium sm:w-[200px]">
                  Ver Resultado Anterior
                </Button>
              </div>
            </form>
            <div className={`mt-4 flex items-center ${onBack ? 'justify-between' : 'justify-center'}`}>
              {onBack && (
                <button type="button" onClick={onBack} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  ← Voltar
                </button>
              )}
              <button type="button" onClick={() => setIsForgot(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
                Esqueci minha senha
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center text-balance">
        Suas respostas são salvas automaticamente a cada questão marcada. Em caso de interrupção, basta acessar novamente com o mesmo e-mail.
      </p>
    </div>
  )
}
