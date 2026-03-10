import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const { chargeId, chargeIds } = await req.json()
        const ids = chargeIds || (chargeId ? [chargeId] : [])

        if (ids.length === 0) {
            return NextResponse.json({ error: "Nenhuma fatura selecionada." }, { status: 400 })
        }

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

        // 2. If single charge and there's already a Pix generated, return it
        if (ids.length === 1 && charges[0].asaas_payment_id && charges[0].pix_qrcode) {
            return NextResponse.json({
                asaasPaymentId: charges[0].asaas_payment_id,
                pixQrcode: charges[0].pix_qrcode,
                pixCopyPaste: charges[0].pix_copy_paste
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
            .eq('id', charges[0].student_id)
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
        const monthlyCount = charges.filter((c: any) => c.type === 'monthly').length
        const totalAmount = charges.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0)
        let finalAmount = totalAmount

        // Apply 5% discount if 2 or more monthly fees
        if (monthlyCount >= 2) {
            finalAmount = totalAmount * 0.95
        }

        const dueDate = charges[0].due_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        const desc = ids.length > 1 ? `Pagamento em Lote (${ids.length} faturas)` : charges[0].description

        const createPaymentRes = await fetch(`${baseUrl}/payments`, {
            method: "POST",
            headers: { "access_token": config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({
                customer: asaasCustomerId,
                billingType: "PIX",
                value: Number(finalAmount.toFixed(2)),
                dueDate,
                description: desc,
                externalReference: ids.length === 1 ? ids[0] : null
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

        // 8. Save everything to the charges
        await supabase.from('financial_charges').update({
            asaas_payment_id: asaasPaymentId,
            pix_qrcode: pixQrcode,
            pix_copy_paste: pixCopyPaste
        }).in('id', ids)

        return NextResponse.json({ asaasPaymentId, pixQrcode, pixCopyPaste })
    } catch (error: any) {
        console.error("Create Pix Exception:", error)
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 })
    }
}
