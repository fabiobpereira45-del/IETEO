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
import {
  getStudentSession,
  getSubmissionByEmailAndAssessment,
  getProfessorSession,
  type StudentSession,
  type StudentSubmission,
} from "@/lib/store"
import { BookOpen, GraduationCap, ClipboardList, User } from "lucide-react"

type View = "landing" | "student-login" | "student-assessment" | "student-result" | "professor-login" | "admin" | "student-dashboard"

export default function HomePage() {
  const [view, setView] = useState<View>("landing")
  const [session, setSession] = useState<StudentSession | null>(null)
  const [submission, setSubmission] = useState<StudentSubmission | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [showGrade, setShowGrade] = useState(false)

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
    checkStudentSession()
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
      <AssessmentHeader
        studentName={session?.name}
        studentEmail={session?.email}
        onAdminClick={() => setView("professor-login")}
        onStudentAreaClick={session ? () => setView("student-dashboard") : undefined}
        onEnrollClick={() => setShowEnroll(true)}
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Landing Page */}
        {view === "landing" && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 text-primary-foreground text-center shadow-xl">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg">
                  <BookOpen className="h-8 w-8 text-accent-foreground" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold mb-2">Instituto de Ensino Teológico</h1>
              <p className="text-primary-foreground/80 text-lg font-medium mb-1">IETEO</p>
              <p className="text-primary-foreground/60 text-sm">Formando líderes para o Reino de Deus</p>
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
                onClick={() => setView("student-login")}
                className="group relative overflow-hidden bg-card border-2 border-border rounded-2xl p-6 text-left shadow-lg hover:shadow-xl hover:border-accent/40 hover:scale-[1.02] transition-all sm:col-span-2"
              >
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <User className="h-8 w-8 text-accent mb-3" />
                <h2 className="text-xl font-extrabold mb-1 text-foreground">Área do Aluno</h2>
                <p className="text-sm text-muted-foreground">Acesse avaliações, financeiro, materiais e muito mais</p>
              </button>
            </div>
          </div>
        )}

        {view === "student-login" && <StudentLogin onLogin={handleStudentLogin} onResult={handleResult} onBack={() => setView("landing")} />}
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
          onSuccess={() => setView("student-login")}
        />
      )}
      {showGrade && (
        <GradeViewer onClose={() => setShowGrade(false)} />
      )}
    </div>
  )
}
