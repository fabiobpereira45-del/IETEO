"use client"

import { useEffect, useState } from "react"
import { DollarSign, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    type FinancialSettings,
    type PaypalConfig,
    type AsaasConfig,
    getFinancialSettings, updateFinancialSettings,
    getPaypalConfig, updatePaypalConfig,
    getAsaasConfig, updateAsaasConfig
} from "@/lib/store"

export function FinancialConfig() {
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form states
    const [enrollmentFee, setEnrollmentFee] = useState("0")
    const [monthlyFee, setMonthlyFee] = useState("0")
    const [secondCallFee, setSecondCallFee] = useState("0")
    const [finalExamFee, setFinalExamFee] = useState("0")
    const [totalMonths, setTotalMonths] = useState("24")

    // PayPal states
    const [paypalClientId, setPaypalClientId] = useState("")
    const [paypalSecret, setPaypalSecret] = useState("")
    const [paypalMode, setPaypalMode] = useState<"sandbox" | "live">("sandbox")

    // Asaas states
    const [asaasApiKey, setAsaasApiKey] = useState("")
    const [asaasMode, setAsaasMode] = useState<"sandbox" | "production">("sandbox")
    const [pixKey, setPixKey] = useState("")

    async function load() {
        setLoading(true)
        const [data, paypal, asaas] = await Promise.all([
            getFinancialSettings(),
            getPaypalConfig(),
            getAsaasConfig()
        ])

        if (data) {
            setSettings(data)
            setEnrollmentFee(data.enrollmentFee.toString())
            setMonthlyFee(data.monthlyFee.toString())
            setSecondCallFee(data.secondCallFee.toString())
            setFinalExamFee(data.finalExamFee.toString())
            setTotalMonths(data.totalMonths.toString())
        }

        if (paypal) {
            setPaypalClientId(paypal.clientId || "")
            setPaypalSecret(paypal.secret || "")
            setPaypalMode(paypal.mode || "sandbox")
        }

        if (asaas) {
            setAsaasApiKey(asaas.apiKey || "")
            setAsaasMode(asaas.mode || "sandbox")
            setPixKey((asaas as any).pixKey || "")
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
                    secondCallFee: parseFloat(secondCallFee) || 0,
                    finalExamFee: parseFloat(finalExamFee) || 0,
                    totalMonths: parseInt(totalMonths) || 12,
                }),
                updatePaypalConfig({
                    clientId: paypalClientId,
                    secret: paypalSecret,
                    mode: paypalMode
                }),
                updateAsaasConfig({
                    apiKey: asaasApiKey,
                    mode: asaasMode,
                    pixKey
                } as any)
            ])
            alert("Configurações salvas com sucesso!")
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
        <div className="bg-card border border-border shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Taxas e Mensalidades</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                    <Label>Valor da Matrícula (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={enrollmentFee}
                        onChange={(e) => setEnrollmentFee(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Valor da Mensalidade (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Taxa de 2ª Chamada (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={secondCallFee}
                        onChange={(e) => setSecondCallFee(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Taxa de Prova Final (R$)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={finalExamFee}
                        onChange={(e) => setFinalExamFee(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <Label>Duração do Curso (Meses)</Label>
                    <Input
                        type="number"
                        min="1"
                        value={totalMonths}
                        onChange={(e) => setTotalMonths(e.target.value)}
                        placeholder="Ex: 24 (equivale a 2 anos)"
                    />
                    <span className="text-xs text-muted-foreground">O sistema usará isso para prever o total de mensalidades.</span>
                </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold font-serif text-lg">P</div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Integração PayPal</h3>
                        <p className="text-xs text-muted-foreground">Insira as credenciais para receber pagamentos automáticos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label>Ambiente (Modo)</Label>
                        <Select value={paypalMode} onValueChange={(val: "sandbox" | "live") => setPaypalMode(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o ambiente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                                <SelectItem value="live">Live (Produção Real)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label>Client ID</Label>
                        <Input
                            type="text"
                            value={paypalClientId}
                            onChange={(e) => setPaypalClientId(e.target.value)}
                            placeholder="AdV... (exemplo)"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label>Secret Key</Label>
                        <Input
                            type="password"
                            value={paypalSecret}
                            onChange={(e) => setPaypalSecret(e.target.value)}
                            placeholder="EGB... (mantenha em segredo)"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">Pix</div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Integração Pix (Asaas)</h3>
                        <p className="text-xs text-muted-foreground">Insira a API Key do Asaas para receber pagamentos via Pix.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label className="text-green-700 font-bold">Chave PIX da Instituição (Manual Fallback)</Label>
                        <Input
                            type="text"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="CPF, CNPJ, E-mail ou Telefone da Igreja"
                            className="border-green-300 focus:ring-green-500"
                        />
                        <span className="text-[10px] text-green-600 font-medium">ESTE É O MAIS IMPORTANTE: Preencha aqui para garantir que os alunos consigam pagar via Pix mesmo que a API do Asaas falhe.</span>
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label>Ambiente (Modo Asaas)</Label>
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
                        <Label>API Key do Asaas (Automático)</Label>
                        <Input
                            type="password"
                            value={asaasApiKey}
                            onChange={(e) => setAsaasApiKey(e.target.value)}
                            placeholder="$aact_... (cole sua chave aqui)"
                        />
                        <span className="text-xs text-muted-foreground">Opcional para automação. Encontre em: asaas.com → Configurações → Integrações → API Key</span>
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
