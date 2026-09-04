import { createClient } from "@/lib/supabase/client"
import { type StudentProfile } from "@/lib/store"

export interface Book {
  id: string
  title: string
  subtitle?: string
  author: string
  publisher?: string
  publicationYear?: number | string
  isbn?: string
  category: string // Hermenêutica, Teologia Sistemática, História da Igreja, etc.
  coverUrl?: string
  synopsis: string
  totalCopies: number
  availableCopies: number
  locationShelf?: string // Ex: Estante A1, Prateleira 2
  poloId?: string | null // null = geral ou específico
  createdAt: string
}

export type LoanStatus = "reserved" | "active" | "returned" | "late"

export interface BookLoan {
  id: string
  bookId: string
  bookTitle: string
  bookAuthor: string
  bookCoverUrl?: string
  studentId: string
  studentName: string
  studentEmail?: string
  studentPhone?: string
  studentCpf?: string
  poloId?: string | null
  requestedAt: string
  borrowedAt?: string | null
  dueDate?: string | null // borrowedAt + 7 dias
  returnedAt?: string | null
  status: LoanStatus
  notes?: string
  registeredBy?: string
  renewed?: boolean
}

// ─── Default Theological Categories ──────────────────────────────────────────
export const BOOK_CATEGORIES = [
  "Teologia Sistemática",
  "Hermenêutica e Exegese",
  "História da Igreja",
  "Liderança e Ministério Pastoral",
  "Homilética e Pregação",
  "Ética Cristã e Sociedade",
  "Missiologia e Evangelismo",
  "Pneumatologia",
  "Escatologia e Profecias",
  "Aconselhamento Bíblico",
  "Bibliologia e Cânon",
  "Geral / Espiritualidade"
]

// ─── Initial Seed / Mock Catalog ─────────────────────────────────────────────
const INITIAL_BOOKS: Book[] = [
  {
    id: "book-1",
    title: "Teologia Sistemática",
    subtitle: "Uma introdução às doutrinas bíblicas",
    author: "Wayne Grudem",
    publisher: "Vida Nova",
    publicationYear: 2018,
    isbn: "978-8527506694",
    category: "Teologia Sistemática",
    coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
    synopsis: "A mais completa e acessível introdução à Teologia Sistemática contemporânea, fundamentada em uma leitura bíblica conservadora com clareza pedagógica para alunos de seminários.",
    totalCopies: 4,
    availableCopies: 3,
    locationShelf: "Estante Teologia - Prateleira A",
    createdAt: new Date().toISOString()
  },
  {
    id: "book-2",
    title: "A Hermenêutica Bíblica",
    subtitle: "Princípios para interpretar corretamente as Escrituras",
    author: "Gordon Fee & Douglas Stuart",
    publisher: "Vida",
    publicationYear: 2020,
    isbn: "978-8538302001",
    category: "Hermenêutica e Exegese",
    coverUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800",
    synopsis: "Guia indispensável para estudantes e pastores lerem a Bíblia compreendendo seus diferentes gêneros literários, contextos históricos e aplicação pastoral.",
    totalCopies: 3,
    availableCopies: 2,
    locationShelf: "Estante Exegese - Prateleira B",
    createdAt: new Date().toISOString()
  },
  {
    id: "book-3",
    title: "História do Cristianismo",
    subtitle: "Dos Apóstolos até a Reforma Protestante",
    author: "Justo L. González",
    publisher: "Hagnos",
    publicationYear: 2019,
    isbn: "978-8577421251",
    category: "História da Igreja",
    coverUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=800",
    synopsis: "Um relato abrangente, vivo e ricamente documentado da trajetória da Igreja ao longo dos séculos, ressaltando os conflitos doutrinários e vitórias do povo de Deus.",
    totalCopies: 2,
    availableCopies: 1,
    locationShelf: "Estante História - Prateleira C",
    createdAt: new Date().toISOString()
  },
  {
    id: "book-4",
    title: "O Pregador e a Mensagem",
    subtitle: "Fundamentos bíblicos da Homilética expositiva",
    author: "John Stott",
    publisher: "Ultimato",
    publicationYear: 2017,
    isbn: "978-8577790340",
    category: "Homilética e Pregação",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
    synopsis: "Um clássico da homilética bíblica com orientações práticas para a construção do sermão expositivo fiel ao texto e relevante à vida contemporânea.",
    totalCopies: 3,
    availableCopies: 3,
    locationShelf: "Estante Prática - Prateleira D",
    createdAt: new Date().toISOString()
  }
]

