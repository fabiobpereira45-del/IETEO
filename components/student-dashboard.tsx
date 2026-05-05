import { useState, useEffect } from "react"
import {
    LogOut, BookOpen, Clock, FileText, Loader2, ArrowLeft,
    CalendarDays, MessageSquare, CheckCircle2,
    Users, Menu, GraduationCap, Home, AlertCircle,
    Library, BookOpenCheck, ChevronRight, User, X, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    type StudentSession, type StudentProfile, getStudentProfileAuth, logoutStudentAuth,
    type Semester, type Discipline, type StudyMaterial, type FinancialCharge, type ClassRoom, type ClassSchedule,
    getSemesters, getDisciplines, getStudyMaterials, getFinancialCharges, getClasses, getClassSchedules,
    getClassmates, getStudentGrades, type StudentGrade, syncStudentGrades
} from "@/lib/store"
import { StudentAuth } from "@/components/student-auth"
import { AvatarUpload } from "@/components/avatar-upload"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    <p className="mt-4 text-sm font-medium text-muted-foreground">Carregando...</p>
  </div>
)

const FinancialStudentView = dynamic(() => import("@/components/financial-student-view").then(m => m.FinancialStudentView), { loading: LoadingFallback })
const StudentChatView = dynamic(() => import("@/components/student-chat-view").then(m => m.StudentChatView), { loading: LoadingFallback })
const StudentGradesView = dynamic(() => import("@/components/student-grades-view").then(m => m.StudentGradesView), { loading: LoadingFallback })
const StudentAssessmentView = dynamic(() => import("@/components/student-assessment-view").then(m => m.StudentAssessmentView), { loading: LoadingFallback })
const StudentJourneyView = dynamic(() => import("@/components/student/student-journey-view").then(m => m.StudentJourneyView), { loading: LoadingFallback })
const OverviewTab = dynamic(() => import("./student/tabs/OverviewTab").then(m => m.OverviewTab), { loading: LoadingFallback })
const ClassInfoTab = dynamic(() => import("./student/tabs/ClassInfoTab").then(m => m.ClassInfoTab), { loading: LoadingFallback })
const CurriculumTab = dynamic(() => import("./student/tabs/CurriculumTab").then(m => m.CurriculumTab), { loading: LoadingFallback })
const MaterialsTab = dynamic(() => import("./student/tabs/MaterialsTab").then(m => m.MaterialsTab), { loading: LoadingFallback })
const ProfileTab = dynamic(() => import("./student/tabs/ProfileTab").then(m => m.ProfileTab), { loading: LoadingFallback })

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

type Tab = "overview" | "class-info" | "curriculum" | "materials" | "grades" | "exams" | "journey" | "financial" | "chat" | "perfil"

