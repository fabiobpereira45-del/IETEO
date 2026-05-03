import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const disciplineId = searchParams.get("disciplineId")
        
        const supabase = createAdminClient()
        let query = supabase.from('challenges').select('*').order('week', { ascending: true })
        
        if (disciplineId) {
            query = query.eq('discipline_id', disciplineId)
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
        const data = await request.json()
        const supabase = createAdminClient()
        const { data: result, error } = await supabase.from('challenges').insert(data).select().single()
        
        if (error) throw error
        return NextResponse.json({ success: true, data: result })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, ...data } = await request.json()
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })
        
        const supabase = createAdminClient()
        const { error } = await supabase.from('challenges').update(data).eq('id', id)
        
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })
        
        const supabase = createAdminClient()
        
        // Check for dependencies first to give a better error
        const { count: subCount } = await supabase.from('challenge_submissions').select('*', { count: 'exact', head: true }).eq('challenge_id', id)
        
        if (subCount && subCount > 0) {
            return NextResponse.json({ 
                error: `Não é possível excluir esta missão pois ela possui ${subCount} respostas de alunos registradas. Exclua as respostas primeiro ou desative a missão.` 
            }, { status: 400 })
        }

        const { error } = await supabase.from('challenges').delete().eq('id', id)
        
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("DELETE Challenge Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
