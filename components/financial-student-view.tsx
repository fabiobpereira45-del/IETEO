"use client"

import { useEffect, useState } from "react"
import { Clock, DollarSign, CheckCircle2, AlertCircle, Loader2, XCircle, CreditCard, Copy, MessageCircle, QrCode } from "lucide-react"
import { type FinancialCharge, getFinancialCharges, getFinancialSettings, type FinancialSettings } from "@/lib/store"
import { Button } from "@/components/ui/button"

interface Props {
    studentId: string
}

export function FinancialStudentView({ studentId }: Props) {
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [loading, setLoading] = useState(true)

    const [settings, setSettings] = useState<FinancialSettings | null>(null)

    // Bulk Selection State
    const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([])

    // Manual Payment Modal state
    const [showPayModal, setShowPayModal] = useState(false)
    const [pixCopied, setPixCopied] = useState(false)

    async function load() {
        setLoading(true)
        const [allCharges, finSettings] = await Promise.all([
            getFinancialCharges(),
            getFinancialSettings()
        ])
        setCharges(allCharges.filter(c => c.studentId === studentId))
        setSettings(finSettings)
        setLoading(false)
    }

    useEffect(() => { load() }, [studentId])

    function getStatusBadge(status: string) {
        if (status === 'paid') return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</span>
        if (status === 'late') return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</span>
        if (status === 'cancelled') return <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">Cancelado</span>
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>
    }



    const toggleSelection = (id: string) => {
        setSelectedChargeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleAll = (ids: string[]) => {
        if (selectedChargeIds.length === ids.length && ids.length > 0) {
            setSelectedChargeIds([])
        } else {
            setSelectedChargeIds(ids)
        }
    }



    function closeModal() {

        setShowPayModal(false)
    }

    function handleWhatsAppConfirm() {
        const selectedDescriptions = sortedCharges
            .filter(c => selectedChargeIds.includes(c.id))
            .map(c => `- ${c.description} (Venc: ${new Date(c.dueDate).toLocaleDateString("pt-BR")})`)
            .join("\n")

        const message = `Olá! Realizei o pagamento das seguintes faturas no IETEO:\n\n${selectedDescriptions}\n\n*Estou enviando o comprovante de pagamento em anexo.*`
        const encoded = encodeURIComponent(message)
        window.open(`https://wa.me/5521974796365?text=${encoded}`, "_blank")
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    const sortedCharges = [...charges].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const hasPendingOrLate = sortedCharges.some(c => c.status === 'pending' || c.status === 'late')
    const pendingCharges = sortedCharges.filter(c => c.status === 'pending' || c.status === 'late')

    const selectedCharges = sortedCharges.filter(c => selectedChargeIds.includes(c.id))
    const totalSelectedAmount = selectedCharges.reduce((acc, curr) => acc + curr.amount, 0)
    const monthlyCount = selectedCharges.filter(c => c.type === 'monthly').length
    const hasDiscount = monthlyCount >= 2
    const finalAmount = hasDiscount ? totalSelectedAmount * 0.95 : totalSelectedAmount

    return (
        <div className="flex flex-col gap-6">

            {/* Manual Payment Instructions Modal */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md border border-border my-auto">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Como Pagar</h3>
                                <p className="text-sm text-muted-foreground mt-1">Siga as instruções abaixo para realizar o pagamento.</p>
                            </div>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="bg-muted/40 rounded-xl p-4 text-center mb-6 flex flex-col items-center">
                            {hasDiscount && <span className="text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-full font-black mb-2 uppercase tracking-tight">Economia de R$ {(totalSelectedAmount - finalAmount).toFixed(2)} acumulada!</span>}
                            <span className="text-3xl font-black text-foreground tracking-tight">R$ {finalAmount.toFixed(2)}</span>
                            {hasDiscount && <span className="text-xs text-muted-foreground line-through opacity-70 mt-1 italic font-medium">R$ {totalSelectedAmount.toFixed(2)} sem desconto</span>}
                        </div>

                        <div className="space-y-4">
                            {/* Option 1: Pix */}
                            <div className="border-2 border-green-500 bg-green-50/50 rounded-xl p-5 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <QrCode className="h-6 w-6 text-green-600" />
                                        <p className="font-black text-green-700 text-base">Opção 1: Pix (Imediato)</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-green-600 text-white px-2 py-0.5 rounded-full uppercase">Melhor Opção</span>
                                </div>
                                <div className="bg-white border border-green-200 rounded-lg p-4 shadow-inner">
                                    <p className="text-[10px] uppercase font-black text-muted-foreground mb-1 tracking-widest">Chave Pix para Pagamento:</p>
                                    <div className="flex items-center gap-3">
                                        <code className="text-sm font-mono font-black text-foreground flex-1 break-all">{settings?.pixKey || "Chave PIX não configurada"}</code>
                                        <button
                                            onClick={async () => {
                                                if (!settings?.pixKey) {
                                                    alert("Chave PIX não configurada!")
                                                    return
                                                }
                                                await navigator.clipboard.writeText(settings.pixKey)
                                                setPixCopied(true)
                                                setTimeout(() => setPixCopied(false), 2000)
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95"
                                        >
                                            <Copy className="h-4 w-4" /> {pixCopied ? "Copiado!" : "Copiar Chave"}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-green-700/70 font-medium italic">* O desconto de 5% já está aplicado no valor total acima para 2+ meses.</p>
                            </div>

                            {/* Option 2: Boleto */}
                            <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-amber-600" />
                                    <p className="font-bold text-amber-700 text-sm">Opção 2: Boleto Bancário</p>
                                </div>
                                <div className="bg-white border border-amber-100 rounded-lg p-3 text-center">
                                    <p className="text-xs text-amber-800 font-medium mb-2">Para pagar via boleto, solicite ao suporte ou aguarde o envio mensal.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(`https://wa.me/5521974796365?text=Olá, gostaria de solicitar um boleto para minha mensalidade.`, "_blank")}
                                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 font-bold h-9 text-[11px]"
                                    >
                                        Solicitar Boleto via WhatsApp
                                    </Button>
                                </div>
                            </div>

                            {/* Option 2: Credit Card Link */}
                            {settings?.creditCardUrl && (
                                <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-blue-600" />
                                        <p className="font-bold text-blue-700 text-sm">Opção 2: Pagar com Cartão</p>
                                    </div>
                                    <Button
                                        onClick={() => window.open(settings.creditCardUrl, "_blank")}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs"
                                    >
                                        Abrir Link de Pagamento (Externo)
                                    </Button>
                                </div>
                            )}

                            {/* Step 3: WhatsApp Confirmation */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                <p className="text-xs text-amber-800 font-medium mb-3 underline decoration-amber-300">Após pagar, é obrigatório enviar o comprovante:</p>
                                <Button
                                    onClick={handleWhatsAppConfirm}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12 flex items-center justify-center gap-2 shadow-lg hover:translate-y-[-2px] transition-all"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    Enviar Comprovante via WhatsApp
                                </Button>
                                <p className="text-[10px] text-muted-foreground mt-2">Aguarde a conferência manual para a baixa no sistema.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {hasPendingOrLate && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex gap-3 text-sm shadow-sm group hover:scale-[1.01] transition-transform">
                    <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
                    <div>
                        <p className="font-bold mb-1">PROMOÇÃO: Pagamento em Lote</p>
                        <p className="text-blue-700/80">Selecione <strong>2 ou mais mensalidades</strong> e ganhe <strong>5% de desconto</strong> automático no Pix ou Cartão!</p>
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
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-muted-foreground/30 text-accent focus:ring-accent"
                                            checked={selectedChargeIds.length === pendingCharges.length && pendingCharges.length > 0}
                                            onChange={() => toggleAll(pendingCharges.map(c => c.id))}
                                            disabled={pendingCharges.length === 0}
                                        />
                                    </th>
                                    <th className="px-4 py-3">Descrição / Tipo</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Recibo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedCharges.map(c => (
                                    <tr key={c.id} className={`hover:bg-muted/30 transition-colors ${selectedChargeIds.includes(c.id) ? "bg-accent/5" : ""}`}>
                                        <td className="px-4 py-3">
                                            {(c.status === "pending" || c.status === "late") && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-muted-foreground/30 text-accent focus:ring-accent cursor-pointer"
                                                    checked={selectedChargeIds.includes(c.id)}
                                                    onChange={() => toggleSelection(c.id)}
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-foreground text-[13px]">{c.description}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight">
                                                {{ enrollment: "Matrícula", monthly: "Mensalidade", second_call: "2ª Chamada", final_exam: "Taxa de Prova", other: "Outros" }[c.type] || c.type}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(c.dueDate).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-foreground">
                                            R$ {c.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(c.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {c.status === "paid" && (
                                                <button
                                                    onClick={() => {
                                                        const win = window.open('', '', 'width=600,height=600')
                                                        if (win) {
                                                            win.document.write(`<html><body style="font-family:sans-serif;padding:40px"><h2>IETEO - COMPROVANTE</h2><hr/><p>Descrição: ${c.description}</p><p>Valor: R$ ${c.amount.toFixed(2)}</p><p>Data: ${new Date(c.paymentDate!).toLocaleString()}</p><button onclick="window.print()">Imprimir</button></body></html>`)
                                                        }
                                                    }}
                                                    className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                                >
                                                    RECIBO
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sticky Action Footer */}
            {selectedChargeIds.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.15)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 animate-in slide-in-from-bottom-10 backdrop-blur-md bg-white/90">
                    <div className="flex items-center gap-4">
                        <div className="bg-accent/10 px-4 py-2 rounded-full border border-accent/20">
                            <span className="font-black text-accent">{selectedChargeIds.length}</span> <span className="text-xs font-bold text-accent-foreground">ITEM(S)</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Total a Pagar</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-foreground leading-none">R$ {finalAmount.toFixed(2)}</p>
                                {hasDiscount && (
                                    <p className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full animate-bounce">
                                        Economize R$ {(totalSelectedAmount - finalAmount).toFixed(2)}!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => setSelectedChargeIds([])} className="h-10 text-xs font-bold uppercase">Limpar</Button>
                        <Button
                            onClick={() => setShowPayModal(true)}
                            className="h-12 px-8 bg-accent text-accent-foreground font-black rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all text-sm uppercase tracking-wider"
                        >
                            Pagar Agora
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
