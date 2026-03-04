import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { chargeId } = await req.json()

        // We use admin client to fetch settings and bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch the charge
        const { data: charge, error: chargeErr } = await supabase
            .from('financial_charges')
            .select('*')
            .eq('id', chargeId)
            .single()

        if (chargeErr || !charge) {
            return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 })
        }
        if (charge.status === "paid") {
            return NextResponse.json({ error: "Fatura já está paga." }, { status: 400 })
        }

        // 2. Fetch PayPal API Keys
        const { data: settings, error: settingsErr } = await supabase
            .from('paypal_config')
            .select('*')
            .limit(1)
            .single()

        if (settingsErr || !settings || !settings.client_id || !settings.secret) {
            return NextResponse.json({ error: "Credenciais do PayPal não configuradas pelo administrador." }, { status: 500 })
        }

        const clientId = settings.client_id
        const secret = settings.secret
        const baseUrl = settings.mode === "live"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com"

        // 3. Authenticate with PayPal
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
            const errBody = await authRes.text()
            console.error("PayPal Auth Error:", errBody)
            return NextResponse.json({ error: "Falha de autenticação com o PayPal." }, { status: 500 })
        }

        const { access_token } = await authRes.json()

        // 4. Create Order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        reference_id: chargeId,
                        amount: {
                            currency_code: "BRL",
                            value: charge.amount.toString()
                        },
                        description: charge.description
                    }
                ]
            })
        })

        if (!orderRes.ok) {
            const errBody = await orderRes.text()
            console.error("PayPal Order Error:", errBody)
            return NextResponse.json({ error: "Erro ao criar pedido no PayPal." }, { status: 500 })
        }

        const orderData = await orderRes.json()

        // Save paypal order id
        await supabase
            .from('financial_charges')
            .update({ paypal_order_id: orderData.id })
            .eq('id', chargeId)

        return NextResponse.json({ orderId: orderData.id })
    } catch (error: any) {
        console.error("Create Order Exception:", error)
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 })
    }
}
