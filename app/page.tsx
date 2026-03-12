"use client"

import { useState, useEffect, useCallback } from "react"
import { AssessmentHeader } from "@/components/assessment-header"
import { StudentLogin } from "@/components/student-login"
import { AssessmentForm } from "@/components/assessment-form"
import { AssessmentResult } from "@/components/assessment-result"
import { ProfessorLogin } from "@/components/professor-login"
import { AdminDashboard } from "@/components/admin-dashboard"
import { StudentDashboard } from "@/components/student-dashboard"
import { EnrollmentForm } from "@/components/enrollment-form"
import { GradeViewer } from "@/components/grade-viewer"
import { InstitutionalManager } from "@/components/institutional-manager"
import {
  getStudentSession,
  getSubmissionByEmailAndAssessment,
  getProfessorSession,
  type StudentSession,
  type StudentSubmission,
  type FinancialSettings,
  getAvailableSlots,
} from "@/lib/store"
import { BookOpen, GraduationCap, ClipboardList, User } from "lucide-react"

type View = "landing" | "public-exam-login" | "student-portal-login" | "student-assessment" | "student-result" | "professor-login" | "admin" | "student-dashboard"

export default function HomePage() {
  const [view, setView] = useState<View>("landing")
  const [session, setSession] = useState<StudentSession | null>(null)
  const [submission, setSubmission] = useState<StudentSubmission | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [showGrade, setShowGrade] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)

    // Restore professor session
    const profSession = getProfessorSession()
    if (profSession) {
      setView("admin")
      return
    }

    // Restore student session
    async function checkStudentSession() {
      const studentSession = getStudentSession()
      if (studentSession) {
        const existing = await getSubmissionByEmailAndAssessment(studentSession.email, studentSession.assessmentId)
        if (existing) {
          setSession(studentSession)
          setSubmission(existing)
          setView(existing.submittedAt ? "student-result" : "student-assessment")
        } else {
          setSession(studentSession)
          setView("student-assessment")
        }
      }
    }

    async function fetchSlots() {
      const slots = await getAvailableSlots()
      setAvailableSlots(slots)
    }

    checkStudentSession()
    fetchSlots()
  }, [])

  // Hash routing for admin panel: /admin
  useEffect(() => {
    const { hash } = window.location
    if (hash === "#admin" || hash === "#/admin") {
      setView("professor-login")
    }
  }, [])

  const handleStudentLogin = useCallback(async (sess: StudentSession) => {
    setSession(sess)
    const existing = await getSubmissionByEmailAndAssessment(sess.email, sess.assessmentId)
    if (existing && existing.submittedAt) {
      setSubmission(existing)
      setView("student-result")
    } else {
      setView("student-assessment")
    }
  }, [])

  const handleResult = useCallback((sub: StudentSubmission) => {
    setSubmission(sub)
    setView("student-result")
  }, [])

  const handleSubmit = useCallback((sub: StudentSubmission) => {
    setSubmission(sub)
    setView("student-result")
  }, [])

  const handleProfessorLogin = useCallback(() => {
    setView("admin")
  }, [])

  const handleLogout = useCallback(() => {
    setView("landing")
    setSession(null)
    setSubmission(null)
  }, [])

  if (!mounted) return null

  // Admin views
  if (view === "professor-login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <ProfessorLogin onLogin={handleProfessorLogin} onBack={() => setView("landing")} />
      </div>
    )
  }

  if (view === "admin") {
    return <AdminDashboard onLogout={() => setView("landing")} />
  }

  return (
    <div className="min-h-screen bg-background">
      {!["student-dashboard", "student-portal-login", "student-assessment", "student-result"].includes(view) && (
        <AssessmentHeader
          studentName={session?.name}
          studentEmail={session?.email}
          onAdminClick={() => setView("professor-login")}
          onStudentAreaClick={session ? () => setView("student-dashboard") : undefined}
          onEnrollClick={() => setShowEnroll(true)}
        />
      )}

      <main className="mx-auto max-w-[1400px] px-4 py-8">
        {/* Landing Page */}
        {view === "landing" && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="bg-maroon-dark bg-gradient-to-br from-[#450a0a] to-[#991b1b] rounded-3xl p-8 md:p-12 text-white shadow-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mt-48 blur-3xl" />

              <div className="text-left relative z-10 flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-accent mb-2">
                  Curso de Teologia Bíblica
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  Instituto de Ensino <br /> Teológico <span className="text-accent">IETEO</span>
                </h1>
                <div className="h-1.5 w-20 bg-accent rounded-full opacity-60" />
                <p className="text-white/80 text-lg font-serif italic max-w-lg">
                  "Veritas • Sapientia • Fides"
                </p>
                <div className="pt-4 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-white/40 font-bold tracking-tighter">Campus</span>
                      <span className="text-sm font-bold">Salvador / BA</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-white/40 font-bold tracking-tighter">Fundação</span>
                      <span className="text-sm font-bold">2026</span>
                    </div>
                  </div>

                  {/* Promo Banner */}
                  <div className="bg-maroon/40 border border-accent/40 rounded-2xl p-4 backdrop-blur-md animate-pulse shadow-[0_0_25px_rgba(180,83,9,0.3)]">
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-accent mb-1 flex items-center gap-1.5">
                       <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping"></span> 
                       Corra! Vagas Limitadas
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-bold text-white">Matrícula: <span className="text-accent-foreground bg-accent px-1.5 rounded ml-1">R$ 120,00</span></p>
                      <p className="text-xs font-bold text-white mt-1">Mensalidade: <span className="text-accent-foreground bg-accent px-1.5 rounded ml-1">R$ 60,00</span></p>
                    </div>
                    <p className="text-[9px] font-black text-accent mt-2 tracking-widest uppercase">
                      • {availableSlots !== null ? `${availableSlots} Vagas Restantes` : "Matrículas Abertas"} •
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex-shrink-0 group">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-105 overflow-hidden">
                  <img
                    src="/ieteo-logo.jpg"
                    alt="IETEO Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Matrícula */}
              <button
                onClick={() => setShowEnroll(true)}
                className="group relative overflow-hidden bg-accent text-accent-foreground rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ClipboardList className="h-8 w-8 mb-3 opacity-90" />
                <h2 className="text-xl font-extrabold mb-1">Fazer Matrícula</h2>
                <p className="text-sm opacity-80">Inscreva-se agora e comece sua formação teológica</p>
              </button>

              {/* Grade */}
              <button
                onClick={() => setShowGrade(true)}
                className="group relative overflow-hidden bg-card border-2 border-border rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:border-accent/40 hover:scale-[1.02] transition-all"
              >
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen className="h-8 w-8 text-accent mb-3" />
                <h2 className="text-xl font-extrabold mb-1 text-foreground">Ver Grade Curricular</h2>
                <p className="text-sm text-muted-foreground">Conheça as disciplinas, turmas e turnos disponíveis</p>
              </button>

              {/* Área do Aluno */}
              <button
                onClick={() => setView("student-portal-login")}
                className="group relative overflow-hidden bg-card border-2 border-border rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:border-accent/40 hover:scale-[1.02] transition-all"
              >
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <User className="h-8 w-8 text-accent mb-3" />
                <h2 className="text-xl font-extrabold mb-1 text-foreground">Área do Aluno</h2>
                <p className="text-sm text-muted-foreground">Acesso restrito para alunos matriculados.</p>
              </button>

              {/* Prova Pública */}
              <button
                onClick={() => setView("public-exam-login")}
                className="group relative overflow-hidden bg-card border-2 border-border rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:border-accent/40 hover:scale-[1.02] transition-all"
              >
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <GraduationCap className="h-8 w-8 text-accent mb-3" />
                <h2 className="text-xl font-extrabold mb-1 text-foreground">Prova Pública</h2>
                <p className="text-sm text-muted-foreground">Acesso aberto para avaliações públicas sem matrícula.</p>
              </button>
            </div>

            {/* Inclusão Institucional */}
            <div className="pt-8 border-t border-border mt-12">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-foreground tracking-tight">Informações Institucionais</h2>
                <p className="text-muted-foreground">Conheça nossa missão e diretoria</p>
              </div>
              <InstitutionalManager />
            </div>
          </div>
        )}

        {view === "public-exam-login" && <StudentLogin onLogin={handleStudentLogin} onResult={handleResult} onBack={() => setView("landing")} />}
        {view === "student-portal-login" && (
          <StudentDashboard session={null} onBack={() => setView("landing")} onLogout={handleLogout} />
        )}
        {view === "student-assessment" && session && (
          <AssessmentForm session={session} onSubmit={handleSubmit} />
        )}
        {view === "student-result" && submission && (
          <AssessmentResult submission={submission} onBack={handleLogout} />
        )}
        {view === "student-dashboard" && (
          <StudentDashboard
            session={session}
            onBack={() => {
              if (submission && submission.submittedAt) {
                setView("student-result")
              } else if (session) {
                setView("student-assessment")
              } else {
                setView("landing")
              }
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Modals */}
      {showEnroll && (
        <EnrollmentForm
          onClose={() => setShowEnroll(false)}
          onSuccess={() => setView("student-portal-login")}
        />
      )}
      {showGrade && (
        <GradeViewer onClose={() => setShowGrade(false)} />
      )}
    </div>
  )
}
