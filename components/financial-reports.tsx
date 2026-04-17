"use client"

import { useEffect, useState } from "react"
import {
    FileText, Printer, Download,
    Users, TrendingUp, TrendingDown, BarChart3, GraduationCap, CalendarDays,
    Loader2, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    type FinancialCharge, type StudentProfile, type Expense,
    getFinancialCharges, getStudents, getExpenses, getProLaboreCalculations,
} from "@/lib/store"
import {
    printFinancialReportPDF,
} from "@/lib/pdf"
import { createClient } from "@/lib/supabase/client"

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const YEARS = ["2024", "2025", "2026", "2027"]

function formatCurrency(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function isInPeriod(dateStr: string, scope: "month" | "year" | "all", month: string, year: string) {
    if (scope === "all") return true
    const d = new Date(dateStr + "T12:00:00")
    if (scope === "year") return d.getFullYear().toString() === year
    return d.getFullYear().toString() === year && d.getMonth().toString() === month
}

// ─── Report Block Card ───────────────────────────────────────────────────────

interface ReportCardProps {
    icon: React.ReactNode
    title: string
    description: string
    color: string
    badge?: string
    children: React.ReactNode
    onPrint: () => void
    loading?: boolean
}

function ReportCard({ icon, title, description, color, badge, children, onPrint, loading }: ReportCardProps) {
    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`px-5 py-4 border-b border-border flex items-center justify-between ${color}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        {icon}
                    </div>
                    <div>
                        <div className="font-bold text-sm text-white">{title}</div>
                        <div className="text-[10px] text-white/70 uppercase tracking-wider mt-0.5">{description}</div>
                    </div>
                </div>
                {badge && (
                    <span className="text-[10px] font-black bg-white/20 text-white px-2.5 py-1 rounded-full border border-white/30">
                        {badge}
                    </span>
                )}
            </div>

            {/* Filters */}
            <div className="p-4 space-y-3 bg-muted/10">
                {children}
            </div>

            {/* Print Button */}
            <div className="px-4 pb-4">
                <Button
                    className="w-full h-9 text-xs font-bold gap-2 shadow-sm"
                    onClick={onPrint}
                    disabled={loading}
                >
                    {loading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Printer className="h-4 w-4" />
                    }
                    Imprimir / Salvar PDF
                    <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />
                </Button>
            </div>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FinancialReports() {
    const [globalScope, setGlobalScope] = useState<"month" | "year" | "all">("month")
    const [globalMonth, setGlobalMonth] = useState(new Date().getMonth().toString())
    const [globalYear, setGlobalYear] = useState(new Date().getFullYear().toString())

    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [students, setStudents] = useState<StudentProfile[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [proLabore, setProLabore] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [printing, setPrinting] = useState<string | null>(null)

    // Per-report filter state
    const [mensScope, setMensScope] = useState<"month" | "year" | "all">("month")
    const [mensMonth, setMensMonth] = useState(new Date().getMonth().toString())
    const [mensYear, setMensYear] = useState(new Date().getFullYear().toString())
    const [mensClass, setMensClass] = useState("all")
    const [mensStatus, setMensStatus] = useState("all")

    const [expScope, setExpScope] = useState<"month" | "year" | "all">("month")
    const [expMonth, setExpMonth] = useState(new Date().getMonth().toString())
    const [expYear, setExpYear] = useState(new Date().getFullYear().toString())
    const [expStatus, setExpStatus] = useState("all")

    const [dreScope, setDreScope] = useState<"month" | "year">("month")
    const [dreMonth, setDreMonth] = useState(new Date().getMonth().toString())
    const [dreYear, setDreYear] = useState(new Date().getFullYear().toString())

    const [plMonth, setPlMonth] = useState(new Date().getMonth().toString())
    const [plYear, setPlYear] = useState(new Date().getFullYear().toString())

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        try {
            const supabase = createClient()
            const [ch, st, ex, pl, clResult] = await Promise.all([
                getFinancialCharges(),
                getStudents(),
                getExpenses(),
                getProLaboreCalculations(),
                supabase.from('classes').select('*').order('name')
            ])
            setCharges(ch)
            setStudents(st)
            setExpenses(ex)
            setProLabore(pl)
            setClasses(clResult.data || [])
        } catch (e) {
            console.error("Erro ao carregar dados:", e)
        } finally {
            setLoading(false)
        }
    }

    // ── Mensalidades Report ──────────────────────────────────────────────────

    function handlePrintMensalidades() {
        setPrinting("mensalidades")
        try {
            const filteredStudents = students.filter(s => {
                const matchClass = mensClass === "all" || s.class_id === mensClass
                return matchClass
            })

            const filteredCharges = charges.filter(c => {
                if ((c.type as any) === "expense") return false
                const student = filteredStudents.find(s => s.id === c.studentId)
                if (!student) return false

                const matchPeriod = isInPeriod(c.dueDate, mensScope, mensMonth, mensYear)
                const matchStatus = mensStatus === "all" || c.status === mensStatus
                return matchPeriod && matchStatus
            })

            printFinancialReportPDF(filteredCharges, filteredStudents)
        } finally {
            setPrinting(null)
        }
    }

    // ── Expenses Report ──────────────────────────────────────────────────────

    function handlePrintDespesas() {
        setPrinting("despesas")
        try {
            const filteredExpenses = expenses.filter(e => {
                const matchPeriod = isInPeriod(e.dueDate, expScope, expMonth, expYear)
                const matchStatus = expStatus === "all" || e.status === expStatus
                return matchPeriod && matchStatus
            })

            printExpensesPDF(filteredExpenses, expScope, expMonth, expYear)
        } finally {
            setPrinting(null)
        }
    }

    // ── DRE Report ───────────────────────────────────────────────────────────

    function handlePrintDRE() {
        setPrinting("dre")
        try {
            const periodCharges = charges.filter(c =>
                (c.type as any) !== "expense" && isInPeriod(c.dueDate, dreScope, dreMonth, dreYear)
            )
            const periodExpenses = expenses.filter(e =>
                isInPeriod(e.dueDate, dreScope, dreMonth, dreYear)
            )
            const periodProLabore = proLabore.filter(pl =>
                isInPeriod(pl.created_at || pl.dueDate || "", dreScope, dreMonth, dreYear)
            )

            printDREReportPDF(periodCharges, periodExpenses, periodProLabore, dreScope, dreMonth, dreYear, students)
        } finally {
            setPrinting(null)
        }
    }

    // ── Pro-labore Report ────────────────────────────────────────────────────

    function handlePrintProLabore() {
        setPrinting("prolabore")
        try {
            const filteredPL = proLabore.filter(pl =>
                isInPeriod(pl.created_at || pl.payment_date || "", "year", plMonth, plYear)
            )
            printProLaboreReportPDF(filteredPL, plMonth, plYear)
        } finally {
            setPrinting(null)
        }
    }

    // ── Totals for display ───────────────────────────────────────────────────

    const totalReceita = charges
        .filter(c => (c.type as any) !== "expense" && c.status === "paid")
        .reduce((a, c) => a + c.amount, 0)

    const totalDespesas = expenses
        .filter(e => e.status === "paid")
        .reduce((a, e) => a + e.amount, 0)

    const totalPendente = charges
        .filter(c => (c.type as any) !== "expense" && c.status !== "paid" && c.status !== "cancelled" && c.status !== "bolsa100" && c.status !== "bolsa50" && c.status !== "isento")
        .reduce((a, c) => a + c.amount, 0)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Carregando dados para relatórios...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold font-serif flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Central de Relatórios
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Todos os relatórios em um único lugar. Configure os filtros e imprima os PDF.
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={load} className="text-xs">
                    <Loader2 className="h-3 w-3 mr-2" /> Atualizar Dados
                </Button>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Receita Total Realizada</div>
                    <div className="text-2xl font-black text-green-700">{formatCurrency(totalReceita)}</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <div className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Despesas Pagas</div>
                    <div className="text-2xl font-black text-rose-700">{formatCurrency(totalDespesas)}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Inadimplência Total</div>
                    <div className="text-2xl font-black text-amber-700">{formatCurrency(totalPendente)}</div>
                </div>
            </div>

            {/* Report Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {/* 1 - Mensalidades */}
                <ReportCard
                    icon={<Users className="h-4 w-4 text-white" />}
                    title="Mensalidades por Aluno"
                    description="Status financeiro de cada aluno"
                    color="bg-gradient-to-r from-blue-600 to-blue-500"
                    badge={`${students.length} alunos`}
                    onPrint={handlePrintMensalidades}
                    loading={printing === "mensalidades"}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Período</Label>
                            <Select value={mensScope} onValueChange={(v: any) => setMensScope(v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">Mês</SelectItem>
                                    <SelectItem value="year">Ano</SelectItem>
                                    <SelectItem value="all">Geral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status</Label>
                            <Select value={mensStatus} onValueChange={setMensStatus}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="paid">Pago</SelectItem>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                    <SelectItem value="late">Atrasado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {mensScope !== "all" && (
                        <div className="grid grid-cols-2 gap-2">
                            {mensScope === "month" && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mês</Label>
                                    <Select value={mensMonth} onValueChange={setMensMonth}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ano</Label>
                                <Select value={mensYear} onValueChange={setMensYear}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Turma</Label>
                        <Select value={mensClass} onValueChange={setMensClass}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Turmas</SelectItem>
                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </ReportCard>

                {/* 2 - Despesas */}
                <ReportCard
                    icon={<TrendingDown className="h-4 w-4 text-white" />}
                    title="Relatório de Despesas"
                    description="Saídas e conta a pagar"
                    color="bg-gradient-to-r from-rose-600 to-rose-500"
                    badge={`${expenses.length} lançamentos`}
                    onPrint={handlePrintDespesas}
                    loading={printing === "despesas"}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Período</Label>
                            <Select value={expScope} onValueChange={(v: any) => setExpScope(v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">Mês</SelectItem>
                                    <SelectItem value="year">Ano</SelectItem>
                                    <SelectItem value="all">Geral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status</Label>
                            <Select value={expStatus} onValueChange={setExpStatus}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="paid">Pago</SelectItem>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {expScope !== "all" && (
                        <div className="grid grid-cols-2 gap-2">
                            {expScope === "month" && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mês</Label>
                                    <Select value={expMonth} onValueChange={setExpMonth}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ano</Label>
                                <Select value={expYear} onValueChange={setExpYear}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </ReportCard>

                {/* 3 - DRE */}
                <ReportCard
                    icon={<BarChart3 className="h-4 w-4 text-white" />}
                    title="DRE — Demonstrativo de Resultado"
                    description="Receitas vs. Despesas consolidadas"
                    color="bg-gradient-to-r from-violet-600 to-violet-500"
                    onPrint={handlePrintDRE}
                    loading={printing === "dre"}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Período</Label>
                            <Select value={dreScope} onValueChange={(v: any) => setDreScope(v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">Mensal</SelectItem>
                                    <SelectItem value="year">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ano</Label>
                            <Select value={dreYear} onValueChange={setDreYear}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {dreScope === "month" && (
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mês</Label>
                            <Select value={dreMonth} onValueChange={setDreMonth}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="rounded-lg bg-violet-50 border border-violet-100 p-2.5">
                        <div className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-1">Inclui no relatório:</div>
                        <div className="text-[10px] text-violet-700 space-y-0.5">
                            <div>· Mensalidades realizadas (pagas)</div>
                            <div>· Despesas pagas no período</div>
                            <div>· Pro-labore pago no período</div>
                            <div>· Saldo líquido do período</div>
                        </div>
                    </div>
                </ReportCard>

                {/* 4 - Pro-labore */}
                <ReportCard
                    icon={<GraduationCap className="h-4 w-4 text-white" />}
                    title="Relatório de Pro-labore"
                    description="Pagamentos por professor e disciplina"
                    color="bg-gradient-to-r from-emerald-600 to-emerald-500"
                    badge={`${proLabore.length} registros`}
                    onPrint={handlePrintProLabore}
                    loading={printing === "prolabore"}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mês</Label>
                            <Select value={plMonth} onValueChange={setPlMonth}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ano</Label>
                            <Select value={plYear} onValueChange={setPlYear}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground italic">
                        O relatório lista cada professor, as disciplinas ministradas e os valores pagos no período.
                    </div>
                </ReportCard>

                {/* 5 - Contas a Receber */}
                <ReportCard
                    icon={<TrendingUp className="h-4 w-4 text-white" />}
                    title="Contas a Receber"
                    description="Inadimplência e débitos pendentes"
                    color="bg-gradient-to-r from-amber-600 to-amber-500"
                    badge={`${formatCurrency(totalPendente)}`}
                    onPrint={() => {
                        setPrinting("receber")
                        try {
                            const pendingCharges = charges.filter(c =>
                                (c.type as any) !== "expense" &&
                                c.status !== "paid" &&
                                c.status !== "cancelled" &&
                                c.status !== "bolsa100" &&
                                c.status !== "bolsa50" &&
                                c.status !== "isento"
                            )
                            printFinancialReportPDF(pendingCharges, students)
                        } finally {
                            setPrinting(null)
                        }
                    }}
                    loading={printing === "receber"}
                >
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 space-y-1">
                        <div className="text-[9px] font-black text-amber-700 uppercase tracking-wider">Relatório completo de inadimplência</div>
                        <div className="text-[10px] text-amber-700">
                            Inclui todos os alunos com pendências financeiras abertas, independente do período, com o valor total em atraso.
                        </div>
                    </div>
                </ReportCard>

                {/* 6 - Resumo Geral */}
                <ReportCard
                    icon={<FileText className="h-4 w-4 text-white" />}
                    title="Extrato Geral por Aluno"
                    description="Histórico completo de cobranças"
                    color="bg-gradient-to-r from-slate-600 to-slate-500"
                    badge="Todos os alunos"
                    onPrint={() => {
                        setPrinting("extrato")
                        try {
                            const allStudentCharges = charges.filter(c => (c.type as any) !== "expense")
                            printFinancialReportPDF(allStudentCharges, students)
                        } finally {
                            setPrinting(null)
                        }
                    }}
                    loading={printing === "extrato"}
                >
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Extrato histórico geral</div>
                        <div className="text-[10px] text-slate-600">
                            Exibe todos os alunos com o total pago, total pendente e situação. Útil para auditorias e prestação de contas.
                        </div>
                    </div>
                </ReportCard>

            </div>
        </div>
    )
}

// ─── PDF Generation Functions (in-module helpers) ────────────────────────────

function printExpensesPDF(expenses: any[], scope: string, month: string, year: string) {
    const periodLabel = scope === "all"
        ? "Geral"
        : scope === "year"
            ? year
            : `${["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][parseInt(month)]}/${year}`

    const totalPaid = expenses.filter(e => e.status === "paid").reduce((a, e) => a + e.amount, 0)
    const totalPending = expenses.filter(e => e.status === "pending").reduce((a, e) => a + e.amount, 0)
    const totalAll = expenses.reduce((a, e) => a + e.amount, 0)

    // Group by category
    const categories: Record<string, number> = {}
    expenses.forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + e.amount
    })

    const catRows = Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `
        <tr>
            <td style="padding:8px 12px;font-size:13px;font-weight:600">${cat}</td>
            <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:700;color:#dc2626">R$ ${val.toFixed(2)}</td>
        </tr>
    `).join("")

    const rows = expenses.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(e => `
        <tr style="border-bottom:1px solid #eee">
            <td style="padding:9px 12px;font-size:12px;font-weight:600">${e.description}</td>
            <td style="padding:9px 12px;font-size:11px;color:#64748b">${e.category}</td>
            <td style="padding:9px 12px;font-size:12px">${new Date(e.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</td>
            <td style="padding:9px 12px;font-size:12px;font-weight:700;color:#dc2626">R$ ${e.amount.toFixed(2)}</td>
            <td style="padding:9px 12px;font-size:10px;font-weight:800;color:${e.status === "paid" ? "#16a34a" : "#d97706"}">
                ${e.status === "paid" ? "PAGO" : "PENDENTE"}
            </td>
        </tr>
    `).join("")

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Relatório de Despesas — ${periodLabel}</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;color:#1e293b;padding:32px}
        @media print{body{padding:0}}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;background:#f8fafc;border-bottom:2px solid #e2e8f0;padding:10px 12px;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:.5px}
    </style>
    </head><body>
    <div style="border-bottom:5px solid #1e3a5f;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
            <div style="font-size:11px;font-weight:800;color:#f97316;text-transform:uppercase;margin-bottom:4px;letter-spacing:1px">Instituto de Ensino Teológico — IETEO</div>
            <h1 style="font-size:26px;font-weight:800;color:#1e3a5f;margin:0">Relatório de Despesas</h1>
            <div style="font-size:14px;color:#64748b;margin-top:4px;font-weight:600">Período: ${periodLabel}</div>
        </div>
        <div style="text-align:right;font-size:13px">
            <div style="color:#dc2626;font-weight:800;font-size:18px">Total: R$ ${totalAll.toFixed(2)}</div>
            <div style="color:#16a34a;margin-top:2px">Pago: R$ ${totalPaid.toFixed(2)}</div>
            <div style="color:#d97706">Pendente: R$ ${totalPending.toFixed(2)}</div>
        </div>
    </div>

    <h3 style="font-size:13px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Por Categoria</h3>
    <table style="margin-bottom:30px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        ${catRows}
    </table>

    <h3 style="font-size:13px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Lançamentos Detalhados</h3>
    <table>
        <thead><tr>
            <th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">Nenhuma despesa no período</td></tr>`}</tbody>
    </table>

    <div style="margin-top:40px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #eee;padding-top:16px">
        Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — Sistema IETEO
    </div>
    </body></html>`

    const win = window.open("", "_blank", "width=1000,height=800")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
}

function printDREReportPDF(
    charges: any[], expenses: any[], proLabore: any[],
    scope: string, month: string, year: string,
    students: any[]
) {
    const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
    const periodLabel = scope === "year" ? year : `${monthNames[parseInt(month)]}/${year}`

    const receitaRealizada = charges
        .filter(c => c.status === "paid")
        .reduce((a: number, c: any) => a + c.amount, 0)

    const receitaProjetada = charges.reduce((a: number, c: any) => {
        if (c.status === "bolsa100" || c.status === "isento" || c.status === "cancelled") return a
        return a + c.amount
    }, 0)

    const despesasPagas = expenses
        .filter((e: any) => e.status === "paid")
        .reduce((a: number, e: any) => a + e.amount, 0)

    const despesasPendentes = expenses
        .filter((e: any) => e.status === "pending")
        .reduce((a: number, e: any) => a + e.amount, 0)

    const proLaboreTotal = proLabore.reduce((a: number, pl: any) => a + (pl.amount || 0), 0)

    const saldoRealizado = receitaRealizada - despesasPagas - proLaboreTotal
    const saldoProjetado = receitaProjetada - (despesasPagas + despesasPendentes) - proLaboreTotal

    const saldoColor = saldoRealizado >= 0 ? "#16a34a" : "#dc2626"
    const saldoProjColor = saldoProjetado >= 0 ? "#16a34a" : "#dc2626"

    // Category breakdown for expenses
    const expCategories: Record<string, number> = {}
    expenses.filter((e: any) => e.status === "paid").forEach((e: any) => {
        expCategories[e.category] = (expCategories[e.category] || 0) + e.amount
    })
    const expCatRows = Object.entries(expCategories).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `
        <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:8px 16px;font-size:12px;color:#64748b">${cat}</td>
            <td style="padding:8px 16px;font-size:12px;text-align:right;color:#dc2626;font-weight:700">R$ ${(val as number).toFixed(2)}</td>
        </tr>
    `).join("")

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>DRE — ${periodLabel}</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;color:#1e293b;padding:40px;background:#f8fafc}
        @media print{body{padding:0;background:white}}
        .card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px}
        .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9}
        .row:last-child{border-bottom:none}
    </style></head><body>

    <div style="max-width:800px;margin:0 auto">
        <div style="text-align:center;margin-bottom:30px">
            <div style="font-size:11px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Instituto de Ensino Teológico — IETEO</div>
            <h1 style="font-size:28px;font-weight:900;color:#1e3a5f;margin:0">DRE — Demonstrativo de Resultado</h1>
            <div style="font-size:15px;color:#64748b;margin-top:6px;font-weight:600">Período: ${periodLabel}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
        </div>

        <!-- Summary KPIs -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="background:white;border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Saldo Realizado</div>
                <div style="font-size:30px;font-weight:900;color:${saldoColor}">${saldoRealizado >= 0 ? "+" : ""}R$ ${saldoRealizado.toFixed(2)}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px">Receita paga − Despesas pagas</div>
            </div>
            <div style="background:white;border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Saldo Projetado</div>
                <div style="font-size:30px;font-weight:900;color:${saldoProjColor}">${saldoProjetado >= 0 ? "+" : ""}R$ ${saldoProjetado.toFixed(2)}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px">Receita total − Todas despesas</div>
            </div>
        </div>

        <!-- Receitas -->
        <div class="card">
            <h2 style="font-size:14px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">
                (+) RECEITAS
            </h2>
            <div class="row">
                <div>
                    <div style="font-size:13px;font-weight:600">Mensalidades Pagas</div>
                    <div style="font-size:11px;color:#94a3b8">Receita realizada no período</div>
                </div>
                <div style="font-size:15px;font-weight:800;color:#16a34a">+ R$ ${receitaRealizada.toFixed(2)}</div>
            </div>
            <div class="row" style="background:#f8fafc;padding:10px;border-radius:8px;margin-top:8px">
                <div style="font-size:12px;font-weight:700;color:#1e3a5f">Total de Receitas Realizadas</div>
                <div style="font-size:15px;font-weight:900;color:#16a34a">R$ ${receitaRealizada.toFixed(2)}</div>
            </div>
        </div>

        <!-- Despesas -->
        <div class="card">
            <h2 style="font-size:14px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.5px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">
                (−) DESPESAS OPERACIONAIS
            </h2>
            <div class="row">
                <div>
                    <div style="font-size:13px;font-weight:600">Despesas Pagas</div>
                    <div style="font-size:11px;color:#94a3b8">Saídas confirmadas no período</div>
                </div>
                <div style="font-size:15px;font-weight:800;color:#dc2626">− R$ ${despesasPagas.toFixed(2)}</div>
            </div>
            ${proLaboreTotal > 0 ? `
            <div class="row">
                <div>
                    <div style="font-size:13px;font-weight:600">Pro-labore Docente</div>
                    <div style="font-size:11px;color:#94a3b8">Pagamentos aos professores</div>
                </div>
                <div style="font-size:15px;font-weight:800;color:#dc2626">− R$ ${proLaboreTotal.toFixed(2)}</div>
            </div>` : ""}
            <div class="row" style="background:#f8fafc;padding:10px;border-radius:8px;margin-top:8px">
                <div style="font-size:12px;font-weight:700;color:#1e3a5f">Total de Despesas Pagas</div>
                <div style="font-size:15px;font-weight:900;color:#dc2626">R$ ${(despesasPagas + proLaboreTotal).toFixed(2)}</div>
            </div>
            ${expCatRows ? `
            <div style="margin-top:16px">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:8px">Detalhamento por Categoria</div>
                <table style="width:100%;border-collapse:collapse">
                    <tbody>${expCatRows}</tbody>
                </table>
            </div>` : ""}
        </div>

        <!-- Resultado Final -->
        <div style="background:${saldoRealizado >= 0 ? "#f0fdf4" : "#fef2f2"};border:2px solid ${saldoRealizado >= 0 ? "#16a34a" : "#dc2626"};border-radius:12px;padding:24px;text-align:center">
            <div style="font-size:12px;font-weight:800;color:${saldoColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">RESULTADO DO PERÍODO</div>
            <div style="font-size:36px;font-weight:900;color:${saldoColor}">${saldoRealizado >= 0 ? "+" : ""}R$ ${saldoRealizado.toFixed(2)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:8px">${saldoRealizado >= 0 ? "Superávit — A instituição operou com resultado positivo" : "Déficit — A instituição operou com resultado negativo"}</div>
        </div>

        <div style="margin-top:30px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px">
            Documento para uso interno. Gerado pelo Sistema de Gestão IETEO em ${new Date().toLocaleString("pt-BR")}
        </div>
    </div>
    </body></html>`

    const win = window.open("", "_blank", "width=1000,height=900")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
}

