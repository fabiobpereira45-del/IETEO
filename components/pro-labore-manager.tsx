"use client"

import { useEffect, useState } from "react"
import { DollarSign, Loader2, GraduationCap, Calculator, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
    getProLaboreCalculations, 
    type FinancialSettings, 
    getFinancialSettings
} from "@/lib/store"

export function ProLaboreManager() {
    const [data, setData] = useState<any[]>([])
    const [settings, setSettings] = useState<FinancialSettings | null>(null)
    const [loading, setLoading] = useState(true)

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
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold font-serif">Pro-labore Docente</h3>
                    <p className="text-xs text-muted-foreground font-medium">Cálculo automático baseado em aulas dadas</p>
                </div>
                <div className="bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary">Taxa/Aula: R$ {settings?.proLaboreFeePerLesson?.toFixed(2) || "0,00"}</span>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
                    <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground font-medium">Nenhum professor vinculado a disciplinas com aulas cadastradas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map(item => (
                        <Card key={item.professorId} className="border-border shadow-sm group hover:shadow-md transition-all">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full premium-gradient flex items-center justify-center text-white font-bold text-xs">
                                            {item.professorName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm leading-tight">{item.professorName}</h4>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Pagamento Projetado</p>
                                        </div>
                                    </div>
                                    <DollarSign className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Disciplinas Unitárias:</span>
                                        <span className="font-bold text-foreground">{item.lessonsCount} aulas</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Valor por Aula:</span>
                                        <span className="font-bold text-foreground">R$ {item.feePerLesson.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-border flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total a Receber</span>
                                        <span className="text-lg font-black text-primary">R$ {item.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground italic mb-2">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>Valores calculados com base na grade curricular.</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                        O pagamento deve ser lançado manualmente na aba "Despesas" após a realização para efeitos de fluxo de caixa real.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
