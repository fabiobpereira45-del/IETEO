import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  const challengeId = searchParams.get('challengeId')
  
  let query = supabase.from('challenge_submissions').select('*')

  if (studentId) {
    query = query.eq('student_id', studentId)
  } else if (challengeId) {
    query = query.eq('challenge_id', challengeId)
  } else {
    return NextResponse.json({ error: 'Missing filter' }, { status: 400 })
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { error } = await supabase
      .from('challenge_submissions')
      .insert(body)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const challengeId = searchParams.get('challengeId')

  if (id) {
    const { error } = await supabase.from('challenge_submissions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (challengeId) {
    const { error } = await supabase.from('challenge_submissions').delete().eq('challenge_id', challengeId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Missing id or challengeId' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
