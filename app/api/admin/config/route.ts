import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')
        const supabase = createAdminClient()

        if (type === 'asaas') {
            const { data, error } = await supabase.from('asaas_config').select('*').limit(1).maybeSingle()
            if (error) throw error
            return NextResponse.json({ data })
        } else if (type === 'financial') {
            const { data, error } = await supabase.from('financial_settings').select('*').limit(1).maybeSingle()
            if (error) throw error
            return NextResponse.json({ data })
        }

        const [financialRes, asaasRes] = await Promise.all([
            supabase.from('financial_settings').select('*').limit(1).maybeSingle(),
            supabase.from('asaas_config').select('*').limit(1).maybeSingle()
        ])

        return NextResponse.json({
            financial: financialRes.data,
            asaas: asaasRes.data
        })
    } catch (err: any) {
        console.error("Config GET Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { type, config } = await req.json()
        const supabase = createAdminClient()

        if (type === "asaas") {
            const dbData: any = {
                api_key: (config.apiKey || '').trim(),
                mode: config.mode,
                updated_at: new Date().toISOString()
            }
            if (config.pixKey !== undefined) dbData.pix_key = config.pixKey

            const { data: existing } = await supabase.from('asaas_config').select('id').limit(1).maybeSingle()
            if (existing) {
                const { error } = await supabase.from('asaas_config').update(dbData).eq('id', existing.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('asaas_config').insert(dbData)
                if (error) throw error
            }
        } else if (type === "financial") {
            const meta: any = {}
            if (config.enrollmentFeeOnline !== undefined) meta.enrollmentFeeOnline = Number(config.enrollmentFeeOnline)
            if (config.monthlyFeeOnline !== undefined) meta.monthlyFeeOnline = Number(config.monthlyFeeOnline)

            let fullCreditCardUrl = config.creditCardUrl || null
            if (Object.keys(meta).length > 0) {
                const prefix = `<!--FIN_META:${JSON.stringify(meta)}-->\n`
                fullCreditCardUrl = prefix + (config.creditCardUrl || '')
            }

            const dbData = {
                enrollment_fee: config.enrollmentFee,
                monthly_fee: config.monthlyFee,
                second_call_fee: config.secondCallFee,
                final_exam_fee: config.finalExamFee,
                total_months: config.totalMonths,
                pro_labore_fee_per_lesson: config.proLaboreFeePerLesson,
                credit_card_url: fullCreditCardUrl,
                pix_key: config.pixKey || null,
                updated_at: new Date().toISOString()
            }
            const { data: existing } = await supabase.from('financial_settings').select('id').limit(1).maybeSingle()
            if (existing) {
                const { error } = await supabase.from('financial_settings').update(dbData).eq('id', existing.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('financial_settings').insert(dbData)
                if (error) throw error
            }

            // Update pending charges (moved from store.ts to here for safety)
            await supabase.from('financial_charges')
                .update({ amount: config.enrollmentFee })
                .match({ type: 'enrollment', status: 'pending' })

            await supabase.from('financial_charges')
                .update({ amount: config.monthlyFee })
                .eq('type', 'monthly')
                .in('status', ['pending', 'late'])

            await supabase.from('financial_charges')
                .update({ amount: config.monthlyFee / 2 })
                .match({ type: 'monthly', status: 'bolsa50' })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("Config API Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
