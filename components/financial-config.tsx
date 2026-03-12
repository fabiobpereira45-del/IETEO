"use client"

import { useEffect, useState } from "react"
import { DollarSign, Save, Loader2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    type FinancialSettings,
    getFinancialSettings, updateFinancialSettings
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
    const [creditCardUrl, setCreditCardUrl] = useState("")



    async function load() {
        setLoading(true)
        const [data] = await Promise.all([
            getFinancialSettings()
        ])

        if (data) {
            setSettings(data)
            setEnrollmentFee(data.enrollmentFee.toString())
            setMonthlyFee(data.monthlyFee.toString())
            setSecondCallFee(data.secondCallFee.toString())
            setFinalExamFee(data.finalExamFee.toString())
            setTotalMonths(data.totalMonths.toString())
            setCreditCardUrl(data.creditCardUrl || "")
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
                    creditCardUrl: creditCardUrl
                })
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

                <div className="flex flex-col gap-1.5 md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <Label className="text-blue-700 font-bold text-sm">Link de Pagamento (Cartão de Crédito)</Label>
                    </div>
                    <Input
                        type="text"
                        value={creditCardUrl}
                        onChange={(e) => setCreditCardUrl(e.target.value)}
                        placeholder="Ex: https://link.mercadopago.com.br/meu-pagamento"
                        className="border-blue-200 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-blue-600 font-medium italic">Insira o link externo (Mercado Pago, PicPay, etc.) para recebimento via cartão.</span>
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
