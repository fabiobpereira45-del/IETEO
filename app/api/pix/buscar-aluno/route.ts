import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { identifier } = await req.json()

        if (!identifier || identifier.trim().length < 3) {
            return NextResponse.json({ error: "Informe um CPF ou número de matrícula válido." }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const clean = identifier.replace(/\D/g, "")
        const raw = identifier.trim()

        // Search by CPF (digits only) OR enrollment_number
        const { data: student, error } = await supabase
            .from("students")
            .select("id, name, cpf, enrollment_number, status, polo_id")
            .or(`cpf.eq.${clean},enrollment_number.eq.${raw},enrollment_number.eq.${clean}`)
            .maybeSingle()

        if (error || !student) {
            return NextResponse.json({ error: "Aluno não encontrado. Verifique o CPF ou número de matrícula." }, { status: 404 })
        }

        // Fetch pending/late charges for this student
        const { data: charges } = await supabase
            .from("financial_charges")
            .select("id, type, description, amount, due_date, status, pix_qrcode, pix_copy_paste, asaas_payment_id")
            .eq("student_id", student.id)
            .in("status", ["pending", "late"])
            .order("due_date", { ascending: true })

        return NextResponse.json({
            student: {
                id: student.id,
                name: student.name,
                enrollmentNumber: student.enrollment_number,
                status: student.status,
            },
            charges: (charges || []).map((c: any) => ({
                id: c.id,
                type: c.type,
                description: c.description,
                amount: Number(c.amount),
                dueDate: c.due_date,
                status: c.status,
                pixQrcode: c.pix_qrcode || null,
                pixCopyPaste: c.pix_copy_paste || null,
                asaasPaymentId: c.asaas_payment_id || null,
            }))
        })
    } catch (err: any) {
        console.error("Buscar Aluno Error:", err)
        return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
    }
}
