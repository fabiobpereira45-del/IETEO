"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { logUserActivity, getProfessorSession, getStudentProfileAuth } from "@/lib/store"

export function ActivityTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPath = useRef<string>("")
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const trackAction = async (action: string, metadata: any = {}) => {
      try {
        let userId = undefined
        let userEmail = undefined
        let userName = undefined
        let role = undefined

        // Check Professor Session
        const prof = getProfessorSession()
        if (prof) {
          userId = prof.professorId
          role = prof.role
          userName = prof.role === 'master' ? 'Fábio Barreto' : 'Professor' // Simplification
        } else {
          // Check Student Session
          const student = await getStudentProfileAuth()
          if (student) {
            userId = student.id
            userEmail = student.email
            userName = student.name
            role = 'student'
          }
        }

        if (userId || action === 'page_visit') {
          await logUserActivity({
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            role: role,
            action,
            metadata: {
              ...metadata,
              path: pathname,
              params: searchParams.toString(),
              userAgent: navigator.userAgent,
            }
          })
        }
      } catch (err) {
        // Silently fail to not interrupt user experience
      }
    }

    // Track Page Visit
    if (pathname !== lastPath.current) {
      console.log(`[ActivityTracker] Tracking page visit: ${pathname}`)
      trackAction("page_visit")
      lastPath.current = pathname
    }

    // Heartbeat for time tracking (every 2 minutes)
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
    heartbeatTimer.current = setInterval(() => {
      trackAction("heartbeat")
    }, 120000)

    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
    }
  }, [pathname, searchParams])

  return null
}
