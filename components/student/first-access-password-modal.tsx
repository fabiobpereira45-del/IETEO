"use client"

import { useState } from "react"
import { KeyRound, Eye, EyeOff, ShieldCheck, Check, ArrowRight, X, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import type { StudentProfile } from "@/lib/store"

interface FirstAccessPasswordModalProps {
  isOpen: boolean
  profile: StudentProfile
  onClose: () => void
  onPasswordChanged?: () => void
}

export function FirstAccessPasswordModal({
  isOpen,
  profile,
  onClose,
  onPasswordChanged
}: FirstAccessPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  if (!isOpen) return null

  function markDismissed() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`ieteo_first_access_dismissed_${profile.id}`, "true")
      } catch (err) {
        console.warn("Could not save dismissal flag:", err)
      }
    }
  }

  function handleSkip() {
    markDismissed()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!newPassword || newPassword.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas digitadas não coincidem. Verifique e tente novamente.")
      return
    }

    setLoading(true)
    try {
      // 1. Update Supabase Auth Password
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          password_changed: true,
          password_changed_at: new Date().toISOString()
        }
      })
      if (authError) throw authError

      // 2. Mark in students table if column exists or in metadata
      try {
        await supabase.from('students').update({
          bio: profile.bio || undefined
        }).eq('id', profile.id)
      } catch {
        /* silent */
      }

      markDismissed()
      setSuccess(true)
      if (onPasswordChanged) onPasswordChanged()

      setTimeout(() => {
        onClose()
      }, 1800)
    } catch (err: any) {
      console.error("Erro ao alterar senha:", err)
      setError(err.message || "Não foi possível atualizar sua senha. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden bg-card text-card-foreground border border-border/80 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-100 shadow-inner">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Primeiro Acesso ao Portal
              </span>
              <h2 className="text-xl font-bold text-white font-serif">
                Deseja criar sua senha pessoal?
              </h2>
            </div>
          </div>
          <p className="text-sm text-amber-100/90 leading-relaxed mt-1">
            Olá, <strong className="text-white">{profile.name.split(' ')[0]}</strong>! Para maior segurança da sua conta, você pode cadastrar sua própria senha agora ou continuar com a padrão.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                Senha Alterada com Sucesso!
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Sua nova senha já está ativa para seus próximos acessos ao portal.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="p-3.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl leading-relaxed animate-in shake">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="first-access-new-pwd" className="text-xs font-semibold text-foreground">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="first-access-new-pwd"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="pr-10 h-11 text-sm bg-background border-border/80"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="first-access-confirm-pwd" className="text-xs font-semibold text-foreground">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    id="first-access-confirm-pwd"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente a nova senha"
                    className="h-11 text-sm bg-background border-border/80"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Você também pode alterar sua senha a qualquer momento na aba <strong>Perfil</strong> do painel.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition-all gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Alterar Senha Agora
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={loading}
                  className="h-11 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Manter Atual (Alterar Depois)
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