// ─── LocalStorage Fallback Helpers ────────────────────────────────────────────
const STORAGE_KEY_BOOKS = "ieteo_library_books_v1"
const STORAGE_KEY_LOANS = "ieteo_library_loans_v1"

function getLocalBooks(): Book[] {
  if (typeof window === "undefined") return INITIAL_BOOKS
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(INITIAL_BOOKS))
      return INITIAL_BOOKS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_BOOKS
  }
}

function saveLocalBooks(books: Book[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books))
  } catch (err) {
    console.error("Failed to save local books:", err)
  }
}

function getLocalLoans(): BookLoan[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOANS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalLoans(loans: BookLoan[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(loans))
  } catch (err) {
    console.error("Failed to save local loans:", err)
  }
}

// ─── Helper: Compute Loan Status & Overdue ─────────────────────────────────────
export function evaluateLoanStatus(loan: BookLoan): {
  isOverdue: boolean
  daysRemaining: number
  daysOverdue: number
  status: LoanStatus
} {
  if (loan.status === "returned") {
    return { isOverdue: false, daysRemaining: 0, daysOverdue: 0, status: "returned" }
  }

  if (loan.status === "reserved" && !loan.borrowedAt) {
    return { isOverdue: false, daysRemaining: 0, daysOverdue: 0, status: "reserved" }
  }

  if (!loan.dueDate) {
    return { isOverdue: false, daysRemaining: 7, daysOverdue: 0, status: loan.status }
  }

  const now = new Date().getTime()
  const due = new Date(loan.dueDate).getTime()
  const diffMs = due - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      isOverdue: true,
      daysRemaining: 0,
      daysOverdue: Math.abs(diffDays),
      status: "late"
    }
  }

  return {
    isOverdue: false,
    daysRemaining: diffDays,
    daysOverdue: 0,
    status: "active"
  }
}

// ─── Public CRUD Methods ──────────────────────────────────────────────────────

export async function getBooks(filter?: {
  poloId?: string
  search?: string
  category?: string
}): Promise<Book[]> {
  const supabase = createClient()
  try {
    let query = supabase.from("books").select("*").order("title", { ascending: true })
    if (filter?.category && filter.category !== "all") {
      query = query.eq("category", filter.category)
    }
    if (filter?.poloId && filter.poloId !== "all") {
      query = query.or(`polo_id.eq.${filter.poloId},polo_id.is.null`)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      let books: Book[] = data.map((b: any) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        author: b.author,
        publisher: b.publisher,
        publicationYear: b.publication_year,
        isbn: b.isbn,
        category: b.category,
        coverUrl: b.cover_url,
        synopsis: b.synopsis,
        totalCopies: b.total_copies ?? 1,
        availableCopies: b.available_copies ?? 1,
        locationShelf: b.location_shelf,
        poloId: b.polo_id,
        createdAt: b.created_at
      }))

      if (filter?.search) {
        const s = filter.search.toLowerCase()
        books = books.filter(b =>
          b.title.toLowerCase().includes(s) ||
          b.author.toLowerCase().includes(s) ||
          b.publisher?.toLowerCase().includes(s) ||
          b.category.toLowerCase().includes(s)
        )
      }
      return books
    }
  } catch {
    // Fallback to local
  }

  // Local fallback
  let local = getLocalBooks()
  if (filter?.category && filter.category !== "all") {
    local = local.filter(b => b.category === filter.category)
  }
  if (filter?.poloId && filter.poloId !== "all") {
    local = local.filter(b => !b.poloId || b.poloId === filter.poloId)
  }
  if (filter?.search) {
    const s = filter.search.toLowerCase()
    local = local.filter(b =>
      b.title.toLowerCase().includes(s) ||
      b.author.toLowerCase().includes(s) ||
      b.publisher?.toLowerCase().includes(s) ||
      b.category.toLowerCase().includes(s)
    )
  }
  return local
}

