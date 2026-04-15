"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react"

interface FinancialChartsProps {
  fluxoData: { name: string; previsto: number; realizado: number }[]
  gastosData: { name: string; value: number; color: string }[]
}

export function FinancialCharts({ fluxoData, gastosData }: FinancialChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Fluxo: Previsto vs Realizado</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fluxoData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#888' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#888' }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="previsto" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Previsto" />
              <Bar dataKey="realizado" fill="#F97316" radius={[4, 4, 0, 0]} name="Realizado" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Distribuição de Gastos</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center pt-4 relative">
          {gastosData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gastosData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gastosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center space-y-2 opacity-50">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground mx-auto flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">Nenhuma despesa realizada</p>
              <p className="text-[10px]">As despesas aparecem aqui após serem "Quitadas"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TrendingDown({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}
