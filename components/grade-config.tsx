"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Calculator, Settings2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    getGradeSettings, saveGradeSettings, syncAllAttendanceScores, type GradeSettings
} from "@/lib/store"
import { ErrorBoundary } from "@/components/error-boundary"

export function GradeConfig() {
    const [settings, setSettings] = useState<GradeSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const data = await getGradeSettings()
                setSettings(data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        try {
            await saveGradeSettings(settings)
            alert("Configurações de notas salvas com sucesso! As novas regras de presença serão aplicadas nos próximos registros. Use o botão de sincronização se desejar atualizar registros antigos.")
        } catch (err: any) {
            alert("Erro ao salvar: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleSync = async () => {
        if (!confirm("Isso irá recalcular a nota de presença de TODOS os alunos baseando-se no novo valor definido. Deseja continuar?")) return
        setSyncing(true)
        try {
            await syncAllAttendanceScores()
            alert("Sincronização concluída com sucesso!")
        } catch (err: any) {
            alert("Erro na sincronização: " + err.message)
        } finally {
            setSyncing(false)
        }
    }

    if (loading) return (
        <div className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )

    if (error) return (
        <div className="p-10 text-center bg-red-50 border border-red-100 rounded-2xl mx-auto max-w-2xl mt-10">
            <h3 className="text-red-800 font-bold mb-2">Erro ao carregar configurações</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </div>
    )

    if (!settings) return null

    return (
        <ErrorBoundary>
            <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Configuração Global de Notas</h2>
                            <p className="text-sm text-muted-foreground">Defina os pesos e valores que compõem a média final dos alunos.</p>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 font-bold h-11 px-8 rounded-xl shadow-lg shadow-primary/20">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Configurações
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pesos das Notas */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-primary">
                            <Settings2 className="h-5 w-5" />
                            <h3 className="font-bold">Composição da Média (Pontos Máximos)</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor da Prova</Label>
                                <Input 
                                    type="number" 
                                    step="0.1" 
                                    value={settings.examWeight} 
                                    onChange={e => {
                                        const val = e.target.value.replace(',', '.')
                                        setSettings({...settings, examWeight: parseFloat(val) || 0})
                                    }}
                                />
                                <p className="text-[10px] text-muted-foreground italic">Pontuação máxima que a prova pode atingir.</p>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor do Teste</Label>
                                <Input 
                                    type="number" 
                                    step="0.1" 
                                    value={settings.testWeight} 
                                    onChange={e => {
                                        const val = e.target.value.replace(',', '.')
                                        setSettings({...settings, testWeight: parseFloat(val) || 0})
                                    }}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor do Trabalho</Label>
                                <Input 
                                    type="number" 
                                    step="0.1" 
                                    value={settings.workWeight} 
                                    onChange={e => {
                                        const val = e.target.value.replace(',', '.')
                                        setSettings({...settings, workWeight: parseFloat(val) || 0})
                                    }}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Valor de Bônus</Label>
                                <Input 
                                    type="number" 
                                    step="0.1" 
                                    value={settings.bonusWeight} 
                                    onChange={e => {
                                        const val = e.target.value.replace(',', '.')
                                        setSettings({...settings, bonusWeight: parseFloat(val) || 0})
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Configuração de Presença */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 border-l-4 border-l-amber-500">
                        <div className="flex items-center gap-2 text-amber-600">
                            <Info className="h-5 w-5" />
                            <h3 className="font-bold">Automação de Presença</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground text-amber-700">Valor de Cada Presença</Label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    value={settings.presenceValue} 
                                    onChange={e => {
                                        const val = e.target.value.replace(',', '.')
                                        setSettings({...settings, presenceValue: parseFloat(val) || 0})
                                    }}
                                    className="border-amber-200 focus:ring-amber-500"
                                />
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
                                    <strong>Como funciona:</strong> Ao realizar a chamada no Diário de Classe, o sistema contará quantas presenças o aluno possui na disciplina e multiplicará por este valor. 
                                    <br/><br/>
                                    <em>Exemplo: Se o valor for 0.5 e o aluno tiver 10 presenças, a nota de presença no boletim será 5.0 automaticamente.</em>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="mt-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                                >
                                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                                    Sincronizar Presenças já Registradas
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4 items-start">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800 leading-relaxed">
                        <p className="font-bold mb-1">Aviso Importante</p>
                        <p>As alterações nestes valores impactam o cálculo da média final em todo o sistema. Certifique-se de que a soma dos pesos seja condizente com a nota máxima da instituição (ex: 10.0).</p>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    )
}
