import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Fetch all professors from the public table
    const { data: professors, error: fetchError } = await supabase
      .from('professor_accounts')
      .select('*')

    if (fetchError) throw fetchError

    const results = []

    for (const prof of professors) {
      // 2. Decode password from base64 (since password_hash stores base64 version)
      const decodedPassword = Buffer.from(prof.password_hash, 'base64').toString('ascii')

      // 3. Create user in Supabase Auth
      const { data: userData, error: authError } = await supabase.auth.admin.createUser({
        email: prof.email,
        password: decodedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: prof.name,
          role: prof.role || "professor"
        }
      })

      if (authError) {
        // If user already exists, we skip or update (here we skip with a message)
        results.push({ email: prof.email, status: "error", message: authError.message })
      } else {
        results.push({ email: prof.email, status: "success", userId: userData.user.id })
      }
    }

    return NextResponse.json({ 
      summary: `Processados ${professors.length} professores.`,
      results 
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
