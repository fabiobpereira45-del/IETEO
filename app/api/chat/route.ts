import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { parseOffice } from "officeparser"
import PDFParser from "pdf2json"

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

const SYSTEM_PROMPT = `Você é o Prof. Dr. Teólogo — especialista em Teologia com doutorado em Teologia Sistemática e vasto conhecimento acadêmico.
Sua tarefa é auxiliar o professor do IETEO (Instituto de Ensino Teológico) a preparar aulas, resumir materiais e formular questões.

DIRETRIZES:
1. Responda de forma acadêmica, porém acessível.
2. Seja teologicamente preciso e imparcial, respeitando diferentes tradições quando pertinente.
3. Use o material de apoio enviado (texto ou imagem) como base principal.
4. Se o usuário pedir para gerar uma questão, forneça-a no formato solicitado.
5. Você pode processar imagens de páginas de livros, resumos manuscritos e documentos PDF.

Linguagem: Português Brasileiro acadêmico.`

export async function POST(req: Request) {
    try {
        const isFormData = req.headers.get("content-type")?.includes("multipart/form-data")

        let messages: any[] = []
        let fileText = ""
        let imageData: string | null = null

        if (isFormData) {
            const formData = await req.formData()
            const messagesStr = formData.get("messages") as string
            messages = JSON.parse(messagesStr || "[]")

            const file = formData.get("file") as File | null
            if (file) {
                const arrayBuffer = await file.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)

                if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                    const pdfParser = new PDFParser(null, true);
                    fileText = await new Promise<string>((resolve, reject) => {
                        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                        pdfParser.on("pdfParser_dataReady", () => {
                            resolve(pdfParser.getRawTextContent() || "");
                        });
                        pdfParser.parseBuffer(buffer);
                    });
                } else if (
                    file.type.includes("presentation") ||
                    file.type.includes("sheet") ||
                    file.type.includes("word") ||
                    file.name.endsWith(".pptx") ||
                    file.name.endsWith(".ppt") ||
                    file.name.endsWith(".docx") ||
                    file.name.endsWith(".xlsx")
                ) {
                    fileText = (await parseOffice(buffer)) as unknown as string
                } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
                    fileText = buffer.toString("utf-8")
                } else if (file.type.startsWith("image/")) {
                    imageData = buffer.toString("base64")
                }
            }
        } else {
            const body = await req.json()
            messages = body.messages || []
        }

        // Se houver texto extraído de arquivo, anexamos como contexto na última mensagem do usuário ou como uma mensagem de sistema injetada
        if (fileText) {
            messages.push({
                role: "system",
                content: `CONTEÚDO DO ARQUIVO ANEXADO:\n---\n${fileText.substring(0, 20000)}\n---`
            })
        }

        const lastMessage = messages[messages.length - 1]

        const result = streamText({
            model: google("gemini-1.5-pro-latest"),
            system: SYSTEM_PROMPT,
            messages: messages.map((m: any) => ({
                role: m.role,
                content: m.role === "user" && imageData && m === lastMessage
                    ? [
                        { type: "text", text: m.content },
                        { type: "image", image: imageData }
                    ]
                    : m.content
            })),
            temperature: 0.7,
        })

        return result.toTextStreamResponse()
    } catch (error: any) {
        console.error("[ai-assistant] Error:", error)
        return Response.json(
            { error: error?.message || "Erro no assistente de IA." },
            { status: 500 }
        )
    }
}
