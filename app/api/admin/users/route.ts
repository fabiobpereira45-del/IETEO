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

export async function PATCH(request: Request) {
    try {
        const { id, email, password, name, role } = await request.json()

        if (!id && !email) {
            return NextResponse.json({ error: "User ID or Email is required" }, { status: 400 })
        }

        const supabase = createAdminClient()
        let targetId = id

        if (!targetId && email) {
            const { data: { users }, error } = await supabase.auth.admin.listUsers()
            if (error) throw error
            const user = users.find(u => u.email === email)
            if (user) {
                targetId = user.id
            } else {
                return NextResponse.json({ error: "User not found in Auth" }, { status: 404 })
            }
        }

        const updateData: any = {}
        if (password) updateData.password = password

        if (name || role) {
            // Fetch existing metadata to avoid overwriting other keys
            const { data: { user: existingUser }, error: fetchError } = await supabase.auth.admin.getUserById(targetId)
            if (fetchError) throw fetchError

            updateData.user_metadata = { 
                ...(existingUser?.user_metadata || {})
            }
            if (name) updateData.user_metadata.full_name = name
            if (role) updateData.user_metadata.role = role
        }

        const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
            targetId,
            updateData
        )

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        return NextResponse.json({ user: authData.user })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const email = searchParams.get("email")
        const id = searchParams.get("id")

        if (!email && !id) {
            return NextResponse.json({ error: "Email or ID is required" }, { status: 400 })
        }

        const supabase = createAdminClient()

        if (id) {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
            if (deleteError) throw deleteError
        } else if (email) {
            // List matching users (email should be unique)
            const { data: { users }, error } = await supabase.auth.admin.listUsers()
            if (error) throw error

            const user = users.find(u => u.email === email)
            if (user) {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
                if (deleteError) throw deleteError
            }
        }

        return NextResponse.json({ success: true })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
