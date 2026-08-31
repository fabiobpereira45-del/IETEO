import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function parseEadMetadata(description?: string | null): { cleanDescription: string; meta: any } {
  if (!description) return { cleanDescription: "", meta: {} }
  const match = description.match(/<!--EAD_META:(.*?)-->/)
  if (!match) return { cleanDescription: description, meta: {} }
  try {
    const meta = JSON.parse(match[1])
    const clean = description.replace(/<!--EAD_META:(.*?)-->\n?/, '')
    return { cleanDescription: clean, meta }
  } catch (err) {
    return { cleanDescription: description, meta: {} }
  }
}

function buildEadDescription(cleanDescription?: string, meta?: any): string {
  const json = JSON.stringify(meta || {})
  const prefix = `<!--EAD_META:${json}-->\n`
  return prefix + (cleanDescription || '')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const disciplineId = searchParams.get("disciplineId")

    const supabase = createAdminClient()
    let query = supabase.from('ead_lessons').select('*').order('order_index', { ascending: true })
    if (disciplineId) {
      query = query.eq('discipline_id', disciplineId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/admin/ead error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { disciplineId, title, description, videoUrl, meetUrl, coverUrl, lessonType, minMinutesForPresence, availableFrom, availableUntil, orderIndex } = body

    if (!disciplineId || !title || !videoUrl) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes (disciplineId, title, videoUrl)" }, { status: 400 })
    }

    const meta: any = {
      lessonType: lessonType || 'recorded',
      meetUrl: meetUrl || (lessonType === 'live_meet' ? videoUrl : undefined),
      coverUrl: coverUrl || undefined,
      liveDate: availableFrom ? availableFrom.substring(0, 10) : undefined,
      minMinutesForPresence: minMinutesForPresence !== undefined ? Number(minMinutesForPresence) : 0
    }

    const payload: any = {
      discipline_id: disciplineId,
      title: title.trim(),
      description: buildEadDescription(description, meta),
      video_url: videoUrl.trim(),
      order_index: orderIndex || 0,
      available_from: availableFrom || null,
      available_until: availableUntil || null
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.from('ead_lessons').insert(payload).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/admin/ead error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, disciplineId, title, description, videoUrl, meetUrl, coverUrl, lessonType, minMinutesForPresence, availableFrom, availableUntil, orderIndex } = body

    if (!id) {
      return NextResponse.json({ error: "ID da aula é obrigatório" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch existing description if needed to preserve or merge metadata
    let cleanDesc = description
    let existingMeta: any = {}
    const { data: current } = await supabase.from('ead_lessons').select('description').eq('id', id).single()
    if (current) {
      const parsed = parseEadMetadata(current.description)
      existingMeta = parsed.meta
      if (cleanDesc === undefined) cleanDesc = parsed.cleanDescription
    }

    const mergedMeta = {
      ...existingMeta,
      ...(lessonType !== undefined ? { lessonType } : {}),
      ...(meetUrl !== undefined ? { meetUrl } : {}),
      ...(coverUrl !== undefined ? { coverUrl: coverUrl || undefined } : {}),
      ...(minMinutesForPresence !== undefined ? { minMinutesForPresence: Number(minMinutesForPresence) } : {}),
      ...(availableFrom ? { liveDate: availableFrom.substring(0, 10) } : {})
    }

    const payload: any = {}
    if (title !== undefined) payload.title = title.trim()
    if (cleanDesc !== undefined || lessonType !== undefined || meetUrl !== undefined || coverUrl !== undefined || minMinutesForPresence !== undefined) {
      payload.description = buildEadDescription(cleanDesc, mergedMeta)
    }
    if (videoUrl !== undefined) payload.video_url = videoUrl.trim()
    if (disciplineId !== undefined) payload.discipline_id = disciplineId
    if (orderIndex !== undefined) payload.order_index = orderIndex
    if (availableFrom !== undefined) payload.available_from = availableFrom || null
    if (availableUntil !== undefined) payload.available_until = availableUntil || null

    const { data, error } = await supabase.from('ead_lessons').update(payload).eq('id', id).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("PATCH /api/admin/ead error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('ead_lessons').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/admin/ead error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
