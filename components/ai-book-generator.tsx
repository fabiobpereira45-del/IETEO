"use client"

import { useState, useMemo } from "react"
import {
  Sparkles,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  UploadCloud,
  FileText,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Building2,
  User,
  Calendar,
  Hash,
  Library
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type Book,
  BOOK_CATEGORIES,
  saveBook
} from "@/lib/books"

interface Props {
  open: boolean
  onClose: () => void
  onBookSaved: (book: Book) => void
  defaultPoloId?: string | null
}

const AI_PLATFORMS = [
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    badge: "OpenAI GPT-4o",
    desc: "Excelente busca na web de ISBN, capas e sínteses teológicas",
    color: "hover:border-emerald-500/50 hover:bg-emerald-500/5"
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    badge: "Anthropic Sonnet",
    desc: "Profundo rigor doutrinário e sinopses acadêmicas detalhadas",
    color: "hover:border-orange-500/50 hover:bg-orange-500/5"
  },
  {
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    badge: "DeepSeek R1 / V3",
    desc: "Raciocínio lógico e estrutura JSON precisa",
    color: "hover:border-blue-500/50 hover:bg-blue-500/5"
  },
  {
    name: "Google Gemini",
    url: "https://gemini.google.com",
    badge: "Gemini 1.5 Pro / 2.0",
    desc: "Acesso em tempo real à base do Google Books e imagens",
    color: "hover:border-indigo-500/50 hover:bg-indigo-500/5"
  }
]

