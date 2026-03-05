"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")
    const supabase = createClient()

    useEffect(() => {
        // Supabase adds the token to the URL hash, exchange it for a session
        const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === "PASSWORD_RECOVERY") {
                // Session established by Supabase after clicking the email link
            }
        })
        return () => listener.subscription.unsubscribe()
    }, [supabase.auth])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return }
        if (password !== confirm) { setError("As senhas não coincidem."); return }
        setLoading(true)
        try {
            const { error: err } = await supabase.auth.updateUser({ password })
            if (err) throw err
            setSuccess(true)
            setTimeout(() => router.push("/"), 3000)
        } catch (err: any) {
            setError(err.message || "Erro ao redefinir senha.")
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
                        <Lock className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground font-serif">Redefinir Senha</h1>
                    <p className="text-muted-foreground text-sm mt-1">Instituto de Ensino Teológico - IETEO</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    {success ? (
                        <div className="text-center py-4">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            <h2 className="font-semibold text-lg text-foreground mb-1">Senha redefinida!</h2>
                            <p className="text-sm text-muted-foreground">Redirecionando para a página inicial em 3 segundos...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <input
                                        type={showPwd ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full border border-input rounded-xl pl-9 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                        autoFocus
                                    />
                                    <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5">Confirmar Nova Senha</label>
                                <input
                                    type={showPwd ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                                </div>
                            )}
                            <button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:bg-accent/90 disabled:opacity-60 transition-colors">
                                {loading ? "Salvando..." : "Salvar Nova Senha"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}
