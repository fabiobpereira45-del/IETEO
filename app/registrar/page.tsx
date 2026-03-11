"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { GraduationCap, Users, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react"
import { getPublicClasses, type ClassRoom } from "@/lib/store"

const SHIFT_LABEL: Record<string, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    evening: "Noite",
    ead: "EAD/Online",
}

const DAY_LABEL: Record<string, string> = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
}

function EnrollmentContent() {
    const searchParams = useSearchParams()
    const classIdParam = searchParams.get("classId")

    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [loadingClasses, setLoadingClasses] = useState(true)
    const [form, setForm] = useState({
        name: "",
        cpf: "",
        phone: "",
        address: "",
        church: "",
        pastor: "",
        classId: classIdParam || "",
        amount: 100 // Default enrollment fee
    })
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState<{ enrollmentNumber: string; studentId: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const cls = await getPublicClasses()
                setClasses(cls)
                if (classIdParam && cls.find(c => c.id === classIdParam)) {
                    setForm(prev => ({ ...prev, classId: classIdParam }))
                }
            } catch (err) {
                console.error("Erro ao carregar turmas:", err)
            } finally {
                setLoadingClasses(false)
            }
        }
        load()
    }, [classIdParam])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.classId) {
            setError("Por favor, selecione uma turma.")
            return
        }
        setSubmitting(true)
        setError(null)

        try {
            const res = await fetch("/api/enrollment/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || "Erro ao realizar matrícula")

            setSuccess({ enrollmentNumber: data.enrollmentNumber, studentId: data.studentId })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="max-w-md mx-auto bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Matrícula Realizada!</h2>
                <p className="text-muted-foreground">Seja bem-vindo(a) à IETEO. Seus dados foram processados com sucesso.</p>
                <div className="bg-muted p-4 rounded-2xl border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Número de Matrícula</p>
                    <p className="text-2xl font-mono font-bold text-primary">{success.enrollmentNumber}</p>
                </div>
                <p className="text-sm text-muted-foreground italic">Em breve você receberá um contato via WhatsApp com o link para pagamento da taxa e acesso ao portal.</p>
                <button
                    onClick={() => window.location.href = "/"}
                    className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl hover:bg-accent/90 transition-all shadow-lg hover:shadow-accent/20"
                >
                    Voltar para o Início
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Infos Section */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-accent/5 border border-accent/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">Matrícula Online</h1>
                    </div>
                    <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold">Instituto Educacional de Teologia Evangélica do Oeste - IETEO</p>
                    <div className="space-y-4 pt-4">
                        <div className="flex gap-3">
                            <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                            <p className="text-sm text-balance">Processo 100% seguro e homologado pela coordenação acadêmica.</p>
                        </div>
                        <div className="flex gap-3">
                            <Clock className="h-5 w-5 text-accent shrink-0" />
                            <p className="text-sm">Acesso imediato ao banco de questões e materiais após confirmação.</p>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block space-y-4">
                    <h3 className="font-bold text-sm text-muted-foreground uppercase px-4">Passos para ingressar</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 p-4 rounded-2xl border border-transparent bg-background/50">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">1</div>
                            <span className="text-sm font-medium">Preencha seus dados básicos</span>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl border border-transparent bg-background/50 opacity-60">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">2</div>
                            <span className="text-sm font-medium">Selecione sua turma</span>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl border border-transparent bg-background/50 opacity-40">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">3</div>
                            <span className="text-sm font-medium">Efetue o pagamento da matrícula</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="lg:col-span-3">
                <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Nome Completo</label>
                            <input
                                required
                                className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="Seu nome completo"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">CPF</label>
                            <input
                                required
                                className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="000.000.000-00"
                                value={form.cpf}
                                onChange={e => setForm({ ...form, cpf: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">WhatsApp / Telefone</label>
                            <input
                                required
                                className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="(00) 00000-0000"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Endereço Residencial</label>
                            <input
                                required
                                className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="Rua, Número, Bairro, Cidade"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Igreja</label>
                            <input
                                required
                                className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="Nome da sua igreja"
                                value={form.church}
                                onChange={e => setForm({ ...form, church: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Pastor</label>
                            <input
                                required
                                className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="Nome do seu pastor"
                                value={form.pastor}
                                onChange={e => setForm({ ...form, pastor: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1 mb-2 block">Selecione sua Turma</label>
                            {loadingClasses ? (
                                <div className="flex py-4"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {classes.map(c => {
                                        const remaining = (c.maxStudents || 0) - (c.studentCount || 0)
                                        const isFull = remaining <= 0
                                        return (
                                            <label
                                                key={c.id}
                                                className={`
                                                    relative group cursor-pointer border-2 rounded-2xl p-4 transition-all
                                                    ${form.classId === c.id ? "border-accent bg-accent/5 ring-4 ring-accent/10" : "border-border hover:border-accent/40 bg-muted/10"}
                                                    ${isFull ? "opacity-50 grayscale pointer-events-none" : ""}
                                                `}
                                            >
                                                <input
                                                    type="radio"
                                                    name="classId"
                                                    value={c.id}
                                                    className="sr-only"
                                                    disabled={isFull}
                                                    checked={form.classId === c.id}
                                                    onChange={e => setForm({ ...form, classId: e.target.value })}
                                                />
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-sm tracking-tight">{c.name}</p>
                                                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold uppercase">
                                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {DAY_LABEL[c.dayOfWeek || ''] || 'EAD'}</span>
                                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {SHIFT_LABEL[c.shift] || c.shift}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-xs font-bold ${remaining <= 5 ? "text-red-500" : "text-primary"}`}>
                                                            {isFull ? "Vagas Esgotadas" : `${remaining} vagas`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3 animate-shake">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !form.classId}
                        className="w-full bg-primary text-primary-foreground font-bold py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl hover:shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 text-lg"
                    >
                        {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Finalizar Inscrição <ArrowRight className="h-5 w-5" /></>}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function EnrollmentPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center py-12 px-6">
            {/* Background elements */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="h-[500px] w-[500px] bg-accent/20 blur-[120px] rounded-full opacity-30 -translate-x-[30%] -translate-y-[20%] animate-pulse" />
                <div className="h-[400px] w-[400px] bg-primary/20 blur-[120px] rounded-full opacity-30 translate-x-[30%] translate-y-[20%]" />
            </div>

            <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>}>
                <EnrollmentContent />
            </Suspense>

            <footer className="mt-12 text-center space-y-2 opacity-50">
                <p className="text-xs uppercase tracking-tighter font-bold font-mono">IETEO - Sistema Acadêmico v2.0</p>
                <p className="text-[10px]">© 2026 Todos os direitos reservados</p>
            </footer>
        </div>
    )
}
