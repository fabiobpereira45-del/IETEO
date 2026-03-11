export async function triggerN8nWebhook(flowId: string, payload: any): Promise<void> {
    const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "https://n8n.webhook.com";
    const url = `${N8N_WEBHOOK_URL}/${flowId}`;

    try {
        console.log(`Triggering n8n webhook: ${url}`);
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || "development"
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`n8n trigger failed: ${response.status} ${errorText}`);
        } else {
            console.log(`n8n trigger success: ${flowId}`);
        }
    } catch (error) {
        console.error("n8n connection error:", error);
    }
}
