import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const professorId = searchParams.get("professorId")
    const supabase = createAdminClient()

    let query = supabase.from("professor_disciplines").select("*")
    if (professorId) {
      query = query.eq("professor_id", professorId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("Error fetching professor disciplines:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { professorId, disciplineIds } = body

    if (!professorId) {
      return NextResponse.json({ error: "professorId é obrigatório" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Remover vínculos existentes deste professor
    const { error: deleteError } = await supabase
      .from("professor_disciplines")
      .delete()
      .eq("professor_id", professorId)

    if (deleteError) {
      console.error("Erro ao deletar vínculos anteriores:", deleteError)
      throw deleteError
    }

    // 2. Inserir novos vínculos selecionados
    if (Array.isArray(disciplineIds) && disciplineIds.length > 0) {
      const rows = disciplineIds.map((disciplineId: string) => ({
        professor_id: professorId,
        discipline_id: disciplineId,
        created_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from("professor_disciplines")
        .insert(rows)

      if (insertError) {
        console.error("Erro ao inserir novos vínculos:", insertError)
        throw insertError
      }
    }

    return NextResponse.json({ success: true, count: disciplineIds?.length || 0 })
  } catch (err: any) {
    console.error("Error saving professor disciplines:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
