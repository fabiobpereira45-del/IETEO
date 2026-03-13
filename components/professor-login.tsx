"use client"

import { useState } from "react"
import { BookOpen, Eye, EyeOff, Lock, Mail, UserPlus, LogIn, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { saveProfessorSession, MASTER_CREDENTIALS, ensureProfessorSync, getProfessorByEmail } from "@/lib/store"

interface Props {
  onLogin: () => void
  onBack?: () => void
}

export function ProfessorLogin({ onLogin, onBack }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function reset() {
    setError("")
    setMessage("")
    setIsSignUp(false)
    setIsForgot(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    if (!email.trim()) { setError("Informe o e-mail."); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (err) throw err
      setMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.")
    } catch (err: any) {
      setError(err.message || "Erro ao enviar e-mail.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      if (isSignUp) {
        if (!name.trim()) { setError("O nome é obrigatório para o cadastro."); setLoading(false); return }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name, role: "professor" } }
        })
        if (signUpError) throw signUpError
        if (data.session) {
          saveProfessorSession(data.user!.id, data.user!.user_metadata.role || "professor")
          onLogin()
        } else {
          setMessage("Cadastro realizado! Verifique seu e-mail para confirmar a conta.")
          setIsSignUp(false)
        }
      } else {
        const normalizedEmail = email.toLowerCase().trim()
        const isMaster = normalizedEmail === MASTER_CREDENTIALS.email || normalizedEmail === "professor@ibad.com"
        if (isMaster && password === MASTER_CREDENTIALS.password) {
          saveProfessorSession("master", "master")
          onLogin()
          return
        }
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        if (data.session) {
          // Fetch full profile from DB to seed the session correctly
          const authRole = data.user.user_metadata?.role || data.user.user_metadata?.type
          let finalRole = authRole
          let finalAvatar = null
          
          if (data.user.email) {
            const dbProfile = await getProfessorByEmail(data.user.email)
            if (dbProfile) {
                finalRole = dbProfile.role
                finalAvatar = dbProfile.avatar_url
            }
          }

          if (finalRole !== "master" && finalRole !== "professor") {
            await supabase.auth.signOut()
            throw new Error("Acesso negado. Esta área é restrita a professores.")
          }

          saveProfessorSession(data.user.id, finalRole, finalAvatar)
          // Sync ID with professor_accounts table
          if (data.user.email) {
            await ensureProfessorSync(data.user.email, data.user.id)
          }
          onLogin()
        }
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na autenticação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-10 group">
        <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full relative overflow-hidden shadow-xl border border-white/5 transition-transform duration-500 group-hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20" />
          <img src="/ieteo-logo.jpg" alt="IETEO" className="w-full h-full object-cover relative z-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">Painel do Professor</h1>
        <p className="text-accent text-xs font-bold uppercase tracking-widest mt-2">Instituto de Ensino Teológico</p>
        <div className="h-1 w-8 bg-accent mx-auto mt-4 rounded-full" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        {/* Forgot Password */}
        {isForgot ? (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 mb-2">
                <KeyRound className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-semibold text-foreground">Recuperar Senha</h2>
              <p className="text-xs text-muted-foreground mt-1">Enviaremos um link de recuperação para seu e-mail</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="forgot-email" className="text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="forgot-email" type="email" placeholder="professor@ibad.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" required autoFocus />
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <button type="button" onClick={reset} className="text-sm text-primary hover:underline text-center transition-all">← Voltar ao login</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prof-name" className="text-sm font-medium">Nome Completo</Label>
                <div className="relative">
                  <Input id="prof-name" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required={isSignUp} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prof-email" className="text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="prof-email" type="email" placeholder="professor@ibad.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" required autoFocus />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="prof-password" className="text-sm font-medium">Senha</Label>
                {!isSignUp && (
                  <button type="button" onClick={() => { setIsForgot(true); setError(""); setMessage("") }} className="text-xs text-primary hover:underline transition-colors">
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="prof-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 pr-10" required />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{message}</p>}
            <Button type="submit" className="w-full mt-2 font-semibold" disabled={loading}>
              {loading ? "Processando..." : isSignUp ? <><UserPlus className="w-4 h-4 mr-2" /> Criar Conta</> : <><LogIn className="w-4 h-4 mr-2" /> Entrar</>}
            </Button>
            <div className="text-center mt-2">
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage("") }} className="text-sm text-primary hover:underline transition-all">
                {isSignUp ? "Já tenho uma conta. Fazer Login." : "Não tem conta? Criar nova conta."}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6 mb-4">Acesso exclusivo para professores e coordenadores</p>
      {onBack && (
        <div className="text-center">
          <button type="button" onClick={onBack} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 transition-colors">
            ← Voltar
          </button>
        </div>
      )}
    </div>
  )
}
