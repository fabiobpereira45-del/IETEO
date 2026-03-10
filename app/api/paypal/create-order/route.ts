import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { chargeId, chargeIds } = await req.json()
        const ids = chargeIds || (chargeId ? [chargeId] : [])

        if (ids.length === 0) {
            return NextResponse.json({ error: "Nenhuma fatura selecionada." }, { status: 400 })
        }

        // We use admin client to fetch settings and bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch the charges
        const { data: charges, error: chargeErr } = await supabase
            .from('financial_charges')
            .select('*')
            .in('id', ids)

        if (chargeErr || !charges || charges.length === 0) {
            return NextResponse.json({ error: "Fatura(s) não encontrada(s)." }, { status: 404 })
        }
        if (charges.some((c: any) => c.status === "paid")) {
            return NextResponse.json({ error: "Uma ou mais faturas já estão pagas." }, { status: 400 })
        }

        const monthlyCount = charges.filter((c: any) => c.type === 'monthly').length
        const totalAmount = charges.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0)
        let finalAmount = totalAmount

        // Apply 5% discount if 2 or more monthly fees
        if (monthlyCount >= 2) {
            finalAmount = totalAmount * 0.95
        }

        const desc = ids.length > 1 ? `Pagamento em Lote (${ids.length} faturas)` : charges[0].description


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
                        reference_id: ids[0], // PayPal needs short reference, any ID from the list helps for tracking
                        amount: {
                            currency_code: "BRL",
                            value: finalAmount.toFixed(2)
                        },
                        description: desc.substring(0, 127) // max 127 chars
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

        // Save paypal order id to ALL items
        await supabase
            .from('financial_charges')
            .update({ paypal_order_id: orderData.id })
            .in('id', ids)

        return NextResponse.json({ orderId: orderData.id })
    } catch (error: any) {
        console.error("Create Order Exception:", error)
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 })
    }
}
