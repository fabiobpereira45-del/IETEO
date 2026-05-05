import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { 
            name, email, password, cpf, phone, 
            address, church, pastor_name, class_id, 
            payment_status, enrollment_number 
        } = body

        if (!email || !name) {
            return NextResponse.json({ error: "Email e Nome são obrigatórios" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // 1. Check if user exists in Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) throw listError
        
        let authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        let authUserId = authUser?.id

        // 2. If not in Auth, create them
        if (!authUser) {
            const { data: newAuth, error: createError } = await supabase.auth.admin.createUser({
                email,
                password: password || "123456",
                email_confirm: true,
                user_metadata: {
                    full_name: name.toUpperCase(),
                    type: 'student'
                }
            })
            if (createError) throw createError
            authUserId = newAuth.user.id
        }

        // 3. Check if exists in 'students' table
        const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('email', email)
            .single()

        const matricula = enrollment_number || `2026${Math.floor(1000 + Math.random() * 9000)}`

        const studentData = {
            auth_user_id: authUserId,
            name: name.toUpperCase(),
            cpf: cpf ? cpf.replace(/\D/g, '') : null,
            email: email.toLowerCase(),
            enrollment_number: matricula,
            phone: phone || null,
            address: address || null,
            church: church || null,
            pastor_name: pastor_name || null,
            class_id: class_id || null,
            payment_status: payment_status || 'paid',
            status: 'active'
        }

        if (existingStudent) {
            // Update
            const { error: updateError } = await supabase
                .from('students')
                .update(studentData)
                .eq('id', existingStudent.id)
            
            if (updateError) throw updateError
            return NextResponse.json({ success: true, message: "Cadastro de aluno atualizado", studentId: existingStudent.id })
        } else {
            // Insert
            const { data: newStudent, error: insertError } = await supabase
                .from('students')
                .insert(studentData)
                .select()
                .single()
            
            if (insertError) throw insertError
            return NextResponse.json({ success: true, message: "Aluno matriculado com sucesso", studentId: newStudent.id })
        }

    } catch (err: any) {
        console.error("Enrollment API Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