function printProLaboreReportPDF(proLabore: any[], month: string, year: string) {
    const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

    const totalPaid = proLabore.filter(pl => pl.status === "paid" || pl.payment_date).reduce((a, pl) => a + (pl.amount || 0), 0)
    const totalPending = proLabore.filter(pl => !pl.payment_date && pl.status !== "paid").reduce((a, pl) => a + (pl.amount || 0), 0)

    const rows = proLabore.map(pl => `
        <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 12px;font-size:12px;font-weight:600">${pl.professor_name || pl.professorName || "—"}</td>
            <td style="padding:10px 12px;font-size:12px">${pl.discipline_name || pl.disciplineName || "—"}</td>
            <td style="padding:10px 12px;font-size:12px">${pl.class_name || pl.className || "—"}</td>
            <td style="padding:10px 12px;font-size:12px;font-weight:700;color:#1e3a5f">R$ ${(pl.amount || 0).toFixed(2)}</td>
            <td style="padding:10px 12px;font-size:10px;font-weight:800;color:${(pl.status === "paid" || pl.payment_date) ? "#16a34a" : "#d97706"}">
                ${(pl.status === "paid" || pl.payment_date) ? "PAGO" : "PENDENTE"}
            </td>
        </tr>
    `).join("")

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Pro-labore — ${monthNames[parseInt(month)]}/${year}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1e293b;padding:32px}@media print{body{padding:0}}table{width:100%;border-collapse:collapse}th{text-align:left;background:#f8fafc;border-bottom:2px solid #e2e8f0;padding:10px 12px;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:.5px}</style>
    </head><body>
    <div style="border-bottom:5px solid #1e3a5f;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
            <div style="font-size:11px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Instituto de Ensino Teológico — IETEO</div>
            <h1 style="font-size:26px;font-weight:800;color:#1e3a5f">Relatório de Pro-labore</h1>
            <div style="font-size:14px;color:#64748b;font-weight:600">${monthNames[parseInt(month)]} / ${year}</div>
        </div>
        <div style="text-align:right">
            <div style="font-size:11px;color:#64748b">Total Pago: <strong style="color:#16a34a">R$ ${totalPaid.toFixed(2)}</strong></div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">Total Pendente: <strong style="color:#d97706">R$ ${totalPending.toFixed(2)}</strong></div>
        </div>
    </div>
    <table>
        <thead><tr>
            <th>Professor</th><th>Disciplina</th><th>Turma</th><th>Valor</th><th>Status</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">Nenhum registro de pro-labore encontrado</td></tr>`}</tbody>
    </table>
    <div style="margin-top:40px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #eee;padding-top:16px">
        Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — Sistema IETEO
    </div>
    </body></html>`

    const win = window.open("", "_blank", "width=1000,height=800")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
}
