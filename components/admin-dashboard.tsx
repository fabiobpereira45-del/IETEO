"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Users, FileText, BookOpen, Settings, BarChart3, Download, LogOut,
  Plus, Pencil, Trash2, Eye, EyeOff, Trophy, CheckCircle2, Link2, FileCheck,
  ShieldCheck, Loader2, DollarSign, MessageSquare, CalendarCheck, GraduationCap, XCircle, ArrowLeft, Building2, UserCircle, Briefcase, Send, PlaySquare, CalendarDays, KeyRound, Save,
  Menu, ChevronRight, Archive, ArchiveRestore, Sparkles, Calculator
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  type Assessment, type StudentSubmission, type Question, type Discipline, type StudentGrade, type StudentProfile,
  getAssessments, updateAssessment, deleteAssessment,
  getSubmissions, deleteSubmission, updateSubmissionScore,
  getQuestions, getDisciplines, clearProfessorSession, MASTER_CREDENTIALS,
  getProfessorSession, getStudentGrades, saveStudentGrade, deleteStudentGrade, getStudents, updateProfessorAccount,
  saveProfessorSession,
  type Semester, type StudyMaterial, type FinancialCharge, type ClassRoom, type ClassSchedule,
} from "@/lib/store"
import { printStudentPDF, printBlankAssessmentPDF, printCompiledSubmissionsPDF, printOverviewPDF, printAnswerKeyPDF, printSubmissionsTablePDF } from "@/lib/pdf"
import { ErrorBoundary } from "@/components/error-boundary"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { AvatarUpload } from "@/components/avatar-upload"

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 premium-gradient rounded-lg animate-pulse" />
      </div>
    </div>
    <p className="mt-6 font-medium text-muted-foreground">Carregando módulo...</p>
  </div>
)

