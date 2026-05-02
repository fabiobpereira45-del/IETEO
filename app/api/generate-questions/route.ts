import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { parseOffice } from "officeparser"
import PDFParser from "pdf2json"

export const maxDuration = 60 // 60 seconds timeout

// ─── Helper: Extração Blindada de JSON ──────────────────────────────────────────

function extractFirstJsonObject(text: string): string {
  const firstBrace = text.indexOf("{")
  if (firstBrace === -1) return text

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === "{") depth++
      if (char === "}") {
        depth--
        if (depth === 0) {
          return text.substring(firstBrace, i + 1)
        }
      }
    }
  }

  return text.substring(firstBrace)
}

// ─── Normalizer: mapeia variações de campo que o LLM pode retornar ──────────────

function normalizeQuestion(q: any): any {
  if (!q || typeof q !== "object") return q

  // Normaliza o campo de texto da questão
  const text =
    q.text ??
    q.question ??
    q.statement ??
    q.enunciado ??
    q.pergunta ??
    q.stem ??
    ""

  // Normaliza choices (alternativas)
  let choices: { id: string; text: string }[] = []
  const rawChoices =
    q.choices ??
    q.options ??
    q.alternatives ??
    q.alternativas ??
    q.opcoes ??
    []

  if (Array.isArray(rawChoices)) {
    choices = rawChoices.map((c: any, idx: number) => {
      if (typeof c === "string") {
        // Formato simples: ["Texto A", "Texto B", ...]
        return { id: `opt_${String.fromCharCode(97 + idx)}`, text: c }
      }
      // Formato objeto mas com campos variados
      const cId =
        c.id ??
        c.key ??
        c.letter ??
        `opt_${String.fromCharCode(97 + idx)}`
      const cText =
        c.text ??
        c.label ??
        c.value ??
        c.content ??
        c.opcao ??
        c.alternativa ??
        ""
      return { id: cId, text: cText }
    })
  } else if (rawChoices && typeof rawChoices === "object") {
    // Formato dict: { a: "Texto A", b: "Texto B" }
    choices = Object.entries(rawChoices).map(([k, v]) => ({
      id: k.startsWith("opt_") ? k : `opt_${k}`,
      text: String(v),
    }))
  }

  // Normaliza correctAnswer
  let correctAnswer =
    q.correctAnswer ??
    q.correct_answer ??
    q.answer ??
    q.resposta ??
    q.gabarito ??
    ""
  // Se o llm retornar "a", "b", "c", "d" em vez de "opt_a", "opt_b"...
  if (
    typeof correctAnswer === "string" &&
    correctAnswer.length === 1 &&
    /^[a-d]$/i.test(correctAnswer)
  ) {
    correctAnswer = `opt_${correctAnswer.toLowerCase()}`
  }

  // Normaliza o type
  const type =
    q.type ??
    q.tipo ??
    q.questionType ??
    q.question_type ??
    "multiple-choice"

  // Normaliza explanation
  const explanation =
    q.explanation ??
    q.justification ??
    q.justificativa ??
    q.fundamentacao ??
    q.comentario ??
    null

  // Normaliza pairs (matching)
  const pairs = q.pairs ?? q.colunas ?? null

  return { type, text, choices, pairs, correctAnswer, explanation }
}

// ─── System prompt (Baseado na SKILL.md — IA Teológica) ─────────────────────────