export async function saveBook(book: Partial<Book> & { title: string; author: string }): Promise<Book> {
  const supabase = createClient()
  const id = book.id || `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const newBook: Book = {
    id,
    title: book.title,
    subtitle: book.subtitle || "",
    author: book.author,
    publisher: book.publisher || "",
    publicationYear: book.publicationYear || new Date().getFullYear(),
    isbn: book.isbn || "",
    category: book.category || "Teologia Sistemática",
    coverUrl: book.coverUrl || "",
    synopsis: book.synopsis || "",
    totalCopies: Number(book.totalCopies ?? 1),
    availableCopies: Number(book.availableCopies ?? book.totalCopies ?? 1),
    locationShelf: book.locationShelf || "Acervo Geral",
    poloId: book.poloId || null,
    createdAt: book.createdAt || new Date().toISOString()
  }

  try {
    const dbPayload = {
      id: newBook.id,
      title: newBook.title,
      subtitle: newBook.subtitle,
      author: newBook.author,
      publisher: newBook.publisher,
      publication_year: newBook.publicationYear,
      isbn: newBook.isbn,
      category: newBook.category,
      cover_url: newBook.coverUrl,
      synopsis: newBook.synopsis,
      total_copies: newBook.totalCopies,
      available_copies: newBook.availableCopies,
      location_shelf: newBook.locationShelf,
      polo_id: newBook.poloId,
      created_at: newBook.createdAt
    }
    const { error } = await supabase.from("books").upsert(dbPayload)
    if (error) console.warn("Supabase saveBook warning:", error.message)
  } catch {
    // ignore, saved locally
  }

  const list = getLocalBooks()
  const idx = list.findIndex(b => b.id === newBook.id)
  if (idx >= 0) {
    list[idx] = newBook
  } else {
    list.unshift(newBook)
  }
  saveLocalBooks(list)
  return newBook
}

export async function deleteBook(id: string): Promise<void> {
  const supabase = createClient()
  try {
    await supabase.from("books").delete().eq("id", id)
  } catch {
    // ignore
  }
  const list = getLocalBooks().filter(b => b.id !== id)
  saveLocalBooks(list)
}

// ─── Loan Methods ─────────────────────────────────────────────────────────────

export async function getBookLoans(filter?: {
  studentId?: string
  status?: string
  poloId?: string
}): Promise<BookLoan[]> {
  const supabase = createClient()
  let loans: BookLoan[] = []

  try {
    let query = supabase.from("book_loans").select("*").order("requested_at", { ascending: false })
    if (filter?.studentId) query = query.eq("student_id", filter.studentId)
    if (filter?.status && filter.status !== "all") query = query.eq("status", filter.status)
    if (filter?.poloId && filter.poloId !== "all") query = query.eq("polo_id", filter.poloId)

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      loans = data.map((l: any) => ({
        id: l.id,
        bookId: l.book_id,
        bookTitle: l.book_title,
        bookAuthor: l.book_author,
        bookCoverUrl: l.book_cover_url,
        studentId: l.student_id,
        studentName: l.student_name,
        studentEmail: l.student_email,
        studentPhone: l.student_phone,
        studentCpf: l.student_cpf,
        poloId: l.polo_id,
        requestedAt: l.requested_at,
        borrowedAt: l.borrowed_at,
        dueDate: l.due_date,
        returnedAt: l.returned_at,
        status: l.status,
        notes: l.notes,
        registeredBy: l.registered_by,
        renewed: l.renewed
      }))
    } else {
      loans = getLocalLoans()
    }
  } catch {
    loans = getLocalLoans()
  }

  // Re-evaluate statuses (update to 'late' if dueDate < today and not returned)
  loans = loans.map(l => {
    const { status } = evaluateLoanStatus(l)
    return { ...l, status }
  })

  if (filter?.studentId) {
    loans = loans.filter(l => l.studentId === filter.studentId)
  }
  if (filter?.status && filter.status !== "all") {
    loans = loans.filter(l => l.status === filter.status)
  }
  if (filter?.poloId && filter.poloId !== "all") {
    loans = loans.filter(l => !l.poloId || l.poloId === filter.poloId)
  }

  return loans
}

export async function requestBookLoan(book: Book, student: {
  id: string
  name: string
  email?: string
  phone?: string
  cpf?: string
  poloId?: string | null
}): Promise<BookLoan> {
  if (book.availableCopies <= 0) {
    throw new Error("Não há exemplares deste livro disponíveis para empréstimo no momento.")
  }

  // Check if they are trying to borrow the exact same book they just returned
  await checkBorrowEligibility(student.id, book.id)

  const id = `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const newLoan: BookLoan = {
    id,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    bookCoverUrl: book.coverUrl,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    studentPhone: student.phone,
    studentCpf: student.cpf,
    poloId: student.poloId || book.poloId || null,
    requestedAt: new Date().toISOString(),
    status: "reserved",
    renewed: false
  }

  const supabase = createClient()
  try {
    await supabase.from("book_loans").insert({
      id: newLoan.id,
      book_id: newLoan.bookId,
      book_title: newLoan.bookTitle,
      book_author: newLoan.bookAuthor,
      book_cover_url: newLoan.bookCoverUrl,
      student_id: newLoan.studentId,
      student_name: newLoan.studentName,
      student_email: newLoan.studentEmail,
      student_phone: newLoan.studentPhone,
      student_cpf: newLoan.studentCpf,
      polo_id: newLoan.poloId,
      requested_at: newLoan.requestedAt,
      status: newLoan.status,
      renewed: newLoan.renewed
    })
  } catch {
    // local fallback
  }

  const loans = getLocalLoans()
  loans.unshift(newLoan)
  saveLocalLoans(loans)

  return newLoan
}

