"use client"

import { useState, useEffect } from "react"
import { 
    LayoutDashboard, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    GraduationCap, 
    FileBarChart, 
    Settings,
    Calendar,
    Filter,
    Loader2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { FinancialKpiCards } from "./financial-kpi-cards"
import { FinancialCharts } from "./financial-charts"
import { FinancialManager } from "./financial-manager"
import { ExpenseManager } from "./expense-manager"
import { ProLaboreManager } from "./pro-labore-manager"
import { FinancialConfig } from "./financial-config"
import { 
    getFinancialCharges, 
    getExpenses, 
    type FinancialCharge, 
    type Expense 
} from "@/lib/store"

export function FinancialDashboard() {
    const [tab, setTab] = useState("dashboard")
    const [loading, setLoading] = useState(true)
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    
    // Filters
    const [month, setMonth] = useState(new Date().getMonth().toString())
    const [year, setYear] = useState(new Date().getFullYear().toString())

    async function load() {
        setLoading(true)
        try {
            const [c, e] = await Promise.all([
                getFinancialCharges(),
                getExpenses()
            ])
            setCharges(c)
            setExpenses(e)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    // Filter functions
    const inCurrentMonth = (dateString?: string) => {
        if (!dateString) return false;
        // Adjust for timezone issues if dateString is yyyy-mm-dd
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
             const y = parts[0], m = parseInt(parts[1], 10) - 1;
             return m.toString() === month && y === year;
        }
        const d = new Date(dateString)
        return d.getMonth().toString() === month && d.getFullYear().toString() === year
    }

    // Revenue
    const revenueCharges = charges.filter(c => c.type !== 'expense')
    
    const pendingAmount = revenueCharges
        .filter(c => (c.status === 'pending' || c.status === 'late') && inCurrentMonth(c.dueDate))
        .reduce((acc, curr) => acc + curr.amount, 0)

    const realizedRevenue = revenueCharges
        .filter(c => c.status === 'paid' && inCurrentMonth(c.paymentDate || c.dueDate))
        .reduce((acc, curr) => acc + (curr.actualPaidAmount ?? curr.amount), 0)

    // Expenses
    const expenseCharges = charges.filter(c => c.type === 'expense')
    
    // Projected expenses (from expenses table only, since pro-labore is inserted on-the-fly when paid)
    const projectedExpenses = expenses
        .filter(e => inCurrentMonth(e.dueDate))
        .reduce((acc, curr) => acc + curr.amount, 0)

    const realizedExpensesFromTable = expenses
        .filter(e => e.status === 'paid' && inCurrentMonth(e.paidAt || e.dueDate))
        .reduce((acc, curr) => acc + curr.amount, 0)
        
    const realizedExpensesFromCharges = expenseCharges
        .filter(c => c.status === 'paid' && inCurrentMonth(c.paymentDate || c.dueDate))
        .reduce((acc, curr) => acc + (curr.actualPaidAmount ?? curr.amount), 0)

    const realizedExpenses = realizedExpensesFromTable + realizedExpensesFromCharges
    const netBalance = realizedRevenue - realizedExpenses

    // Chart Data
    const fluxoData = [
        { name: 'Entradas', previsto: pendingAmount + realizedRevenue, realizado: realizedRevenue },
        { name: 'Saídas', previsto: projectedExpenses + realizedExpensesFromCharges, realizado: realizedExpenses },
    ]

    const categoriasMap = expenses
        .filter(e => e.status === 'paid' && inCurrentMonth(e.paidAt || e.dueDate))
        .reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {} as Record<string, number>);

    if (realizedExpensesFromCharges > 0) {
        categoriasMap['pro-labore'] = (categoriasMap['pro-labore'] || 0) + realizedExpensesFromCharges;
    }

    const gastosData = Object.entries(categoriasMap).map(([cat, total]) => ({
        name: cat,
        value: total,
        color: cat === 'fixa' ? '#F97316' : cat === 'infra' ? '#0EA5E9' : cat === 'pro-labore' ? '#10B981' : '#8B5CF6'
    }))

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground italic">Sincronizando fluxo de caixa...</p>
        </div>
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 premium-gradient rounded-xl shadow-lg shadow-orange/20 text-white">
                            <LayoutDashboard className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight font-serif uppercase text-foreground">Gestão Financeira</h2>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Escola de Teologia IETEO</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 bg-card border border-border p-2 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Filter className="h-3 w-3" /> Filtrar Resultados
                    </div>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[130px] h-9 text-xs font-bold rounded-xl border-none bg-muted/50 focus:ring-0">
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                                <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px] h-9 text-xs font-bold rounded-xl border-none bg-muted/50 focus:ring-0">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {["2024", "2025", "2026", "2027"].map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-muted" onClick={load}>
                        Geral
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <FinancialKpiCards 
                pendingAmount={pendingAmount}
                realizedRevenue={realizedRevenue}
                projectedExpenses={projectedExpenses}
                realizedExpenses={realizedExpenses}
                netBalance={netBalance}
            />

            {/* Main Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50 rounded-2xl border border-border/50">
                    <TabsTrigger value="dashboard" className="rounded-xl py-2.5 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="revenue" className="rounded-xl py-2.5 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                        <ArrowUpCircle className="h-4 w-4" /> Receitas
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="rounded-xl py-2.5 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                        <ArrowDownCircle className="h-4 w-4" /> Despesas
                    </TabsTrigger>
                    <TabsTrigger value="prolabore" className="rounded-xl py-2.5 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                        <GraduationCap className="h-4 w-4" /> Pro-labore
                    </TabsTrigger>
                    <TabsTrigger value="config" className="rounded-xl py-2.5 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                        <Settings className="h-4 w-4" /> Ajustes
                    </TabsTrigger>
                </TabsList>

                <div className="mt-8 space-y-8 animate-in fade-in duration-500">
                    <TabsContent value="dashboard" className="m-0 space-y-8">
                        <FinancialCharts fluxoData={fluxoData} gastosData={gastosData} />
                        {/* Summary Table or recent items could go here */}
                    </TabsContent>

                    <TabsContent value="revenue" className="m-0">
                        <FinancialManager onRefresh={load} />
                    </TabsContent>

                    <TabsContent value="expenses" className="m-0">
                        <ExpenseManager onRefresh={load} />
                    </TabsContent>

                    <TabsContent value="prolabore" className="m-0">
                        <ProLaboreManager onRefresh={load} />
                    </TabsContent>

                    <TabsContent value="config" className="m-0">
                        <FinancialConfig />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
