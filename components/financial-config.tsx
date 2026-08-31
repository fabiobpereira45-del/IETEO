"use client"

import { useEffect, useState } from "react"
import { DollarSign, Save, Loader2, CreditCard, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    type FinancialSettings,
    getAsaasConfig, updateAsaasConfig,
    getFinancialSettings, updateFinancialSettings
} from "@/lib/store"

export function FinancialConfig() {
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form states - Presencial
    const [enrollmentFee, setEnrollmentFee] = useState("0")
    const [monthlyFee, setMonthlyFee] = useState("0")

    // Form states - Online (EAD)
    const [enrollmentFeeOnline, setEnrollmentFeeOnline] = useState("0")
    const [monthlyFeeOnline, setMonthlyFeeOnline] = useState("0")

    const [secondCallFee, setSecondCallFee] = useState("0")
    const [finalExamFee, setFinalExamFee] = useState("0")
    const [totalMonths, setTotalMonths] = useState("18")
    const [proLaboreFee, setProLaboreFee] = useState("0")
    const [creditCardUrl, setCreditCardUrl] = useState("")
    const [pixKey, setPixKey] = useState("")

    // Asaas states
    const [asaasApiKey, setAsaasApiKey] = useState("")
    const [asaasMode, setAsaasMode] = useState<"sandbox" | "production">("sandbox")

    async function load() {
        setLoading(true)
        const [data, asaas] = await Promise.all([
            getFinancialSettings(),
            getAsaasConfig()
        ])

        if (data) {
            setSettings(data)
            setEnrollmentFee(data.enrollmentFee.toString())
            setMonthlyFee(data.monthlyFee.toString())
            setEnrollmentFeeOnline((data.enrollmentFeeOnline ?? data.enrollmentFee).toString())
            setMonthlyFeeOnline((data.monthlyFeeOnline ?? data.monthlyFee).toString())
            setSecondCallFee(data.secondCallFee.toString())
            setFinalExamFee(data.finalExamFee.toString())
            setTotalMonths(data.totalMonths.toString())
            setProLaboreFee(data.proLaboreFeePerLesson?.toString() || "0")
            setCreditCardUrl(data.creditCardUrl || "")
            setPixKey(data.pixKey || "")
        }

        if (asaas) {
            setAsaasApiKey(asaas.apiKey || "")
            setAsaasMode(asaas.mode || "sandbox")
        }

        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleSave() {
        setSaving(true)
        try {
            await Promise.all([
                updateFinancialSettings({
                    enrollmentFee: parseFloat(enrollmentFee) || 0,
                    monthlyFee: parseFloat(monthlyFee) || 0,
                    enrollmentFeeOnline: parseFloat(enrollmentFeeOnline) || 0,
                    monthlyFeeOnline: parseFloat(monthlyFeeOnline) || 0,
                    secondCallFee: parseFloat(secondCallFee) || 0,
                    finalExamFee: parseFloat(finalExamFee) || 0,
                    totalMonths: parseInt(totalMonths) || 18,
                    proLaboreFeePerLesson: parseFloat(proLaboreFee) || 0,
                    creditCardUrl: creditCardUrl,
                    pixKey: pixKey
                }),
                updateAsaasConfig({
                    apiKey: asaasApiKey,
                    mode: asaasMode
                })
            ])
            alert("Configurações financeiras salvas com sucesso!")
            await load()
        } catch (error) {
            alert("Erro ao salvar configurações financeiras.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="bg-card border border-border shadow-sm rounded-2xl p-6 space-y-8">
            <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <DollarSign className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-foreground">Taxas e Mensalidades por Modalidade</h3>
                    <p className="text-xs text-muted-foreground">Configure os valores para cursos presenciais e para a modalidade online (EAD).</p>
                </div>
            </div>

            {/* Presencial Section */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        🏫 Modalidade Presencial
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">Aplicado para turmas presenciais nos polos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold">Valor da Matrícula Presencial (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={enrollmentFee}
                            onChange={(e) => setEnrollmentFee(e.target.value)}
                            className="bg-white dark:bg-slate-950 font-bold"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold">Valor da Mensalidade Presencial (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={monthlyFee}
                            onChange={(e) => setMonthlyFee(e.target.value)}
                            className="bg-white dark:bg-slate-950 font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* Online / EAD Section */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        🌐 Modalidade Online (EAD)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">Aplicado para turmas e matrículas online</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">Valor da Matrícula Online (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={enrollmentFeeOnline}
                            onChange={(e) => setEnrollmentFeeOnline(e.target.value)}
                            className="bg-white dark:bg-slate-950 font-bold border-indigo-200 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">Valor da Mensalidade Online (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={monthlyFeeOnline}
                            onChange={(e) => setMonthlyFeeOnline(e.target.value)}
                            className="bg-white dark:bg-slate-950 font-bold border-indigo-200 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* General Fees Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Taxa de 2ª Chamada (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={secondCallFee}
                        onChange={(e) => setSecondCallFee(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Taxa de Prova Final (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={finalExamFee}
                        onChange={(e) => setFinalExamFee(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Duração do Curso (Meses)</Label>
                    <Input
                        type="number"
                        min="1"
                        value={totalMonths}
                        onChange={(e) => setTotalMonths(e.target.value)}
                        placeholder="Ex: 18"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Pró-labore por Aula (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={proLaboreFee}
                        onChange={(e) => setProLaboreFee(e.target.value)}
                        placeholder="Ex: 100.00"
                    />
                </div>
            </div>

            {/* Payment Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 bg-green-50/50 dark:bg-green-950/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                    <div className="flex items-center gap-2 mb-1">
                        <QrCode className="h-4 w-4 text-green-600" />
                        <Label className="text-green-700 dark:text-green-400 font-bold text-sm">Chave Pix (Copia e Cola ou E-mail/CPF)</Label>
                    </div>
                    <Input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Insira a chave PIX ou o código Copia e Cola"
                        className="border-green-200 focus:ring-green-500 bg-white dark:bg-slate-950"
                    />
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium italic">Esta chave será exibida para os alunos na área financeira.</span>
                </div>

                <div className="flex flex-col gap-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <Label className="text-blue-700 dark:text-blue-400 font-bold text-sm">Link de Pagamento (Cartão de Crédito - Opcional)</Label>
                    </div>
                    <Input
                        type="text"
                        value={creditCardUrl}
                        onChange={(e) => setCreditCardUrl(e.target.value)}
                        placeholder="Ex: https://link.mercadopago.com.br/meu-pagamento"
                        className="border-blue-200 focus:ring-blue-500 bg-white dark:bg-slate-950"
                    />
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium italic">Insira o link externo (Mercado Pago, PicPay, etc.) caso aceite cartão.</span>
                </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">Pix</div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Integração Pix Automático (Asaas)</h3>
                        <p className="text-xs text-muted-foreground">Insira a API Key do Asaas para gerar e receber pagamentos via Pix Dinâmico.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label>Ambiente (Modo)</Label>
                        <Select value={asaasMode} onValueChange={(val: "sandbox" | "production") => setAsaasMode(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o ambiente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                                <SelectItem value="production">Produção (Real)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label>API Key do Asaas</Label>
                        <Input
                            type="password"
                            value={asaasApiKey}
                            onChange={(e) => setAsaasApiKey(e.target.value)}
                            placeholder="$aact_... (cole sua chave aqui)"
                        />
                        <span className="text-xs text-muted-foreground">Encontre em: asaas.com → Configurações → Integrações → API Key</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
            </div>
        </div>
    )
}