export async function confirmPhysicalBorrow(loanId: string, registeredBy?: string): Promise<BookLoan> {
  const now = new Date()
  const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 dias corridos

  let updated: BookLoan | null = null
  const localLoans = getLocalLoans()
  const loan = localLoans.find(l => l.id === loanId)

  if (loan) {
    loan.borrowedAt = now.toISOString()
    loan.dueDate = due.toISOString()
    loan.status = "active"
    loan.registeredBy = registeredBy || "Docente / Master"
    updated = { ...loan }
    saveLocalLoans(localLoans)

    // Abate 1 cópia disponível do livro
    const books = getLocalBooks()
    const b = books.find(item => item.id === loan.bookId)
    if (b && b.availableCopies > 0) {
      b.availableCopies -= 1
      saveLocalBooks(books)
      try {
        const supabase = createClient()
        await supabase.from("books").update({ available_copies: b.availableCopies }).eq("id", b.id)
      } catch {
        // ignore
      }
    }
  }

  try {
    const supabase = createClient()
    await supabase.from("book_loans").update({
      borrowed_at: now.toISOString(),
      due_date: due.toISOString(),
      status: "active",
      registered_by: registeredBy || "Docente / Master"
    }).eq("id", loanId)
  } catch {
    // ignore
  }

  if (!updated) {
    throw new Error("Empréstimo não encontrado.")
  }

  return updated
}

export async function returnBookLoan(loanId: string): Promise<BookLoan> {
  const now = new Date()
  let updated: BookLoan | null = null
  const localLoans = getLocalLoans()
  const loan = localLoans.find(l => l.id === loanId)

  if (loan) {
    loan.returnedAt = now.toISOString()
    loan.status = "returned"
    updated = { ...loan }
    saveLocalLoans(localLoans)

    // Devolve 1 cópia para o estoque
    const books = getLocalBooks()
    const b = books.find(item => item.id === loan.bookId)
    if (b && b.availableCopies < b.totalCopies) {
      b.availableCopies += 1
      saveLocalBooks(books)
      try {
        const supabase = createClient()
        await supabase.from("books").update({ available_copies: b.availableCopies }).eq("id", b.id)
      } catch {
        // ignore
      }
    }
  }

  try {
    const supabase = createClient()
    await supabase.from("book_loans").update({
      returned_at: now.toISOString(),
      status: "returned"
    }).eq("id", loanId)
  } catch {
    // ignore
  }

  if (!updated) {
    throw new Error("Empréstimo não encontrado.")
  }

  return updated
}

export async function cancelBookLoan(loanId: string): Promise<void> {
  const localLoans = getLocalLoans().filter(l => l.id !== loanId)
  saveLocalLoans(localLoans)

  try {
    const supabase = createClient()
    await supabase.from("book_loans").delete().eq("id", loanId)
  } catch {
    // ignore
  }
}

export async function renewBookLoan(loanId: string): Promise<BookLoan> {
  const localLoans = getLocalLoans()
  const loan = localLoans.find(l => l.id === loanId)

  if (!loan) {
    throw new Error("Empréstimo não encontrado.")
  }

  if (loan.renewed) {
    throw new Error("Este empréstimo já foi renovado anteriormente. Só é permitida uma renovação por locação.")
  }

  if (!loan.dueDate) {
    throw new Error("Não é possível renovar um empréstimo sem data de vencimento estabelecida.")
  }

  const currentDueDate = new Date(loan.dueDate)
  // Adiciona 5 dias (5 * 24 horas * 60 min * 60 seg * 1000 ms)
  const newDueDate = new Date(currentDueDate.getTime() + 5 * 24 * 60 * 60 * 1000)

  loan.dueDate = newDueDate.toISOString()
  loan.renewed = true
  // Re-avalia o status localmente para garantir consistência visual imediata
  const { status } = evaluateLoanStatus(loan)
  loan.status = status

  saveLocalLoans(localLoans)

  try {
    const supabase = createClient()
    await supabase.from("book_loans").update({
      due_date: loan.dueDate,
      renewed: true
    }).eq("id", loanId)
  } catch {
    // ignore
  }

  return { ...loan }
}

