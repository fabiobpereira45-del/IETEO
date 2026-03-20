"use client"

import { useState } from "react"
import { Building2, Target, Users, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"

const ABOUT_US_TEXT = `O Instituto de Ensino Teológico - IETEO é uma instituição dedicada à formação ministerial e acadêmica de líderes cristãos. Nossa estrutura foca na excelência do ensino bíblico-teológico, proporcionando aos alunos uma base sólida para o exercício do ministério. 

A diretoria é composta por uma equipe experiente:
- PRESIDÊNCIA: Pr. Felipe das Virgens e Pr. Nicodemos Glória
- REITORIA: Pb. Fábio Barreto e Pb. Aislan Bastos

Nosso compromisso é com a verdade bíblica e o desenvolvimento integral de nossos estudantes.`

const MISSION_TEXT = `Nossa missão é capacitar homens e mulheres para o serviço cristão através do ensino teológico de alta qualidade, integrando conhecimento acadêmico e vivência espiritual. Buscamos ser um referencial em educação teológica, formando obreiros aprovados que manejam bem a palavra da verdade e estão prontos para os desafios do mundo contemporâneo.`

export function InstitutionalManager() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quem Somos */}
        <div className="bg-card border border-border rounded-2xl p-6 premium-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Quem Somos</h3>
          </div>
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {ABOUT_US_TEXT}
            </p>
          </div>
        </div>

        {/* Nossa Missão */}
        <div className="bg-card border border-border rounded-2xl p-6 premium-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-orange/10 text-orange">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Nossa Missão</h3>
          </div>
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {MISSION_TEXT}
            </p>
          </div>
        </div>
      </div>

      {/* Diretoria Details */}
      <div className="bg-card border border-border rounded-2xl p-6 premium-shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
            <Landmark className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Corpo Diretivo</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Presidência</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">FV</div>
                <p className="text-sm font-semibold">Pr. Felipe das Virgens</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">NG</div>
                <p className="text-sm font-semibold">Pr. Nicodemos Glória</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Reitoria</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">FB</div>
                <p className="text-sm font-semibold">Pb. Fábio Barreto</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">AB</div>
                <p className="text-sm font-semibold">Pb. Aislan Bastos</p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}
