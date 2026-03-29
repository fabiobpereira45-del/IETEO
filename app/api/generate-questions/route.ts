import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { parseOffice } from "officeparser"
import PDFParser from "pdf2json"

export const maxDuration = 60 // 60 seconds timeout

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
})

// ─── System prompt (Baseado na SKILL.md — IA Teológica) ─────────────────────────

const SYSTEM_PROMPT = `Você é uma IA Teológica especializada em educação cristã. Você possui conhecimento profundo em:
- Teologia Sistemática, Bíblica, Histórica e Prática
- Exegese e Hermenêutica das Escrituras
- História da Igreja e das doutrinas cristãs (Patrística, Reforma, Escolástica)
- Pedagogia e avaliação acadêmica teológica

Quando um professor enviar um arquivo e uma solicitação de questionário, você deve:
1. Ler e analisar completamente o material fornecido (PDF/PPTX/TXT).
2. Identificar os conceitos teológicos centrais.
3. Criar questões rigorosas, precisas e academicamente adequadas conforme a Taxonomia de Bloom.
4. Gerar gabarito completo com justificativas bíblicas e teológicas (citando autores como Grudem, Berkhof, Carson, etc., quando aplicável).
5. Formatar profissionalmente o questionário em JSON.

REGRAS DE FORMATAÇÃO POR TIPO:
- MÚLTIPLA ESCOLHA (multiple-choice) e INCORRETA (incorrect-alternative): 4 alternativas (opt_a a opt_d).
- VERDADEIRO OU FALSO (true-false): choices=[], correctAnswer="true" ou "false".
- DISCURSIVA (discursive): explanation deve conter critérios de correção detalhados.
- COMPLETAR LACUNAS (fill-in-the-blank): text="blá ________ blá".
- RELACIONAR COLUNAS (matching): pairs=[{"id":"p1","left":"...","right":"..."}].

PADRÃO DE QUALIDADE:
- Nunca crie questões ambíguas.
- Sempre cite referências bíblicas corretas (NVI ou ARA).
- Distratores devem ser plausíveis mas claramente incorretos (baseados em erros históricos ou doutrinários reais).
- Mantenha linguagem técnica adequada ao nível do aluno.

IMPORTANTE: Retorne APENAS o JSON no formato: {"questions": [...]}`

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const isFormData = req.headers.get("content-type")?.includes("multipart/form-data")

    let discipline = ""
    let count = 0
    let types: string[] = []
    let fileText = ""
    let sourceDetails = ""
    let audience = ""
    let difficulty = ""

    if (isFormData) {
      const formData = await req.formData()
      discipline = formData.get("discipline") as string
      count = parseInt(formData.get("count") as string, 10)
      const typesStr = formData.get("types") as string
      if (typesStr) types = JSON.parse(typesStr)
      sourceDetails = formData.get("sourceDetails") as string || ""
      audience = formData.get("audience") as string || "Graduação Teológica"
      difficulty = formData.get("difficulty") as string || "Intermediário"

      const file = formData.get("file") as File | null
      if (file) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          const pdfParser = new PDFParser(null, true)
          fileText = await new Promise<string>((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError))
            pdfParser.on("pdfParser_dataReady", () => {
              resolve(pdfParser.getRawTextContent() || "")
            })
            pdfParser.parseBuffer(buffer)
          })
        } else if (
          file.type.includes("presentation") ||
          file.name.endsWith(".pptx") ||
          file.name.endsWith(".ppt")
        ) {
          fileText = (await parseOffice(buffer)) as unknown as string
        } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          fileText = buffer.toString("utf-8")
        }
      }
    } else {
      const body = (await req.json()) as {
        discipline: string; count: number; types: string[]
        sourceDetails?: string; audience?: string; difficulty?: string
      }
      discipline = body.discipline
      count = body.count
      types = body.types
      sourceDetails = body.sourceDetails || ""
      audience = body.audience || "Graduação Teológica"
      difficulty = body.difficulty || "Intermediário"
    }

    const safeCount = Math.min(Math.max(1, count), 30)
    const typesList = types.length > 0 ? types : ["multiple-choice"]

    const modalLabel = (t: string) => {
      const labels: Record<string, string> = {
        "multiple-choice": "múltipla escolha",
        "true-false": "verdadeiro ou falso",
        "incorrect-alternative": "escolha a alternativa incorreta",
        "fill-in-the-blank": "completar lacunas",
        "matching": "relacionar colunas"
      }
      return labels[t] || "discursiva"
    }

    const userPrompt = `AJA COMO A IA TEOLÓGICA (SKILL.md).
Gere exatamente ${safeCount} questão(ões) de avaliação técnica para a disciplina: "${discipline}".

Público-Alvo: ${audience}
Nível de Dificuldade: ${difficulty}
Modalidades Solicitadas: ${typesList.map(modalLabel).join(", ")}.

${fileText ? `
========================================
ALERTA DE PRIORIDADE: ANEXO LIDO COM SUCESSO
========================================
BASE DE CONHECIMENTO OBRIGATÓRIA (Use ÚNICA e EXCLUSIVAMENTE o texto abaixo para criar as questões):
---
${fileText.substring(0, 40000)}
---
INSTRUÇÃO CRÍTICA: As questões DEVEM ser formuladas a partir deste texto anexo. Se o texto for insuficiente para o número de questões, use temas teológicos diretamente correlacionados aos conceitos presentes no texto.
` : `
Sem anexo. Use seu conhecimento enciclopédico teológico para o tema "${discipline}" focando em ${difficulty}.
`}

${sourceDetails ? `FOCO ESPECÍFICO ADICIONAL: ${sourceDetails}.` : ""}

Retorne um JSON com exatamente ${safeCount} questões.`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"), // Velocidade extrema e estabilidade total
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
    })

    let parsed: any
    try {
      // Tenta limpar markdown se existir
      let cleanText = text.trim()
      if (cleanText.includes("```")) {
        const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (match) cleanText = match[1]
      }
      
      // Procura pelo primeiro { e o último }
      const firstBrace = cleanText.indexOf("{")
      const lastBrace = cleanText.lastIndexOf("}")
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1)
      }

      parsed = JSON.parse(cleanText)
    } catch (e) {
      console.error("[generate-questions] JSON Parse Error. Raw text snippet:", text.substring(0, 500))
      // Fallback para o regex anterior se tudo falhar
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch {
          throw new Error("A IA retornou um JSON incompleto ou inválido. Tente novamente.")
        }
      } else {
        throw new Error("Não foi possível localizar as questões no formato correto. Tente novamente.")
      }
    }

    return Response.json({ questions: parsed.questions ?? [] })
  } catch (error: any) {
    console.error("[generate-questions] Error:", error)
    return Response.json(
      { error: error?.message || "Erro desconhecido no servidor." },
      { status: 500 }
    )
  }
}

