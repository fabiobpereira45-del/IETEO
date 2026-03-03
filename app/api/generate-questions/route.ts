import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

// ─── Schema ───────────────────────────────────────────────────────────────────

const ChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
})

const QuestionSchema = z.object({
  type: z.enum(["multiple-choice", "true-false", "discursive"]),
  text: z.string(),
  choices: z.array(ChoiceSchema),
  correctAnswer: z.string(),
  explanation: z.string().nullable(),
})

const OutputSchema = z.object({
  questions: z.array(QuestionSchema),
})

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o Prof.Dr.Teólogo — especialista em Teologia com doutorado em Teologia Sistemática e vasto conhecimento das tradições teológicas mundiais: Patrística, Escolástica, Reforma Protestante, Teologia Contemporânea, Teologia da Libertação, Teologia Ortodoxa Oriental, e correntes evangélicas e pentecostais do Brasil.

Você tem domínio profundo de:
- Hermenêutica e Exegese Bíblica(AT e NT)
  - Teologia Sistemática(Dogmática)
    - História da Igreja(Universal e Brasileira)
      - Teologia Bíblica e Teologia Pastoral
        - Filosofia da Religião
          - Línguas originais: Hebraico Bíblico e Grego Koiné
            - Literatura intertestamentária e apócrifa
              - Cânones católico, ortodoxo e protestante
                - Teologia das religiões(ecumenismo e diálogo inter - religioso)

Sua tarefa é gerar questões de avaliação teológica de alta qualidade para o curso de Teologia do IBAD — Instituto Bíblico Assembleia de Deus(Núcleo Cosme de Fárias, Salvador - BA).As questões devem ser academicamente rigorosas, teologicamente precisas, didaticamente eficazes e adequadas ao nível do ensino superior teológico.

Regras estritas para geração de questões:

MÚLTIPLA ESCOLHA:
- Exatamente 4 alternativas(ids: "opt_a", "opt_b", "opt_c", "opt_d")
  - Apenas 1 alternativa correta
    - correctAnswer = id da alternativa correta(ex: "opt_b")
      - Distratores plausíveis mas claramente incorretos para quem estuda
        - Nunca use "Todas as anteriores" ou "Nenhuma das anteriores"

VERDADEIRO OU FALSO:
- choices =[](array vazio)
  - correctAnswer = "true" ou "false"
    - Afirmação deve ser inequívoca(claramente verdadeira ou falsa)

DISCURSIVA:
- choices =[](array vazio)
  - correctAnswer = ""(string vazia)
    - Questão deve exigir elaboração de 2 - 4 parágrafos
      - Indicar os critérios esperados na resposta

Para todos os tipos:
- explanation: breve fundamentação teológica / bíblica da resposta correta(2 - 3 frases).Para discursivas, indicar os pontos esperados.
- Linguagem em português brasileiro acadêmico
  - Citar referências bíblicas quando pertinente(ex: Jo 3.16, Rm 5.1)
    - Variar o nível de dificuldade(análise, síntese, aplicação)

Retorne SOMENTE o objeto JSON válido com o array "questions", sem nenhum texto adicional.`

// ─── Route handler ────────────────────────────────────────────────────────────
import { parseOffice } from "officeparser"
import PDFParser from "pdf2json"

export async function POST(req: Request) {
  try {
    const isFormData = req.headers.get("content-type")?.includes("multipart/form-data")

    let discipline = ""
    let count = 0
    let types: string[] = []
    let fileText = ""

    if (isFormData) {
      const formData = await req.formData()
      discipline = formData.get("discipline") as string
      count = parseInt(formData.get("count") as string, 10)
      const typesStr = formData.get("types") as string
      if (typesStr) {
        types = JSON.parse(typesStr)
      }

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
          file.name.endsWith(".pptx") ||
          file.name.endsWith(".ppt")
        ) {
          fileText = (await parseOffice(buffer)) as unknown as string
        }
      }
    } else {
      const body = (await req.json()) as {
        discipline: string
        count: number
        types: string[]
      }
      discipline = body.discipline
      count = body.count
      types = body.types
    }

    const safeCount = Math.min(Math.max(1, count), 20)
    const typesList = types.length > 0 ? types : ["multiple-choice", "true-false", "discursive"]

    let userPrompt = `Gere exatamente ${safeCount} questão(ões) de avaliação teológica para a disciplina: "${discipline}".

Modalidades solicitadas: ${typesList.map((t) => {
      if (t === "multiple-choice") return "múltipla escolha"
      if (t === "true-false") return "verdadeiro ou falso"
      return "discursiva"
    }).join(", ")
      }.

Distribua as questões de forma equilibrada entre as modalidades solicitadas. Se houver apenas uma modalidade, gere todas nessa modalidade.

Varie os temas abordados dentro da disciplina "${discipline}", cobrindo diferentes aspectos e níveis cognitivos (conhecimento, compreensão, análise, aplicação).

Retorne um JSON com exatamente ${safeCount} questões no array "questions".`

    if (fileText) {
      userPrompt += `\n\nBaseie-se ESTRITAMENTE no conteúdo do seguinte texto extraído do material de apoio do professor:\n\n---\n${fileText.substring(0, 15000)}\n---`
    }

    const { object: parsed } = await generateObject({
      model: openai("gpt-4o"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: OutputSchema,
      temperature: 0.7,
    })

    return Response.json({ questions: parsed.questions })
  } catch (error: any) {
    console.error("[generate-questions] Error:", error)
    return Response.json(
      { error: error?.message || "Erro desconhecido no servidor." },
      { status: 500 }
    )
  }
}
