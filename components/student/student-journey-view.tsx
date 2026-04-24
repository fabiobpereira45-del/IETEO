"use client"

import { useState, useEffect } from "react"
import { 
  Trophy, 
  Lock, 
  CheckCircle2, 
  Star, 
  Scroll, 
  HelpCircle, 
  Sparkles,
  ChevronRight,
  MapPin,
  Clock,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { 
  getChallenges, 
  getChallengeSubmissions, 
  type Challenge, 
  type ChallengeSubmission,
  type StudentSession
} from "@/lib/store"

interface Props {
  session: StudentSession
  disciplineId: string
}

export function StudentJourneyView({ session, disciplineId }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [allChs, allSubs] = await Promise.all([
        getChallenges(disciplineId),
        getChallengeSubmissions(session.studentId)
      ])
      setChallenges(allChs)
      setSubmissions(allSubs)
      setLoading(false)
    }
    load()
  }, [disciplineId, session.studentId])

  const totalPoints = submissions.reduce((acc, s) => acc + s.earnedPoints, 0)
  const completedCount = submissions.length
  const currentLevel = Math.floor(totalPoints / 100) + 1
  const levelProgress = totalPoints % 100

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-16 h-16 bg-primary/20 rounded-full mb-4" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Player Stats Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground shadow-2xl shadow-primary/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-black/10 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0 relative">
            <div className="h-32 w-32 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Trophy className="h-16 w-16 text-yellow-300 drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-3 -right-3 h-12 w-12 rounded-2xl bg-yellow-400 text-primary flex items-center justify-center font-bold text-xl shadow-lg border-4 border-primary">
              {currentLevel}
            </div>
          </div>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h2 className="text-3xl font-bold font-serif tracking-tight">Jornada de {session.name}</h2>
              <p className="text-primary-foreground/70 font-medium mt-1">Explorador Teológico • Nível {currentLevel}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80">
                <span>Progresso do Nível</span>
                <span>{totalPoints} / {(currentLevel) * 100} XP</span>
              </div>
              <Progress value={levelProgress} className="h-3 bg-black/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/10 text-center">
              <div className="text-2xl font-bold">{completedCount}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">Missões</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/10 text-center">
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">Saber</div>
            </div>
          </div>
        </div>
      </div>

      {/* The Roadmap */}
      <div className="relative max-w-2xl mx-auto px-4">
        {/* Connection Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/40 via-primary/10 to-transparent -translate-x-1/2 rounded-full" />
        
        <div className="space-y-16 relative">
          {challenges.map((challenge, idx) => {
            const isCompleted = submissions.some(s => s.challengeId === challenge.id)
            const isLocked = !challenge.isActive && !isCompleted
            const isNext = !isCompleted && !isLocked && (idx === 0 || submissions.some(s => {
              const prevCh = challenges[idx - 1]
              return prevCh && s.challengeId === prevCh.id
            }))

            return (
              <div key={challenge.id} className={cn(
                "flex flex-col items-center gap-6 group transition-all duration-500",
                isLocked && "opacity-40 grayscale"
              )}>
                {/* Milestone Node */}
                <div className={cn(
                  "relative z-10 h-20 w-20 rounded-[2rem] flex items-center justify-center shadow-xl border-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                  isNext ? "bg-white border-primary text-primary animate-pulse" :
                  "bg-card border-border text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="h-10 w-10" /> : 
                   isLocked ? <Lock className="h-8 w-8" /> :
                   <Scroll className="h-10 w-10" />}
                  
                  {/* Floating Level Label */}
                  <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-secondary border-2 border-primary/20 flex items-center justify-center text-[10px] font-bold">
                    W{challenge.week}
                  </div>
                </div>

                {/* Mission Card */}
                <div className={cn(
                  "w-full bg-card rounded-[2rem] border-2 p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 relative group",
                  isCompleted ? "border-primary/20 shadow-lg shadow-primary/5" :
                  isNext ? "border-primary shadow-xl shadow-primary/10 border-dashed" :
                  "border-border shadow-sm"
                )}>
                  {isNext && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg animate-bounce">
                      <Sparkles className="h-3 w-3" /> Missão Disponível
                    </div>
                  )}

                  <div className="flex flex-col gap-4 text-center">
                    <div>
                      <h3 className="text-xl font-bold font-serif text-foreground/90">{challenge.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 italic">
                        "{challenge.description}"
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-yellow-500" />
                        {challenge.points} XP
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Semana {challenge.week}
                      </div>
                    </div>

                    {isNext && (
                      <Button className="w-full rounded-2xl h-12 text-sm font-bold shadow-lg shadow-primary/20 group-hover:gap-4 transition-all">
                        Iniciar Desafio <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}

                    {isCompleted && (
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl py-3 text-primary text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4" /> Concluído com Sucesso
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {challenges.length === 0 && (
            <div className="text-center py-20 space-y-6">
              <div className="h-24 w-24 bg-muted rounded-full mx-auto flex items-center justify-center opacity-40">
                <MapPin className="h-12 w-12" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif">O Horizonte está Limpo</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                  Ainda não há missões disponíveis para esta disciplina. Fique atento às revelações!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discovery Board Legend */}
      <div className="max-w-xl mx-auto p-8 rounded-[2rem] bg-secondary/30 border-2 border-dashed border-primary/10 text-center space-y-4">
        <Sparkles className="h-8 w-8 text-primary mx-auto opacity-50" />
        <h4 className="text-lg font-bold font-serif">Prepare-se para o Extraordinário</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cada desafio concluído aproxima você da maestria teológica. Ganhe XP, suba de nível e desbloqueie novos segredos da disciplina.
        </p>
      </div>
    </div>
  )
}