const SYSTEM_PROMPT = `Você é o Arquiteto de Avaliações do IETEO (Instituto de Ensino Teológico). Sua missão é gerar questões de alto rigor acadêmico, precisão exegética e profundidade doutrinária.

DOMÍNIOS DE EXPERTISE:
- Teologia Sistemática (Soteriologia, Cristologia, Escatologia, etc.)
- Teologia Bíblica e Exegese (Grego, Hebraico, Contexto Histórico)
- História da Igreja (Patrística, Reforma Protestante, Escolástica)
- Pedagogia Teológica baseada na Taxonomia de Bloom (Níveis 1 a 6)

INSTRUÇÃO DE FORMATO CRÍTICA:
- Retorne EXCLUSIVAMENTE um objeto JSON.
- É PROIBIDO escrever qualquer texto, preâmbulo ou conclusão fora do JSON.
- NÃO use blocos de código markdown (\`\`\`json).

ESTRUTURA DE DADOS OBRIGATÓRIA:
{
  "questions": [
    {
      "type": "multiple-choice" | "true-false" | "discursive" | "fill-in-the-blank" | "matching",
      "text": "Enunciado da questão (se for lacuna, use ________)",
      "bloomLevel": 1-6,
      "difficulty": "facil" | "medio" | "dificil",
      "choices": [
        {"id": "opt_a", "text": "Alternativa A"},
        ...
      ],
      "pairs": [{"id": "p1", "left": "...", "right": "..."}], // Apenas para matching
      "correctAnswer": "opt_a" | "true" | "false" | "texto do gabarito",
      "explanation": "Fundamentação teológica profunda, citando autores (ex: Berkhof, Grudem, Agostinho) e referências bíblicas (ARA/NVI)."
    }
  ]
}

PADRÕES DE QUALIDADE IETEO:
1. RIGOR: Use terminologia técnica correta (ex: 'Imputação', 'Substituição Vicária').
2. BLOOM: Varie os níveis. Nível 1 para fatos, Nível 4+ para análises críticas e comparações.
3. DISTRATORES: Em múltipla escolha, os erros devem ser heresias históricas plausíveis ou confusões doutrinárias comuns.
4. REFERÊNCIAS: Sempre fundamente a resposta com versículos e lógica teológica.`


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
    let aiProvider = "groq"
    let apiKey = ""

    if (isFormData) {
      const formData = await req.formData()
      discipline = formData.get("discipline") as string
      count = parseInt(formData.get("count") as string, 10)
      const typesStr = formData.get("types") as string
      if (typesStr) types = JSON.parse(typesStr)
      sourceDetails = formData.get("sourceDetails") as string || ""
      audience = formData.get("audience") as string || "Graduação Teológica"
      difficulty = formData.get("difficulty") as string || "Intermediário"
      aiProvider = formData.get("aiProvider") as string || "groq"
      apiKey = formData.get("apiKey") as string || ""

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
        aiProvider?: string; apiKey?: string
      }
      discipline = body.discipline
      count = body.count
      types = body.types
      sourceDetails = body.sourceDetails || ""
      audience = body.audience || "Graduação Teológica"
      difficulty = body.difficulty || "Intermediário"
      aiProvider = body.aiProvider || "groq"
      apiKey = body.apiKey || ""
    }

    if (!apiKey) {
      throw new Error("Chave de API (API Key) não fornecida. Por favor, insira sua credencial nas opções de IA.")
    }

    let model;
    if (aiProvider === "openai") {
      const openai = createOpenAI({ apiKey })
      model = openai("gpt-4o-mini")
    } else if (aiProvider === "google") {
      const google = createGoogleGenerativeAI({ apiKey })
      model = google("gemini-1.5-pro-latest")
    } else {
      const groq = createOpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
      })
      model = groq("llama-3.3-70b-versatile")
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

    const userPrompt = `Gere exatamente ${safeCount} questão(ões) para a disciplina: "${discipline}".

Público-Alvo: ${audience}
Nível de Dificuldade: ${difficulty}
Modalidades: ${typesList.map(modalLabel).join(", ")}.

${fileText ? `
========================================
BASE DE CONHECIMENTO OBRIGATÓRIA (Use ÚNICA e EXCLUSIVAMENTE o texto abaixo):
---
${fileText.substring(0, 40000).replace(/\s+/g, " ")}
---
INSTRUÇÃO: Formule as questões com base neste texto. Se necessário, use temas correlacionados.
` : `Sem anexo. Use seu conhecimento enciclopédico para o tema "${discipline}".`}

${sourceDetails ? `FOCO ESPECÍFICO: ${sourceDetails}.` : ""}

LEMBRE-SE: Retorne APENAS o JSON bruto. Sem explicações.`

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
    })

    let parsed: any
    try {
      const cleanText = extractFirstJsonObject(text.trim())
      parsed = JSON.parse(cleanText)
    } catch (e) {
      console.error("[generate-questions] JSON Final Error. Raw text (first 500 chars):", text.substring(0, 500))
      throw new Error("A IA retornou um formato inesperado. Por favor, tente novamente.")
    }

    const rawQuestions: any[] = parsed.questions ?? parsed.questoes ?? parsed.items ?? []

    // Debug: log the keys of the first raw question to diagnose field names
    if (rawQuestions.length > 0) {
      console.log("[generate-questions] First raw question keys:", Object.keys(rawQuestions[0]))
      console.log("[generate-questions] First raw question:", JSON.stringify(rawQuestions[0]).substring(0, 300))
    }

    const normalizedQuestions = rawQuestions.map(normalizeQuestion)

    return Response.json({ questions: normalizedQuestions })
  } catch (error: any) {
    console.error("[generate-questions] Error:", error)
    return Response.json(
      { error: error?.message || "Erro desconhecido no servidor." },
      { status: 500 }
    )
  }
}

