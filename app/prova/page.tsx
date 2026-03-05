"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useState, useCallback } from "react"
import { StudentLogin } from "@/components/student-login"
import { AssessmentForm } from "@/components/assessment-form"
import { AssessmentResult } from "@/components/assessment-result"
import { AssessmentHeader } from "@/components/assessment-header"
import { type StudentSession, type StudentSubmission } from "@/lib/store"

function ProvaPageContent() {
    const params = useSearchParams()
    const assessmentId = params.get("id") || undefined

    const [session, setSession] = useState<StudentSession | null>(null)
    const [submission, setSubmission] = useState<StudentSubmission | null>(null)
    const [view, setView] = useState<"login" | "assessment" | "result">("login")

    const handleLogin = useCallback((sess: StudentSession) => {
        setSession(sess)
        setView("assessment")
    }, [])

    const handleSubmit = useCallback((sub: StudentSubmission) => {
        setSubmission(sub)
        setView("result")
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <AssessmentHeader />
            <main className="mx-auto max-w-3xl px-4 py-8">
                {view === "login" && (
                    <StudentLogin
                        onLogin={handleLogin}
                        preloadedAssessmentId={assessmentId}
                    />
                )}
                {view === "assessment" && session && (
                    <AssessmentForm session={session} onSubmit={handleSubmit} />
                )}
                {view === "result" && submission && (
                    <AssessmentResult
                        submission={submission}
                        onBack={() => { setView("login"); setSession(null); setSubmission(null) }}
                    />
                )}
            </main>
        </div>
    )
}

export default function ProvaPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        }>
            <ProvaPageContent />
        </Suspense>
    )
}
