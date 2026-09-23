import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
    try {
        const form = await request.formData()
        const name = (form.get("name") as string | null)?.trim()
        const role = (form.get("role") as string | null)?.trim() || null
        const polo = (form.get("polo") as string | null)?.trim() || null
        const quote = (form.get("quote") as string | null)?.trim()
        const photo = form.get("photo") as File | null

        if (!name || !quote) {
            return NextResponse.json({ error: "Nome e depoimento são obrigatórios." }, { status: 400 })
        }
        if (name.length > 120 || quote.length > 2000) {
            return NextResponse.json({ error: "Texto muito longo." }, { status: 400 })
        }

        const supabase = createAdminClient()
        let photoUrl: string | null = null

        if (photo && photo.size > 0) {
            if (!photo.type.startsWith("image/")) {
                return NextResponse.json({ error: "Arquivo de foto inválido." }, { status: 400 })
            }
            if (photo.size > 2 * 1024 * 1024) {
                return NextResponse.json({ error: "A foto deve ter no máximo 2MB." }, { status: 400 })
            }
            const ext = photo.name.split(".").pop() || "jpg"
            const fileName = `testimonials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, photo, { contentType: photo.type })
            if (uploadError) {
                return NextResponse.json({ error: "Erro ao enviar foto: " + uploadError.message }, { status: 500 })
            }
            const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
            photoUrl = data.publicUrl
        }

        // Submissions land unpublished; the master reviews and publishes from the admin panel.
        const { data: maxOrderRow } = await supabase
            .from("testimonials")
            .select("order")
            .order("order", { ascending: false })
            .limit(1)
            .maybeSingle()
        const nextOrder = (maxOrderRow?.order ?? -1) + 1

        const { error: insertError } = await supabase.from("testimonials").insert({
            name, role, polo, quote,
            photo_url: photoUrl,
            is_published: false,
            order: nextOrder,
            created_at: new Date().toISOString(),
        })

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Erro inesperado." }, { status: 500 })
    }
}
