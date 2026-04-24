"use client"

import { useState } from "react"
import { 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  BookOpen, 
  Users, 
  BarChart, 
  HelpCircle, 
  List, 
  Dna, 
  MessageSquare,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type ChallengeType, type Discipline } from "@/lib/store"

interface Props {
  disciplines: Discipline[]
  onImport?: (data: { title: string; description: string; content: string; correctAnswer?: string }) => void
}

export function AIChallengeGenerator({ disciplines }: Props) {
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id || "")
  const [audience, setAudience] = useState("Seminário Teológico / Graduação")
  const [difficulty, setDifficulty] = useState("Intermediário")
  const [type, setType] = useState<ChallengeType>("riddle")
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const selectedDiscipline = disciplines.find(d => d.id === disciplineId)

  const handleCopyPrompt = () => {
    let prompt = ""
    const discName = selectedDiscipline?.name || "Teologia"

    switch (type) {
      case "riddle":
        prompt = `Atue como um Especialista em Teologia. 
Crie um ENIGMA BÍBLICO (Riddle) instigante sobre "${discName}".
Público: ${audience}. Nível: ${difficulty}.

Instruções:
1. O enigma deve ser curto e poético ou misterioso.
2. Deve haver apenas UMA resposta correta (uma palavra ou nome curto).
3. Formato de saída:
Título: [Um título criativo]
Enigma: [O texto do enigma]
Resposta: [A palavra exata]`
        break
      case "quiz":
        prompt = `Atue como um Especialista em Teologia.
Gere um QUIZ RÁPIDO sobre "${discName}".
Público: ${audience}. Nível: ${difficulty}.

Instruções:
1. Gere 3 perguntas de múltipla escolha.
2. Cada pergunta deve ter 4 opções.
3. Formato de saída (JSON amigável):
Título: [Título do Quiz]
Perguntas:
1. [Texto da pergunta]
   A) [Opção]
   B) [Opção]
   C) [Opção]
   D) [Opção]
Gabarito: [Letra]`
        break
      case "decoding":
        prompt = `Atue como um Especialista em Teologia.
Escolha um VERSÍCULO BÍBLICO CHAVE para a disciplina de "${discName}".
Instruções:
1. O versículo deve ser impactante e central ao tema.
2. Forneça o texto completo e a referência.
3. Formato de saída:
Título: Decifre o Versículo de ${discName}
Versículo: [Texto do Versículo]
Referência: [Livro, Cap e Vers]`
        break
      case "reflection":
        prompt = `Atue como um Especialista em Teologia.
Crie um DESAFIO DE REFLEXÃO sobre "${discName}".
Público: ${audience}. Nível: ${difficulty}.

Instruções:
1. Proponha uma situação prática ou dilema teológico.
2. Peça ao aluno para escrever uma breve defesa ou solução pastoral.
3. Formato de saída:
Título: [Título da Reflexão]
Desafio: [O texto da situação/pergunta de reflexão]`
        break
    }

    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setStep(2)
    }, 1500)
  }

  const externalIAs = [
    { name: "ChatGPT", desc: "(OpenAI)", url: "https://chatgpt.com", color: "text-emerald-500", bg: "bg-emerald-50" },
    { name: "Gemini", desc: "(Google)", url: "https://gemini.google.com", color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Claude", desc: "(Anthropic)", url: "https://claude.ai", color: "text-orange-500", bg: "bg-orange-50" },
    { name: "Copilot", desc: "(Microsoft)", url: "https://copilot.microsoft.com", color: "text-sky-500", bg: "bg-sky-50" }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Agente IA Teológico</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Gere prompts otimizados para criar desafios semanais incríveis em segundos.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 border border-border rounded-full p-1.5 w-max mx-auto bg-muted/30">
        <button onClick={() => setStep(1)} className={cn(
          "px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-2",
          step === 1 ? "bg-background shadow-sm text-foreground font-bold" : "text-muted-foreground hover:bg-background/50"
        )}>
          <span className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full border text-[10px]",
            step === 1 ? "bg-primary/10 border-primary text-primary" : "border-current"
          )}>1</span> Configurar Prompt
        </button>
        <div className={cn(
          "px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-2",
          step === 2 ? "bg-background shadow-sm text-foreground font-bold" : "text-muted-foreground"
        )}>
          <span className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full border text-[10px]",
            step === 2 ? "bg-primary/10 border-primary text-primary" : "border-current"
          )}>2</span> Abrir IA Externa
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Perfil</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Disciplina</Label>
                  <select
                    value={disciplineId}
                    onChange={(e) => setDisciplineId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium outline-none focus:border-primary"
                  >
                    {disciplines.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Público</Label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium outline-none focus:border-primary"
                  >
                    <option value="Escola Bíblica (Membros Gerais)">Básico (EBD)</option>
                    <option value="Seminário Teológico / Graduação">Médio (Seminário)</option>
                    <option value="Pós-Graduação / Especialização">Avançado (Pós)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <BarChart className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Complexidade</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nível Exigido</Label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium outline-none focus:border-primary"
                  >
                    <option value="Básico">Básico</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Missão</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { v: "riddle", i: HelpCircle, l: "Enigma" },
                      { v: "quiz", i: List, l: "Quiz" },
                      { v: "decoding", i: Dna, l: "Verso" },
                      { v: "reflection", i: MessageSquare, l: "Reflex" }
                    ].map(t => (
                      <button
                        key={t.v}
                        onClick={() => setType(t.v as ChallengeType)}
                        className={cn(
                          "flex flex-col items-center justify-center p-1 rounded-lg border transition-all",
                          type === t.v ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted"
                        )}
                        title={t.l}
                      >
                        <t.i className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-sm">Tudo pronto?</h4>
              <p className="text-[11px] text-muted-foreground">O prompt será gerado para o tipo: <span className="font-bold text-primary">{type.toUpperCase()}</span></p>
            </div>
            <Button
              onClick={handleCopyPrompt}
              className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20 w-full sm:w-auto"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar Prompt e Avançar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Aviso de Créditos:</strong> Use seus créditos pessoais nas IAs externas para maior profundidade teológica. O prompt já contém as instruções de formato para você apenas colar e receber a resposta pronta.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {externalIAs.map(ia => (
              <a 
                key={ia.name} 
                href={ia.url} 
                target="_blank" 
                rel="noreferrer" 
                className="flex flex-col items-center justify-center p-4 border border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group bg-card"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", ia.bg)}>
                  <Sparkles className={cn("h-5 w-5", ia.color)} />
                </div>
                <span className="font-bold text-xs">{ia.name}</span>
                <span className="text-[9px] text-muted-foreground">{ia.desc}</span>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-bold text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir <ExternalLink className="h-2 w-2" />
                </div>
              </a>
            ))}
          </div>

          <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center bg-muted/10">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="font-bold text-sm mb-1">O que fazer agora?</h4>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              1. Cole o prompt na IA escolhida.<br/>
              2. Copie a resposta gerada.<br/>
              3. Preencha os campos da missão aqui ao lado.
            </p>
          </div>
          
          <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-xs text-muted-foreground">
            Voltar para configurações
          </Button>
        </div>
      )}
    </div>
  )
}
