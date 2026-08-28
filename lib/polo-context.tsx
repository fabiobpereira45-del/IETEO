"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type Polo, getSelectedPolo, saveSelectedPolo, clearSelectedPolo } from "@/lib/store"

// ─── Context ──────────────────────────────────────────────────────────────────

interface PoloContextType {
  polo: Polo | null
  selectPolo: (polo: Polo) => void
  resetPolo: () => void
  isLoaded: boolean
}

const PoloContext = createContext<PoloContextType>({
  polo: null,
  selectPolo: () => {},
  resetPolo: () => {},
  isLoaded: false,
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PoloProvider({ children }: { children: ReactNode }) {
  const [polo, setPolo] = useState<Polo | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Restore saved polo on mount
  useEffect(() => {
    const saved = getSelectedPolo()
    if (saved) setPolo(saved)
    setIsLoaded(true)
  }, [])

  const selectPolo = useCallback((p: Polo) => {
    saveSelectedPolo(p.id)
    setPolo(p)
  }, [])

  const resetPolo = useCallback(() => {
    clearSelectedPolo()
    setPolo(null)
  }, [])

  return (
    <PoloContext.Provider value={{ polo, selectPolo, resetPolo, isLoaded }}>
      {children}
    </PoloContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePolo() {
  return useContext(PoloContext)
}
