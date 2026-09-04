import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const status = searchParams.get("status")
    const poloId = searchParams.get("poloId")

    const supabase = createAdminClient()
    let query = supabase.from("book_loans").select("*").order("requested_at", { ascending: false })

    if (studentId) query = query.eq("student_id", studentId)
    if (status && status !== "all") query = query.eq("status", status)
    if (poloId && poloId !== "all") query = query.eq("polo_id", poloId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("book_loans").insert(payload).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase.from("book_loans").update(updates).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
