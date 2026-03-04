import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { orderID, chargeId } = await req.json()

        // We use admin client to fetch settings and bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch PayPal API Keys
        const { data: settings, error: settingsErr } = await supabase
            .from('paypal_config')
            .select('*')
            .limit(1)
            .single()

        if (settingsErr || !settings || !settings.client_id || !settings.secret) {
            return NextResponse.json({ error: "Credenciais do PayPal não configuradas." }, { status: 500 })
        }

        const clientId = settings.client_id
        const secret = settings.secret
        const baseUrl = settings.mode === "live"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com"

        // 2. Authenticate with PayPal
        const authCombo = Buffer.from(`${clientId}:${secret}`).toString("base64")
        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authCombo}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
        })

        if (!authRes.ok) {
            return NextResponse.json({ error: "Falha de autenticação com o PayPal." }, { status: 500 })
        }

        const { access_token } = await authRes.json()

        // 3. Capture Order
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            }
        })

        if (!captureRes.ok) {
            const errBody = await captureRes.text()
            console.error("PayPal Capture Error:", errBody)
            return NextResponse.json({ error: "Erro ao capturar o pagamento no PayPal." }, { status: 500 })
        }

        const captureData = await captureRes.json()

        // 4. Update Database charge to PAID
        // check if capture was completed
        if (captureData.status === "COMPLETED") {
            const { error: updateErr } = await supabase
                .from('financial_charges')
                .update({
                    status: 'paid',
                    payment_date: new Date().toISOString()
                })
                .eq('id', chargeId)

            if (updateErr) {
                console.error("Erro ao atualizar status da fatura no Supabase:", updateErr)
                return NextResponse.json({ error: "Pagamento recebido, mas falha ao atualizar banco de dados." }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true, captureData })
    } catch (error: any) {
        console.error("Capture Order Exception:", error)
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 })
    }
}
