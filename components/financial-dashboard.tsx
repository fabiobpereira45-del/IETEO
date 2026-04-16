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
    getProLaboreCalculations,
    type FinancialCharge, 
    type Expense 
} from "@/lib/store"

export function FinancialDashboard() {
    const [tab, setTab] = useState("dashboard")
    const [loading, setLoading] = useState(true)
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [proLaboreCalcs, setProLaboreCalcs] = useState<any[]>([])
    
    // Filters
    const [month, setMonth] = useState(new Date().getMonth().toString())
    const [year, setYear] = useState(new Date().getFullYear().toString())
    const [filterScope, setFilterScope] = useState<"month" | "year" | "all">("month")

    async function load() {
        setLoading(true)
        try {
            const [c, e, pl] = await Promise.all([
                getFinancialCharges(),
                getExpenses(),
                getProLaboreCalculations()
            ])
            setCharges(c)
            setExpenses(e)
            setProLaboreCalcs(pl)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    // Filter functions
    const isInScope = (dateString?: string) => {
        if (!dateString) return false;
        if (filterScope === "all") return true;

        const parts = dateString.split('T')[0].split('-');
        let y, m;
        if (parts.length === 3) {
             y = parts[0];
             m = (parseInt(parts[1], 10) - 1).toString();
        } else {
            const d = new Date(dateString);
            y = d.getFullYear().toString();
            m = d.getMonth().toString();
        }

        if (filterScope === "year") return y === year;
        if (filterScope === "month") return y === year && m === month;
        return false;
    }

    // Revenue
    const revenueCharges = charges.filter(c => c.type !== 'expense')
    
    const pendingAmount = revenueCharges
        .filter(c => (c.status === 'pending' || c.status === 'late') && isInScope(c.dueDate))
        .reduce((acc, curr) => acc + curr.amount, 0)

    const realizedRevenue = revenueCharges
        .filter(c => c.status === 'paid' && isInScope(c.paymentDate || c.dueDate))
        .reduce((acc, curr) => acc + (curr.actualPaidAmount ?? curr.amount), 0)

    // Expenses
    const expenseCharges = charges.filter(c => c.type === 'expense')
    
    // Projected expenses
    const projectedExpensesFromTable = expenses
        .filter(e => e.status !== 'cancelled' && isInScope(e.dueDate))
        .reduce((acc, curr) => acc + curr.amount, 0)

    const projectedProLabore = proLaboreCalcs
        .filter(item => !item.isPaid && isInScope(`${item.applicationYear}-${item.applicationMonth}-01`))
        .reduce((acc, curr) => acc + curr.totalAmount, 0)

    const projectedExpenses = projectedExpensesFromTable + projectedProLabore

    const realizedExpensesFromTable = expenses
        .filter(e => e.status === 'paid' && isInScope(e.paidAt || e.dueDate))
        .reduce((acc, curr) => acc + curr.amount, 0)
        
    const realizedExpensesFromCharges = expenseCharges
        .filter(c => c.status === 'paid' && isInScope(c.paymentDate || c.dueDate))
        .reduce((acc, curr) => acc + (curr.actualPaidAmount ?? curr.amount), 0)

    const realizedExpenses = realizedExpensesFromTable + realizedExpensesFromCharges
    const netBalance = realizedRevenue - realizedExpenses

    // Chart Data
    const fluxoData = [
        { name: 'Entradas', previsto: pendingAmount + realizedRevenue, realizado: realizedRevenue },
        { name: 'Saídas', previsto: projectedExpenses + realizedExpensesFromCharges, realizado: realizedExpenses },
    ]

    const categoriasMap = expenses
        .filter(e => e.status === 'paid' && isInScope(e.paidAt || e.dueDate))
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

    // Only show full loading if it's the VERY FIRST load
    if (loading && charges.length === 0) return (
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
                    {/* Scope Toggle */}
                    <div className="flex p-1 bg-muted rounded-xl gap-1 mr-2">
                        <Button 
                            variant={filterScope === 'month' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${filterScope === 'month' ? 'bg-card shadow-sm' : ''}`}
                            onClick={() => setFilterScope('month')}
                        >
                            Mês
                        </Button>
                        <Button 
                            variant={filterScope === 'year' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${filterScope === 'year' ? 'bg-card shadow-sm' : ''}`}
                            onClick={() => setFilterScope('year')}
                        >
                            Ano
                        </Button>
                        <Button 
                            variant={filterScope === 'all' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className={`h-8 px-4 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${filterScope === 'all' ? 'bg-card shadow-sm' : ''}`}
                            onClick={() => setFilterScope('all')}
                        >
                            Geral
                        </Button>
                    </div>

                    <div className="h-4 w-[1px] bg-border mx-1" />

                    <Select value={month} onValueChange={setMonth} disabled={filterScope !== 'month'}>
                        <SelectTrigger className={`w-[130px] h-9 text-xs font-bold rounded-xl border-none transition-opacity ${filterScope !== 'month' ? 'opacity-30 bg-muted/20 cursor-not-allowed' : 'bg-muted/50 focus:ring-0'}`}>
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                                <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={year} onValueChange={setYear} disabled={filterScope === 'all'}>
                        <SelectTrigger className={`w-[100px] h-9 text-xs font-bold rounded-xl border-none transition-opacity ${filterScope === 'all' ? 'opacity-30 bg-muted/20 cursor-not-allowed' : 'bg-muted/50 focus:ring-0'}`}>
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {["2024", "2025", "2026", "2027"].map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-muted" onClick={load} disabled={loading}>
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                        Atualizar
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
                        <FinancialManager 
                            onRefresh={load} 
                            scope={filterScope}
                            month={month}
                            year={year}
                        />
                    </TabsContent>

                    <TabsContent value="expenses" className="m-0">
                        <ExpenseManager 
                            onRefresh={load} 
                            scope={filterScope}
                            month={month}
                            year={year}
                        />
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