export function StudentDashboard({ session, onBack, onLogout }: Props) {
    const [profile, setProfile] = useState<StudentProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedJourneyDisc, setSelectedJourneyDisc] = useState<string>("")
    const [tab, setTab] = useState<Tab>("overview")
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const supabase = createClient()

    const [semesters, setSemesters] = useState<Semester[]>([])
    const [disciplines, setDisciplines] = useState<Discipline[]>([])
    const [materials, setMaterials] = useState<StudyMaterial[]>([])
    const [charges, setCharges] = useState<FinancialCharge[]>([])
    const [myClass, setMyClass] = useState<ClassRoom | null>(null)
    const [mySchedules, setMySchedules] = useState<ClassSchedule[]>([])
    const [classmates, setClassmates] = useState<StudentProfile[]>([])
    const [officialGrades, setOfficialGrades] = useState<StudentGrade[]>([])
    const [journeyDiscs, setJourneyDiscs] = useState<Discipline[]>([])

    const [dataLoading, setDataLoading] = useState(false)

    useEffect(() => {
        if (tab === "journey" && !selectedJourneyDisc && journeyDiscs.length > 0) {
            setSelectedJourneyDisc(journeyDiscs[0].id)
        }
    }, [tab, journeyDiscs])

    async function checkAuth() {
        setLoading(true)
        const p = await getStudentProfileAuth()
        setProfile(p)
        setLoading(false)
        if (p) {
            // Auto-Healing: Sync orphaned grades to UUID
            syncStudentGrades(p.id, p.cpf, p.email).catch(e => console.error("Sync Error:", e))

            setDataLoading(true)
            const [s, d, m, c, cls, sch, allChs] = await Promise.all([
                getSemesters(), getDisciplines(), getStudyMaterials(), getFinancialCharges(p.id),
                getClasses(), getClassSchedules(),
                fetch("/api/admin/challenges").then(r => r.json()).then(r => r.data || [])
            ])
            setSemesters(s)
            setDisciplines(d)
            setMaterials(m)
            setCharges(c)

            // Identify disciplines with challenges
            const discIdsWithChallenges = new Set(allChs.map((ch: any) => ch.discipline_id))
            const jDiscs = d.filter(disc => discIdsWithChallenges.has(disc.id))
            setJourneyDiscs(jDiscs)

            if (p.class_id) {
                const foundClass = cls.find(cl => cl.id === p.class_id)
                if (foundClass) setMyClass(foundClass)
                const classSchedules = sch.filter(sh => sh.classId === p.class_id)
                setMySchedules(classSchedules)

                const [members, grades] = await Promise.all([
                    getClassmates(p.class_id),
                    getStudentGrades()
                ])
                setClassmates(members.filter(m => m.id !== p.id))

                // Robust matching: ID or CPF/Email
                const myGrades = grades.filter(g =>
                    g.studentId === p.id ||
                    g.student_id === p.id ||
                    (g.studentIdentifier && (g.studentIdentifier === p.cpf || g.studentIdentifier === p.email))
                )
                setOfficialGrades(myGrades)
            }
            setDataLoading(false)
        }
    }

    useEffect(() => {
        checkAuth()
    }, [])

    async function handlePortalLogout() {
        await logoutStudentAuth()
        setProfile(null)
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
        { id: "journey", label: "Minha Jornada", icon: Sparkles },
        { id: "class-info", label: "Minha Turma", icon: Users },
        { id: "curriculum", label: "Grade Curricular", icon: CalendarDays },
        { id: "materials", label: "Materiais EAD", icon: Library },
        { id: "exams", label: "Avaliações", icon: BookOpenCheck },
        { id: "grades", label: "Boletim e Notas", icon: FileText },
        { id: "financial", label: "Financeiro", icon: Clock },
        { id: "chat", label: "Mensagens", icon: MessageSquare },
        { id: "perfil", label: "Meu Perfil", icon: User },
    ]

    const myDisciplineIds = new Set(mySchedules.map(s => s.disciplineId))
    const filteredMaterials = materials.filter(m => !m.disciplineId || myDisciplineIds.has(m.disciplineId))

    const renderSidebar = () => (
        <div className="flex flex-col h-[100dvh] text-slate-100 pt-[env(safe-area-inset-top,0px)]" style={{ backgroundColor: '#0f172a' }}>
            <div className="p-6 border-b border-white/20 mb-4 bg-black/40 backdrop-blur-md">
                <div className="relative mb-4 group inline-block">
                    <AvatarUpload
                        currentUrl={profile.avatar_url}
                        userId={profile.id}
                        userName={profile.name}
                        type="student"
                        onUploadSuccess={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
                    />
                </div>
                <h2 className="text-base font-bold tracking-tight text-white">{profile.name}</h2>
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

            <div className="p-4 mt-auto border-t border-white/10 bg-black/10">
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
                {renderSidebar()}
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
                                {renderSidebar()}
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

                        <div className="h-10 w-10 rounded-full overflow-hidden border border-border shadow-sm flex-shrink-0 bg-muted flex items-center justify-center">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>

                        <Button variant="outline" size="sm" onClick={onBack} className="hidden sm:flex gap-2 text-xs font-bold rounded-xl border-accent/20 text-accent hover:bg-accent/10 h-10 px-4">
                            <BookOpen className="h-4 w-4" /> Sala de Provas
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePortalLogout}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-10 w-10"
                            title="Sair do Portal"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Content View */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in bg-slate-50/50">
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
                            {tab === "overview" && profile && <OverviewTab profile={profile} charges={charges} disciplines={disciplines} myClass={myClass} onTabChange={setTab} />}
                            {tab === "journey" && (
                                <div className="space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold font-serif">Minha Jornada</h2>
                                            <p className="text-muted-foreground">Complete missões semanais e suba de nível.</p>
                                        </div>
                                        <div className="w-full md:w-64">
                                            <Select
                                                value={selectedJourneyDisc}
                                                onValueChange={setSelectedJourneyDisc}
                                            >
                                                <SelectTrigger className="rounded-xl border-primary/20 bg-white">
                                                    <SelectValue placeholder="Selecione a Disciplina" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {journeyDiscs.map(d => (
                                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <StudentJourneyView studentId={profile.id} studentName={profile.name} disciplineId={selectedJourneyDisc} />
                                </div>
                            )}
                            {tab === "class-info" && <ClassInfoTab myClass={myClass} classmates={classmates} mySchedules={mySchedules} disciplines={disciplines} officialGrades={officialGrades} />}
                            {tab === "curriculum" && <CurriculumTab semesters={semesters} disciplines={disciplines} />}
                            {tab === "materials" && <MaterialsTab filteredMaterials={filteredMaterials} disciplines={disciplines} />}
                            {tab === "exams" && <StudentAssessmentView studentId={profile.id} studentName={profile.name} studentEmail={session?.email || ""} studentDoc={profile.cpf} />}
                            {tab === "grades" && <StudentGradesView studentId={profile.id} studentEmail={session?.email || ""} studentDoc={profile.cpf} />}
                            {tab === "financial" && <FinancialStudentView studentId={profile.id} />}
                            {tab === "chat" && <StudentChatView studentId={profile.id} studentName={profile.name} />}
                            {tab === "perfil" && <ProfileTab profile={profile} onUpdateSuccess={checkAuth} />}
                        </div>
                    )}
                </main>
            </div>
        </div >
    )
}
