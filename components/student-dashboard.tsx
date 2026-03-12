import { useState, useEffect } from "react"
import {
    LogOut, BookOpen, Clock, FileText, Loader2, ArrowLeft, Download,
    Library, CalendarDays, MessageSquare, KeyRound, CheckCircle2,
    Eye, EyeOff, Users, Menu, X, ChevronRight, GraduationCap, Home, BookOpenCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    type StudentSession, type StudentProfile, getStudentProfileAuth, logoutStudentAuth,
    type Semester, type Discipline, type StudyMaterial, type FinancialCharge, type ClassRoom, type ClassSchedule,
    getSemesters, getDisciplines, getStudyMaterials, getFinancialCharges, getClasses, getClassSchedules
} from "@/lib/store"
import { StudentAuth } from "@/components/student-auth"
import { FinancialStudentView } from "@/components/financial-student-view"
import { StudentChatView } from "@/components/student-chat-view"
import { StudentGradesView } from "@/components/student-grades-view"
import { StudentAssessmentView } from "@/components/student-assessment-view"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const DAY_LABEL: Record<string, string> = {
    monday: "Segunda-feira", tuesday: "Terça-feira", wednesday: "Quarta-feira",
    thursday: "Quinta-feira", friday: "Sexta-feira", saturday: "Sábado", sunday: "Domingo"
}
const SHIFT_LABEL: Record<string, string> = {
    morning: "Manhã", afternoon: "Tarde", evening: "Noite", ead: "EAD/Online"
}

interface Props {
    session: StudentSession | null
    onBack: () => void
    onLogout: () => void
}

