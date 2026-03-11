import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
    try {
        const payload = await req.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Asaas sends event type in payload
        const eventType = payload?.event
        const payment = payload?.payment

        if (!payment) {
            return NextResponse.json({ received: true })
        }

        // Only process payment confirmed events
        if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
            const asaasPaymentId = payment.id
            const externalReference = payment.externalReference // this is our chargeId

            let updatedCharge: any = null
            if (externalReference) {
                const { data } = await supabase
                    .from('financial_charges')
                    .update({
                        status: 'paid',
                        payment_date: new Date().toISOString()
                    })
                    .eq('id', externalReference)
                    .select('student_id')
                    .single()
                updatedCharge = data
            } else {
                // fallback: find by asaas_payment_id
                const { data } = await supabase
                    .from('financial_charges')
                    .update({
                        status: 'paid',
                        payment_date: new Date().toISOString()
                    })
                    .eq('asaas_payment_id', asaasPaymentId)
                    .select('student_id')
                    .single()
                updatedCharge = data
            }

            // Activate the student enrollment
            if (updatedCharge?.student_id) {
                // We call our internal API to handle activation + auth creation + n8n
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ieteo-dashboard.vercel.app'
                await fetch(`${baseUrl}/api/student/activate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ studentId: updatedCharge.student_id })
                }).catch(e => console.error("Webhook activation fetch error:", e))
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error("Asaas Webhook Error:", error)
        return NextResponse.json({ error: "Webhook error" }, { status: 500 })
    }
}
