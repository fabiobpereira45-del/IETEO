"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle, Clock, CheckCircle2, Library, FileText, BookOpenCheck, MessageSquare, Star } from "lucide-react"
import type { StudentProfile, FinancialCharge, Discipline } from "@/lib/store"
import { cn } from "@/lib/utils"

type Tab = "overview" | "class-info" | "curriculum" | "materials" | "grades" | "exams" | "financial" | "chat" | "perfil"

interface OverviewTabProps {
  profile: StudentProfile
  charges: FinancialCharge[]
  disciplines: Discipline[]
  onTabChange: (tab: Tab) => void
}

export function OverviewTab({ profile, charges, disciplines, onTabChange }: OverviewTabProps) {
  const now = new Date()
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0')
  const currentYear = now.getFullYear().toString()

  const focusDisc = disciplines.find(d => d.applicationMonth === currentMonth && d.applicationYear === currentYear)
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {charges.some(c => c.status === 'late') && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-4 items-center animate-pulse">
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-black text-red-800 text-sm">PENDÊNCIA FINANCEIRA: Regularize seu acesso!</p>
            <p className="text-xs text-red-700 font-medium">Sua mensalidade está vencida. Regularize sua situação para manter seu acesso aos materiais e avaliações.</p>
          </div>
          <Button size="sm" onClick={() => onTabChange("financial")} className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 shadow-lg shadow-red-200">
            Regularizar
          </Button>
        </div>
      )}

      {charges.some(c => c.status === 'pending') && !charges.some(c => c.status === 'late') && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-4 items-center shadow-sm">
          <div className="bg-emerald-500 p-2 rounded-xl text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-emerald-800 text-sm">Você está em dia! Que tal antecipar sua próxima mensalidade?</p>
            <p className="text-xs text-emerald-700">Garanta sua tranquilidade e ajude a manter nossa instituição. Clique em pagar para ver as opções.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onTabChange("financial")} className="border-emerald-400 text-emerald-700 hover:bg-emerald-100 font-bold h-9">
            Antecipar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border border-white/10" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl opacity-30" style={{ backgroundColor: '#b45309' }} />
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div>
              <h3 className="text-3xl font-bold font-serif mb-2 leading-tight drop-shadow-md">Que a graça do nosso <br /> Senhor Jesus esteja contigo!</h3>
              <p className="text-slate-200 text-base max-w-md mt-4 leading-relaxed font-medium">
                Bem-vindo de volta, {profile.name.split(' ')[0]}. Sua jornada teológica está em andamento.
              </p>
            </div>
            <div className="flex gap-4">
              <Button className="text-white font-bold rounded-2xl h-12 px-8 shadow-lg transition-all hover:scale-105" style={{ backgroundColor: '#b45309' }} onClick={() => onTabChange("curriculum")}>
                Ver Grade
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10 font-bold rounded-2xl h-12 px-8" onClick={() => onTabChange("materials")}>
                Materiais
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border/50 shadow-sm rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden group">
          {focusDisc ? (
             <>
                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-md">
                   <Star className="h-3 w-3 fill-white" /> Em Foco
                </div>
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2 ring-4 ring-primary/5 transition-transform group-hover:scale-110">
                  <Star className="h-8 w-8 fill-primary" />
                </div>
                <h3 className="text-xl font-bold leading-tight line-clamp-2">{focusDisc.name}</h3>
                <div className="flex flex-col items-center gap-1 mt-1">
                    <p className="text-muted-foreground text-[10px] leading-relaxed uppercase tracking-widest font-bold">
                        Disciplina deste Mês
                    </p>
                    <span className="text-[10px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        {focusDisc.applicationMonth}/{focusDisc.applicationYear}
                    </span>
                </div>
                {focusDisc.description && (
                   <p className="text-[11px] text-muted-foreground line-clamp-2 italic px-4">
                      {focusDisc.description}
                   </p>
                )}
                <div className="pt-2">
                  <Button size="sm" variant="outline" className="rounded-full px-6 h-8 text-[10px] font-bold uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5" onClick={() => onTabChange("curriculum")}>
                    Ver Detalhes
                  </Button>
                </div>
             </>
          ) : (
            <>
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2 ring-4 ring-primary/5">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Status Acadêmico</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                No momento você está em dia com todas as obrigações e materiais.
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100 uppercase tracking-tighter">
                  Matrícula Regular
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: "materials", label: "Materiais", sub: "Apostilas e PDFs", icon: Library, color: "text-blue-600", bg: "bg-blue-50" },
          { id: "grades", label: "Boletim", sub: "Notas e Frequência", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
          { id: "exams", label: "Avaliações", sub: "Provas disponíveis", icon: BookOpenCheck, color: "text-green-600", bg: "bg-green-50" },
          { id: "chat", label: "Suporte", sub: "Dúvidas e Chat", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((card) => (
          <button key={card.id} onClick={() => onTabChange(card.id as Tab)} className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all text-left flex flex-col group">
            <div className={cn("p-2 rounded-xl mb-4 w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-110", card.bg, card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-foreground">{card.label}</h4>
            <p className="text-[11px] text-muted-foreground mt-1 uppercase font-semibold tracking-tighter">{card.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
