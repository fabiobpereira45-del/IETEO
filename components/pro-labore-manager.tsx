"use client"

import { useEffect, useState } from "react"
import { DollarSign, Loader2, GraduationCap, Calculator, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { 
    getProLaboreCalculations, 
    type FinancialSettings, 
    getFinancialSettings,
    settleProLabore
} from "@/lib/store"
import { toast } from "sonner"

export function ProLaboreManager() {
    const [data, setData] = useState<any[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // Stores id of the item being saved

    async function load() {
        setLoading(true)
        try {
            const [calcs, s] = await Promise.all([
                getProLaboreCalculations(),
                getFinancialSettings()
            ])
            setData(calcs)
            setSettings(s)
        } catch (e) {
            console.error(e)
            toast.error("Erro ao carregar cálculos")
        } finally {
            setLoading(false)
        }
    }

    async function handleSettle(item: any) {
        if (!confirm(`Deseja confirmar o pagamento de R$ ${item.totalAmount.toFixed(2)} referente à disciplina ${item.disciplineName} na turma ${item.className}?`)) return
        
        const key = `${item.professorId}-${item.disciplineId}-${item.classId}`
        setSaving(key)
        try {
            await settleProLabore({
                professorId: item.professorId,
                disciplineId: item.disciplineId,
                classId: item.classId,
                amount: item.totalAmount,
                description: `Pro-labore: ${item.disciplineName} (${item.className})`
            })
            toast.success("Pagamento registrado com sucesso!")
            load()
        } catch (e: any) {
            toast.error("Erro ao registrar pagamento: " + e.message)
        } finally {
            setSaving(null)
        }
    }

    useEffect(() => { load() }, [])

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold font-serif">Pro-labore Docente</h3>
                    <p className="text-xs text-muted-foreground font-medium">Controle por Disciplina e Turma</p>
                </div>
                <div className="bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary">Taxa/Aula: R$ {settings?.proLaboreFeePerLesson?.toFixed(2) || "0,00"}</span>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
                    <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground font-medium">Nenhum professor vinculado a turmas com aulas cadastradas.</p>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Professor / Disciplina</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Turma</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Aulas</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(item => {
                                const key = `${item.professorId}-${item.disciplineId}-${item.classId}`
                                return (
                                    <tr key={key} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-sm">{item.professorName}</div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <GraduationCap className="h-3 w-3" /> {item.disciplineName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-medium text-foreground py-0.5 px-2 bg-muted rounded-full">
                                                {item.className}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-bold">{item.lessonsCount}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm font-black text-primary">R$ {item.totalAmount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {item.isPaid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                    <CheckCircle2 className="h-3 w-3" /> PAGO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                    <Loader2 className="h-3 w-3" /> PENDENTE
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {!item.isPaid && (
                                                <button 
                                                    onClick={() => handleSettle(item)}
                                                    disabled={saving === key}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                >
                                                    {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                                                    DAR BAIXA
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground font-medium italic">
                    Ao dar baixa, um registro de despesa será criado automaticamente no fluxo financeiro geral vinculado a este professor e turma.
                </p>
            </div>
        </div>
    )
}
        </div>
    )
}
