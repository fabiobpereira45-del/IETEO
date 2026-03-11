import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { chargeId, chargeIds } = await req.json()
        const ids = chargeIds || (chargeId ? [chargeId] : [])

        if (ids.length === 0) {
            return NextResponse.json({ error: "Nenhuma fatura informada para checagem." }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Get the charges to find asaas_payment_id
        const { data: charges } = await supabase
            .from('financial_charges')
            .select('*')
            .in('id', ids)

        if (!charges || charges.length === 0 || !charges[0].asaas_payment_id) {
            return NextResponse.json({ error: "Cobrança Pix não encontrada." }, { status: 404 })
        }

        // Use the first charge's payment id, since all in a bulk transaction share the same
        const asaasPaymentId = charges[0].asaas_payment_id

        if (charges.every((c: any) => c.status === 'paid')) {
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
        const res = await fetch(`${baseUrl}/payments/${asaasPaymentId}`, {
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
                .in('id', ids)

            // Activate the student enrollment
            const studentIds = charges.map((c: any) => c.student_id).filter(Boolean)
            if (studentIds.length > 0) {
                await supabase
                    .from('students')
                    .update({ status: 'active' })
                    .in('id', studentIds)
                    .eq('status', 'pending')
            }

            return NextResponse.json({ status: 'paid' })
        }


        return NextResponse.json({ status: payment.status })
    } catch (error: any) {
        console.error("Check Pix Status Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
