import { createBrowserClient } from '@supabase/ssr'

// FIX: Global check for sessionStorage/localStorage to prevent SecurityError in blocked environments
if (typeof window !== 'undefined') {
  try {
    // Just accessing the property can throw SecurityError in some browsers
    const testS = window.sessionStorage;
    const testL = window.localStorage;
  } catch (e) {
    console.warn("Browser storage is blocked. Providing mocks to prevent crash.");
    const mockStorage = () => {
      let storage: Record<string, string> = {};
      return {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => { storage[key] = value },
        removeItem: (key: string) => { delete storage[key] },
        clear: () => { storage = {} },
        key: (i: number) => Object.keys(storage)[i] || null,
        length: 0
      };
    };
    
    try {
      if (!('sessionStorage' in window)) {
        Object.defineProperty(window, 'sessionStorage', { value: mockStorage() });
      }
    } catch (err) {}
    
    try {
      if (!('localStorage' in window)) {
        Object.defineProperty(window, 'localStorage', { value: mockStorage() });
      }
    } catch (err) {}
  }
}

// In-memory fallback for environments where localStorage/sessionStorage are blocked (SecurityError)
const isBrowser = typeof window !== 'undefined'
const memoryStorage: Record<string, string> = {}

const safeStorage = {
  getItem: (key: string) => {
    if (!isBrowser) return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memoryStorage[key] || null
    }
  },
  setItem: (key: string, value: string) => {
    if (!isBrowser) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      memoryStorage[key] = value
    }
  },
  removeItem: (key: string) => {
    if (!isBrowser) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      delete memoryStorage[key]
    }
  },
}

let supabaseInstance: any = null

export function createClient() {
  if (!supabaseInstance) {
    try {
      supabaseInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            storage: safeStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          }
        }
      )
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err)
      // Return a basic client if the above fails, though createBrowserClient should handle options
      supabaseInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
  }
  return supabaseInstance
}
