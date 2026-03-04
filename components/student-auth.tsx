"use client"

import { useState } from "react"
import { Lock, User, Key, ArrowRight, AlertCircle, GraduationCap, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registerStudentAuth, loginStudentAuth } from "@/lib/store"

interface Props {
    onSuccess: () => void
}

export function StudentAuth({ onSuccess }: Props) {
    const [mode, setMode] = useState<"login" | "register">("login")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Fields
    const [name, setName] = useState("")
    const [identifier, setIdentifier] = useState("") // CPF or Matricula
    const [password, setPassword] = useState("")

    const formatCpf = (v: string) => {
        return v.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSuccessMsg(null)
        setLoading(true)

        try {
            if (mode === "register") {
                if (name.length < 3) throw new Error("Informe o nome completo.")
                if (identifier.replace(/\D/g, '').length !== 11) throw new Error("Informe um CPF válido.")
                if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.")

                const { matricula } = await registerStudentAuth(name, identifier, password)
                setSuccessMsg(`Cadastro realizado com sucesso! Sua MATRÍCULA é: ${matricula}. Por favor, anote este número.`)
                setMode("login")
                // clear fields except identifier to let them login easily
                setPassword("")
            } else {
                if (!identifier) throw new Error("Informe seu CPF ou Matrícula.")
                if (!password) throw new Error("Informe sua senha.")

                await loginStudentAuth(identifier, password)
                onSuccess()
            }
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto rounded-2xl bg-card text-card-foreground border border-border shadow-xl p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center gap-3 text-center mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <GraduationCap className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">
                        {mode === "login" ? "Acesso do Aluno" : "Matrícula IETEO"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground text-balance">
                        {mode === "login"
                            ? "Entre com seu CPF ou Matrícula para acessar o Portal do Aluno."
                            : "Preencha seus dados para criar sua conta no Portal Acadêmico."}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === "register" && (
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="auth-name" className="text-sm font-medium">Nome Completo</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="auth-name"
                                placeholder="Ex: Maria da Silva"
                                className="pl-9"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="auth-id" className="text-sm font-medium">
                        {mode === "login" ? "CPF ou Matrícula" : "CPF"}
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="auth-id"
                            placeholder={mode === "login" ? "000.000.000-00 ou 2026..." : "000.000.000-00"}
                            className="pl-9"
                            value={identifier}
                            onChange={(e) => {
                                // if it's explicitly numbers and length < 11 format as CPF
                                const val = e.target.value
                                const clean = val.replace(/\D/g, '')
                                if (mode === "register") {
                                    setIdentifier(formatCpf(val))
                                } else {
                                    // In login, we let them type whatever (CPF or matricula)
                                    if (clean.length <= 11 && !val.startsWith('2026')) {
                                        setIdentifier(formatCpf(val))
                                    } else {
                                        setIdentifier(clean) // probably matricula
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="auth-pass" className="text-sm font-medium">Senha</Label>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="auth-pass"
                            type="password"
                            placeholder="••••••••"
                            className="pl-9"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in slide-in-from-top-1">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 animate-in slide-in-from-top-1 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                        <span className="font-medium">{successMsg}</span>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 text-base w-full mt-2"
                >
                    {loading ? "Aguarde..." : mode === "login" ? "Entrar no Portal" : "Concluir Matrícula"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                    {mode === "login" ? "Ainda não tem matrícula?" : "Já possui matrícula?"}
                </span>{" "}
                <button
                    type="button"
                    onClick={() => {
                        setMode(mode === "login" ? "register" : "login")
                        setError(null)
                        setSuccessMsg(null)
                    }}
                    className="font-semibold text-primary hover:underline"
                >
                    {mode === "login" ? "Realizar Matrícula" : "Fazer Login"}
                </button>
            </div>
        </div>
    )
}
