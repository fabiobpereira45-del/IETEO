"use client"

import { useState } from "react"
import { BookOpen, Eye, EyeOff, Lock, Mail, UserPlus, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { saveProfessorSession, MASTER_CREDENTIALS } from "@/lib/store"

interface Props {
  onLogin: () => void
  onBack?: () => void
}

export function ProfessorLogin({ onLogin, onBack }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState("") // Only used for sign up
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("O nome é obrigatório para o cadastro.")
          setLoading(false)
          return
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: "professor", // Default role
            },
          },
        })

        if (signUpError) throw signUpError

        // If email confirmation is disabled in Supabase, data.session might exist, otherwise users have to confirm email.
        if (data.session) {
          saveProfessorSession(data.user!.id, data.user!.user_metadata.role || "professor")
          onLogin()
        } else {
          setMessage("Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta se necessário, ou tente fazer o login.")
          setIsSignUp(false) // switch to login
        }
      } else {
        const normalizedEmail = email.toLowerCase().trim()
        const isMaster = (normalizedEmail === MASTER_CREDENTIALS.email || normalizedEmail === "professor@ibad.com")

        if (isMaster && password === MASTER_CREDENTIALS.password) {
          saveProfessorSession("master", "master")
          onLogin()
          return
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        if (data.session) {
          // Explicitly check for master fallback if metadata is missing/delayed
          const role = isMaster ? "master" : (data.user.user_metadata?.role || "professor")
          saveProfessorSession(data.user.id, role)
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
      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
          <BookOpen className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground font-serif">Painel do Professor</h1>
        <p className="text-muted-foreground text-sm mt-1 font-sans">
          Instituto de Ensino Teológico - IETEO
        </p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prof-name" className="text-sm font-medium">
                Nome Completo
              </Label>
              <div className="relative">
                <Input
                  id="prof-name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prof-email" className="text-sm font-medium">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="prof-email"
                type="email"
                placeholder="professor@ieteo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prof-password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="prof-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {message && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full mt-2 font-semibold" disabled={loading}>
            {loading
              ? "Processando..."
              : isSignUp ? (
                <><UserPlus className="w-4 h-4 mr-2" /> Criar Conta</>
              ) : (
                <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
              )}
          </Button>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
                setMessage("")
              }}
              className="text-sm text-primary hover:underline transition-all"
            >
              {isSignUp ? "Já tenho uma conta. Fazer Login." : "Não tem conta? Criar nova conta."}
            </button>
          </div>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Acesso exclusivo para professores e coordenadores
      </p>
      {onBack && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Voltar para a página dos alunos
          </button>
        </div>
      )}
    </div>
  )
}