const QuestionBank = dynamic(() => import("@/components/question-bank").then(m => m.QuestionBank), { loading: LoadingFallback })
const AssessmentBuilder = dynamic(() => import("@/components/assessment-builder").then(m => m.AssessmentBuilder), { loading: LoadingFallback })
const ProfessorManager = dynamic(() => import("@/components/professor-manager").then(m => m.ProfessorManager), { loading: LoadingFallback })
const SemesterManager = dynamic(() => import("@/components/semester-manager").then(m => m.SemesterManager), { loading: LoadingFallback })
const StudyMaterialManager = dynamic(() => import("@/components/study-material-manager").then(m => m.StudyMaterialManager), { loading: LoadingFallback })
const FinancialConfig = dynamic(() => import("@/components/financial-config").then(m => m.FinancialConfig), { loading: LoadingFallback })
const FinancialDashboard = dynamic(() => import("@/components/financial-dashboard").then(m => m.FinancialDashboard), { loading: LoadingFallback })
const ProfessorChatView = dynamic(() => import("@/components/professor-chat-view").then(m => m.ProfessorChatView), { loading: LoadingFallback })
const AttendanceManager = dynamic(() => import("@/components/attendance-manager").then(m => m.AttendanceManager), { loading: LoadingFallback })
const ClassManager = dynamic(() => import("@/components/class-manager").then(m => m.ClassManager), { loading: LoadingFallback })
const StudentManager = dynamic(() => import("@/components/student-manager").then(m => m.StudentManager), { loading: LoadingFallback })
const ClassScheduleManager = dynamic(() => import("@/components/class-schedule-manager").then(m => m.ClassScheduleManager), { loading: LoadingFallback })
const GradesManager = dynamic(() => import("@/components/grades-manager").then(m => m.GradesManager), { loading: LoadingFallback })
const GradeConfig = dynamic(() => import("@/components/grade-config").then(m => m.GradeConfig), { loading: LoadingFallback })
const ChallengeManager = dynamic(() => import("@/components/admin/challenge-manager").then(m => m.ChallengeManager), { loading: LoadingFallback })
const InstitutionalManager = dynamic(() => import("@/components/institutional-manager").then(m => m.InstitutionalManager), { loading: LoadingFallback })
const OverviewTab = dynamic(() => import("./admin/tabs/OverviewTab").then(m => m.OverviewTab), { loading: LoadingFallback })
const SubmissionsTab = dynamic(() => import("./admin/tabs/SubmissionsTab").then(m => m.SubmissionsTab), { loading: LoadingFallback })
const AssessmentsTab = dynamic(() => import("./admin/tabs/AssessmentsTab").then(m => m.AssessmentsTab), { loading: LoadingFallback })
const SettingsTab = dynamic(() => import("./admin/tabs/SettingsTab").then(m => m.SettingsTab), { loading: LoadingFallback })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m${sec.toString().padStart(2, "0")}s`
}

type Tab = "overview" | "students" | "grades" | "submissions" | "questions" | "assessments" | "challenges" | "professors" | "semesters" | "class_schedules" | "materials" | "financial" | "settings" | "chat" | "attendance" | "classes" | "institutional" | "grade_config"

interface Props {
  onLogout: () => void
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [username, setUsername] = useState("")
  const [userEmail, setUserEmail] = useState("")

  const session = typeof window !== "undefined" ? getProfessorSession() : null
  const isMaster = session?.role === "master"
  const supabase = createClient()

  // Improved refresh mechanism: individual tabs now manage their own fetching.
  // We provide this callback for backward compatibility and potential triggers.
  const refresh = useCallback(async (showLoading: boolean = true) => {
    // Logic moved to components
  }, [])

  async function handleLogout() {
    clearProfessorSession()
    await supabase.auth.signOut()
    onLogout()
  }

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUsername(user.user_metadata?.full_name || "Professor")
        setUserEmail(user.email || "")
      } else if (session?.professorId === "master") {
        setUsername(MASTER_CREDENTIALS.name)
        setUserEmail(MASTER_CREDENTIALS.email)
      }
    }
    fetchUser()
  }, [supabase.auth, session?.professorId])

  const menuGroups = useMemo(() => [
    {
      title: "Principal",
      items: [
        { id: "overview", label: "Visão Geral", icon: <BarChart3 className="h-4 w-4" /> },
        { id: "chat", label: "Chat Alunos", icon: <MessageSquare className="h-4 w-4" /> },
      ]
    },
    {
      title: "Administração",
      items: [
        { id: "financial", label: "Financeiro", icon: <DollarSign className="h-4 w-4" />, masterOnly: true },
        { id: "grade_config", label: "Configuração de Notas", icon: <Calculator className="h-4 w-4" />, masterOnly: true },
        { id: "professors", label: "Professores", icon: <ShieldCheck className="h-4 w-4" />, masterOnly: true },
        { id: "settings", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
      ]
    },
    {
      title: "Institucional",
      items: [
        { id: "institutional", label: "Quem Somos / Missão", icon: <Building2 className="h-4 w-4" /> },
      ]
    },
    {
      title: "Acadêmico",
      items: [
        { id: "students", label: "Alunos", icon: <Users className="h-4 w-4" /> },
        { id: "grades", label: "Notas e Diários", icon: <GraduationCap className="h-4 w-4" /> },
        { id: "attendance", label: "Frequência", icon: <CalendarCheck className="h-4 w-4" /> },
        { id: "classes", label: "Turmas", icon: <Briefcase className="h-4 w-4" />, masterOnly: true },
      ]
    },
    {
      title: "Avaliações",
      items: [
        { id: "questions", label: "Banco de Questões", icon: <BookOpen className="h-4 w-4" />, masterOnly: true },
        { id: "assessments", label: "Provas", icon: <FileText className="h-4 w-4" /> },
        { id: "challenges", label: "Missões Semanais", icon: <Sparkles className="h-4 w-4" /> },
        { id: "submissions", label: "Respostas de Provas", icon: <CheckCircle2 className="h-4 w-4" /> },
      ]
    },
    {
      title: "Recursos",
      items: [
        { id: "materials", label: "Biblioteca (PDFs)", icon: <BookOpen className="h-4 w-4" /> },
        { id: "semesters", label: "Grade Curricular", icon: <GraduationCap className="h-4 w-4" /> },
        { id: "class_schedules", label: "Quadro de Horários", icon: <CalendarDays className="h-4 w-4" />, masterOnly: true },
      ]
    }
  ], [isMaster])


  const renderNavItem = (item: any) => (
    <button
      key={item.id}
      onClick={() => {
        setTab(item.id as Tab)
        setIsMobileMenuOpen(false)
      }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group w-full",
        tab === item.id
          ? "accent-gradient text-white shadow-lg shadow-orange/20"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-lg transition-colors",
        tab === item.id ? "bg-white/20" : "bg-muted group-hover:bg-background"
      )}>
        {item.icon}
      </div>
      <span className="flex-1 text-left">{item.label}</span>
      {tab === item.id && <ChevronRight className="h-4 w-4" />}
    </button>
  )

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-card border-r border-border/50 overflow-hidden">
      <div className="flex flex-col h-full text-slate-100 bg-navy">
        {/* Perfil Header na Sidebar */}
        <div className="p-6 border-b border-white/10 mb-2 bg-black/20 overflow-hidden relative">
          <div className="flex items-center gap-4">
            <div className="shrink-0 relative group">
              <AvatarUpload 
                currentUrl={session?.avatar_url}
                userId={session?.professorId || ""}
                userName={username || "Professor"}
                type="professor"
                onUploadSuccess={(url) => {
                  if (session) saveProfessorSession(session.professorId, session.role, url)
                  refresh(false)
                }}
              />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white leading-tight truncate w-32">{username || "Professor"}</h2>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">IETEO • {isMaster ? "Painel Master" : "Painel Docente"}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-6 pb-6 pt-2">
            {menuGroups.map((group) => {
              const visibleItems = group.items.filter(i => !i.masterOnly || isMaster)
              if (visibleItems.length === 0) return null
              return (
                <div key={group.title} className="space-y-1">
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    {group.title}
                  </h3>
                  <div className="grid gap-1">
                    {visibleItems.map(item => renderNavItem(item))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="p-4 pb-8 mt-auto border-t border-white/10 bg-black/20 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">{username}</p>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/10 h-9"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair do Sistema
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-[10px] text-slate-500 hover:text-slate-300 h-8"
          >
            <ArrowLeft className="h-3 w-3 mr-2" /> Voltar ao Portal
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 sticky top-0 h-[100dvh] overflow-hidden">
        {renderSidebar()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border/50 premium-gradient sticky top-0 z-40 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full shrink-0 overflow-hidden border border-white/20 shadow-md">
              <img src="/ieteo-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">IETEO</h1>
              <p className="text-[9px] text-white/70 uppercase tracking-widest font-semibold">Painel Administrativo</p>
            </div>
          </div>

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-none w-72">
              {renderSidebar()}
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/10 lg:hidden"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Header Desktop (Optional Breadcrumb/Actions) */}
        <header className="hidden lg:flex h-16 border-b border-border/50 bg-background/50 backdrop-blur-md px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground capitalize">{tab.replace('_', ' ')}</span>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <span className="opacity-50">Instituto de Ensino Teológico</span>
          </div>
          <div className="flex items-center gap-4">
            {isMaster && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                Acesso Master
              </span>
            )}
            <div className="flex items-center gap-3 pl-4 border-l border-border/50">
              <p className="text-xs font-semibold text-muted-foreground">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sair do Sistema"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] mx-auto w-full">
          {(loading && ["overview", "submissions", "assessments", "settings"].includes(tab)) ? (
            <LoadingFallback />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {tab === "overview" && <OverviewTab />}
              {tab === "students" && <StudentManager isMaster={isMaster} />}
              {tab === "grades" && <GradesManager isMaster={isMaster} />}
              {tab === "submissions" && <SubmissionsTab isMaster={isMaster} />}
              {tab === "questions" && <QuestionBank isMaster={isMaster} />}
              {tab === "assessments" && <AssessmentsTab isMaster={isMaster} />}
              {tab === "settings" && <SettingsTab onLogout={handleLogout} />}
              {tab === "materials" && <StudyMaterialManager />}
              {tab === "semesters" && <SemesterManager isMaster={isMaster} />}
              {tab === "class_schedules" && isMaster && <ClassScheduleManager />}
              {tab === "attendance" && <AttendanceManager />}
              {tab === "classes" && isMaster && <ClassManager />}
              {tab === "challenges" && <ChallengeManager />}
              {tab === "chat" && <ProfessorChatView />}
              {tab === "financial" && <FinancialDashboard />}
              {tab === "professors" && isMaster && <ProfessorManager />}
              {tab === "institutional" && <InstitutionalManager />}
              {tab === "grade_config" && isMaster && <GradeConfig />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
