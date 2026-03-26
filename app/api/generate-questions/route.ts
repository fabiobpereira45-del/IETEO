import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { parseOffice } from "officeparser"
import PDFParser from "pdf2json"

export const maxDuration = 60 // 60 seconds timeout

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é uma IA Teológica especializada em educação cristã. Você possui conhecimento profundo em:
- Teologia Sistemática (Bibliologia, Cristologia, Pneumatologia, Soteriologia, Escatologia)
- Teologia Bíblica (AT e NT), Exegese e Hermenêutica das Escrituras
- História da Igreja e das doutrinas cristãs
- Teologia Prática (Homilética, Liturgia, Ética, Missiologia)
- Tradições Denominacionais e Pedagogia e avaliação acadêmica teológica

Sua tarefa é gerar questões de avaliação teológica de alta qualidade. Cite referências bíblicas (ex: Jo 3:16, NVI) e autores teológicos (Grudem, Berkhof, Carson, Bruce) nas justificativas sempre que possível.

PADRÃO DE QUALIDADE:
- Distratores baseados em erros históricos/doutrinários reais e plausíveis.
- Nenhuma questão pode endossar heresia de forma ambígua.
- Linguagem técnica e acadêmica.

REGRAS DE FORMATAÇÃO POR TIPO:

MÚLTIPLA ESCOLHA (multiple-choice) e INCORRETA (incorrect-alternative):
- Exatamente 4 alternativas com ids: "opt_a", "opt_b", "opt_c", "opt_d"
- Para multiple-choice: correctAnswer = id da correta.
- Para incorrect-alternative: correctAnswer = id da INCORRETA.
- NUNCA use "todas as anteriores" ou "nenhuma acima".

VERDADEIRO OU FALSO (true-false):
- choices = [] (array vazio)
- correctAnswer = "true" ou "false"

DISCURSIVA (discursive):
- choices = [] (array vazio), correctAnswer = "" (string vazia)
- explanation deve conter os critérios de correção detalhados.

COMPLETAR LACUNAS (fill-in-the-blank):
- No campo "text", substitua a palavra por "________": ex: "Jesus nasceu em ________."
- choices = [] (array vazio)
- correctAnswer = a(s) palavra(s) que preenche(m) a(s) lacuna(s).

RELACIONAR COLUNAS (matching):
- text = "Relacione as colunas corretamente:"
- choices = [] (array vazio), correctAnswer = "" (string vazia)
- pairs = array com pares: [{"id":"p1","left":"Termo","right":"Definição"}]

IMPORTANTE: Retorne APENAS um objeto JSON válido com esta estrutura exata:
{"questions":[{"type":"...","text":"...","choices":[{"id":"opt_a","text":"..."}],"pairs":[{"id":"p1","left":"...","right":"..."}],"correctAnswer":"...","explanation":"..."}]}`

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
      if (t === "multiple-choice") return "múltipla escolha"
      if (t === "true-false") return "verdadeiro ou falso"
      if (t === "incorrect-alternative") return "escolha a alternativa incorreta"
      if (t === "fill-in-the-blank") return "completar lacunas"
      if (t === "matching") return "relacionar colunas"
      return "discursiva"
    }

    const userPrompt = `Gere exatamente ${safeCount} questão(ões) de avaliação teológica para a disciplina: "${discipline}".

Público-Alvo: ${audience}
Nível de Dificuldade: ${difficulty}
Modalidades: ${typesList.map(modalLabel).join(", ")}.

Distribua as questões equilibradamente entre as modalidades. Se apenas uma modalidade, gere todas nessa modalidade.
Varie os temas dentro de "${discipline}" adequando ao nível ${difficulty}.
${sourceDetails ? `FOCO ESPECÍFICO: ${sourceDetails}.` : ""}
${fileText ? `\nBaseie-se ESTRITAMENTE no texto abaixo:\n---\n${fileText.substring(0, 12000)}\n---` : ""}

Retorne um JSON com exatamente ${safeCount} questões.`

    const { text } = await generateText({
      model: google("gemini-1.5-flash-latest"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
    })

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
      else throw new Error("A IA não retornou um JSON válido. Tente novamente.")
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
