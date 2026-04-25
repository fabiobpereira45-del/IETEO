import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
        const { error } = await supabase.from('challenges').delete().eq('id', id)
        
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
