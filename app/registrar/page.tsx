"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { GraduationCap, Users, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, MessageCircle, QrCode, CreditCard } from "lucide-react"
import { getPublicClasses, getFinancialSettings, type ClassRoom, type FinancialSettings } from "@/lib/store"

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

    const [step, setStep] = useState<"personal" | "class" | "payment">("personal")
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [loadingClasses, setLoadingClasses] = useState(true)
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    
    const [form, setForm] = useState({
        name: "",
        cpf: "",
        phone: "",
        address: "",
        church: "",
        pastor: "",
        classId: classIdParam || "",
        amount: 120 // Initial default, will be updated by settings
    })

    const [payMethod, setPayMethod] = useState<"pix" | "card" | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState<{ enrollmentNumber: string; studentId: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    
    // Pix/Payment states
    const [pixCopied, setPixCopied] = useState(false)
    const [enrolledChargeId, setEnrolledChargeId] = useState<string | null>(null)
    const [isPaidLater, setIsPaidLater] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const [cls, fin] = await Promise.all([getPublicClasses(), getFinancialSettings()])
                setClasses(cls)
                setSettings(fin)
                if (fin) setForm(prev => ({ ...prev, amount: fin.enrollmentFee }))
                
                if (classIdParam && cls.find(c => c.id === classIdParam)) {
                    setForm(prev => ({ ...prev, classId: classIdParam }))
                }
            } catch (err) {
                console.error("Erro ao carregar dados:", err)
            } finally {
                setLoadingClasses(false)
            }
        }
        load()
    }, [classIdParam])

    // Leave warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!success && (form.name || form.cpf)) {
                e.preventDefault()
                e.returnValue = "Sua matrícula ainda não foi finalizada. Se você sair agora, seus dados não serão salvos. Tem certeza que deseja sair?"
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [success, form.name, form.cpf])

    const isPersonalValid = form.name.trim() && form.cpf.replace(/\D/g, '').length === 11 && form.phone.trim() && form.address.trim() && form.church.trim() && form.pastor.trim()

    async function handleCreateEnrollment() {
        if (submitting) return
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

            setEnrolledChargeId(data.chargeId)
            setSuccess({ enrollmentNumber: data.enrollmentNumber, studentId: data.studentId })
            return data
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setSubmitting(false)
        }
    }

    async function handlePayLater() {
        try {
            await handleCreateEnrollment()
            setIsPaidLater(true)
        } catch (e) {}
    }

    async function handleCardPay() {
        try {
            await handleCreateEnrollment()
            if (settings?.creditCardUrl) {
                window.open(settings.creditCardUrl, "_blank")
            }
        } catch (e) {}
    }

    function handleWhatsAppConfirm() {
        const message = `Olá! Acabei de realizar minha matrícula no IETEO.\n\n*Dados:* \nNome: ${form.name}\nCPF: ${form.cpf}\nMatrícula: ${success?.enrollmentNumber}\n\n*Estou enviando o comprovante de pagamento em anexo.*`
        const encoded = encodeURIComponent(message)
        window.open(`https://wa.me/5571987483103?text=${encoded}`, "_blank")
    }

    if (success && (isPaidLater || payMethod === 'card' || payMethod === 'pix')) {
        return (
            <div className="max-w-md mx-auto bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">
                    {isPaidLater ? "Pré-Matrícula Realizada!" : "Matrícula Confirmada!"}
                </h2>
                <p className="text-muted-foreground">
                    {isPaidLater 
                        ? "Sua pré-matrícula foi registrada. Lembre-se: ela só será efetivada após a comprovação do pagamento em até 5 dias." 
                        : "Sua matrícula foi concluída com sucesso. Assim que o pagamento for confirmado, você receberá seus dados de acesso."}
                </p>
                <div className="bg-muted p-4 rounded-2xl border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Número de Matrícula</p>
                    <p className="text-2xl font-mono font-bold text-primary">{success.enrollmentNumber}</p>
                </div>
                <div className="space-y-3">
                    <button
                        onClick={handleWhatsAppConfirm}
                        className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <MessageCircle className="h-5 w-5" /> Confirmar no WhatsApp
                    </button>
                    <button
                        onClick={() => window.location.href = "/"}
                        className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl hover:bg-accent/90 transition-all shadow-lg"
                    >
                        Voltar para o Início
                    </button>
                </div>
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
                    <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold">Instituto de Ensino Teológico - IETEO</p>
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
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${step === 'personal' ? 'bg-accent/10 border-accent/20 ring-2 ring-accent/5' : 'bg-background/50 border-transparent opacity-60'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'personal' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
                            <span className="text-sm font-medium">Preencha seus dados básicos</span>
                        </div>
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${step === 'class' ? 'bg-accent/10 border-accent/20 ring-2 ring-accent/5' : 'bg-background/50 border-transparent opacity-60'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'class' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
                            <span className="text-sm font-medium">Selecione sua turma</span>
                        </div>
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${step === 'payment' ? 'bg-accent/10 border-accent/20 ring-2 ring-accent/5' : 'bg-background/50 border-transparent opacity-60'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'payment' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
                            <span className="text-sm font-medium">Efetue o pagamento da matrícula</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="lg:col-span-3">
                <div className="bg-card border border-border rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
                    
                    {step === 'personal' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
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
                            </div>
                            <button
                                onClick={() => setStep('class')}
                                disabled={!isPersonalValid}
                                className="w-full bg-primary text-primary-foreground font-bold py-5 rounded-2xl transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                            >
                                Avançar <ArrowRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    {step === 'class' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div className="pt-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1 mb-4 block">Selecione sua Turma</label>
                                {loadingClasses ? (
                                    <div className="flex py-12 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
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
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('personal')}
                                    className="flex-1 bg-muted text-foreground font-bold py-4 rounded-2xl hover:bg-muted/80 transition-all"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={() => setStep('payment')}
                                    disabled={!form.classId}
                                    className="flex-[2] bg-primary text-primary-foreground font-bold py-4 rounded-2xl transition-all shadow-xl disabled:opacity-50"
                                >
                                    Avançar para Pagamento
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-xl font-bold">Matrícula + 1ª Mensalidade</h3>
                                </div>
                                <div className="bg-muted/40 border border-border rounded-2xl p-6 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total a Pagar Agora</p>
                                        <p className="text-sm text-muted-foreground">Inclui Matrícula e 1ª Mensalidade</p>
                                    </div>
                                    <span className="text-3xl font-black text-foreground">
                                        R$ {(settings?.enrollmentFee || 120).toFixed(2)}
                                    </span>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3 animate-shake">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <p className="text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                {!payMethod ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Pix */}
                                        <button
                                            onClick={() => setPayMethod("pix")}
                                            className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-green-600 bg-green-50/50 hover:bg-green-50 transition-all text-left"
                                        >
                                            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                                                <QrCode className="h-7 w-7" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-green-800">Pagar com Pix</p>
                                                <p className="text-xs text-green-700/70 font-medium tracking-tight">Liberação automática imediata</p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        {/* Cartão */}
                                        {settings?.creditCardUrl && (
                                            <button
                                                onClick={() => setPayMethod("card")}
                                                className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-blue-600 bg-blue-50/50 hover:bg-blue-50 transition-all text-left"
                                            >
                                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                                                    <CreditCard className="h-7 w-7" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-blue-800">Cartão de Crédito</p>
                                                    <p className="text-xs text-blue-700/70 font-medium tracking-tight">Parcele em até 12x via link seguro</p>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        )}

                                        {/* Pagar Depois */}
                                        <button
                                            onClick={handlePayLater}
                                            disabled={submitting}
                                            className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-amber-500 bg-amber-50/50 hover:bg-amber-50 transition-all text-left disabled:opacity-50"
                                        >
                                            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                                                {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Clock className="h-7 w-7" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-amber-800">Efetuar matrícula e pagar depois</p>
                                                <p className="text-xs text-amber-700/70 font-medium tracking-tight">Sua vaga fica reservada por 5 dias</p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                ) : payMethod === 'pix' ? (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="bg-white border-2 border-green-200 rounded-3xl p-6 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                    <QrCode className="h-6 w-6 text-green-600" />
                                                </div>
                                                <h4 className="font-bold text-green-800">Chave Pix para Transferência</h4>
                                            </div>
                                            <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Chave Pix:</label>
                                                <div className="flex items-center gap-3">
                                                    <code className="text-sm font-mono font-bold flex-1 break-all">{settings?.pixKey || "Não configurada"}</code>
                                                    <button
                                                        onClick={async () => {
                                                            if (settings?.pixKey) {
                                                                await navigator.clipboard.writeText(settings.pixKey)
                                                                setPixCopied(true)
                                                                setTimeout(() => setPixCopied(false), 2000)
                                                            }
                                                        }}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shrink-0"
                                                    >
                                                        {pixCopied ? "Copiado!" : "Copiar"}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                                <p className="text-xs text-blue-700 leading-relaxed font-medium">Após realizar o pagamento, clique no botão abaixo para gerar sua matrícula e confirmar o processo.</p>
                                            </div>
                                            {!success ? (
                                                <button
                                                    onClick={handleCreateEnrollment}
                                                    disabled={submitting}
                                                    className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:bg-primary/95 transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Concluir e Gerar Matrícula</>}
                                                </button>
                                            ) : (
                                                <div className="bg-green-600 text-white p-4 rounded-2xl flex items-center gap-3 justify-center">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    <span className="font-bold">Matrícula Gerada com Sucesso!</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setPayMethod(null)} className="w-full text-sm text-muted-foreground font-bold hover:text-foreground py-2 transition-colors">← Escolher outra forma</button>
                                    </div>
                                ) : payMethod === 'card' ? (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <CreditCard className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <h4 className="font-bold text-blue-800">Pagamento no Cartão</h4>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">Nós utilizamos gateways seguros. Clique no botão abaixo para abrir o link de pagamento e gerar sua matrícula.</p>
                                            
                                            {!success ? (
                                                <button
                                                    onClick={handleCardPay}
                                                    disabled={submitting}
                                                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CreditCard className="h-5 w-5" /> Abrir Link e Gerar Matrícula</>}
                                                </button>
                                            ) : (
                                                <div className="bg-green-600 text-white p-4 rounded-2xl flex items-center gap-3 justify-center">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    <span className="font-bold">Matrícula Gerada com Sucesso!</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setPayMethod(null)} className="w-full text-sm text-muted-foreground font-bold hover:text-foreground py-2 transition-colors">← Escolher outra forma</button>
                                    </div>
                                ) : null}
                             </div>
                             
                             {!payMethod && (
                                <button
                                    onClick={() => setStep('class')}
                                    className="w-full text-sm text-muted-foreground font-bold hover:text-foreground py-2"
                                >
                                    ← Voltar para seleção de turma
                                </button>
                             )}
                        </div>
                    )}
                </div>
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