async function checkBorrowEligibility(studentId: string, bookId: string): Promise<void> {
  // Regra: "o aluno não poderá locar o mesmo material na proxima vez, antes deverá locar outro material para depois retornar ao anterior"
  // Obtém o histórico do aluno (já vem de local + supabase em caso de query real, mas podemos usar getBookLoans)
  const loans = await getBookLoans({ studentId })
  
  // Pegar apenas os livros devolvidos, ordenados do mais recente para o mais antigo (getBookLoans já ordena decrescente, mas vamos garantir usando returnedAt se existir)
  const returnedLoans = loans.filter(l => l.status === "returned" && l.returnedAt)
  returnedLoans.sort((a, b) => new Date(b.returnedAt!).getTime() - new Date(a.returnedAt!).getTime())

  if (returnedLoans.length > 0) {
    const lastReturned = returnedLoans[0]
    if (lastReturned.bookId === bookId) {
      throw new Error("Você deve locar um material diferente antes de poder pegar este mesmo livro novamente.")
    }
  }
}

// ─── Direct Admin Borrow (without student reservation) ────────────────────────
export async function directAdminBorrow(data: {
  book: Book
  student: StudentProfile
  registeredBy?: string
}): Promise<BookLoan> {
  if (data.book.availableCopies <= 0) {
    throw new Error("Livro sem exemplares disponíveis no momento.")
  }

  const now = new Date()
  const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const id = `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const newLoan: BookLoan = {
    id,
    bookId: data.book.id,
    bookTitle: data.book.title,
    bookAuthor: data.book.author,
    bookCoverUrl: data.book.coverUrl,
    studentId: data.student.id,
    studentName: data.student.name,
    studentEmail: data.student.email,
    studentPhone: data.student.phone,
    studentCpf: data.student.cpf,
    poloId: data.student.polo_id || data.book.poloId || null,
    requestedAt: now.toISOString(),
    borrowedAt: now.toISOString(),
    dueDate: due.toISOString(),
    status: "active",
    registeredBy: data.registeredBy || "Administrador / Docente",
    renewed: false
  }

  // Check eligibility
  await checkBorrowEligibility(data.student.id, data.book.id)

  // Salvar no local
  const loans = getLocalLoans()
  loans.unshift(newLoan)
  saveLocalLoans(loans)

  // Abater estoque
  const books = getLocalBooks()
  const b = books.find(item => item.id === data.book.id)
  if (b && b.availableCopies > 0) {
    b.availableCopies -= 1
    saveLocalBooks(books)
  }

  try {
    const supabase = createClient()
    await supabase.from("book_loans").insert({
      id: newLoan.id,
      book_id: newLoan.bookId,
      book_title: newLoan.bookTitle,
      book_author: newLoan.bookAuthor,
      book_cover_url: newLoan.bookCoverUrl,
      student_id: newLoan.studentId,
      student_name: newLoan.studentName,
      student_email: newLoan.studentEmail,
      student_phone: newLoan.studentPhone,
      student_cpf: newLoan.studentCpf,
      polo_id: newLoan.poloId,
      requested_at: newLoan.requestedAt,
      borrowed_at: newLoan.borrowedAt,
      due_date: newLoan.dueDate,
      status: "active",
      registered_by: newLoan.registeredBy,
      renewed: newLoan.renewed
    })
    if (b) {
      await supabase.from("books").update({ available_copies: b.availableCopies }).eq("id", b.id)
    }
  } catch {
    // ignore
  }

  return newLoan
}

// ─── WhatsApp Alert Message Generator ─────────────────────────────────────────
export function getWhatsAppOverdueLink(loan: BookLoan, daysOverdue: number): string | null {
  if (!loan.studentPhone) return null
  const cleanPhone = loan.studentPhone.replace(/\D/g, "")
  if (cleanPhone.length < 10) return null

  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
  const dueDateFormatted = loan.dueDate
    ? new Date(loan.dueDate).toLocaleDateString("pt-BR")
    : "data acordada"

  const text = encodeURIComponent(
    `Paz do Senhor, ${loan.studentName}! 📖\n\n` +
    `Aqui é da coordenação da Biblioteca do IETEO (Instituto de Ensino Teológico).\n\n` +
    `Identificamos que o empréstimo do livro *"${loan.bookTitle}"* venceu em ${dueDateFormatted} (há ${daysOverdue} ${daysOverdue === 1 ? "dia" : "dias"}).\n\n` +
    `Como o prazo de empréstimo gratuito para estudo é de 7 dias e há outros irmãos na fila de leitura, solicitamos com carinho a devolução do exemplar no seu polo para mantermos seu cadastro regular.\n\n` +
    `Deus abençoe seus estudos teológicos! 🙏`
  )

  return `https://wa.me/${formattedPhone}?text=${text}`
}
