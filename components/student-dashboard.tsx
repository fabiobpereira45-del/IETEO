"use client"

import { useState, useEffect } from "react"
import { LogOut, BookOpen, Clock, FileText, Loader2, ArrowLeft, Download, Library, CalendarDays, MessageSquare, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    type StudentSession, type StudentProfile, getStudentProfileAuth, logoutStudentAuth,
    type Semester, type Discipline, type StudyMaterial,
    getSemesters, getDisciplines, getStudyMaterials
} from "@/lib/store"
import { StudentAuth } from "@/components/student-auth"
import { FinancialStudentView } from "@/components/financial-student-view"
import { StudentChatView } from "@/components/student-chat-view"
import { StudentGradesView } from "@/components/student-grades-view"
import { createClient } from "@/lib/supabase/client"

interface Props {
    session: StudentSession | null
    onBack: () => void
    onLogout: () => void
}

type Tab = "overview" | "curriculum" | "materials" | "grades" | "financial" | "chat" | "senha"

export function StudentDashboard({ session, onBack, onLogout }: Props) {
    const [profile, setProfile] = useState<StudentProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<Tab>("overview")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPwd, setShowPwd] = useState(false)
    const [pwdLoading, setPwdLoading] = useState(false)
    const [pwdMsg, setPwdMsg] = useState("")
    const [pwdErr, setPwdErr] = useState("")
    const supabase = createClient()

    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [materials, setMaterials] = useState<StudyMaterial[]>([])
    const [dataLoading, setDataLoading] = useState(false)

    async function checkAuth() {
        setLoading(true)
        const p = await getStudentProfileAuth()
        setProfile(p)
        if (p) {
            setDataLoading(true)
            const [s, d, m] = await Promise.all([getSemesters(), getDisciplines(), getStudyMaterials()])
            setSemesters(s)
            setDisciplines(d)
            setMaterials(m)
            setDataLoading(false)
        }
        setLoading(false)
    }

    useEffect(() => {
        checkAuth()
    }, [])

    async function handlePortalLogout() {
        await logoutStudentAuth()
        setProfile(null)
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        setPwdErr("")
        setPwdMsg("")
        if (newPassword.length < 6) { setPwdErr("A senha deve ter no mínimo 6 caracteres."); return }
        if (newPassword !== confirmPassword) { setPwdErr("As senhas não coincidem."); return }
        setPwdLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error
            setPwdMsg("Senha alterada com sucesso!")
            setNewPassword("")
            setConfirmPassword("")
        } catch (err: any) {
            setPwdErr(err.message || "Erro ao alterar senha.")
        } finally { setPwdLoading(false) }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Verificando acesso...</p>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex justify-start mb-2">
                    <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para Avaliação
                    </Button>
                </div>
                <StudentAuth onSuccess={checkAuth} />
            </div>
        )
    }

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "overview", label: "Início", icon: <BookOpen className="h-4 w-4" /> },
        { id: "curriculum", label: "Grade Curricular", icon: <CalendarDays className="h-4 w-4" /> },
        { id: "materials", label: "Materiais", icon: <Library className="h-4 w-4" /> },
        { id: "grades", label: "Boletim", icon: <FileText className="h-4 w-4" /> },
        { id: "financial", label: "Financeiro", icon: <Clock className="h-4 w-4" /> },
        { id: "chat", label: "Mensagens", icon: <MessageSquare className="h-4 w-4" /> },
        { id: "senha", label: "Minha Senha", icon: <KeyRound className="h-4 w-4" /> },
    ]

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary text-primary-foreground rounded-2xl p-6 shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-1.5 rounded-lg">
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold font-serif">Portal do Aluno</h2>
                        <p className="text-primary-foreground/80 mt-0.5">Olá, <span className="font-semibold">{profile.name}</span></p>
                    </div>
                </div>
                <div className="flex flex-col md:items-end gap-1 text-sm bg-primary-foreground/10 p-3 rounded-lg border border-primary-foreground/20">
                    <div className="flex justify-between md:justify-end gap-4 w-full">
                        <span className="text-primary-foreground/70">Matrícula:</span>
                        <span className="font-mono font-bold tracking-wider">{profile.enrollment_number}</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-4 w-full">
                        <span className="text-primary-foreground/70">Curso:</span>
                        <span className="font-medium">Teologia Bíblica (Básico)</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1 bg-muted rounded-xl p-1">
                {tabs.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === id
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {icon}
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {dataLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                    <>
                        {tab === "overview" && (
                            <div className="flex flex-col gap-6">
                                <div className="bg-card border border-border shadow-sm rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                                        <BookOpen className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold">Suas Atualizações</h3>
                                    <p className="text-muted-foreground max-w-md">
                                        No momento você não possui pendências financeiras e todas as suas avaliações estão em dia. Continue assim!
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-muted/30 border border-border rounded-xl p-5 flex gap-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setTab("materials")}>
                                        <div className="text-primary mt-1"><Library className="h-6 w-6" /></div>
                                        <div>
                                            <h4 className="font-semibold">Novos Materiais</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Acesse as novas apostilas disponíveis na sua biblioteca.</p>
                                        </div>
                                    </div>
                                    <div className="bg-muted/30 border border-border rounded-xl p-5 flex gap-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setTab("grades")}>
                                        <div className="text-amber-600 mt-1"><FileText className="h-6 w-6" /></div>
                                        <div>
                                            <h4 className="font-semibold">Frequência e Notas</h4>
                                            <p className="text-sm text-muted-foreground mt-1">Consulte seus resultados do último bimestre.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === "curriculum" && (
                            <div className="flex flex-col gap-6">
                                {semesters.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground border border-border border-dashed rounded-xl">
                                        Nenhuma grade curricular cadastrada no momento.
                                    </div>
                                ) : (
                                    semesters.map((sem, idx) => {
                                        const semDisciplines = disciplines.filter(d => d.semesterId === sem.id)
                                        return (
                                            <div key={sem.id} className="relative">
                                                <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background py-2 z-10">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <h3 className="text-lg font-bold text-foreground">{sem.name}</h3>
                                                    <div className="h-px bg-border flex-1 ml-4" />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ml-4 md:ml-11">
                                                    {semDisciplines.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground italic col-span-full">Disciplinas em definição.</p>
                                                    ) : (
                                                        semDisciplines.map(disc => (
                                                            <div key={disc.id} className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-sm hover:border-primary/40 transition-colors group cursor-default">
                                                                <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{disc.name}</h4>
                                                                {disc.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{disc.description}</p>}

                                                                <div className="mt-auto pt-3 border-t border-border/50 text-xs text-muted-foreground flex flex-col gap-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span>Professor(a):</span>
                                                                        <span className="font-medium text-foreground">{disc.professorName || "A definir"}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span>Turno:</span>
                                                                        <span className="font-medium text-foreground">{sem.shift || "A definir"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {tab === "materials" && (
                            <div className="flex flex-col gap-6">
                                {materials.length === 0 ? (
                                    <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
                                        <Library className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground mb-1">Biblioteca Vazia</h3>
                                        <p className="text-muted-foreground text-sm max-w-md">No momento não há nenhum material PDF ou apostila disponível para download.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {materials.map(mat => {
                                            const disc = disciplines.find(d => d.id === mat.disciplineId)
                                            return (
                                                <div key={mat.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors flex flex-col h-full group">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100 group-hover:scale-110 transition-transform">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mb-1" title={mat.title}>{mat.title}</h4>
                                                            <p className="text-xs text-primary font-medium truncate" title={disc?.name}>{disc?.name}</p>
                                                        </div>
                                                    </div>

                                                    {mat.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-3 my-2 flex-grow">{mat.description}</p>
                                                    )}

                                                    <div className="mt-auto pt-4 flex w-full">
                                                        <Button size="sm" className="w-full gap-2 text-xs h-9 bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground transition-colors" asChild>
                                                            <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-3.5 w-3.5" /> Baixar PDF
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "grades" && (
                            <StudentGradesView studentId={profile.id} studentEmail={session?.email || ""} />
                        )}

                        {tab === "financial" && (
                            <FinancialStudentView studentId={profile.id} />
                        )}

                        {tab === "chat" && (
                            <StudentChatView studentId={profile.id} studentName={profile.name} />
                        )}

                        {tab === "senha" && (
                            <div className="max-w-md mx-auto">
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="h-10 w-10 bg-accent/10 rounded-full flex items-center justify-center">
                                            <KeyRound className="h-5 w-5 text-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground">Alterar Senha</h3>
                                            <p className="text-xs text-muted-foreground">Escolha uma senha segura com pelo menos 6 caracteres</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nova Senha</label>
                                            <div className="relative">
                                                <input type={showPwd ? "text" : "password"} className="w-full border border-input rounded-xl px-3 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                                <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Confirmar Nova Senha</label>
                                            <input type={showPwd ? "text" : "password"} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                        </div>
                                        {pwdErr && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwdErr}</p>}
                                        {pwdMsg && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{pwdMsg}</p>}
                                        <button type="submit" disabled={pwdLoading} className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:bg-accent/90 disabled:opacity-60 transition-colors text-sm">
                                            {pwdLoading ? "Salvando..." : "Salvar Nova Senha"}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-center justify-between gap-4 mt-2 pt-6 border-t border-border">
                <Button variant="ghost" onClick={handlePortalLogout} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair do Portal
                </Button>

                <Button variant="outline" onClick={onBack} className="text-xs h-8">
                    Acessar Sala de Prova <ArrowLeft className="h-3 w-3 ml-2 rotate-180" />
                </Button>
            </div>
        </div>
    )
}
