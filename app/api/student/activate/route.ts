import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { triggerN8nWebhook } from "@/lib/n8n"

export async function POST(req: Request) {
    try {
        const { studentId } = await req.json()

        if (!studentId) {
            return NextResponse.json({ error: "ID do aluno é obrigatório" }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Get student data
        const { data: student, error: fetchErr } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single()

        if (fetchErr || !student) {
            return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 })
        }

        // 2. Activate student status
        const { error: updateErr } = await supabase
            .from('students')
            .update({ status: 'active' })
            .eq('id', studentId)

        if (updateErr) throw updateErr

        // 3. Check if Auth User already exists
        if (student.auth_user_id) {
            return NextResponse.json({ success: true, message: "Aluno já ativado e com acesso." })
        }

        // 4. Create Auth User
        const cleanCpf = student.cpf.replace(/\D/g, '')
        const email = `${cleanCpf}@student.ieteo.com`
        const password = "123456"

        // Use admin client to create user without confirmation
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: student.name, type: 'student' }
        })

        if (authErr) {
            // If user already exists (maybe from a previous attempt), try to link it
            if (authErr.message.includes("already registered")) {
                const { data: existingUser } = await supabase.from('students').select('auth_user_id').eq('cpf', cleanCpf).not('auth_user_id', 'is', null).maybeSingle()
                if (existingUser?.auth_user_id) {
                    await supabase.from('students').update({ auth_user_id: existingUser.auth_user_id }).eq('id', studentId)
                    return NextResponse.json({ success: true, message: "Status ativado e usuário vinculado." })
                }
            }
            console.error("Auth Creation Error:", authErr)
            // Still return success for activation, but note the auth error
            return NextResponse.json({ success: true, warning: "Status ativado, mas erro ao criar acesso: " + authErr.message })
        }

        // 5. Update student with auth_user_id
        if (authUser?.user) {
            await supabase
                .from('students')
                .update({ auth_user_id: authUser.user.id })
                .eq('id', studentId)
        }

        // 6. Trigger n8n Welcome (with credentials)
        /* TEMPORARILY DISABLED: Usuário enviará mensagens via comando humano
        try {
            await triggerN8nWebhook('matricula_confirmada', {
                type: 'enrollment',
                name: student.name,
                phone: student.phone,
                matricula: student.enrollment_number,
                cpf: cleanCpf,
                password: password,
                login_url: "https://ieteo-dashboard.vercel.app/aluno/login"
            })
        } catch (err) {
            console.error("n8n Trigger Error:", err)
        }
        */

        return NextResponse.json({ success: true, message: "Aluno ativado e credenciais geradas." })

    } catch (error: any) {
        console.error("Activation API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
