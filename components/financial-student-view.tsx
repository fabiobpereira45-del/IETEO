"use client"

import { useEffect, useState } from "react"
import { Clock, DollarSign, CheckCircle2, AlertCircle, Loader2, XCircle, CreditCard } from "lucide-react"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { type FinancialCharge, getFinancialCharges, getPaypalConfig, getAsaasConfig, type PaypalConfig, type AsaasConfig } from "@/lib/store"
import { Button } from "@/components/ui/button"

interface Props {
    studentId: string
}

export function FinancialStudentView({ studentId }: Props) {
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [loading, setLoading] = useState(true)
    const [paypalConfig, setPaypalConfig] = useState<PaypalConfig | null>(null)
    const [asaasConfigured, setAsaasConfigured] = useState(false)

    // PayPal Modal state
    const [payingChargeId, setPayingChargeId] = useState<string | null>(null)
    const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
    const [payMessage, setPayMessage] = useState("")

    // Pix Modal state
    const [pixChargeId, setPixChargeId] = useState<string | null>(null)
    const [pixLoading, setPixLoading] = useState(false)
    const [pixQrcode, setPixQrcode] = useState<string>("")
    const [pixCopyPaste, setPixCopyPaste] = useState<string>("")
    const [pixError, setPixError] = useState<string>("")
    const [pixCopied, setPixCopied] = useState(false)
    const [pixVerifying, setPixVerifying] = useState(false)
    const [pixVerifyMsg, setPixVerifyMsg] = useState<"" | "paid" | "pending" | "error">("")

    async function load() {
        setLoading(true)
        const [allCharges, config, asaas] = await Promise.all([
            getFinancialCharges(),
            getPaypalConfig(),
            getAsaasConfig()
        ])
        setCharges(allCharges.filter(c => c.studentId === studentId))
        setPaypalConfig(config)
        setAsaasConfigured(!!(asaas?.apiKey))
        setLoading(false)
    }

    useEffect(() => { load() }, [studentId])

    function getStatusBadge(status: string) {
        if (status === 'paid') return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</span>
        if (status === 'late') return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</span>
        if (status === 'cancelled') return <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">Cancelado</span>
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
    }

    async function createOrder(_data: any, actions: any) {
        if (!payingChargeId) return ""
        try {
            const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeId: payingChargeId })
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || "Erro ao criar pedido.")
            return body.orderId
        } catch (err: any) {
            setPayMessage(err.message)
            setPayStatus("error")
            throw err
        }
    }

    async function onApprove(data: any, _actions: any) {
        setPayStatus("processing")
        try {
            const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data.orderID, chargeId: payingChargeId })
            })
            const body = await res.json()
            if (!res.ok || !body.success) throw new Error(body.error || "Erro ao confirmar pagamento.")
            setPayStatus("success")
            setPayMessage("Pagamento confirmado! Obrigado.")
            await load() // Reload charges after payment
        } catch (err: any) {
            setPayStatus("error")
            setPayMessage(err.message)
        }
    }

    async function handleOpenPix(chargeId: string) {
        setPixChargeId(chargeId)
        setPixLoading(true)
        setPixQrcode("")
        setPixCopyPaste("")
        setPixError("")
        setPixCopied(false)
        try {
            const res = await fetch("/api/asaas/create-pix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeId })
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || "Erro ao gerar Pix.")
            setPixQrcode(body.pixQrcode)
            setPixCopyPaste(body.pixCopyPaste)
        } catch (err: any) {
            setPixError(err.message)
        } finally {
            setPixLoading(false)
        }
    }

    async function handleCopyPix() {
        await navigator.clipboard.writeText(pixCopyPaste)
        setPixCopied(true)
        setTimeout(() => setPixCopied(false), 2000)
    }

    function closeModal() {
        setPayingChargeId(null)
        setPayStatus("idle")
        setPayMessage("")
    }

    function closePixModal() {
        setPixChargeId(null)
        setPixQrcode("")
        setPixCopyPaste("")
        setPixError("")
        setPixCopied(false)
        setPixVerifyMsg("")
    }

    async function handleCheckPixStatus() {
        if (!pixChargeId) return
        setPixVerifying(true)
        setPixVerifyMsg("")
        try {
            const res = await fetch("/api/asaas/check-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeId: pixChargeId })
            })
            const body = await res.json()
            if (body.status === "paid") {
                setPixVerifyMsg("paid")
                await load()
                setTimeout(() => closePixModal(), 2000)
            } else {
                setPixVerifyMsg("pending")
            }
        } catch {
            setPixVerifyMsg("error")
        } finally {
            setPixVerifying(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    const sortedCharges = [...charges].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const hasPendingOrLate = sortedCharges.some(c => c.status === 'pending' || c.status === 'late')
    const payingCharge = sortedCharges.find(c => c.id === payingChargeId)

    return (
        <div className="flex flex-col gap-6">

            {/* PayPal Checkout Modal */}
            {payingChargeId && paypalConfig && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md border border-border">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Pagar com PayPal</h3>
                                <p className="text-sm text-muted-foreground mt-1">{payingCharge?.description}</p>
                            </div>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="bg-muted rounded-xl p-4 text-center mb-5">
                            <span className="text-3xl font-bold text-foreground">R$ {payingCharge?.amount.toFixed(2)}</span>
                        </div>

                        {payStatus === "idle" && (
                            <PayPalScriptProvider options={{
                                clientId: paypalConfig.clientId,
                                currency: "BRL"
                            }}>
                                <PayPalButtons
                                    style={{ layout: "vertical", color: "gold", shape: "pill" }}
                                    createOrder={createOrder}
                                    onApprove={onApprove}
                                    onError={(err) => {
                                        setPayStatus("error")
                                        setPayMessage("O pagamento foi cancelado ou ocorreu um erro. Tente novamente.")
                                    }}
                                />
                            </PayPalScriptProvider>
                        )}

                        {payStatus === "processing" && (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Confirmando pagamento...</p>
                            </div>
                        )}

                        {payStatus === "success" && (
                            <div className="flex flex-col items-center gap-3 py-4 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                                <p className="text-base font-semibold text-foreground">{payMessage}</p>
                                <Button onClick={closeModal} className="mt-2">Fechar</Button>
                            </div>
                        )}

                        {payStatus === "error" && (
                            <div className="flex flex-col items-center gap-3 py-4 text-center">
                                <AlertCircle className="h-12 w-12 text-red-500" />
                                <p className="text-sm text-red-600">{payMessage}</p>
                                <Button variant="outline" onClick={() => setPayStatus("idle")} className="mt-2">Tentar Novamente</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Pix QR Code Modal */}
            {pixChargeId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md border border-border">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Pagar com Pix</h3>
                                <p className="text-sm text-muted-foreground mt-1">{sortedCharges.find(c => c.id === pixChargeId)?.description}</p>
                            </div>
                            <button onClick={closePixModal} className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        {pixLoading && (
                            <div className="flex flex-col items-center gap-3 py-8">
                                <Loader2 className="h-10 w-10 animate-spin text-green-500" />
                                <p className="text-sm text-muted-foreground">Gerando QR Code Pix...</p>
                            </div>
                        )}

                        {pixError && (
                            <div className="flex flex-col items-center gap-3 py-4 text-center">
                                <AlertCircle className="h-12 w-12 text-red-500" />
                                <p className="text-sm text-red-600">{pixError}</p>
                                <Button variant="outline" onClick={closePixModal} className="mt-2">Fechar</Button>
                            </div>
                        )}

                        {pixQrcode && !pixLoading && (
                            <div className="flex flex-col items-center gap-4">
                                <img
                                    src={`data:image/png;base64,${pixQrcode}`}
                                    alt="QR Code Pix"
                                    className="w-52 h-52 rounded-xl border border-border shadow"
                                />
                                <p className="text-xs text-muted-foreground text-center">Escaneie com o app do seu banco para pagar</p>
                                <div className="w-full">
                                    <p className="text-xs text-muted-foreground mb-1">Ou copie o código Pix:</p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={pixCopyPaste}
                                            className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 text-muted-foreground font-mono truncate"
                                        />
                                        <button
                                            onClick={handleCopyPix}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                                        >
                                            {pixCopied ? "Copiado!" : "Copiar"}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                    ⚠️ O QR Code expira. Após pagar, clique no botão abaixo para confirmar.
                                </p>
                                <button
                                    onClick={handleCheckPixStatus}
                                    disabled={pixVerifying}
                                    className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-xl transition-colors disabled:opacity-60 text-white ${pixVerifyMsg === "pending"
                                            ? "bg-red-600 hover:bg-red-700"
                                            : "bg-green-600 hover:bg-green-700"
                                        }`}
                                >
                                    {pixVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {pixVerifying ? "Verificando..." : "Já Paguei — Verificar Pagamento"}
                                </button>
                                {pixVerifyMsg === "paid" && (
                                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold justify-center">
                                        <CheckCircle2 className="h-4 w-4" /> Pagamento confirmado! Fechando...
                                    </div>
                                )}
                                {pixVerifyMsg === "pending" && (
                                    <p className="text-xs text-muted-foreground text-center">Pagamento ainda não identificado. Tente novamente em alguns instantes.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {hasPendingOrLate && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex gap-3 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Atenção!</p>
                        <p>Você possui faturas pendentes ou atrasadas. Clique em <em>"Pagar"</em> na fatura para quitar pelo PayPal.</p>
                    </div>
                </div>
            )}

            {sortedCharges.length === 0 ? (
                <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">Sem Lançamentos</h3>
                    <p className="text-muted-foreground text-sm max-w-md">Você não possui histórico financeiro ou faturas em aberto no momento.</p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Descrição / Tipo</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedCharges.map(c => (
                                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">{c.description}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{c.type.replace('_', ' ')}</div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(c.dueDate).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            R$ {c.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(c.status)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1.5">
                                                {(c.status === "pending" || c.status === "late") && paypalConfig?.clientId && (
                                                    <button
                                                        onClick={() => { setPayingChargeId(c.id); setPayStatus("idle") }}
                                                        className="flex items-center gap-1.5 bg-[#FFC439] hover:bg-[#f0b930] text-[#003087] text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                                                    >
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        PayPal
                                                    </button>
                                                )}
                                                {(c.status === "pending" || c.status === "late") && asaasConfigured && (
                                                    <button
                                                        onClick={() => handleOpenPix(c.id)}
                                                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                                                    >
                                                        <span className="text-[10px] font-black">Pix</span>
                                                        Pagar
                                                    </button>
                                                )}
                                                {(c.status === "pending" || c.status === "late") && !paypalConfig?.clientId && !asaasConfigured && (
                                                    <span className="text-xs text-muted-foreground italic">Config. necessária</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
