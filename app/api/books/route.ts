import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const poloId = searchParams.get("poloId")

    const supabase = createAdminClient()
    let query = supabase.from("books").select("*").order("title", { ascending: true })

    if (category && category !== "all") {
      query = query.eq("category", category)
    }
    if (poloId && poloId !== "all") {
      query = query.or(`polo_id.eq.${poloId},polo_id.is.null`)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const book = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("books").upsert(book).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from("books").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
