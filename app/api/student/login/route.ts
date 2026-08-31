import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identificador e senha são obrigatórios." }, { status: 400 })
    }

    const supabase = createAdminClient()
    let cleanId = identifier.trim()
    const cleanDigits = cleanId.replace(/\D/g, '')

    // 1. Find student in database
    let student: any = null

    if (cleanId.includes('@')) {
      const { data } = await supabase.from('students').select('*').eq('email', cleanId.toLowerCase()).maybeSingle()
      student = data
    } else if (cleanDigits.length === 11) {
      const { data } = await supabase.from('students').select('*').eq('cpf', cleanDigits).maybeSingle()
      student = data
    }

    if (!student && cleanDigits.length > 0) {
      // Try by enrollment_number or partial CPF
      const { data } = await supabase.from('students').select('*').or(`enrollment_number.eq.${cleanId},enrollment_number.ilike.%${cleanDigits}%,cpf.eq.${cleanDigits}`).maybeSingle()
      student = data
    }

    if (!student) {
      return NextResponse.json({ error: "Nenhum cadastro de aluno encontrado para este CPF, Matrícula ou E-mail." }, { status: 404 })
    }

    const cleanCpf = student.cpf ? student.cpf.replace(/\D/g, '') : ''
    const email = student.email || (cleanCpf ? `${cleanCpf}@student.ieteo.com` : null)

    if (!email) {
      return NextResponse.json({ error: "Aluno sem e-mail ou CPF válido cadastrado." }, { status: 400 })
    }

    // 2. Check Auth User
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    let authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    const cleanInputPassword = password.trim()
    const isDefaultPasswordAttempt = cleanInputPassword === '123456' || cleanInputPassword === cleanCpf || cleanInputPassword === cleanDigits

    if (!authUser) {
      // Create auth user automatically
      const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: cleanInputPassword,
        email_confirm: true,
        user_metadata: { name: student.name, type: 'student' }
      })
      if (createErr) throw createErr
      authUser = newAuth.user
    } else if (isDefaultPasswordAttempt) {
      // If user tries initial password, ensure auth account is set to it
      try {
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: cleanInputPassword,
          email_confirm: true,
          user_metadata: { name: student.name, type: 'student' }
        })
      } catch (updateErr) {
        console.warn("Could not sync default password:", updateErr)
      }
    }

    // 3. Link student record
    if (authUser && (student.auth_user_id !== authUser.id || !student.email || student.status === 'pending')) {
      await supabase.from('students').update({
        auth_user_id: authUser.id,
        email: email.toLowerCase(),
        status: student.status === 'pending' ? 'active' : student.status
      }).eq('id', student.id)
    }

    return NextResponse.json({
      success: true,
      email: email.toLowerCase(),
      studentId: student.id,
      name: student.name
    })

  } catch (err: any) {
    console.error("Student Login API Error:", err)
    return NextResponse.json({ error: err.message || "Erro ao autenticar aluno." }, { status: 500 })
  }
}
