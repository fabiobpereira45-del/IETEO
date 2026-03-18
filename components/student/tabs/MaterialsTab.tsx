"use client"

import { Library, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StudyMaterial, Discipline } from "@/lib/store"

interface MaterialsTabProps {
    filteredMaterials: StudyMaterial[]
    disciplines: Discipline[]
}

export function MaterialsTab({ filteredMaterials, disciplines }: MaterialsTabProps) {
    return (
        <div className="animate-in fade-in slide-in-from-right-2 duration-500">
            {filteredMaterials.length === 0 ? (
                <div className="bg-white border-2 border-border border-dashed rounded-3xl p-20 text-center flex flex-col items-center max-w-2xl mx-auto shadow-sm">
                    <Library className="h-20 w-20 text-muted-foreground opacity-15 mb-6" />
                    <h3 className="text-2xl font-bold text-foreground mb-2">Biblioteca Vazia</h3>
                    <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">No momento não há apostilas ou materiais relacionados às suas disciplinas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map(mat => {
                        const disc = disciplines.find(d => d.id === mat.disciplineId)
                        return (
                            <div key={mat.id} className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-2xl hover:border-red-500/20 transition-all flex flex-col h-full group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-red-500/10 transition-colors" />
                                <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100/50 group-hover:rotate-6 transition-all duration-300">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest truncate mb-1" title={disc?.name}>{disc?.name || "Geral"}</p>
                                        <h4 className="font-bold text-base text-foreground line-clamp-2 leading-snug group-hover:text-red-700 transition-colors" title={mat.title}>{mat.title}</h4>
                                    </div>
                                </div>

                                {mat.description && (
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-3 mb-6 flex-grow">{mat.description}</p>
                                )}

                                <div className="mt-auto pt-5 border-t border-border/50 relative z-10">
                                    <Button size="sm" className="w-full gap-2 text-xs h-10 bg-slate-900 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-black/5" asChild>
                                        <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" /> FAZER DOWNLOAD PDF
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
