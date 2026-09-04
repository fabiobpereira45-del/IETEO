"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BookOpen,
  Library,
  Sparkles,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  MessageCircle,
  Building2,
  Trash2,
  Pencil,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Hash,
  ExternalLink,
  BookCopy,
  ChevronRight,
  X
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
  type BookLoan,
  BOOK_CATEGORIES,
  getBooks,
  saveBook,
  deleteBook,
  getBookLoans,
  confirmPhysicalBorrow,
  returnBookLoan,
  cancelBookLoan,
  directAdminBorrow,
  evaluateLoanStatus,
  getWhatsAppOverdueLink,
  renewBookLoan
} from "@/lib/books"
import { getStudents, type StudentProfile } from "@/lib/store"
import { AIBookGenerator } from "@/components/ai-book-generator"

interface Props {
  isMaster?: boolean
  poloFilter?: string
}

export function BookManager({ isMaster, poloFilter }: Props) {
  const [activeTab, setActiveTab] = useState<"loans" | "catalog">("loans")
  const [books, setBooks] = useState<Book[]>([])
  const [loans, setLoans] = useState<BookLoan[]>([])
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [manualBookModalOpen, setManualBookModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [directLoanModalOpen, setDirectLoanModalOpen] = useState(false)
  const [selectedBookForLoan, setSelectedBookForLoan] = useState<Book | null>(null)

  // Filtros
  const [searchCatalog, setSearchCatalog] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchLoans, setSearchLoans] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Form de cadastro manual de livro
  const [bookTitle, setBookTitle] = useState("")
  const [bookSubtitle, setBookSubtitle] = useState("")
  const [bookAuthor, setBookAuthor] = useState("")
  const [bookPublisher, setBookPublisher] = useState("")
  const [bookYear, setBookYear] = useState<number | string>(new Date().getFullYear())
  const [bookIsbn, setBookIsbn] = useState("")
  const [bookCategory, setBookCategory] = useState(BOOK_CATEGORIES[0])
  const [bookCoverUrl, setBookCoverUrl] = useState("")
  const [bookSynopsis, setBookSynopsis] = useState("")
  const [bookTotalCopies, setBookTotalCopies] = useState(2)
  const [bookLocationShelf, setBookLocationShelf] = useState("Estante Teologia - Prateleira A")

  // Form de empréstimo direto no balcão
  const [directStudentId, setDirectStudentId] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const [b, l, s] = await Promise.all([
        getBooks({ poloId: poloFilter }),
        getBookLoans({ poloId: poloFilter }),
        getStudents(poloFilter)
      ])
      setBooks(b)
      setLoans(l)
      setStudents(s)
    } catch (err) {
      console.error("Erro ao carregar dados da biblioteca:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [poloFilter])

  // KPIs
  const stats = useMemo(() => {
    let overdueCount = 0
    let activeCount = 0
    let reservedCount = 0
    let totalStock = 0
    let availableStock = 0

    books.forEach(b => {
      totalStock += b.totalCopies || 0
      availableStock += b.availableCopies || 0
    })

    loans.forEach(l => {
      const { isOverdue, status } = evaluateLoanStatus(l)
      if (status === "reserved") reservedCount++
      if (isOverdue) overdueCount++
      else if (status === "active") activeCount++
    })

    return {
      totalTitles: books.length,
      totalStock,
      availableStock,
      activeCount,
      reservedCount,
      overdueCount
    }
  }, [books, loans])

  // Filtrar livros
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch =
        b.title.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        b.author.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        b.category.toLowerCase().includes(searchCatalog.toLowerCase())
      const matchCat = categoryFilter === "all" || b.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [books, searchCatalog, categoryFilter])

  // Filtrar empréstimos
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const { status } = evaluateLoanStatus(l)
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "late" && status === "late") ||
        (statusFilter === "active" && status === "active") ||
        (statusFilter === "reserved" && status === "reserved") ||
        (statusFilter === "returned" && status === "returned")

      const matchSearch =
        l.bookTitle.toLowerCase().includes(searchLoans.toLowerCase()) ||
        l.studentName.toLowerCase().includes(searchLoans.toLowerCase()) ||
        (l.studentPhone && l.studentPhone.includes(searchLoans))

      return matchStatus && matchSearch
    })
  }, [loans, searchLoans, statusFilter])

  // Ações de empréstimo
  async function handleConfirmBorrow(loanId: string) {
    try {
      await confirmPhysicalBorrow(loanId, isMaster ? "Master" : "Docente")
      await loadData()
    } catch (err: any) {
      alert(`Erro ao confirmar retirada: ${err.message}`)
    }
  }

  async function handleReturn(loanId: string) {
    if (!confirm("Confirmar a devolução deste livro e devolução ao estoque do acervo?")) return
    try {
      await returnBookLoan(loanId)
      await loadData()
    } catch (err: any) {
      alert(`Erro ao registrar devolução: ${err.message}`)
    }
  }

  async function handleCancelLoan(loanId: string) {
    if (!confirm("Tem certeza que deseja cancelar esta reserva/empréstimo?")) return
    try {
      await cancelBookLoan(loanId)
      await loadData()
    } catch (err: any) {
      alert(`Erro ao cancelar: ${err.message}`)
    }
  }

  async function handleRenew(loanId: string) {
    if (!confirm("Tem certeza que deseja renovar este empréstimo por mais 5 dias? A renovação só pode ser feita uma vez.")) return
    try {
      await renewBookLoan(loanId)
      await loadData()
      alert("Empréstimo renovado com sucesso!")
    } catch (err: any) {
      alert(`Erro ao renovar: ${err.message}`)
    }
  }

  function openEditBook(book: Book) {
    setEditingBook(book)
    setBookTitle(book.title)
    setBookSubtitle(book.subtitle || "")
    setBookAuthor(book.author)
    setBookPublisher(book.publisher || "")
    setBookYear(book.publicationYear || new Date().getFullYear())
    setBookIsbn(book.isbn || "")
    setBookCategory(book.category)
    setBookCoverUrl(book.coverUrl || "")
    setBookSynopsis(book.synopsis)
    setBookTotalCopies(book.totalCopies)
    setBookLocationShelf(book.locationShelf || "Estante Teologia - Prateleira A")
    setManualBookModalOpen(true)
  }

  function openNewBook() {
    setEditingBook(null)
    setBookTitle("")
    setBookSubtitle("")
    setBookAuthor("")
    setBookPublisher("")
    setBookYear(new Date().getFullYear())
    setBookIsbn("")
    setBookCategory(BOOK_CATEGORIES[0])
    setBookCoverUrl("")
    setBookSynopsis("")
    setBookTotalCopies(2)
    setBookLocationShelf("Estante Teologia - Prateleira A")
    setManualBookModalOpen(true)
  }

  async function handleSaveManualBook() {
    if (!bookTitle.trim() || !bookAuthor.trim()) {
      alert("Por favor, preencha o título e o autor do livro.")
      return
    }

    const payload: Partial<Book> & { title: string; author: string } = {
      id: editingBook ? editingBook.id : undefined,
      title: bookTitle,
      subtitle: bookSubtitle,
      author: bookAuthor,
      publisher: bookPublisher,
      publicationYear: bookYear,
      isbn: bookIsbn,
      category: bookCategory,
      coverUrl: bookCoverUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
      synopsis: bookSynopsis || "Sem sinopse cadastrada.",
      totalCopies: Number(bookTotalCopies || 1),
      availableCopies: editingBook
        ? Math.max(0, Number(bookTotalCopies) - (editingBook.totalCopies - editingBook.availableCopies))
        : Number(bookTotalCopies || 1),
      locationShelf: bookLocationShelf,
      poloId: poloFilter && poloFilter !== "all" ? poloFilter : null
    }

    try {
      await saveBook(payload)
      setManualBookModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erro ao salvar livro: ${err.message}`)
    }
  }

  async function handleDeleteBook(id: string) {
    if (!confirm("Tem certeza que deseja remover este livro do catálogo?")) return
    try {
      await deleteBook(id)
      loadData()
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`)
    }
  }

  async function handleDirectLoan() {
    if (!selectedBookForLoan || !directStudentId) {
      alert("Selecione o aluno para o empréstimo.")
      return
    }
    const student = students.find(s => s.id === directStudentId)
    if (!student) {
      alert("Aluno não encontrado.")
      return
    }

    try {
      await directAdminBorrow({
        book: selectedBookForLoan,
        student,
        registeredBy: isMaster ? "Master" : "Docente"
      })
      setDirectLoanModalOpen(false)
      setSelectedBookForLoan(null)
      setDirectStudentId("")
      loadData()
    } catch (err: any) {
      alert(`Erro ao registrar empréstimo: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass rounded-2xl p-6 premium-shadow">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
            <BookCopy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-foreground">Locação de Livros & Biblioteca Física</h2>
            <p className="text-muted-foreground text-xs">
              Empréstimos gratuitos para estudo em casa com prazo de 7 dias, devoluções e alertas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <Button
            onClick={() => setAiModalOpen(true)}
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md font-semibold text-xs"
          >
            <Sparkles className="h-4 w-4" /> Pesquisar com IA
          </Button>

          <Button
            onClick={openNewBook}
            size="sm"
            variant="outline"
            className="gap-1.5 border-border/80 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" /> Novo Livro Manual
          </Button>
        </div>
      </div>

      {/* ⚠️ ALERTA CRÍTICO DE DEVOLUÇÕES EM ATRASO */}
      {stats.overdueCount > 0 && (
        <div className="bg-red-500/10 border-2 border-red-500/40 text-red-700 dark:text-red-300 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 text-red-500 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight text-red-600 dark:text-red-400">
                ⚠️ ALERTA DE ATRASO: {stats.overdueCount} {stats.overdueCount === 1 ? "livro ultrapassou" : "livros ultrapassaram"} o prazo de 7 dias!
              </h4>
              <p className="text-xs opacity-90 mt-0.5">
                Existem alunos com empréstimos pendentes há mais de 1 semana. Clique na aba de empréstimos e envie lembrete via WhatsApp para recuperar os exemplares.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setActiveTab("loans")
              setStatusFilter("late")
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 shadow-sm"
          >
            Ver Atrasados
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-card border border-border/50 rounded-2xl p-4 premium-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Títulos no Acervo</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalTitles}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalStock} exemplares físicos</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 premium-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Disponíveis</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.availableStock}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Prontos para retirada</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 premium-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Casa (Empréstimo)</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.activeCount}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Prazo padrão de 7 dias</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 premium-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Reservas Pendentes</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.reservedCount}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Aguardando retirada no polo</p>
        </div>

        <div className={`border rounded-2xl p-4 premium-shadow ${
          stats.overdueCount > 0
            ? "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300"
            : "bg-card border-border/50"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">⚠️ Em Atraso</span>
            <AlertTriangle className={`h-4 w-4 ${stats.overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </div>
          <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
            {stats.overdueCount}
          </div>
          <p className="text-[10px] opacity-80 mt-0.5">Devoluções vencidas</p>
        </div>
      </div>

      {/* Abas Principais: Empréstimos x Acervo */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="loans" className="flex items-center gap-2 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" /> Controle de Empréstimos ({loans.length})
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2 text-xs font-semibold">
            <Library className="h-3.5 w-3.5" /> Acervo da Biblioteca ({books.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA 1: EMPRÉSTIMOS E DEVOLUÇÕES ───────────────────────────────── */}
        <TabsContent value="loans" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por livro, aluno ou telefone..."
                value={searchLoans}
                onChange={(e) => setSearchLoans(e.target.value)}
                className="pl-9 h-9 text-xs bg-card"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-[180px] bg-card">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="late">🔴 Em Atraso (&gt; 7 dias)</SelectItem>
                  <SelectItem value="active">🟢 Em Andamento</SelectItem>
                  <SelectItem value="reserved">🟡 Reserva Solicitada</SelectItem>
                  <SelectItem value="returned">⚪ Devolvidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredLoans.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border/40 space-y-2">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <h4 className="text-sm font-semibold text-foreground">Nenhum registro de empréstimo encontrado</h4>
              <p className="text-xs text-muted-foreground">
                Quando os alunos reservarem livros pelo portal ou retirarem no polo, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLoans.map((loan) => {
                const { isOverdue, daysRemaining, daysOverdue, status } = evaluateLoanStatus(loan)
                const whatsappUrl = isOverdue ? getWhatsAppOverdueLink(loan, daysOverdue) : null

                return (
                  <div
                    key={loan.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card ${
                      isOverdue
                        ? "border-red-500/50 bg-red-500/5 shadow-md"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    {/* Livro e Capa */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden shadow shrink-0 border border-border/40 relative">
                        {loan.bookCoverUrl ? (
                          <img
                            src={loan.bookCoverUrl}
                            alt={loan.bookTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-6 w-6 m-auto text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-foreground truncate">{loan.bookTitle}</h4>
                        <p className="text-xs text-muted-foreground truncate">{loan.bookAuthor}</p>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <User className="h-3 w-3 text-primary" /> {loan.studentName}
                          </span>
                          {loan.studentPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {loan.studentPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Datas e Prazos */}
                    <div className="flex flex-col md:items-center gap-1 text-xs shrink-0 w-full md:w-auto">
                      {status === "reserved" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          🟡 Reserva Solicitada (Aguardando Retirada)
                        </span>
                      )}

                      {status === "active" && (
                        <div className="flex flex-col items-start md:items-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            🟢 Em Andamento (Faltam {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"})
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Devolução até: {new Date(loan.dueDate!).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}

                      {status === "late" && (
                        <div className="flex flex-col items-start md:items-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-600 text-white shadow-sm flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> EM ATRASO: {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"}
                          </span>
                          <span className="text-[10px] text-red-500 font-semibold mt-0.5">
                            Venceu em: {new Date(loan.dueDate!).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}

                      {status === "returned" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          ⚪ Devolvido em {new Date(loan.returnedAt!).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-border/30">
                      {status === "reserved" && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmBorrow(loan.id)}
                          className="h-8 text-xs font-semibold gap-1.5 accent-gradient text-white shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar Retirada Física
                        </Button>
                      )}

                      {(status === "active" || status === "late") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturn(loan.id)}
                            className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Registrar Devolução
                          </Button>
                          
                          {!loan.renewed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRenew(loan.id)}
                              className="h-8 text-xs font-semibold gap-1.5 border-blue-500/40 text-blue-600 hover:bg-blue-500/10"
                            >
                              <Calendar className="h-3.5 w-3.5" /> Renovar (5 Dias)
                            </Button>
                          )}
                        </>
                      )}

                      {isOverdue && whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                          title="Cobrar devolução via WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Notificar no WhatsApp
                        </a>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelLoan(loan.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Cancelar registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA 2: ACERVO DA BIBLIOTECA (CATÁLOGO) ────────────────────────── */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar livros por título, autor ou assunto..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="pl-9 h-9 text-xs bg-card"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs w-[200px] bg-card">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {BOOK_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border/40 space-y-3">
              <Library className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
              <h4 className="text-sm font-semibold text-foreground">Nenhum livro encontrado</h4>
              <p className="text-xs text-muted-foreground">
                Cadastre novas obras manualmente ou use o Super Prompt com IA para pesquisar dados na web.
              </p>
              <Button size="sm" onClick={() => setAiModalOpen(true)} className="gap-1.5 accent-gradient text-white">
                <Sparkles className="h-3.5 w-3.5" /> Pesquisar com IA
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book) => {
                const isAvailable = book.availableCopies > 0

                return (
                  <div
                    key={book.id}
                    className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col justify-between hover-lift premium-shadow transition-all group"
                  >
                    <div className="flex gap-3.5">
                      <div className="w-20 h-28 rounded-xl bg-muted overflow-hidden shadow shrink-0 border border-border/50 relative">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <BookOpen className="h-8 w-8 m-auto text-muted-foreground opacity-50" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1">
                          {book.category}
                        </span>
                        <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-2">{book.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                        {book.publisher && (
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                            {book.publisher} • {book.publicationYear || ""}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isAvailable
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            }`}
                          >
                            {isAvailable
                              ? `${book.availableCopies} de ${book.totalCopies} disponíveis`
                              : "Esgotado no momento"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {book.synopsis}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>📍 {book.locationShelf || "Acervo Geral"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="sm"
                          disabled={!isAvailable}
                          onClick={() => {
                            setSelectedBookForLoan(book)
                            setDirectLoanModalOpen(true)
                          }}
                          className="flex-1 h-8 text-xs font-semibold accent-gradient text-white shadow-sm disabled:opacity-50"
                        >
                          Emprestar no Balcão
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditBook(book)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Editar dados do livro"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBook(book.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Excluir do catálogo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── MODAL DE PESQUISA COM IA ───────────────────────────────────────── */}
      <AIBookGenerator
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onBookSaved={() => {
          loadData()
          setActiveTab("catalog")
        }}
        defaultPoloId={poloFilter && poloFilter !== "all" ? poloFilter : null}
      />

      {/* ─── MODAL DE CADASTRO / EDIÇÃO MANUAL DE LIVRO ─────────────────────── */}
      <Dialog open={manualBookModalOpen} onOpenChange={setManualBookModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 bg-background">
          <DialogHeader>
            <DialogTitle>{editingBook ? "Editar Livro" : "Cadastrar Novo Livro no Acervo"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Título da Obra *</Label>
              <Input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Ex: Teologia Sistemática"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Subtítulo (Opcional)</Label>
              <Input
                value={bookSubtitle}
                onChange={(e) => setBookSubtitle(e.target.value)}
                placeholder="Ex: Uma introdução às doutrinas bíblicas"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Autor *</Label>
              <Input
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Ex: Wayne Grudem"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Editora</Label>
              <Input
                value={bookPublisher}
                onChange={(e) => setBookPublisher(e.target.value)}
                placeholder="Ex: Vida Nova"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria Teológica</Label>
              <Select value={bookCategory} onValueChange={setBookCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ano de Publicação</Label>
              <Input
                type="number"
                value={bookYear}
                onChange={(e) => setBookYear(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ISBN</Label>
              <Input
                value={bookIsbn}
                onChange={(e) => setBookIsbn(e.target.value)}
                placeholder="978-..."
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Total de Exemplares Físicos</Label>
              <Input
                type="number"
                min={1}
                value={bookTotalCopies}
                onChange={(e) => setBookTotalCopies(Math.max(1, Number(e.target.value) || 1))}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">URL da Imagem da Capa (Opcional)</Label>
              <Input
                value={bookCoverUrl}
                onChange={(e) => setBookCoverUrl(e.target.value)}
                placeholder="https://... capa.jpg"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Localização Física / Estante</Label>
              <Input
                value={bookLocationShelf}
                onChange={(e) => setBookLocationShelf(e.target.value)}
                placeholder="Ex: Estante Teologia - Prateleira A"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Sinopse da Obra</Label>
              <Textarea
                value={bookSynopsis}
                onChange={(e) => setBookSynopsis(e.target.value)}
                rows={3}
                placeholder="Resumo pedagógico e relevância para o curso..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setManualBookModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveManualBook} className="accent-gradient text-white font-semibold">
              Salvar Livro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DE EMPRÉSTIMO DIRETO NO BALCÃO ─────────────────────────── */}
      <Dialog open={directLoanModalOpen} onOpenChange={setDirectLoanModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-6 bg-background">
          <DialogHeader>
            <DialogTitle>Registrar Empréstimo no Balcão</DialogTitle>
          </DialogHeader>

          {selectedBookForLoan && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                  {selectedBookForLoan.coverUrl && (
                    <img
                      src={selectedBookForLoan.coverUrl}
                      alt={selectedBookForLoan.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">{selectedBookForLoan.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{selectedBookForLoan.author}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                    Prazo de Devolução: 7 dias a partir de hoje
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Selecione o Aluno Retirante *</Label>
                <Select value={directStudentId} onValueChange={setDirectStudentId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Escolha um aluno matriculado..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {students.map(st => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} {st.cpf ? `(CPF: ${st.cpf})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDirectLoanModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!directStudentId}
              onClick={handleDirectLoan}
              className="accent-gradient text-white font-semibold"
            >
              Confirmar Empréstimo (7 Dias)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
