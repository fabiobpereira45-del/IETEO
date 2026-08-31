import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Ensure bucket 'avatars' exists and is public
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const avatarsExists = buckets?.some(b => b.name === 'avatars')
      if (!avatarsExists) {
        await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        })
      }
    } catch (bucketErr) {
      console.warn("Aviso ao verificar bucket avatars:", bucketErr)
    }

    // 2. Prepare file data
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    let ext = 'jpg'
    if (file.name && file.name.includes('.')) {
      ext = file.name.split('.').pop() || 'jpg'
    } else if (file.type) {
      ext = file.type.split('/')[1] || 'jpg'
    }

    const fileName = `ead-cover-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    const filePath = `ead/${fileName}`

    // 3. Upload with Service Role
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error("Erro ao subir capa no storage Supabase:", uploadError)
      throw new Error(`Erro no Supabase Storage: ${uploadError.message}`)
    }

    // 4. Retrieve Public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl
    })
  } catch (err: any) {
    console.error("POST /api/admin/ead/upload error:", err)
    return NextResponse.json({ error: err.message || "Falha no upload da capa" }, { status: 500 })
  }
}
