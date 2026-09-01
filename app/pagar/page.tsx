"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Search, CheckCircle2, Loader2, QrCode, Copy, Check, ChevronRight, ArrowLeft, Smartphone, BookOpen } from "lucide-react"
import Image from "next/image"

// ── Types ──────────────────────────────────────────────────────────────────────
interface Charge {
    id: string
    type: string
    description: string
    amount: number
    dueDate: string
    status: string
    pixQrcode: string | null
    pixCopyPaste: string | null
    asaasPaymentId: string | null
}
interface Student {
    id: string
    name: string
    enrollmentNumber: string
    status: string
}

type Step = "search" | "charges" | "pix" | "confirmed"

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCPF(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11)
    return d
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
}
function formatCurrency(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}
function formatDate(s: string) {
    if (!s) return ""
    const d = new Date(s + "T12:00:00")
    return d.toLocaleDateString("pt-BR")
}
function isLate(dueDate: string) {
    return new Date(dueDate + "T23:59:59") < new Date()
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PagarPage() {
    const [step, setStep] = useState<Step>("search")
    const [identifier, setIdentifier] = useState("")
    const [isCpf, setIsCpf] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [student, setStudent] = useState<Student | null>(null)
    const [charges, setCharges] = useState<Charge[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [pixData, setPixData] = useState<{ pixQrcode: string; pixCopyPaste: string; asaasPaymentId: string } | null>(null)
    const [copied, setCopied] = useState(false)
    const [polling, setPolling] = useState(false)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // ── Step 1: Search student ─────────────────────────────────────────────────
    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        if (!identifier.trim()) { setError("Informe seu CPF ou número de matrícula."); return }
        setLoading(true)
        try {
            const res = await fetch("/api/pix/buscar-aluno", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: identifier.replace(/\D/g, "") || identifier })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || "Aluno não encontrado."); return }
            if (!data.charges || data.charges.length === 0) {
                setError("Nenhuma fatura pendente encontrada para este aluno. ✅")
                return
            }
            setStudent(data.student)
            setCharges(data.charges)
            setSelectedIds([])
            setStep("charges")
        } catch {
            setError("Erro de conexão. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    // ── Step 2: Toggle charge selection ───────────────────────────────────────
    function toggleCharge(id: string) {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    // ── Step 3: Generate Pix ──────────────────────────────────────────────────
    async function handleGeneratePix() {
        if (selectedIds.length === 0) { setError("Selecione ao menos uma fatura."); return }
        setError("")
        setLoading(true)
        try {
            const res = await fetch("/api/asaas/create-pix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeIds: selectedIds })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || "Erro ao gerar Pix."); return }
            setPixData({ pixQrcode: data.pixQrcode, pixCopyPaste: data.pixCopyPaste, asaasPaymentId: data.asaasPaymentId })
            setStep("pix")
            startPolling()
        } catch {
            setError("Erro ao gerar QR Code. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    // ── Polling: Check payment status ─────────────────────────────────────────
    function startPolling() {
        setPolling(true)
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/pix/status?ids=${selectedIds.join(",")}`)
                const data = await res.json()
                if (data.allPaid) {
                    stopPolling()
                    setStep("confirmed")
                }
            } catch { /* ignore */ }
        }, 4000)
    }
    function stopPolling() {
        setPolling(false)
        if (pollingRef.current) clearInterval(pollingRef.current)
    }
    useEffect(() => () => stopPolling(), [])

    // ── Copy to clipboard ─────────────────────────────────────────────────────
    async function handleCopy() {
        if (!pixData?.pixCopyPaste) return
        await navigator.clipboard.writeText(pixData.pixCopyPaste)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    // ── Total selected ────────────────────────────────────────────────────────
    const totalSelected = charges.filter(c => selectedIds.includes(c.id)).reduce((s, c) => s + c.amount, 0)

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-4 py-8">

            {/* Header */}
            <div className="flex flex-col items-center mb-8 gap-3">
                <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                    <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-black text-white tracking-tight">IETEO</h1>
                    <p className="text-blue-300 text-sm font-medium">Instituto de Ensino Teológico</p>
                </div>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

                {/* Progress Dots */}
                <div className="flex items-center justify-center gap-2 pt-5 pb-2">
                    {(["search", "charges", "pix", "confirmed"] as Step[]).map((s, i) => (
                        <div key={s} className={`h-2 rounded-full transition-all duration-300 ${step === s ? "w-8 bg-blue-400" : i < ["search","charges","pix","confirmed"].indexOf(step) ? "w-2 bg-blue-500/60" : "w-2 bg-white/20"}`} />
                    ))}
                </div>

                <div className="p-6">

                    {/* ── STEP: SEARCH ─────────────────────────────── */}
                    {step === "search" && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                                    <Smartphone className="h-3.5 w-3.5" /> Auto-Atendimento Pix
                                </div>
                                <h2 className="text-xl font-bold text-white">Pagar Fatura</h2>
                                <p className="text-slate-400 text-sm mt-1">Informe seu CPF ou número de matrícula para localizar suas faturas em aberto.</p>
                            </div>

                            {/* Toggle CPF / Matrícula */}
                            <div className="flex rounded-xl overflow-hidden border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => { setIsCpf(true); setIdentifier("") }}
                                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${isCpf ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                    CPF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsCpf(false); setIdentifier("") }}
                                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${!isCpf ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                    Nº Matrícula
                                </button>
                            </div>

                            <form onSubmit={handleSearch} className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={isCpf ? formatCPF(identifier) : identifier}
                                        onChange={e => setIdentifier(isCpf ? e.target.value.replace(/\D/g, "") : e.target.value)}
                                        placeholder={isCpf ? "000.000.000-00" : "Ex: 2024001"}
                                        maxLength={isCpf ? 14 : 20}
                                        className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 font-mono text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || identifier.length < 3}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5" /> Buscar Faturas</>}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── STEP: CHARGES ────────────────────────────── */}
                    {step === "charges" && student && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setStep("search"); setError("") }} className="text-slate-400 hover:text-white transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <div>
                                    <h2 className="text-white font-bold text-lg">{student.name}</h2>
                                    <p className="text-slate-400 text-xs">Matrícula: {student.enrollmentNumber || "—"}</p>
                                </div>
                            </div>

                            <p className="text-slate-300 text-sm">Selecione as faturas que deseja pagar:</p>

                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {charges.map(charge => {
                                    const selected = selectedIds.includes(charge.id)
                                    const late = isLate(charge.dueDate)
                                    return (
                                        <button
                                            key={charge.id}
                                            onClick={() => toggleCharge(charge.id)}
                                            className={`w-full text-left rounded-xl border p-4 transition-all duration-200 flex items-center gap-3 ${selected ? "border-blue-500 bg-blue-500/15" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                                        >
                                            <div className={`h-5 w-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-colors ${selected ? "bg-blue-500 border-blue-500" : "border-slate-500"}`}>
                                                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold text-sm truncate">{charge.description}</p>
                                                <p className={`text-xs mt-0.5 ${late ? "text-red-400" : "text-slate-400"}`}>
                                                    Venc. {formatDate(charge.dueDate)} {late && "• ATRASADA"}
                                                </p>
                                            </div>
                                            <span className="text-white font-bold text-sm flex-shrink-0">{formatCurrency(charge.amount)}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedIds.length >= 2 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center justify-between">
                                    <span className="text-green-300 text-xs font-medium">🎉 Desconto 5% (2+ mensalidades)</span>
                                    <span className="text-green-400 font-bold text-sm">{formatCurrency(totalSelected * 0.95)}</span>
                                </div>
                            )}

                            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

                            <button
                                onClick={handleGeneratePix}
                                disabled={loading || selectedIds.length === 0}
                                className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-600/30"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><QrCode className="h-5 w-5" /> Gerar QR Code Pix &nbsp;{selectedIds.length > 0 && `• ${formatCurrency(selectedIds.length >= 2 ? totalSelected * 0.95 : totalSelected)}`}</>}
                            </button>
                        </div>
                    )}

                    {/* ── STEP: PIX ────────────────────────────────── */}
                    {step === "pix" && pixData && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { stopPolling(); setStep("charges") }} className="text-slate-400 hover:text-white transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <div>
                                    <h2 className="text-white font-bold text-lg">Pague com Pix</h2>
                                    <p className="text-slate-400 text-xs">Escaneie o QR Code ou copie o código</p>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-2xl shadow-2xl">
                                    {pixData.pixQrcode ? (
                                        <Image
                                            src={`data:image/png;base64,${pixData.pixQrcode}`}
                                            alt="QR Code Pix"
                                            width={220}
                                            height={220}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="h-[220px] w-[220px] flex items-center justify-center text-slate-400 text-sm text-center p-4">
                                            QR Code indisponível. Use o Copia e Cola abaixo.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Copy Paste */}
                            {pixData.pixCopyPaste && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pix Copia e Cola</p>
                                    <p className="text-slate-300 text-xs font-mono break-all leading-relaxed">{pixData.pixCopyPaste.slice(0, 60)}...</p>
                                    <button
                                        onClick={handleCopy}
                                        className="w-full py-2.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                                    >
                                        {copied ? <><Check className="h-4 w-4 text-green-400" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar código</>}
                                    </button>
                                </div>
                            )}

                            {/* Polling status */}
                            <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl py-3 px-4">
                                <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                                <p className="text-amber-300 text-sm font-medium">Aguardando confirmação do pagamento...</p>
                            </div>

                            <p className="text-center text-slate-500 text-xs">Após o pagamento, esta tela será atualizada automaticamente.</p>
                        </div>
                    )}

                    {/* ── STEP: CONFIRMED ──────────────────────────── */}
                    {step === "confirmed" && (
                        <div className="space-y-6 py-4">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">Pagamento Confirmado!</h2>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Suas faturas foram baixadas com sucesso. Seu acesso foi liberado.
                                    </p>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-6 py-4 w-full">
                                    <p className="text-green-300 font-semibold text-sm">✅ {student?.name}</p>
                                    <p className="text-green-400 text-xs mt-1">{selectedIds.length} fatura(s) paga(s) — Conta ativa</p>
                                </div>
                            </div>

                            <button
                                onClick={() => { setStep("search"); setIdentifier(""); setStudent(null); setCharges([]); setSelectedIds([]); setPixData(null) }}
                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Nova Consulta
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <p className="text-slate-600 text-xs mt-6 text-center">
                Pagamentos processados com segurança via Asaas • IETEO © {new Date().getFullYear()}
            </p>
        </div>
    )
}
