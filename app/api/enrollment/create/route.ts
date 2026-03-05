import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

        // Check if CPF already enrolled
        const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('cpf', cpf.replace(/\D/g, ''))
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ error: "Este CPF já possui uma matrícula cadastrada." }, { status: 409 })
        }

        // Generate enrollment number
        const enrollmentNumber = `IETEO-${Date.now().toString().slice(-8)}`

        // Create student record (pre-enrollment, no auth user yet)
        const { data: student, error: studentErr } = await supabase
            .from('students')
            .insert({
                name: name.trim(),
                cpf: cpf.replace(/\D/g, ''),
                enrollment_number: enrollmentNumber,
                phone: phone.trim(),
                address: address.trim(),
                church: church.trim(),
                pastor_name: pastor.trim(),
                class_id: classId || null,
                auth_user_id: '00000000-0000-0000-0000-000000000000' // placeholder
            })
            .select()
            .single()

        if (studentErr) {
            console.error("Erro ao criar aluno:", studentErr)
            return NextResponse.json({ error: "Erro ao registrar candidato. Tente novamente." }, { status: 500 })
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
