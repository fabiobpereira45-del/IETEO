"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  variant: "primary" | "success" | "danger" | "warning" | "info"
  className?: string
}

export function KpiCard({ title, value, subtitle, icon, variant, className }: KpiCardProps) {
  const variants = {
    primary: "bg-indigo-50 text-indigo-700 border-indigo-100 icon-bg-indigo-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100 icon-bg-emerald-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100 icon-bg-rose-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100 icon-bg-amber-100",
    info: "bg-sky-50 text-sky-700 border-sky-100 icon-bg-sky-100",
  }

  const iconColors = {
    primary: "bg-indigo-500/10 text-indigo-600",
    success: "bg-emerald-500/10 text-emerald-600",
    danger: "bg-rose-500/10 text-rose-600",
    warning: "bg-amber-500/10 text-amber-600",
    info: "bg-sky-500/10 text-sky-600",
  }

  return (
    <Card className={cn("border shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300", className, variants[variant])}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
              {title}
            </p>
            <h3 className="text-2xl font-bold tracking-tight">
              {value}
            </h3>
            {subtitle && (
              <p className="text-[10px] opacity-60 font-medium pt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110 duration-300 shadow-sm", iconColors[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FinancialKpiCardsProps {
  pendingAmount: number
  realizedRevenue: number
  projectedExpenses: number
  realizedExpenses: number
  netBalance: number
}

export function FinancialKpiCards({
  pendingAmount,
  realizedRevenue,
  projectedExpenses,
  realizedExpenses,
  netBalance
}: FinancialKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        title="Mensalidades em Aberto"
        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount)}
        subtitle="Previsão do mês"
        variant="warning"
        icon={<CalendarDays className="h-5 w-5" />}
      />
      <KpiCard
        title="Receita Realizada"
        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realizedRevenue)}
        subtitle={`No mês. Acumulado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realizedRevenue)}`}
        variant="success"
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <KpiCard
        title="Despesas Projetadas"
        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedExpenses)}
        subtitle="Previsto no mês"
        variant="danger"
        icon={<TrendingDown className="h-5 w-5" />}
      />
      <KpiCard
        title="Despesa Realizada"
        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realizedExpenses)}
        subtitle="No mês"
        variant="danger"
        icon={<TrendingDown className="h-5 w-5 opacity-70" />}
      />
      <KpiCard
        title="Saldo Líquido (Real)"
        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}
        subtitle="Entradas - Saídas (mês)"
        variant="info"
        icon={<Wallet className="h-5 w-5" />}
        className="bg-indigo-600 text-white border-indigo-700"
      />
    </div>
  )
}
