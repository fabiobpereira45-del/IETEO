"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BookOpen,
  Library,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookMarked,
  Info,
  Calendar,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  type Book,
  type BookLoan,
  BOOK_CATEGORIES,
  getBooks,
  getBookLoans,
  requestBookLoan,
  evaluateLoanStatus,
  renewBookLoan
} from "@/lib/books"
import { type StudentProfile } from "@/lib/store"

interface Props {
  profile: StudentProfile
  isProfessor?: boolean
}

export function StudentBooksView({ profile, isProfessor }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [myLoans, setMyLoans] = useState<BookLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [reservingBookId, setReservingBookId] = useState<string | null>(null)
  const [reserveSuccessBookTitle, setReserveSuccessBookTitle] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  async function loadData() {
    setLoading(true)
    try {
      const [b, l] = await Promise.all([
        getBooks({ poloId: profile.polo_id || undefined }),
        getBookLoans({ studentId: profile.id })
      ])
      setBooks(b)
      setMyLoans(l)
    } catch (err) {
      console.error("Erro ao carregar biblioteca do aluno:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [profile.id])

  // Identificar se há empréstimo em atraso
  const overdueLoan = useMemo(() => {
    return myLoans.find(l => {
      const { isOverdue } = evaluateLoanStatus(l)
      return isOverdue
    })
  }, [myLoans])

  // Filtrar catálogo
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch =
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase()) ||
        b.category.toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory === "all" || b.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [books, search, selectedCategory])

  // Solicitar reserva
  async function handleRequestReservation(book: Book) {
    setReservingBookId(book.id)
    try {
      await requestBookLoan(book, {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        cpf: profile.cpf,
        poloId: profile.polo_id
      })
      setReserveSuccessBookTitle(book.title)
      await loadData()
      setTimeout(() => setReserveSuccessBookTitle(null), 4000)
    } catch (err: any) {
      alert(`Não foi possível reservar o livro: ${err.message}`)
    } finally {
      setReservingBookId(null)
    }
  }

  async function handleRenew(loanId: string) {
    if (!confirm("Tem certeza que deseja renovar este empréstimo por mais 5 dias? A renovação só pode ser feita uma vez.")) return
    try {
      await renewBookLoan(loanId)
      await loadData()
      alert("Empréstimo renovado com sucesso!")
    } catch (err: any) {
      alert(`Não foi possível renovar: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Banner de Boas-Vindas à Biblioteca */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-900 via-navy to-slate-950 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <Library className="h-3.5 w-3.5" /> Biblioteca Física do Instituto
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-serif tracking-tight">
            Locação Gratuita de Livros para {isProfessor ? "Professores" : "Alunos"}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Aprofunde seus estudos teológicos com o acervo impresso do IETEO. Você pode retirar livros gratuitamente por até <strong>7 dias corridos</strong> para estudar na sua casa. Solicite a reserva aqui e retire com o coordenador no seu polo.
          </p>
        </div>
      </div>

      {/* ⚠️ ALERTA CRÍTICO: DEVOLUÇÃO EM ATRASO */}
      {overdueLoan && (
        <div className="bg-red-500/15 border-2 border-red-500/50 text-red-900 dark:text-red-200 p-5 rounded-2xl shadow-lg flex items-start gap-4 animate-bounce-subtle">
          <div className="p-3 bg-red-600 text-white rounded-xl shrink-0 shadow-md">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-red-600 dark:text-red-400">
              ⚠️ ATENÇÃO: Devolução em Atraso no Livro "{overdueLoan.bookTitle}"!
            </h4>
            <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
              O prazo padrão de 7 dias de empréstimo para este exemplar expirou em{" "}
              <strong>{overdueLoan.dueDate ? new Date(overdueLoan.dueDate).toLocaleDateString("pt-BR") : "recentemente"}</strong>.
              Por favor, entregue o livro no seu polo na próxima aula para manter o seu cadastro regular e liberar a leitura para outros irmãos.
            </p>
          </div>
        </div>
      )}

      {/* Sucesso na Reserva */}
      {reserveSuccessBookTitle && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>
            🎉 Reserva confirmada para <strong>"{reserveSuccessBookTitle}"</strong>! Apresente-se ao coordenador/professor no polo para retirar seu exemplar físico.
          </span>
        </div>
      )}

      {/* ─── MEUS LIVROS EMPRESTADOS E RESERVAS ──────────────────────────────── */}
      {myLoans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Meus Livros Retirados & Reservas
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {myLoans.length} {myLoans.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myLoans.map(loan => {
              const { isOverdue, daysRemaining, daysOverdue, status } = evaluateLoanStatus(loan)

              return (
                <div
                  key={loan.id}
                  className={`p-4 rounded-2xl border transition-all bg-card flex gap-4 ${
                    isOverdue
                      ? "border-red-500/60 bg-red-500/5 shadow-md"
                      : "border-border/50 shadow-sm"
                  }`}
                >
                  <div className="w-16 h-24 rounded-xl bg-muted overflow-hidden shadow shrink-0 border border-border/40 relative">
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

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground truncate">{loan.bookTitle}</h4>
                      <p className="text-xs text-muted-foreground truncate">{loan.bookAuthor}</p>

                      <div className="mt-2 text-xs">
                        {status === "reserved" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            🟡 Aguardando Retirada Física no Polo
                          </span>
                        )}

                        {status === "active" && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              🟢 Em estudo (Faltam {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"})
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Devolver até: <strong>{new Date(loan.dueDate!).toLocaleDateString("pt-BR")}</strong>
                            </p>
                          </div>
                        )}

                        {status === "late" && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-red-600 text-white shadow-sm">
                              🔴 EM ATRASO: Venceu há {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"}!
                            </span>
                            <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                              Data limite era: {new Date(loan.dueDate!).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}

                        {status === "returned" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                            ⚪ Devolvido em {new Date(loan.returnedAt!).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        
                        {(status === "active" || status === "late") && !loan.renewed && (
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleRenew(loan.id)}
                              className="h-7 text-[10px] font-semibold gap-1 border-blue-500/40 text-blue-600 hover:bg-blue-500/10"
                            >
                              <Calendar className="h-3 w-3" /> Renovar (+5 dias)
                            </Button>
                          </div>
                        )}
                        {(status === "active" || status === "late") && loan.renewed && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              <Calendar className="h-2.5 w-2.5" /> Já renovado (1x)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      {loan.borrowedAt
                        ? `Retirado em: ${new Date(loan.borrowedAt).toLocaleDateString("pt-BR")}`
                        : `Solicitado em: ${new Date(loan.requestedAt).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── VITRINE DO ACERVO DE LIVROS ───────────────────────────────────── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Vitrine de Livros Disponíveis
            </h3>
            <p className="text-xs text-muted-foreground">
              Consulte as obras de referência teológica e reserve gratuitamente
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-xs w-[180px] bg-card">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                {BOOK_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Busca por texto */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título do livro, autor ou tema teológico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-card rounded-xl"
          />
        </div>

        {/* Grid de Livros */}
        {filteredBooks.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-2xl border border-border/40 space-y-2">
            <Library className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
            <h4 className="text-sm font-semibold text-foreground">Nenhum livro encontrado</h4>
            <p className="text-xs text-muted-foreground">Tente pesquisar com outros termos ou selecione outra categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map(book => {
              const isAvailable = book.availableCopies > 0
              const alreadyReserved = myLoans.some(
                l => l.bookId === book.id && (l.status === "reserved" || l.status === "active" || l.status === "late")
              )

              return (
                <div
                  key={book.id}
                  className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col justify-between hover-lift premium-shadow transition-all group"
                >
                  <div className="flex gap-4">
                    {/* Imagem da Capa */}
                    <div className="w-24 h-36 rounded-xl bg-muted overflow-hidden shadow-md shrink-0 border border-border/50 relative">
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

                    {/* Informações */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1">
                          {book.category}
                        </span>
                        <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-2">{book.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                        {book.publisher && (
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                            {book.publisher} {book.publicationYear ? `• ${book.publicationYear}` : ""}
                          </p>
                        )}
                      </div>

                      <div className="mt-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isAvailable
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 border-red-500/20"
                          }`}
                        >
                          {isAvailable
                            ? `Disponível (${book.availableCopies} exemplares)`
                            : "Todos em empréstimo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sinopse e Botão de Reserva */}
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                      {book.synopsis}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>📍 Local: {book.locationShelf || "Polo Sede"}</span>
                      <span>⏱️ Prazo: 7 dias</span>
                    </div>

                    <Button
                      size="sm"
                      disabled={!isAvailable || alreadyReserved || reservingBookId === book.id}
                      onClick={() => handleRequestReservation(book)}
                      className="w-full h-9 text-xs font-semibold accent-gradient text-white shadow-md disabled:opacity-50"
                    >
                      {alreadyReserved ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" /> Você já solicitou este livro
                        </span>
                      ) : isAvailable ? (
                        <span className="flex items-center gap-1.5">
                          <BookMarked className="h-3.5 w-3.5" /> Solicitar Reserva Gratuita (7 Dias)
                        </span>
                      ) : (
                        "Exemplares Esgotados"
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
