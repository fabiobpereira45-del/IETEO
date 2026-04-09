import { BookOpen, CheckCircle2, Star } from "lucide-react"
import type { Semester, Discipline } from "@/lib/store"
import { cn } from "@/lib/utils"

interface CurriculumTabProps {
    semesters: Semester[]
    disciplines: Discipline[]
}

export function CurriculumTab({ semesters, disciplines }: CurriculumTabProps) {
    const now = new Date()
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYear = now.getFullYear().toString()

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-2 duration-500">
            {semesters.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-border border-dashed rounded-3xl bg-white">
                    < BookOpen className="h-12 w-12 mx-auto opacity-20 mb-4" />
                    <p className="font-medium italic">Nenhuma grade curricular cadastrada no momento.</p>
                </div>
            ) : (
                semesters.map((sem, idx) => {
                    const semDisciplines = disciplines.filter(d => d.semesterId === sem.id)
                    return (
                        <div key={sem.id} className="relative">
                            <div className="flex items-center gap-4 mb-8">
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-xl shadow-lg transition-all",
                                    sem.isConcluded 
                                        ? "bg-green-600 text-white shadow-green-200" 
                                        : "bg-navy text-accent shadow-navy/20"
                                )}>
                                    {sem.isConcluded ? <CheckCircle2 className="h-6 w-6" /> : idx + 1}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className={cn("text-2xl font-bold transition-colors", sem.isConcluded ? "text-green-700" : "text-foreground")}>
                                        {sem.name}
                                        {sem.isConcluded && <span className="ml-3 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Concluído</span>}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{sem.shift || "Turno Regular"}</p>
                                </div>
                                <div className="h-px bg-border flex-1 ml-4" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ml-4 lg:ml-16">
                                {semDisciplines.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic col-span-full">Disciplinas em definição para este semestre.</p>
                                ) : (
                                    semDisciplines.map(disc => {
                                        const isFocus = disc.applicationMonth === currentMonth && disc.applicationYear === currentYear
                                        
                                        return (
                                            <div 
                                                key={disc.id} 
                                                className={cn(
                                                    "relative bg-white border rounded-2xl p-6 flex flex-col shadow-sm transition-all group overflow-hidden",
                                                    isFocus ? "border-primary/50 shadow-xl ring-1 ring-primary/20 scale-[1.02] z-10" : "border-border/50 hover:shadow-xl hover:border-primary/30",
                                                    disc.isConcluded && "opacity-80 grayscale-[0.3]"
                                                )}
                                            >
                                                {isFocus && (
                                                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-md">
                                                        <Star className="h-3 w-3 fill-white" /> Em Foco
                                                    </div>
                                                )}
                                                
                                                <div className="mb-4">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h4 className={cn(
                                                            "font-bold text-lg leading-tight transition-colors",
                                                            isFocus ? "text-primary" : "text-foreground group-hover:text-primary",
                                                            disc.isConcluded && "text-green-700"
                                                        )}>
                                                            {disc.name}
                                                        </h4>
                                                        {disc.isConcluded && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
                                                    </div>
                                                    {disc.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{disc.description}</p>}
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-border/50">
                                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                                        <span className="text-muted-foreground">Docente</span>
                                                        <span className="text-navy">{disc.professorName || "A definir"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
