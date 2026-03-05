"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, ChevronLeft, User, Phone, MapPin, Church, BookOpen, CreditCard, QrCode, Loader2, CheckCircle2, AlertCircle, Copy } from "lucide-react"
import { getClasses, getFinancialSettings, getPaypalConfig, getAsaasConfig, type ClassRoom, type FinancialSettings } from "@/lib/store"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

interface EnrollmentFormProps {
    onClose: () => void
    onSuccess?: () => void
}

type Step = "personal" | "class" | "payment"
type PayMethod = "pix" | "paypal" | null

interface FormData {
    name: string
    cpf: string
    phone: string
    address: string
    church: string
    pastor: string
    classId: string
}

const EMPTY_FORM: FormData = { name: "", cpf: "", phone: "", address: "", church: "", pastor: "", classId: "" }

function formatCPF(v: string) {
    return v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14)
}
function formatPhone(v: string) {
    return v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15)
}

export function EnrollmentForm({ onClose, onSuccess }: EnrollmentFormProps) {
    const [step, setStep] = useState<Step>("personal")
    const [form, setForm] = useState<FormData>(EMPTY_FORM)
    const [classes, setClasses] = useState<ClassRoom[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [paypalConfig, setPaypalConfig] = useState<{ clientId: string; mode: string } | null>(null)
    const [asaasConfigured, setAsaasConfigured] = useState(false)
    const [payMethod, setPayMethod] = useState<PayMethod>(null)
    const [loading, setLoading] = useState(true)
    // Pix state
    const [pixLoading, setPixLoading] = useState(false)
    const [pixQrcode, setPixQrcode] = useState("")
    const [pixCopyPaste, setPixCopyPaste] = useState("")
    const [pixError, setPixError] = useState("")
    const [pixCopied, setPixCopied] = useState(false)
    const [pixVerifying, setPixVerifying] = useState(false)
    const [pixVerifyMsg, setPixVerifyMsg] = useState<"" | "paid" | "pending" | "error">("")
    const [enrolledChargeId, setEnrolledChargeId] = useState<string | null>(null)
    // Success
    const [success, setSuccess] = useState(false)
    const [enrollError, setEnrollError] = useState("")

    useEffect(() => {
        async function load() {
            const [cls, fin, pp, asaas] = await Promise.all([
                getClasses(), getFinancialSettings(), getPaypalConfig(), getAsaasConfig()
            ])
            setClasses(cls)
            setSettings(fin)
            if (pp?.clientId) setPaypalConfig({ clientId: pp.clientId, mode: pp.mode })
            if (asaas?.apiKey) setAsaasConfigured(true)
            setLoading(false)
        }
        load()
    }, [])

    const isPersonalValid = form.name.trim() && form.cpf.length >= 14 && form.phone.length >= 14 && form.address.trim() && form.church.trim() && form.pastor.trim()
    const isClassValid = !!form.classId

    async function handleCreateEnrollment() {
        try {
            const res = await fetch("/api/enrollment/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, amount: settings?.enrollmentFee || 0 })
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || "Erro ao criar matrícula")
            return body.chargeId as string
        } catch (e: any) {
            throw e
        }
    }

    async function handlePixPay() {
        setPixLoading(true)
        setPixError("")
        try {
            const chargeId = await handleCreateEnrollment()
            setEnrolledChargeId(chargeId)
            const res = await fetch("/api/asaas/create-pix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeId })
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || "Erro ao gerar Pix")
            setPixQrcode(body.qrcode)
            setPixCopyPaste(body.copyPaste)
        } catch (e: any) {
            setPixError(e.message)
        } finally {
            setPixLoading(false)
        }
    }

    async function handleCheckPixStatus() {
        if (!enrolledChargeId) return
        setPixVerifying(true)
        setPixVerifyMsg("")
        try {
            const res = await fetch("/api/asaas/check-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeId: enrolledChargeId })
            })
            const body = await res.json()
            if (body.status === "paid") {
                setPixVerifyMsg("paid")
                setTimeout(() => { setSuccess(true) }, 1500)
            } else {
                setPixVerifyMsg("pending")
            }
        } catch { setPixVerifyMsg("error") } finally { setPixVerifying(false) }
    }

    async function handlePayPalApprove(orderId: string) {
        try {
            const chargeId = enrolledChargeId || await handleCreateEnrollment()
            const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, chargeId })
            })
            if (res.ok) setSuccess(true)
        } catch (e: any) { setEnrollError(e.message) }
    }

    async function createPayPalOrder() {
        const chargeId = await handleCreateEnrollment()
        setEnrolledChargeId(chargeId)
        const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chargeId })
        })
        const body = await res.json()
        return body.orderId
    }

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Matrícula Confirmada!</h2>
                    <p className="text-muted-foreground mb-6">Sua matrícula foi realizada com sucesso. Você já pode acessar seu portal do aluno.</p>
                    <button onClick={() => { onSuccess?.(); onClose() }} className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:bg-accent/90 transition-colors">
                        Acessar Minha Área
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary text-primary-foreground rounded-t-2xl shrink-0">
                    <div>
                        <h2 className="font-bold text-lg">Faça sua Matrícula</h2>
                        <p className="text-xs text-primary-foreground/70">IETEO — Instituto de Ensino Teológico</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="flex px-6 py-3 gap-2 border-b border-border shrink-0">
                    {(["personal", "class", "payment"] as Step[]).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-accent text-accent-foreground" : i < ["personal", "class", "payment"].indexOf(step) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                            <span className={`text-xs hidden sm:block ${step === s ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{["Dados Pessoais", "Turma", "Pagamento"][i]}</span>
                            {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                        </div>
                    ))}
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-accent animate-spin" /></div>
                    ) : step === "personal" ? (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-accent" /> Dados Pessoais</h3>
                            {[
                                { label: "Nome Completo *", key: "name", icon: User, placeholder: "Seu nome completo", type: "text" },
                                { label: "CPF *", key: "cpf", icon: User, placeholder: "000.000.000-00", type: "text" },
                                { label: "Telefone/WhatsApp *", key: "phone", icon: Phone, placeholder: "(00) 00000-0000", type: "tel" },
                                { label: "Endereço Completo *", key: "address", icon: MapPin, placeholder: "Rua, número, bairro, cidade", type: "text" },
                                { label: "Nome da Igreja *", key: "church", icon: Church, placeholder: "Nome da sua congregação", type: "text" },
                                { label: "Nome do Pastor *", key: "pastor", icon: User, placeholder: "Nome do pastor responsável", type: "text" },
                            ].map(({ label, key, icon: Icon, placeholder, type }) => (
                                <div key={key}>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
                                    <div className="relative">
                                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type={type}
                                            className="w-full border border-input rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                                            placeholder={placeholder}
                                            value={form[key as keyof FormData]}
                                            onChange={e => {
                                                let val = e.target.value
                                                if (key === "cpf") val = formatCPF(val)
                                                if (key === "phone") val = formatPhone(val)
                                                setForm(f => ({ ...f, [key]: val }))
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : step === "class" ? (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /> Escolha sua Turma</h3>
                            {classes.length === 0 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                                    <AlertCircle className="h-4 w-4 inline mr-2" />Nenhuma turma disponível no momento.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {classes.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setForm(f => ({ ...f, classId: c.id }))}
                                            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${form.classId === c.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-sm">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{
                                                        { morning: "Manhã", afternoon: "Tarde", evening: "Noite", ead: "EAD/Online" }[c.shift]
                                                    }</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-accent">{c.maxStudents} vagas</p>
                                                    {form.classId === c.id && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto mt-1" />}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /> Pagamento da Matrícula</h3>
                            <div className="bg-muted/40 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Taxa de Matrícula</span>
                                <span className="text-xl font-bold text-foreground">
                                    R$ {(settings?.enrollmentFee || 0).toFixed(2)}
                                </span>
                            </div>

                            {enrollError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{enrollError}
                                </div>
                            )}

                            {!payMethod && (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">Escolha a forma de pagamento:</p>
                                    {asaasConfigured && (
                                        <button
                                            onClick={() => { setPayMethod("pix"); handlePixPay() }}
                                            className="w-full flex items-center gap-3 border-2 border-green-500 bg-green-50 rounded-xl p-4 hover:bg-green-100 transition-colors"
                                        >
                                            <QrCode className="h-6 w-6 text-green-600" />
                                            <div className="text-left">
                                                <p className="font-bold text-green-700">Pagar com Pix</p>
                                                <p className="text-xs text-green-600">QR Code · Aprovação imediata</p>
                                            </div>
                                        </button>
                                    )}
                                    {paypalConfig && (
                                        <button
                                            onClick={() => setPayMethod("paypal")}
                                            className="w-full flex items-center gap-3 border-2 border-yellow-400 bg-yellow-50 rounded-xl p-4 hover:bg-yellow-100 transition-colors"
                                        >
                                            <CreditCard className="h-6 w-6 text-yellow-600" />
                                            <div className="text-left">
                                                <p className="font-bold text-yellow-700">Pagar com PayPal</p>
                                                <p className="text-xs text-yellow-600">Cartão ou conta PayPal</p>
                                            </div>
                                        </button>
                                    )}
                                    {!asaasConfigured && !paypalConfig && (
                                        <p className="text-sm text-muted-foreground italic">Nenhuma forma de pagamento configurada.</p>
                                    )}
                                </div>
                            )}

                            {/* Pix QR Code */}
                            {payMethod === "pix" && (
                                <div className="space-y-4">
                                    {pixLoading ? (
                                        <div className="flex flex-col items-center gap-3 py-8">
                                            <Loader2 className="h-8 w-8 text-accent animate-spin" />
                                            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                                        </div>
                                    ) : pixError ? (
                                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{pixError}</div>
                                    ) : pixQrcode ? (
                                        <div className="space-y-3">
                                            <div className="flex justify-center">
                                                <img src={`data:image/png;base64,${pixQrcode}`} alt="QR Code Pix" className="h-48 w-48 rounded-xl border border-border" />
                                            </div>
                                            <p className="text-xs text-center text-muted-foreground">Escaneie com o app do seu banco</p>
                                            <div className="bg-muted/50 rounded-xl p-3">
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Código Pix:</p>
                                                <div className="flex gap-2 items-center">
                                                    <p className="text-xs font-mono truncate flex-1">{pixCopyPaste.slice(0, 40)}...</p>
                                                    <button onClick={async () => { await navigator.clipboard.writeText(pixCopyPaste); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000) }}
                                                        className="shrink-0 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                                        <Copy className="h-3 w-3" />{pixCopied ? "Copiado!" : "Copiar"}
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleCheckPixStatus}
                                                disabled={pixVerifying}
                                                className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-xl transition-colors disabled:opacity-60 text-white ${pixVerifyMsg === "pending" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                                            >
                                                {pixVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                {pixVerifying ? "Verificando..." : "Já Paguei — Verificar"}
                                            </button>
                                            {pixVerifyMsg === "pending" && <p className="text-xs text-center text-muted-foreground">Pagamento ainda não identificado.</p>}
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* PayPal */}
                            {payMethod === "paypal" && paypalConfig && (
                                <div className="space-y-3">
                                    <PayPalScriptProvider options={{ clientId: paypalConfig.clientId, currency: "BRL" }}>
                                        <PayPalButtons
                                            style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                                            createOrder={createPayPalOrder}
                                            onApprove={async (data) => { await handlePayPalApprove(data.orderID) }}
                                            onError={() => setEnrollError("Erro no PayPal. Tente novamente.")}
                                        />
                                    </PayPalScriptProvider>
                                    <button onClick={() => setPayMethod(null)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">← Voltar às opções</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Nav */}
                {step !== "payment" && !loading && (
                    <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
                        {step !== "personal" && (
                            <button onClick={() => setStep(step === "class" ? "personal" : "class")} className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-medium hover:bg-muted transition-colors">
                                <ChevronLeft className="h-4 w-4" /> Voltar
                            </button>
                        )}
                        <button
                            onClick={() => setStep(step === "personal" ? "class" : "payment")}
                            disabled={(step === "personal" && !isPersonalValid) || (step === "class" && !isClassValid)}
                            className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground font-bold rounded-xl py-3 text-sm disabled:opacity-50 hover:bg-accent/90 transition-colors"
                        >
                            {step === "class" ? "Ir para Pagamento" : "Próximo"} <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
