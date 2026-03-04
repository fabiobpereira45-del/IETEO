"use client"

import { useState, useEffect, useCallback } from "react"
import { AssessmentHeader } from "@/components/assessment-header"
import { StudentLogin } from "@/components/student-login"
import { AssessmentForm } from "@/components/assessment-form"
import { AssessmentResult } from "@/components/assessment-result"
import { ProfessorLogin } from "@/components/professor-login"
import { AdminDashboard } from "@/components/admin-dashboard"
import {
  getStudentSession,
  getSubmissionByEmailAndAssessment,
  getProfessorSession,
  type StudentSession,
  type StudentSubmission,
} from "@/lib/store"

type View = "student-login" | "student-assessment" | "student-result" | "professor-login" | "admin"

export default function HomePage() {
  const [view, setView] = useState<View>("student-login")
  const [session, setSession] = useState<StudentSession | null>(null)
  const [submission, setSubmission] = useState<StudentSubmission | null>(null)
  const [mounted, setMounted] = useState(false)

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

  const handleSubmit = useCallback((sub: StudentSubmission) => {
    setSubmission(sub)
    setView("student-result")
  }, [])

  const handleProfessorLogin = useCallback(() => {
    setView("admin")
  }, [])

  const handleLogout = useCallback(() => {
    setView("student-login")
    setSession(null)
    setSubmission(null)
  }, [])

  if (!mounted) return null

  // Admin views
  if (view === "professor-login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <ProfessorLogin onLogin={handleProfessorLogin} onBack={() => setView("student-login")} />
      </div>
    )
  }

  if (view === "admin") {
    return <AdminDashboard onLogout={() => setView("student-login")} />
  }

  // Student views
  return (
    <div className="min-h-screen bg-background">
      <AssessmentHeader
        studentName={session?.name}
        studentEmail={session?.email}
        onAdminClick={() => setView("professor-login")}
      />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {view === "student-login" && <StudentLogin onLogin={handleStudentLogin} />}
        {view === "student-assessment" && session && (
          <AssessmentForm session={session} onSubmit={handleSubmit} />
        )}
        {view === "student-result" && submission && (
          <AssessmentResult submission={submission} onBack={handleLogout} />
        )}
      </main>
    </div>
  )
}
