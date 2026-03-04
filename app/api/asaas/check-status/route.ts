import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { chargeId } = await req.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Get the charge to find asaas_payment_id
        const { data: charge } = await supabase
            .from('financial_charges')
            .select('*')
            .eq('id', chargeId)
            .single()

        if (!charge?.asaas_payment_id) {
            return NextResponse.json({ error: "Cobrança Pix não encontrada." }, { status: 404 })
        }

        if (charge.status === 'paid') {
            return NextResponse.json({ status: 'paid' })
        }

        // 2. Get Asaas config
        const { data: config } = await supabase
            .from('asaas_config')
            .select('*')
            .limit(1)
            .single()

        if (!config?.api_key) {
            return NextResponse.json({ error: "API Key do Asaas não configurada." }, { status: 500 })
        }

        const baseUrl = config.mode === "production"
            ? "https://api.asaas.com/v3"
            : "https://api-sandbox.asaas.com/v3"

        // 3. Check payment status on Asaas
        const res = await fetch(`${baseUrl}/payments/${charge.asaas_payment_id}`, {
            headers: { "access_token": config.api_key }
        })

        if (!res.ok) {
            return NextResponse.json({ error: "Erro ao consultar status no Asaas." }, { status: 500 })
        }

        const payment = await res.json()

        // 4. If paid, update our DB
        if (payment.status === "RECEIVED" || payment.status === "CONFIRMED") {
            await supabase
                .from('financial_charges')
                .update({
                    status: 'paid',
                    payment_date: new Date().toISOString()
                })
                .eq('id', chargeId)

            return NextResponse.json({ status: 'paid' })
        }

        return NextResponse.json({ status: payment.status })
    } catch (error: any) {
        console.error("Check Pix Status Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
