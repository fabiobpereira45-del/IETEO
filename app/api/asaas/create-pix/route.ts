import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { chargeId } = await req.json()

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

        // 2. If there's already a Pix generated for this charge, return it
        if (charge.asaas_payment_id && charge.pix_qrcode) {
            return NextResponse.json({
                asaasPaymentId: charge.asaas_payment_id,
                pixQrcode: charge.pix_qrcode,
                pixCopyPaste: charge.pix_copy_paste
            })
        }

        // 3. Fetch Asaas config
        const { data: config, error: configErr } = await supabase
            .from('asaas_config')
            .select('*')
            .limit(1)
            .single()

        if (configErr || !config || !config.api_key) {
            return NextResponse.json({ error: "API Key do Asaas não configurada pelo administrador." }, { status: 500 })
        }

        // 4. Fetch student info to get CPF/name
        const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('id', charge.student_id)
            .single()

        const baseUrl = config.mode === "production"
            ? "https://api.asaas.com/v3"
            : "https://api-sandbox.asaas.com/v3"

        // 5. Find or create an Asaas Customer
        let asaasCustomerId: string | null = null

        const searchRes = await fetch(`${baseUrl}/customers?cpfCnpj=${student?.cpf}`, {
            headers: { "access_token": config.api_key }
        })
        const searchBody = await searchRes.json()

        if (searchBody?.data?.length > 0) {
            asaasCustomerId = searchBody.data[0].id
        } else {
            const createCustomerRes = await fetch(`${baseUrl}/customers`, {
                method: "POST",
                headers: { "access_token": config.api_key, "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: student?.name || "Aluno IETEO",
                    cpfCnpj: student?.cpf || "00000000000"
                })
            })
            const customerBody = await createCustomerRes.json()
            if (!createCustomerRes.ok) {
                return NextResponse.json({ error: "Erro ao criar cliente no Asaas: " + (customerBody.errors?.[0]?.description || "desconhecido") }, { status: 500 })
            }
            asaasCustomerId = customerBody.id
        }

        // 6. Create a Pix charge
        const dueDate = charge.due_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        const createPaymentRes = await fetch(`${baseUrl}/payments`, {
            method: "POST",
            headers: { "access_token": config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({
                customer: asaasCustomerId,
                billingType: "PIX",
                value: charge.amount,
                dueDate,
                description: charge.description,
                externalReference: chargeId
            })
        })
        const paymentBody = await createPaymentRes.json()
        if (!createPaymentRes.ok) {
            return NextResponse.json({ error: "Erro ao criar cobrança Pix: " + (paymentBody.errors?.[0]?.description || "desconhecido") }, { status: 500 })
        }

        const asaasPaymentId = paymentBody.id

        // 7. Get QR Code
        const qrRes = await fetch(`${baseUrl}/payments/${asaasPaymentId}/pixQrCode`, {
            headers: { "access_token": config.api_key }
        })
        const qrBody = await qrRes.json()
        const pixQrcode = qrBody.encodedImage || ""
        const pixCopyPaste = qrBody.payload || ""

        // 8. Save everything to the charge
        await supabase.from('financial_charges').update({
            asaas_payment_id: asaasPaymentId,
            pix_qrcode: pixQrcode,
            pix_copy_paste: pixCopyPaste
        }).eq('id', chargeId)

        return NextResponse.json({ asaasPaymentId, pixQrcode, pixCopyPaste })
    } catch (error: any) {
        console.error("Create Pix Exception:", error)
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 })
    }
}
