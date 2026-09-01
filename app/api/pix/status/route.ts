import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const ids = searchParams.get("ids")

        if (!ids) {
            return NextResponse.json({ error: "IDs não informados." }, { status: 400 })
        }

        const chargeIds = ids.split(",").filter(Boolean)

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: charges } = await supabase
            .from("financial_charges")
            .select("id, status, payment_date")
            .in("id", chargeIds)

        const allPaid = charges?.every((c: any) => c.status === "paid") ?? false

        return NextResponse.json({ charges, allPaid })
    } catch (err: any) {
        return NextResponse.json({ error: "Erro interno." }, { status: 500 })
    }
}
