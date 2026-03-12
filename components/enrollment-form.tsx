"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, ChevronLeft, User, Phone, MapPin, Church, BookOpen, CreditCard, QrCode, Loader2, CheckCircle2, AlertCircle, Copy, MessageCircle, Clock } from "lucide-react"
import { getClasses, getFinancialSettings, getClassSchedules, type ClassRoom, type FinancialSettings, type ClassSchedule } from "@/lib/store"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface EnrollmentFormProps {
    onClose: () => void
    onSuccess?: () => void
}

type Step = "personal" | "class" | "payment"
type PayMethod = "pix" | "card" | null

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
    const [schedules, setSchedules] = useState<ClassSchedule[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)

    const [payMethod, setPayMethod] = useState<PayMethod>(null)
    const [loading, setLoading] = useState(true)

    // Pix state
    const [pixCopied, setPixCopied] = useState(false)
    const [enrollmentDetails, setEnrollmentDetails] = useState<{ enrollmentNumber: string, name: string } | null>(null)
    const [enrolledChargeId, setEnrolledChargeId] = useState<string | null>(null)

    // Success
    const [success, setSuccess] = useState(false)
    const [enrollError, setEnrollError] = useState("")
    const [creating, setCreating] = useState(false)
    const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
    const [isPaidLater, setIsPaidLater] = useState(false)

    useEffect(() => {
        async function load() {
            const [cls, fin, scheds] = await Promise.all([
                getClasses(), getFinancialSettings(), getClassSchedules()
            ])
            setClasses(cls)
            setSchedules(scheds)
            setSettings(fin)
            setLoading(false)
        }
        load()
    }, [])

    const isPersonalValid = form.name.trim() && form.cpf.length >= 14 && form.phone.length >= 14 && form.address.trim() && form.church.trim() && form.pastor.trim()
    const isClassValid = !!form.classId

    async function handleCreateEnrollment() {
        if (creating) return
        setCreating(true)
        try {
            const res = await fetch("/api/enrollment/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, amount: settings?.enrollmentFee || 0 })
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || "Erro ao criar matrícula")
            setEnrollmentDetails({ enrollmentNumber: body.enrollmentNumber, name: form.name })
            setEnrolledChargeId(body.chargeId)
            return body
        } catch (e: any) {
            setEnrollError(e.message)
            throw e
        } finally {
            setCreating(false)
        }
    }

    const institutionPixKey = "SEU_PIX_AQUI" // This should ideally come from a global setting

    function handleWhatsAppConfirm() {
        const message = `Olá! Acabei de realizar minha matrícula no IETEO.\n\n*Dados:* \nNome: ${form.name}\nCPF: ${form.cpf}\nMatrícula: ${enrollmentDetails?.enrollmentNumber}\n\n*Estou enviando o comprovante de pagamento em anexo.*`
        const encoded = encodeURIComponent(message)
        window.open(`https://wa.me/5571987483103?text=${encoded}`, "_blank") // Updated to final contact
    }

    async function handleCardPay() {
        if (!enrolledChargeId) {
            await handleCreateEnrollment()
        }
        if (settings?.creditCardUrl) {
            window.open(settings.creditCardUrl, "_blank")
        } else {
            alert("Link de pagamento não configurado. Entre em contato com a secretaria.")
        }
    }

    async function handlePayLater() {
        if (creating) return
        try {
            await handleCreateEnrollment()
            setIsPaidLater(true)
            setSuccess(true)
        } catch (e) {
            // Error already handled in handleCreateEnrollment
        }
    }

    function handleAttemptClose() {
        if (success) {
            onClose()
        } else {
            setExitConfirmOpen(true)
        }
    }

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-8 text-center flex flex-col items-center">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-sm">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
                        {isPaidLater ? "Pré-Matrícula Realizada!" : "Matrícula Confirmada!"}
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        {isPaidLater 
                            ? "Sua pré-matrícula foi registrada. Lembre-se: ela só será efetivada após a comprovação do pagamento em até 5 dias." 
                            : "Sua matrícula foi concluída com sucesso. Assim que o pagamento for confirmado, você receberá seus dados de acesso."}
                    </p>

                    <div className="w-full bg-muted/40 border border-border rounded-2xl p-6 text-left mb-8 shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Número de Pré-Matrícula</p>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between bg-background border border-border rounded-lg p-3">
                                    <span className="font-mono text-xl font-bold tracking-widest text-primary">{enrollmentDetails?.enrollmentNumber}</span>
                                    <button
                                        onClick={() => {
                                            if (enrollmentDetails?.enrollmentNumber) {
                                                navigator.clipboard.writeText(enrollmentDetails.enrollmentNumber);
                                            }
                                        }}
                                        className="text-xs flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent font-semibold px-2 py-1.5 rounded-md transition-colors"
                                    >
                                        <Copy className="h-3.5 w-3.5" /> Copiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => { onSuccess?.(); onClose() }} className="w-full bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:bg-accent/90 transition-colors shadow-md">
                        Fechar
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
                    <button onClick={handleAttemptClose} className="rounded-full p-1.5 hover:bg-white/10 transition-colors">
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
                                                    <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                                                        <p>
                                                            {{ morning: "Manhã", afternoon: "Tarde", evening: "Noite", ead: "EAD/Online" }[c.shift]}
                                                        </p>
                                                        {schedules.filter(s => s.classId === c.id).length > 0 ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                {schedules.filter(s => s.classId === c.id).map(s => (
                                                                    <p key={s.id} className="text-[10px] font-medium text-primary/80 uppercase tracking-tight">
                                                                        {{
                                                                            segunda: "Segunda", terca: "Terça", quarta: "Quarta",
                                                                            quinta: "Quinta", sexta: "Sexta", sabado: "Sábado"
                                                                        }[s.dayOfWeek] || s.dayOfWeek} • {s.timeStart.substring(0, 5)} - {s.timeEnd.substring(0, 5)}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            c.dayOfWeek && (
                                                                <p className="text-[10px] uppercase">
                                                                    {{
                                                                        monday: "Segunda", tuesday: "Terça", wednesday: "Quarta",
                                                                        thursday: "Quinta", friday: "Sexta", saturday: "Sábado"
                                                                    }[c.dayOfWeek] || c.dayOfWeek}
                                                                </p>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${c.maxStudents - (c.studentCount || 0) <= 5 ? "text-destructive" : "text-accent"}`}>
                                                        {Math.max(0, c.maxStudents - (c.studentCount || 0))} vagas restantes
                                                    </p>
                                                    {form.classId === c.id && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto mt-1" />}
                                                    {c.maxStudents - (c.studentCount || 0) <= 0 && <span className="text-[10px] font-bold text-destructive uppercase">Esgotado</span>}
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
                                <div className="space-y-3">
                                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />{enrollError}
                                    </div>
                                    <button
                                        onClick={() => { setEnrollError(""); setPayMethod(null); }}
                                        className="w-full flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-medium py-2.5 rounded-xl transition-colors text-sm"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Voltar e tentar novamente
                                    </button>
                                </div>
                            )}

                            {!payMethod && (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground mr-1">Escolha a forma de pagamento:</p>

                                    {/* Manual PIX */}
                                    <button
                                        onClick={() => setPayMethod("pix")}
                                        className="w-full flex items-center gap-3 border-2 border-green-600 bg-green-50 rounded-xl p-4 hover:bg-green-100 transition-all group"
                                    >
                                        <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                            <QrCode className="h-6 w-6" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-green-700">Pagar com Pix</p>
                                            <p className="text-xs text-green-600 font-medium">Chave para transferência manual</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-green-400" />
                                    </button>

                                    {/* Manual Credit Card Link */}
                                    {settings?.creditCardUrl && (
                                        <button
                                            onClick={() => setPayMethod("card")}
                                            className="w-full flex items-center gap-3 border-2 border-blue-600 bg-blue-50 rounded-xl p-4 hover:bg-blue-100 transition-all group"
                                        >
                                            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                                <CreditCard className="h-6 w-6" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-bold text-blue-700">Pagar com Cartão (Link Externo)</p>
                                                <p className="text-xs text-blue-600 font-medium">Pagamento via Mercado Pago / PicPay</p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-blue-400" />
                                        </button>
                                    )}

                                    {/* Pay Later Option */}
                                    <button
                                        onClick={handlePayLater}
                                        disabled={creating}
                                        className="w-full flex items-center gap-3 border-2 border-amber-500 bg-amber-50 rounded-xl p-4 hover:bg-amber-100 transition-all group"
                                    >
                                        <div className="h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                            <Clock className="h-6 w-6" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-amber-700">Concluir matrícula e pagar depois</p>
                                            <p className="text-xs text-amber-600 font-medium">A matrícula só será efetivada após o pagamento (prazo: 5 dias)</p>
                                        </div>
                                        {creating ? <Loader2 className="h-5 w-5 animate-spin text-amber-400" /> : <ChevronRight className="h-5 w-5 text-amber-400" />}
                                    </button>
                                </div>
                            )}


                            {/* Pix Flow */}
                            {payMethod === "pix" && (
                                <div className="space-y-4">
                                    <div className="border border-green-200 bg-white rounded-xl p-4 space-y-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <QrCode className="h-6 w-6 text-green-600 shrink-0" />
                                            <div>
                                                <p className="font-bold text-green-700">Pagamento via Pix</p>
                                                <p className="text-xs text-muted-foreground italic">Copie a chave abaixo e realize o pagamento</p>
                                            </div>
                                        </div>
                                        <div className="bg-muted/30 rounded-xl p-3 border border-border">
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">Chave Pix da Instituição:</p>
                                            <div className="flex gap-2 items-center">
                                                <p className="text-sm font-mono flex-1 break-all">{settings?.pixKey || "Chave PIX não configurada"}</p>
                                                <button
                                                    onClick={async () => {
                                                        const key = settings?.pixKey || ""
                                                        if (!key) {
                                                            alert("Chave PIX não configurada!")
                                                            return
                                                        }
                                                        await navigator.clipboard.writeText(key)
                                                        setPixCopied(true)
                                                        setTimeout(() => setPixCopied(false), 2000)
                                                    }}
                                                    className="shrink-0 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                                                >
                                                    <Copy className="h-3 w-3" />{pixCopied ? "Copiado!" : "Copiar"}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            {!enrollmentDetails ? (
                                                <button
                                                    onClick={handleCreateEnrollment}
                                                    disabled={creating}
                                                    className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                                                >
                                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                                    Gerar QR Code e Matrícula
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 text-center font-medium">
                                                        Sua matrícula foi gerada! Conclua o processo abaixo após realizar o pagamento.
                                                    </div>
                                                    <button
                                                        onClick={() => setSuccess(true)}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Concluir Matrícula
                                                    </button>
                                                    <button
                                                        onClick={handleWhatsAppConfirm}
                                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                        Confirmar Pagamento no WhatsApp
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setPayMethod(null)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">← Voltar às opções</button>
                                </div>
                            )}

                            {/* Card Flow */}
                            {payMethod === "card" && (
                                <div className="space-y-4">
                                    <div className="border border-blue-200 bg-white rounded-xl p-4 space-y-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="h-6 w-6 text-blue-600 shrink-0" />
                                            <div>
                                                <p className="font-bold text-blue-700">Pagamento via Cartão</p>
                                                <p className="text-xs text-muted-foreground italic">Clique no botão para abrir o link de pagamento</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-2">
                                            {!enrollmentDetails ? (
                                                <button
                                                    onClick={handleCardPay}
                                                    disabled={creating}
                                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                                                >
                                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                                    Abrir Link e Gerar Matrícula
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 text-center font-medium">
                                                        Link aberto! Conclua o processo abaixo após realizar o pagamento.
                                                    </div>
                                                    <button
                                                        onClick={() => setSuccess(true)}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Concluir Matrícula
                                                    </button>
                                                    <button
                                                        onClick={handleWhatsAppConfirm}
                                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                        Confirmar Pagamento no WhatsApp
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setPayMethod(null)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">← Voltar às opções</button>
                                </div>
                            )}


                        </div>
                    )}
                </div>

                {/* Footer Nav */}
                {!loading && (
                    <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
                        {step !== "personal" && (
                            <button onClick={() => setStep(step === "class" ? "personal" : "class")} className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-medium hover:bg-muted transition-colors">
                                <ChevronLeft className="h-4 w-4" /> Voltar
                            </button>
                        )}
                        {step !== "payment" && (
                            <button
                                onClick={() => setStep(step === "personal" ? "class" : "payment")}
                                disabled={(step === "personal" && !isPersonalValid) || (step === "class" && !isClassValid)}
                                className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground font-bold rounded-xl py-3 text-sm disabled:opacity-50 hover:bg-accent/90 transition-colors"
                            >
                                {step === "class" ? "Ir para Pagamento" : "Próximo"} <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Matrícula não concluída</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sua matrícula ainda não foi finalizada. Se você sair agora, seus dados não serão salvos. Tem certeza que deseja sair?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Continuar Matrícula</AlertDialogCancel>
                        <AlertDialogAction onClick={onClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sair e Cancelar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
