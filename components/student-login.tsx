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
    if (!forgotEmail.trim()) { setForgotErr("Informe seu e-mail."); return }
    setForgotLoading(true)
    setForgotErr("")
    setForgotMsg("")
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (err) throw err
      setForgotMsg("Link de recuperação enviado! Verifique seu e-mail.")
    } catch (err: any) {
      setForgotErr(err.message || "Erro ao enviar e-mail.")
    } finally { setForgotLoading(false) }
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
        <div className="w-full rounded-2xl bg-primary text-primary-foreground p-8 flex flex-col items-center gap-4 text-center shadow-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <div>
            {assessment.institution && (
              <div className="mb-3">
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/90 border border-white/20">
                  {assessment.institution}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-serif font-bold text-balance">{assessment.title}</h1>
            <p className="mt-1.5 text-sm text-primary-foreground/80 font-medium">
              {disc?.name ?? "Disciplina Geral"} <span className="mx-1 opacity-50">•</span> Prof. {assessment.professor}
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
          <p className="text-sm text-muted-foreground">
            {initError ? `Erro: ${initError}` : "Aguarde o professor publicar a avaliação para acessá-la."}
          </p>
        </div>
      )}

      {/* Login Form or Forgot Password */}
      <div className="w-full rounded-2xl bg-card text-card-foreground border border-border shadow-sm p-8">
        {isForgot ? (
          <>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 mb-2">
                <KeyRound className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-lg font-semibold">Recuperar Senha</h2>
              <p className="text-sm text-muted-foreground mt-1">Enviaremos um link de recuperação para seu e-mail de aluno</p>
            </div>
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="forgot-email-student">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="forgot-email-student" type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="pl-9" autoFocus />
                </div>
              </div>
              {forgotErr && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{forgotErr}</p>}
              {forgotMsg && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{forgotMsg}</p>}
              <Button type="submit" className="w-full" disabled={forgotLoading}>
                {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <button type="button" onClick={() => setIsForgot(false)} className="text-sm text-primary hover:underline text-center">← Voltar</button>
            </form>
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