export function AIBookGenerator({ open, onClose, onBookSaved, defaultPoloId }: Props) {
  const [activeTab, setActiveTab] = useState<"prompt" | "import">("prompt")

  // Input fields for prompt generator
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [publisher, setPublisher] = useState("")
  const [category, setCategory] = useState(BOOK_CATEGORIES[0])
  const [totalCopies, setTotalCopies] = useState(2)
  const [locationShelf, setLocationShelf] = useState("Estante Teologia - Prateleira A")
  const [notes, setNotes] = useState("")

  // Copy status
  const [copied, setCopied] = useState(false)

  // JSON import status
  const [rawJson, setRawJson] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ─── Super Prompt Builder ───────────────────────────────────────────────────
  const superPrompt = useMemo(() => {
    return `Você é um bibliotecário teológico e pesquisador acadêmico sênior do IETEO (Instituto de Ensino Teológico).

Sua missão é realizar uma pesquisa aprofundada na web para identificar com precisão máxima os dados bibliográficos, a relevância doutrinária, a sinopse e os metadados do seguinte livro teológico:

══════════════════════════════════════════════════
DADOS INFORMAIS DA OBRA:
- TÍTULO: ${title || "[Informe o título da obra]"}
- AUTOR: ${author || "[Informe o autor, se conhecido]"}
- EDITORA PREFERENCIAL: ${publisher || "[Qualquer editora cristã consagrada]"}
- CATEGORIA TEOLÓGICA: ${category}
${notes ? `- NOTAS ADICIONAIS: ${notes}` : ""}
══════════════════════════════════════════════════

DIRETRIZES DA PESQUISA:
1. PESQUISE NA WEB E GOOGLE BOOKS:
   - Identifique o título completo e subtítulo oficial.
   - Nome completo do(s) autor(es) e ano de publicação mais recente em português.
   - Editora brasileira que publicou a obra (Vida Nova, CPAD, Hagnos, Vida, Cultura Cristã, Ultimato, Mundo Cristão, Thomas Nelson, etc.).
   - Número de ISBN válido (ISBN-13 ou ISBN-10).
   - Uma URL direta pública de imagem da capa em alta resolução (ex: Google Books API cover, Amazon media, ou acervo público de editoras). Caso não encontre uma URL direta estável, utilize uma imagem teológica de alta qualidade do Unsplash compatível com livros bíblicos.
2. SÍNTESE TEOLÓGICA E SINOPSE:
   - Redija uma sinopse rica (de 2 a 3 parágrafos) apresentando a tese central do livro, sua importância para alunos de teologia, pastores e líderes cristãos, e seus principais tópicos.
3. FORMATO DE SAÍDA EXCLUSIVO EM JSON VÁLIDO:
   - Você DEVE responder APENAS com um bloco JSON estritamente válido (sem markdown extra fora do json, sem introduções ou despedidas).

SCHEMA EXATO DO JSON:
{
  "title": "Título Completo da Obra",
  "subtitle": "Subtítulo da obra (se houver)",
  "author": "Nome Completo do Autor",
  "publisher": "Nome da Editora",
  "publicationYear": 2022,
  "isbn": "978-XXXXXXXXXX",
  "category": "${category}",
  "coverUrl": "https://url-publica-da-capa-do-livro.jpg",
  "synopsis": "Sinopse teológica completa, detalhando a proposta do livro, capítulos centrais e aplicabilidade pedagógica para o seminário.",
  "totalCopies": ${totalCopies},
  "locationShelf": "${locationShelf}"
}`
  }, [title, author, publisher, category, totalCopies, locationShelf, notes])

  function handleCopyPrompt() {
    navigator.clipboard.writeText(superPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleParseJson() {
    setParseError(null)
    setParsedData(null)
    if (!rawJson.trim()) {
      setParseError("Cole o texto JSON retornado pela IA para importar.")
      return
    }

    try {
      // Clean possible code fences: ```json ... ```
      let cleaned = rawJson.trim()
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?\s*/i, "").replace(/\s*```$/, "")
      }

      // If array of books or single book
      const parsed = JSON.parse(cleaned)
      const bookData = Array.isArray(parsed) ? parsed[0] : parsed

      if (!bookData.title || !bookData.author) {
        throw new Error("O JSON precisa conter ao menos os campos 'title' e 'author'.")
      }

      setParsedData({
        title: bookData.title,
        subtitle: bookData.subtitle || "",
        author: bookData.author,
        publisher: bookData.publisher || publisher || "Não informada",
        publicationYear: bookData.publicationYear || new Date().getFullYear(),
        isbn: bookData.isbn || "",
        category: bookData.category || category || "Teologia Sistemática",
        coverUrl: bookData.coverUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
        synopsis: bookData.synopsis || "Sinopse não informada.",
        totalCopies: Number(bookData.totalCopies || totalCopies || 2),
        availableCopies: Number(bookData.totalCopies || totalCopies || 2),
        locationShelf: bookData.locationShelf || locationShelf || "Estante Geral",
        poloId: defaultPoloId || null
      })
    } catch (err: any) {
      setParseError(`Erro de formatação no JSON: ${err.message}. Verifique se copiou o bloco JSON completo.`)
    }
  }

  async function handleSaveImportedBook() {
    if (!parsedData) return
    setSaving(true)
    try {
      const saved = await saveBook(parsedData)
      setSaveSuccess(true)
      setTimeout(() => {
        onBookSaved(saved)
        onClose()
        setSaveSuccess(false)
        setParsedData(null)
        setRawJson("")
      }, 1000)
    } catch (err: any) {
      setParseError(`Falha ao salvar livro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-6 overflow-hidden bg-background">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Pesquisador de Livros com Super Prompt IA
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie um prompt de busca profunda na web para IAs externas e importe capas e metadados teológicos com 1 clique.
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0 pt-3">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="prompt" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> 1. Gerador de Super Prompt
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> 2. Importar JSON da IA
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: GERADOR DE SUPER PROMPT ─────────────────────────────── */}
          <TabsContent value="prompt" className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Título do Livro *</Label>
                <Input
                  placeholder="Ex: Teologia Sistemática"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Autor Principal</Label>
                <Input
                  placeholder="Ex: Wayne Grudem"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Editora (Opcional)</Label>
                <Input
                  placeholder="Ex: Vida Nova, CPAD, Hagnos..."
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria Teológica</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOK_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Exemplares Físicos no Polo</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={totalCopies}
                  onChange={(e) => setTotalCopies(Math.max(1, Number(e.target.value) || 1))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estante / Localização no Polo</Label>
                <Input
                  placeholder="Ex: Estante A1 - Prateleira 2"
                  value={locationShelf}
                  onChange={(e) => setLocationShelf(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* AI Platforms Links */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Escolha onde rodar o Super Prompt:
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {AI_PLATFORMS.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex flex-col p-3 rounded-xl border border-border/60 transition-all ${p.color} group shadow-sm bg-card`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-foreground group-hover:text-primary">{p.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="text-[10px] text-amber-500 font-semibold">{p.badge}</span>
                    <span className="text-[9px] text-muted-foreground line-clamp-2 mt-1">{p.desc}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Prompt View Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Super Prompt Gerado:
                </Label>
                <Button
                  size="sm"
                  variant={copied ? "default" : "outline"}
                  onClick={handleCopyPrompt}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" /> Copiado para a Área de Transferência!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar Super Prompt
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  readOnly
                  value={superPrompt}
                  className="font-mono text-xs h-40 bg-muted/40 resize-none rounded-xl border border-border/50 select-all"
                />
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 2: IMPORTAR JSON DA IA ──────────────────────────────────── */}
          <TabsContent value="import" className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
            {!parsedData ? (
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                  <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Como importar:</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Copie a resposta JSON retornada pelo ChatGPT, Claude, Gemini ou DeepSeek e cole no campo abaixo. O sistema lerá os dados e exibirá a capa e a ficha da obra antes de cadastrar.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cole o JSON gerado pela IA:</Label>
                  <Textarea
                    placeholder='Cole aqui o JSON gerado (ex: {"title": "Teologia Sistemática", "author": "Wayne Grudem", ...})'
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    className="font-mono text-xs h-56 resize-none rounded-xl border border-border/50"
                  />
                </div>

                {parseError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                <Button
                  onClick={handleParseJson}
                  disabled={!rawJson.trim()}
                  className="w-full gap-2 accent-gradient text-white shadow-md font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" /> Processar e Visualizar Obra
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Obra Identificada com Sucesso
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setParsedData(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Colar outro JSON
                  </Button>
                </div>

                {/* Rich Book Preview Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-card p-5 rounded-2xl border border-border/60 premium-shadow">
                  {/* Capa */}
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-[200px] aspect-[2/3] rounded-xl overflow-hidden shadow-xl border border-border/60 bg-muted relative group">
                      {parsedData.coverUrl ? (
                        <img
                          src={parsedData.coverUrl}
                          alt={parsedData.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                          <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-xs">Sem capa informada</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        {parsedData.category}
                      </span>
                    </div>
                  </div>

                  {/* Informações detalhadas */}
                  <div className="md:col-span-2 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground leading-snug">{parsedData.title}</h3>
                      {parsedData.subtitle && (
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">{parsedData.subtitle}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span><strong>Autor:</strong> {parsedData.author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span><strong>Editora:</strong> {parsedData.publisher}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span><strong>Ano:</strong> {parsedData.publicationYear}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hash className="h-3.5 w-3.5 text-primary" />
                          <span><strong>ISBN:</strong> {parsedData.isbn || "Não informado"}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sinopse da Obra:</Label>
                        <p className="text-xs text-foreground/80 leading-relaxed max-h-32 overflow-y-auto pr-2 bg-muted/20 p-2.5 rounded-lg border border-border/30">
                          {parsedData.synopsis}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground">Exemplares Físicos:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={parsedData.totalCopies}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1)
                            setParsedData({ ...parsedData, totalCopies: val, availableCopies: val })
                          }}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-muted-foreground">Localização / Estante:</Label>
                        <Input
                          value={parsedData.locationShelf}
                          onChange={(e) => setParsedData({ ...parsedData, locationShelf: e.target.value })}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Livro cadastrado com sucesso no acervo da biblioteca!
                  </div>
                )}

                <Button
                  onClick={handleSaveImportedBook}
                  disabled={saving || saveSuccess}
                  className="w-full gap-2 accent-gradient text-white shadow-md font-semibold h-10"
                >
                  <Library className="h-4 w-4" /> {saving ? "Salvando no Acervo..." : "Confirmar e Salvar no Acervo"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-border/40 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
