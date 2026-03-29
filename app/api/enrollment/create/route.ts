import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { triggerN8nWebhook } from "@/lib/n8n"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { name, cpf, phone, address, church, pastor, classId, amount } = body

        if (!name || !cpf || !phone || !address || !church || !pastor) {
            return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Check if CPF already enrolled and CONFIRMED (not pending/abandoned)
        const { data: existing } = await supabase
            .from('students')
            .select('id, status')
            .eq('cpf', cpf.replace(/\D/g, ''))
            .not('status', 'eq', 'pending')
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ error: "Este CPF já possui uma matrícula confirmada." }, { status: 409 })
        }

        // Clean up any abandoned pending enrollment for this CPF
        await supabase
            .from('students')
            .delete()
            .eq('cpf', cpf.replace(/\D/g, ''))
            .eq('status', 'pending')

        // Vacancy check
        if (classId) {
            const { data: cls } = await supabase.from('classes').select('max_students').eq('id', classId).single()
            if (cls) {
                const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', classId)
                if (count !== null && count >= cls.max_students) {
                    return NextResponse.json({ error: "Esta turma já está com as vagas esgotadas." }, { status: 403 })
                }
            }
        }

        // Generate enrollment number
        const enrollmentNumber = `IETEO-${Date.now().toString().slice(-8)}`
        const cleanCpf = cpf.replace(/\D/g, '')
        const email = `${cleanCpf}@student.ieteo.com`

        // Create Auth User
        let authUserId: string | undefined

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: "123456", // Senha padrão para evitar confusão
            email_confirm: true,
            user_metadata: { name: name.trim(), type: 'student' }
        })

        if (authError) {
            if (authError.message === 'User already registered' || authError.code === 'email_exists') {
                // If user exists, fetch their ID
                const { data: users } = await supabase.auth.admin.listUsers()
                const existingUser = users?.users.find(u => u.email === email)
                authUserId = existingUser?.id
            } else {
                console.error("Erro ao criar usuário Auth:", authError)
            }
        } else {
            authUserId = authUser?.user?.id
        }

        // Create student record with status 'pending' (awaiting payment)
        const { data: student, error: studentErr } = await supabase
            .from('students')
            .insert({
                auth_user_id: authUserId,
                name: name.trim(),
                cpf: cleanCpf,
                enrollment_number: enrollmentNumber,
                phone: phone.trim(),
                address: address.trim(),
                church: church.trim(),
                pastor_name: pastor.trim(),
                class_id: classId || null,
                status: 'pending'
            })
            .select()
            .single()

        if (studentErr) {
            console.error("Erro ao criar aluno:", studentErr)
            return NextResponse.json({ error: `Erro ao registrar candidato: ${studentErr.message}` }, { status: 500 })
        }


        // Create enrollment charge
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 3)

        const { data: charge, error: chargeErr } = await supabase
            .from('financial_charges')
            .insert({
                student_id: student.id,
                type: 'enrollment',
                description: `Matrícula - ${name.trim()}`,
                amount: amount || 0,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending'
            })
            .select()
            .single()

        if (chargeErr) {
            console.error("Erro ao criar cobrança:", chargeErr)
            return NextResponse.json({ error: "Erro ao criar cobrança." }, { status: 500 })
        }

        // Trigger n8n WhatsApp (Online Enrollment)
        /* TEMPORARILY DISABLED: Usuário enviará mensagens via comando humano
        try {
            await triggerN8nWebhook('matricula_realizada_online', {
                type: 'online_enrollment',
                name: name.trim(),
                phone: phone.trim(),
                enrollmentNumber,
                amount: amount || 0,
                dueDate: dueDate.toISOString().split('T')[0]
            })
        } catch (err) {
            console.error("Erro ao disparar n8n em matrícula online:", err)
        }
        */

        return NextResponse.json({
            chargeId: charge.id,
            studentId: student.id,
            enrollmentNumber
        })
    } catch (error: any) {
        console.error("Enrollment Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