type Tab = "overview" | "class-info" | "curriculum" | "materials" | "grades" | "exams" | "financial" | "chat" | "senha"

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const supabase = createClient()

    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [materials, setMaterials] = useState<StudyMaterial[]>([])
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [myClass, setMyClass] = useState<ClassRoom | null>(null)
    const [mySchedules, setMySchedules] = useState<ClassSchedule[]>([])

    const [dataLoading, setDataLoading] = useState(false)

    async function checkAuth() {
        setLoading(true)
        const p = await getStudentProfileAuth()
        setProfile(p)
        if (p) {
            setDataLoading(true)
            const [s, d, m, c, cls, sch] = await Promise.all([
                getSemesters(), getDisciplines(), getStudyMaterials(), getFinancialCharges(p.id),
                getClasses(), getClassSchedules()
            ])
            setSemesters(s)
            setDisciplines(d)
            setMaterials(m)
            setCharges(c)
            if (p.class_id) {
                const foundClass = cls.find(cl => cl.id === p.class_id)
                if (foundClass) setMyClass(foundClass)
                setMySchedules(sch.filter(sh => sh.classId === p.class_id))
            }
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
            <div className="flex flex-col items-center justify-center h-screen opacity-50 bg-background">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                <p className="font-medium">Verificando acesso...</p>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex flex-col gap-4 p-8 max-w-lg mx-auto min-h-screen justify-center">
                <div className="flex justify-start mb-2">
                    <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para o Site
                    </Button>
                </div>
                <StudentAuth onSuccess={checkAuth} />
            </div>
        )
    }

    const isLocked = profile.payment_status !== 'paid' && charges.some(c => c.type === 'enrollment' && c.status !== 'paid')

    const navItems: { id: Tab; label: string; icon: any }[] = [
        { id: "overview", label: "Visão Geral", icon: Home },
        { id: "class-info", label: "Minha Turma", icon: Users },
        { id: "curriculum", label: "Grade Curricular", icon: CalendarDays },
        { id: "materials", label: "Materiais EAD", icon: Library },
        { id: "exams", label: "Avaliações", icon: BookOpenCheck },
        { id: "grades", label: "Boletim e Notas", icon: FileText },
        { id: "financial", label: "Financeiro", icon: Clock },
        { id: "chat", label: "Mensagens", icon: MessageSquare },
        { id: "senha", label: "Minha Senha", icon: KeyRound },
    ]

    const myDisciplineIds = new Set(mySchedules.map(s => s.disciplineId))
    const filteredMaterials = materials.filter(m => !m.disciplineId || myDisciplineIds.has(m.disciplineId))

    const SidebarContent = () => (
        <div className="flex flex-col h-[100dvh] text-slate-100 pt-[env(safe-area-inset-top,0px)]" style={{ backgroundColor: '#0f172a' }}>
            <div className="p-6 border-b border-white/20 mb-4 bg-black/40 backdrop-blur-md">
                <div className="flex h-12 w-12 items-center justify-center mb-4 rounded-full shrink-0 overflow-hidden border border-white/20 shadow-md">
                    <img src="/ieteo-logo.jpg" alt="Logo IETEO" className="h-full w-full object-cover" />
                </div>
                <h2 className="text-base font-bold tracking-tight text-white">IETEO</h2>
                <p className="text-[10px] text-slate-300 uppercase tracking-[2px] font-bold">Portal do Aluno</p>
            </div>

            <ScrollArea className="flex-1 px-3">
                <div className="flex flex-col gap-1.5 mb-8">
                    {!isLocked && navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setTab(item.id)
                                setIsMobileMenuOpen(false)
                            }}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                tab === item.id
                                    ? "text-white shadow-md shadow-[#b45309]/20"
                                    : "text-slate-400 hover:text-white hover:bg-white/10"
                            )}
                            style={tab === item.id ? { backgroundColor: '#b45309' } : {}}
                        >
                            <item.icon className={cn("h-5 w-5 transition-colors", tab === item.id ? "text-white" : "text-slate-500 group-hover:text-slate-200")} />
                            {item.label}
                            {tab === item.id && <ChevronRight className="h-4 w-4 ml-auto opacity-70" />}
                        </button>
                    ))}

                    {isLocked && (
                        <button
                            onClick={() => {
                                setTab("financial")
                                setIsMobileMenuOpen(false)
                            }}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-destructive text-white shadow-md shadow-destructive/20"
                            )}
                        >
                            <Clock className="h-5 w-5" />
                            Financeiro (Pendente)
                        </button>
                    )}
                </div>

                <div className="mt-4 px-3">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#b45309' }}>Suporte Direto</p>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">Dúvidas sobre o curso ou notas? Fale conosco.</p>
                        <Button variant="outline" size="sm" className="w-full bg-white/10 text-xs text-white border-white/20 hover:bg-white/20 h-8 gap-2" asChild>
                            <a href="https://wa.me/5571987483103" target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="h-3 w-3" /> WhatsApp
                            </a>
                        </Button>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-4 mt-auto border-t border-white/10 bg-black/10 pb-[calc(1rem+env(safe-area-inset-bottom,20px))]">
                <button
                    onClick={handlePortalLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Sair do Portal
                </button>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden fixed inset-0">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 h-full flex-shrink-0 animate-in slide-in-from-left duration-500">
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Header */}
                <header className="h-[calc(5rem+env(safe-area-inset-top,0px))] md:h-20 flex-shrink-0 border-b border-border/50 bg-white shadow-sm flex items-center justify-between px-6 z-30 pt-[env(safe-area-inset-top,0px)]">
                    <div className="flex items-center gap-4">
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72 border-r-0" style={{ backgroundColor: '#0f172a' }}>
                                <SidebarContent />
                            </SheetContent>
                        </Sheet>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                {tab !== "overview" && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTab("overview")}
                                        className="h-8 w-8 rounded-lg hover:bg-slate-100 -ml-1"
                                    >
                                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                )}
                                <h2 className="font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-accent" />
                                    {navItems.find(t => t.id === tab)?.label || "Menu"}
                                </h2>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none mt-1">
                                {profile.enrollment_number} • Teologia Bíblica (Básico)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col text-right pr-4 border-r border-border">
                            <p className="text-sm font-bold text-foreground leading-none">{profile.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-none">Matrícula Ativa</p>
                        </div>

                        <Button variant="outline" size="sm" onClick={onBack} className="hidden sm:flex gap-2 text-xs font-bold rounded-xl border-accent/20 text-accent hover:bg-accent/10 h-10 px-4">
                            <BookOpen className="h-4 w-4" /> Sala de Provas
                        </Button>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handlePortalLogout}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 sm:hidden h-10 w-10"
                            title="Sair do Portal"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Content View */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700 bg-slate-50/50">
                    {dataLoading ? (
                        <div className="flex flex-col justify-center items-center h-full gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-40" />
                            <p className="text-sm font-medium text-muted-foreground">Sincronizando dados acadêmicos...</p>
                        </div>
                    ) : isLocked && tab !== "financial" ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] p-12 bg-white border border-destructive/10 rounded-3xl shadow-xl shadow-destructive/5 text-center max-w-2xl mx-auto">
                            <div className="h-20 w-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 ring-8 ring-destructive/5">
                                <Clock className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-3">Acesso Pendente</h3>
                            <p className="text-muted-foreground leading-relaxed mb-8">Seu acesso ao Portal do Aluno está temporariamente limitado aguardando a confirmação do pagamento da matrícula. Por favor, regularize no setor financeiro.</p>
                            <Button variant="default" onClick={() => setTab("financial")} className="bg-destructive hover:bg-destructive/90 text-white font-bold h-12 px-10 rounded-2xl shadow-lg shadow-destructive/20 transform hover:scale-105 transition-all">
                                Acessar Financeiro Agora
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full max-w-[1600px] mx-auto">
                            {tab === "overview" && (
                                <div className="flex flex-col gap-8 animate-in fade-in duration-500">
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
                                                    <Button className="text-white font-bold rounded-2xl h-12 px-8 shadow-lg transition-all hover:scale-105" style={{ backgroundColor: '#b45309' }} onClick={() => setTab("curriculum")}>
                                                        Ver Grade
                                                    </Button>
                                                    <Button variant="ghost" className="text-white hover:bg-white/10 font-bold rounded-2xl h-12 px-8" onClick={() => setTab("materials")}>
                                                        Materiais
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-border/50 shadow-sm rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
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
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[
                                            { id: "materials", label: "Materiais", sub: "Apostilas e PDFs", icon: Library, color: "text-blue-600", bg: "bg-blue-50" },
                                            { id: "grades", label: "Boletim", sub: "Notas e Frequência", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
                                            { id: "exams", label: "Avaliações", sub: "Provas disponíveis", icon: BookOpenCheck, color: "text-green-600", bg: "bg-green-50" },
                                            { id: "chat", label: "Suporte", sub: "Dúvidas e Chat", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
                                        ].map((card) => (
                                            <button key={card.id} onClick={() => setTab(card.id as Tab)} className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all text-left flex flex-col group">
                                                <div className={cn("p-2 rounded-xl mb-4 w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-110", card.bg, card.color)}>
                                                    <card.icon className="h-5 w-5" />
                                                </div>
                                                <h4 className="font-bold text-foreground">{card.label}</h4>
                                                <p className="text-[11px] text-muted-foreground mt-1 uppercase font-semibold tracking-tighter">{card.sub}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tab === "class-info" && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                                    <div className="bg-white border border-border/50 rounded-3xl p-8 shadow-sm">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8 pb-8 border-b border-border/50">
                                            <div>
                                                <h3 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                                    <Users className="h-8 w-8 text-accent" /> {myClass?.name || "Turma Geral"}
                                                </h3>
                                                <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                                        <CalendarDays className="h-4 w-4 text-primary" /> {myClass?.dayOfWeek ? DAY_LABEL[myClass.dayOfWeek] : "EAD Flexível"}
                                                    </span>
                                                    <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                                        <Clock className="h-4 w-4 text-primary" /> {myClass?.shift ? SHIFT_LABEL[myClass.shift] : "Online"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground mb-6 flex items-center gap-4">
                                            <span>Quadro de Horários Semanais</span>
                                            <div className="h-px bg-border flex-1" />
                                        </h4>
                                        {mySchedules.length === 0 ? (
                                            <div className="text-center py-20 bg-slate-50 border border-border border-dashed rounded-3xl">
                                                <CalendarDays className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-4" />
                                                <p className="text-muted-foreground font-medium italic">Nenhum horário cadastrado para esta turma ainda.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {mySchedules.map(sched => {
                                                    const disc = disciplines.find(d => d.id === sched.disciplineId)
                                                    return (
                                                        <div key={sched.id} className="bg-white border border-border p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-accent/30 transition-all group">
                                                            <div className="bg-accent/10 text-accent font-bold px-3 py-1.5 rounded-lg text-xs inline-block mb-4 tracking-tighter uppercase group-hover:bg-accent group-hover:text-white transition-colors">
                                                                {DAY_LABEL[sched.dayOfWeek] || sched.dayOfWeek} — {sched.timeStart} às {sched.timeEnd}
                                                            </div>
                                                            <p className="font-bold text-lg text-foreground mb-1 line-clamp-1 leading-tight" title={disc?.name}>{disc?.name || "Disciplina"}</p>
                                                            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-2">
                                                                <GraduationCap className="h-4 w-4 opacity-40" /> Prof. {sched.professorName}
                                                            </p>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tab === "curriculum" && (
                                <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-right-2 duration-500">
                                    {semesters.length === 0 ? (
                                        <div className="text-center py-20 text-muted-foreground border-2 border-border border-dashed rounded-3xl bg-white">
                                            <BookOpen className="h-12 w-12 mx-auto opacity-20 mb-4" />
                                            <p className="font-medium italic">Nenhuma grade curricular cadastrada no momento.</p>
                                        </div>
                                    ) : (
                                        semesters.map((sem, idx) => {
                                            const semDisciplines = disciplines.filter(d => d.semesterId === sem.id)
                                            return (
                                                <div key={sem.id} className="relative">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-accent font-bold text-xl shadow-lg shadow-navy/20">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h3 className="text-2xl font-bold text-foreground">{sem.name}</h3>
                                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{sem.shift || "Turno Regular"}</p>
                                                        </div>
                                                        <div className="h-px bg-border flex-1 ml-4" />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ml-4 lg:ml-16">
                                                        {semDisciplines.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground italic col-span-full">Disciplinas em definição para este semestre.</p>
                                                        ) : (
                                                            semDisciplines.map(disc => (
                                                                <div key={disc.id} className="bg-white border border-border/50 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group">
                                                                    <div className="mb-4">
                                                                        <h4 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">{disc.name}</h4>
                                                                        {disc.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{disc.description}</p>}
                                                                    </div>

                                                                    <div className="mt-auto pt-4 border-t border-border/50">
                                                                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                                                            <span className="text-muted-foreground">Docente</span>
                                                                            <span className="text-navy">{disc.professorName || "A definir"}</span>
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
                            )}

                            {tab === "exams" && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                                    <StudentAssessmentView studentId={profile.id} studentName={profile.name} studentEmail={session?.email || ""} studentDoc={profile.cpf} />
                                </div>
                            )}

                            {tab === "grades" && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                                    <div className="bg-white border border-border/50 rounded-3xl p-8 shadow-sm">
                                        <StudentGradesView studentId={profile.id} studentEmail={session?.email || ""} />
                                    </div>
                                </div>
                            )}

                            {tab === "financial" && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                                    <div className="bg-white border border-border/50 rounded-3xl shadow-sm">
                                        <FinancialStudentView studentId={profile.id} />
                                    </div>
                                </div>
                            )}

                            {tab === "chat" && (
                                <div className="animate-in fade-in slide-in-from-right-2 duration-500 h-[600px]">
                                    <StudentChatView studentId={profile.id} studentName={profile.name} />
                                </div>
                            )}

                            {tab === "senha" && (
                                <div className="max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                                    <div className="bg-white border border-border/50 rounded-3xl p-10 shadow-xl shadow-black/5">
                                        <div className="flex flex-col items-center text-center mb-8">
                                            <div className="h-20 w-20 bg-accent/10 rounded-3xl flex items-center justify-center mb-4 ring-8 ring-accent/5">
                                                <KeyRound className="h-10 w-10 text-accent" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-foreground">Trocar de Senha</h3>
                                            <p className="text-sm text-muted-foreground mt-2 max-w-xs">Escolha uma nova senha segura para proteger o seu acesso ao portal.</p>
                                        </div>
                                        <form onSubmit={handleChangePassword} className="flex flex-col gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Nova Senha</label>
                                                <div className="relative group">
                                                    <input
                                                        type={showPwd ? "text" : "password"}
                                                        className="w-full border border-border rounded-2xl px-5 pr-12 py-4 text-base bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all font-medium"
                                                        placeholder="Mínimo 6 dígitos"
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                    />
                                                    <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent p-2 rounded-lg hover:bg-accent/5 transition-all">
                                                        {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Confirmar Senha</label>
                                                <input
                                                    type={showPwd ? "text" : "password"}
                                                    className="w-full border border-border rounded-2xl px-5 py-4 text-base bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all font-medium"
                                                    placeholder="Digite novamente"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                />
                                            </div>
                                            {pwdErr && <p className="text-sm font-bold text-destructive bg-destructive/10 rounded-2xl px-5 py-3 border border-destructive/10 animate-shake">{pwdErr}</p>}
                                            {pwdMsg && <p className="text-sm font-bold text-green-700 bg-green-50 rounded-2xl px-5 py-3 flex items-center gap-2 border border-green-100 animate-in bounce-in"><CheckCircle2 className="h-5 w-5" />{pwdMsg}</p>}
                                            <Button type="submit" disabled={pwdLoading} className="w-full bg-accent hover:bg-accent/90 text-navy font-bold py-7 rounded-2xl shadow-lg shadow-accent/20 transition-all text-base">
                                                {pwdLoading ? "Processando..." : "ATUALIZAR MINHA SENHA"}
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div >
    )
}
