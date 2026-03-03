import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
    try {
        const { email, password, name, role } = await request.json()

        if (!email || !password || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Create the user in Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: name,
                role: role || "professor"
            }
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        return NextResponse.json({ user: authData.user })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
