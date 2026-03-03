// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = "multiple-choice" | "true-false" | "discursive"

export interface Choice {
  id: string
  text: string
}

export interface Discipline {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface Question {
  id: string
  disciplineId: string
  type: QuestionType
  text: string
  choices: Choice[]
  correctAnswer: string // choiceId | "true" | "false" | "" for discursive
  points: number
  createdAt: string
}

export interface Assessment {
  id: string
  title: string
  disciplineId: string
  professor: string
  institution: string
  questionIds: string[]
  pointsPerQuestion: number
  totalPoints: number
  openAt: string | null
  closeAt: string | null
  isPublished: boolean
  logoBase64?: string
  rules?: string
  createdAt: string
}

export interface StudentAnswer {
  questionId: string
  answer: string
}

export interface StudentSubmission {
  id: string
  assessmentId: string
  studentName: string
  studentEmail: string
  answers: StudentAnswer[]
  score: number
  totalPoints: number
  percentage: number
  submittedAt: string
  timeElapsedSeconds: number
}

export interface ProfessorAccount {
  id: string
  name: string
  email: string
  passwordHash: string // base64 encoded — simple obfuscation for localStorage
  role: "master" | "professor"
  createdAt: string
}

export interface ProfessorSession {
  loggedIn: boolean
  professorId: string
  role: "master" | "professor"
  expiresAt: string
}

export interface StudentSession {
  name: string
  email: string
  assessmentId: string
  startedAt: string
}

// ─── Simple hash (btoa) — not cryptographic, fine for local-only auth ─────────

export function hashPassword(plain: string): string {
  if (typeof window !== "undefined") return btoa(unescape(encodeURIComponent(plain)))
  return Buffer.from(plain).toString("base64")
}

export function checkPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  DISCIPLINES: "ibad_disciplines_v2",
  QUESTIONS: "ibad_question_bank",
  ASSESSMENTS: "ibad_assessments",
  SUBMISSIONS: "ibad_submissions_v2",
  PROFESSOR_SESSION: "ibad_professor_session",
  PROFESSOR_ACCOUNTS: "ibad_professor_accounts",
  STUDENT_SESSION: "ibad_current_session",
  DRAFT_ANSWERS: "ibad_draft_answers",
} as const

// ─── Master credentials (hardcoded fallback) ──────────────────────────────────

export const MASTER_CREDENTIALS = {
  email: "professor@ieteo.com",
  password: "ieteo2026",
  name: "Pb. Fábio Barreto",
  role: "master" as const,
}

// Legacy alias so existing code doesn't break
export const PROFESSOR_CREDENTIALS = MASTER_CREDENTIALS

// ─── Low-level helpers ────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ─── Professor Session ────────────────────────────────────────────────────────

export function getProfessorSession(): ProfessorSession | null {
  const s = read<ProfessorSession | null>(KEYS.PROFESSOR_SESSION, null)
  if (!s?.loggedIn) return null
  if (new Date(s.expiresAt) < new Date()) {
    clearProfessorSession()
    return null
  }
  return s
}

export function saveProfessorSession(professorId: string, role: "master" | "professor"): void {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  write<ProfessorSession>(KEYS.PROFESSOR_SESSION, { loggedIn: true, professorId, role, expiresAt })
}

export function clearProfessorSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEYS.PROFESSOR_SESSION)
}

// ─── Professor Accounts ───────────────────────────────────────────────────────

export function getProfessorAccounts(): ProfessorAccount[] {
  return read<ProfessorAccount[]>(KEYS.PROFESSOR_ACCOUNTS, [])
}

export function saveProfessorAccounts(accounts: ProfessorAccount[]): void {
  write(KEYS.PROFESSOR_ACCOUNTS, accounts)
}

export function addProfessorAccount(data: Omit<ProfessorAccount, "id" | "createdAt" | "passwordHash"> & { password: string }): ProfessorAccount {
  const account: ProfessorAccount = {
    id: uid(),
    name: data.name,
    email: data.email.toLowerCase().trim(),
    passwordHash: hashPassword(data.password),
    role: data.role,
    createdAt: new Date().toISOString(),
  }
  saveProfessorAccounts([...getProfessorAccounts(), account])
  return account
}

export function updateProfessorAccount(id: string, data: Partial<Pick<ProfessorAccount, "name" | "email" | "role">> & { password?: string }): void {
  saveProfessorAccounts(getProfessorAccounts().map((a) => {
    if (a.id !== id) return a
    const updated: ProfessorAccount = { ...a, ...data }
    if (data.password) updated.passwordHash = hashPassword(data.password)
    if (data.email) updated.email = data.email.toLowerCase().trim()
    return updated
  }))
}

export function deleteProfessorAccount(id: string): void {
  saveProfessorAccounts(getProfessorAccounts().filter((a) => a.id !== id))
}

export function authenticateProfessor(email: string, password: string): ProfessorAccount | "master" | null {
  // Check master credentials first
  if (
    email.trim().toLowerCase() === MASTER_CREDENTIALS.email &&
    password === MASTER_CREDENTIALS.password
  ) {
    return "master"
  }
  // Check stored accounts
  const account = getProfessorAccounts().find(
    (a) => a.email === email.trim().toLowerCase()
  )
  if (account && checkPassword(password, account.passwordHash)) return account
  return null
}

// ─── Student Session ──────────────────────────────────────────────────────────

export function getStudentSession(): StudentSession | null {
  return read<StudentSession | null>(KEYS.STUDENT_SESSION, null)
}

export function saveStudentSession(s: StudentSession): void {
  write(KEYS.STUDENT_SESSION, s)
}

export function clearStudentSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.STUDENT_SESSION)
    localStorage.removeItem(KEYS.DRAFT_ANSWERS)
  }
}

// ─── Draft Answers ────────────────────────────────────────────────────────────

export function getDraftAnswers(): StudentAnswer[] {
  return read<StudentAnswer[]>(KEYS.DRAFT_ANSWERS, [])
}

export function saveDraftAnswers(answers: StudentAnswer[]): void {
  write(KEYS.DRAFT_ANSWERS, answers)
}

// ─── Disciplines ──────────────────────────────────────────────────────────────

export function getDisciplines(): Discipline[] {
  const stored = read<Discipline[] | null>(KEYS.DISCIPLINES, null)
  if (stored !== null) {
    return stored.sort((a, b) => a.name.localeCompare(b.name))
  }
  const defaults = defaultDisciplines()
  write(KEYS.DISCIPLINES, defaults)
  return defaults.sort((a, b) => a.name.localeCompare(b.name))
}

export function saveDisciplines(d: Discipline[]): void {
  write(KEYS.DISCIPLINES, d)
}

export function addDiscipline(name: string, description?: string): Discipline {
  const d: Discipline = { id: uid(), name, description, createdAt: new Date().toISOString() }
  saveDisciplines([...getDisciplines(), d])
  return d
}

export function updateDiscipline(id: string, data: Partial<Pick<Discipline, "name" | "description">>): void {
  saveDisciplines(getDisciplines().map((d) => (d.id === id ? { ...d, ...data } : d)))
}

export function deleteDiscipline(id: string): void {
  saveDisciplines(getDisciplines().filter((d) => d.id !== id))
  saveQuestions(getQuestions().filter((q) => q.disciplineId !== id))
}

// ─── Questions ────────────────────────────────────────────────────────────────

export function getQuestions(): Question[] {
  const stored = read<Question[] | null>(KEYS.QUESTIONS, null)
  if (stored !== null) return stored
  const defaults = defaultQuestions()
  write(KEYS.QUESTIONS, defaults)
  return defaults
}

export function saveQuestions(q: Question[]): void {
  write(KEYS.QUESTIONS, q)
}

export function getQuestionsByDiscipline(disciplineId: string): Question[] {
  return getQuestions().filter((q) => q.disciplineId === disciplineId)
}

export function addQuestion(data: Omit<Question, "id" | "createdAt">): Question {
  const q: Question = { ...data, id: uid(), createdAt: new Date().toISOString() }
  saveQuestions([...getQuestions(), q])
  return q
}

export function updateQuestion(id: string, data: Partial<Omit<Question, "id" | "createdAt">>): void {
  saveQuestions(getQuestions().map((q) => (q.id === id ? { ...q, ...data } : q)))
}

export function deleteQuestion(id: string): void {
  saveQuestions(getQuestions().filter((q) => q.id !== id))
}

// ─── Assessments ─────────────────────────────────────────────────────────��────

export function getAssessments(): Assessment[] {
  return read<Assessment[]>(KEYS.ASSESSMENTS, [])
}

export function saveAssessments(a: Assessment[]): void {
  write(KEYS.ASSESSMENTS, a)
}

export function getAssessmentById(id: string): Assessment | null {
  return getAssessments().find((a) => a.id === id) ?? null
}

export function getActiveAssessment(): Assessment | null {
  const now = new Date()
  return (
    getAssessments().find((a) => {
      if (!a.isPublished) return false
      if (a.openAt && new Date(a.openAt) > now) return false
      if (a.closeAt && new Date(a.closeAt) < now) return false
      return true
    }) ?? null
  )
}

export function addAssessment(data: Omit<Assessment, "id" | "createdAt">): Assessment {
  const a: Assessment = { ...data, id: uid(), createdAt: new Date().toISOString() }
  saveAssessments([...getAssessments(), a])
  return a
}

export function updateAssessment(id: string, data: Partial<Omit<Assessment, "id" | "createdAt">>): void {
  saveAssessments(getAssessments().map((a) => (a.id === id ? { ...a, ...data } : a)))
}

export function deleteAssessment(id: string): void {
  saveAssessments(getAssessments().filter((a) => a.id !== id))
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export function getSubmissions(): StudentSubmission[] {
  return read<StudentSubmission[]>(KEYS.SUBMISSIONS, [])
}

export function getSubmissionsByAssessment(assessmentId: string): StudentSubmission[] {
  return getSubmissions().filter((s) => s.assessmentId === assessmentId)
}

export function saveSubmission(sub: StudentSubmission): void {
  const rest = getSubmissions().filter(
    (s) => !(s.assessmentId === sub.assessmentId && s.studentEmail === sub.studentEmail)
  )
  write(KEYS.SUBMISSIONS, [...rest, sub])
}

export function deleteSubmission(id: string): void {
  write(KEYS.SUBMISSIONS, getSubmissions().filter((s) => s.id !== id))
}

export function hasStudentSubmitted(email: string, assessmentId: string): boolean {
  return getSubmissions().some((s) => s.studentEmail === email && s.assessmentId === assessmentId)
}

export function getSubmissionByEmailAndAssessment(
  email: string,
  assessmentId: string
): StudentSubmission | null {
  return (
    getSubmissions().find(
      (s) => s.studentEmail === email && s.assessmentId === assessmentId
    ) ?? null
  )
}

// ─── Score Calculator ─────────────────────────────────────────────────────────

export function calculateScore(
  answers: StudentAnswer[],
  questions: Question[],
  pointsPerQuestion: number
): { score: number; totalPoints: number; percentage: number } {
  const gradable = questions.filter((q) => q.type !== "discursive")
  const totalPoints = questions.length * pointsPerQuestion
  let score = 0
  for (const q of gradable) {
    const ans = answers.find((a) => a.questionId === q.id)
    if (ans && ans.answer === q.correctAnswer) score += pointsPerQuestion
  }
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
  return { score, totalPoints, percentage }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

function defaultDisciplines(): Discipline[] {
  const now = "2024-01-01T00:00:00.000Z"
  return [
    { id: "disc-1", name: "Cristologia", createdAt: now },
    { id: "disc-2", name: "Epístolas Paulinas", createdAt: now },
    { id: "disc-3", name: "Escatologia", createdAt: now },
    { id: "disc-4", name: "Escola Dominical", createdAt: now },
    { id: "disc-5", name: "Evangelhos e Atos", createdAt: now },
    { id: "disc-6", name: "Evangelismo", createdAt: now },
    { id: "disc-7", name: "Evidência Cristã", createdAt: now },
    { id: "disc-8", name: "Fundamentos da Psicologia e do Aconselhamento", createdAt: now },
    { id: "disc-9", name: "Geografia Bíblica", createdAt: now },
    { id: "disc-10", name: "Hebreus e Epístolas Gerais", createdAt: now },
    { id: "disc-11", name: "Hermenêutica", createdAt: now },
    { id: "disc-12", name: "História da Igreja", createdAt: now },
    { id: "disc-13", name: "Homilética", createdAt: now },
    { id: "disc-14", name: "Introdução ao Novo Testamento", createdAt: now },
    { id: "disc-15", name: "Introdução Bíblica", createdAt: now },
    { id: "disc-16", name: "Livros Históricos", createdAt: now },
    { id: "disc-17", name: "Livros Poéticos", createdAt: now },
    { id: "disc-18", name: "Maneiras e Costumes Bíblicos", createdAt: now },
    { id: "disc-19", name: "Missiologia", createdAt: now },
    { id: "disc-20", name: "Pentateuco", createdAt: now },
    { id: "disc-21", name: "Profetas Maiores e Menores", createdAt: now },
    { id: "disc-22", name: "Religiões Comparadas", createdAt: now },
    { id: "disc-23", name: "Teologia Pastoral", createdAt: now },
    { id: "disc-24", name: "Teologia Sistemática", createdAt: now },
  ]
}

function defaultQuestions(): Question[] {
  return [
    {
      id: "q1",
      disciplineId: "disc-1",
      type: "multiple-choice",
      text: "Qual livro do Antigo Testamento é considerado o mais longo poema hebraico de louvor?",
      choices: [
        { id: "q1a", text: "Provérbios" },
        { id: "q1b", text: "Jó" },
        { id: "q1c", text: "Salmos" },
        { id: "q1d", text: "Eclesiastes" },
      ],
      correctAnswer: "q1c",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q2",
      disciplineId: "disc-1",
      type: "multiple-choice",
      text: "O livro de Jó pertence ao gênero literário conhecido como:",
      choices: [
        { id: "q2a", text: "Profecia" },
        { id: "q2b", text: "Literatura Sapiencial" },
        { id: "q2c", text: "Narrativa Histórica" },
        { id: "q2d", text: "Epístola" },
      ],
      correctAnswer: "q2b",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q3",
      disciplineId: "disc-1",
      type: "true-false",
      text: "O paralelismo é uma das principais características da poesia hebraica, onde ideias são expressas em pares de versos que se completam ou se contrastam.",
      choices: [],
      correctAnswer: "true",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q4",
      disciplineId: "disc-1",
      type: "multiple-choice",
      text: "Qual é a principal mensagem teológica do livro de Eclesiastes?",
      choices: [
        { id: "q4a", text: "A prosperidade é sempre sinal de bênção divina" },
        { id: "q4b", text: "A vida sem Deus é vaidade e não tem sentido duradouro" },
        { id: "q4c", text: "O sofrimento é punição pelos pecados" },
        { id: "q4d", text: "A sabedoria humana é suficiente para encontrar a felicidade" },
      ],
      correctAnswer: "q4b",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q5",
      disciplineId: "disc-1",
      type: "true-false",
      text: "O Cântico dos Cânticos é um livro que trata exclusivamente de amor romântico, sem nenhuma dimensão teológica ou alegórica.",
      choices: [],
      correctAnswer: "false",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q6",
      disciplineId: "disc-1",
      type: "multiple-choice",
      text: "Qual personagem bíblico é tradicionalmente associado à autoria do livro de Provérbios?",
      choices: [
        { id: "q6a", text: "Davi" },
        { id: "q6b", text: "Moisés" },
        { id: "q6c", text: "Salomão" },
        { id: "q6d", text: "Isaías" },
      ],
      correctAnswer: "q6c",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q7",
      disciplineId: "disc-1",
      type: "true-false",
      text: "O Salmo 119 é o mais longo capítulo da Bíblia e está estruturado como um acróstico do alfabeto hebraico.",
      choices: [],
      correctAnswer: "true",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q8",
      disciplineId: "disc-1",
      type: "discursive",
      text: "Explique o conceito de 'temor do Senhor' nos livros de sabedoria e sua importância para a vida cristã.",
      choices: [],
      correctAnswer: "",
      points: 2,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q9",
      disciplineId: "disc-2",
      type: "multiple-choice",
      text: "Qual apóstolo escreveu a maior parte das epístolas do Novo Testamento?",
      choices: [
        { id: "q9a", text: "Pedro" },
        { id: "q9b", text: "João" },
        { id: "q9c", text: "Paulo" },
        { id: "q9d", text: "Tiago" },
      ],
      correctAnswer: "q9c",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q10",
      disciplineId: "disc-2",
      type: "true-false",
      text: "O livro de Apocalipse foi escrito pelo apóstolo João enquanto estava exilado na ilha de Patmos.",
      choices: [],
      correctAnswer: "true",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q11",
      disciplineId: "disc-2",
      type: "multiple-choice",
      text: "Qual é o tema central do Evangelho de João em comparação com os Evangelhos Sinóticos?",
      choices: [
        { id: "q11a", text: "O nascimento de Jesus" },
        { id: "q11b", text: "A divindade de Jesus Cristo" },
        { id: "q11c", text: "As parábolas do reino" },
        { id: "q11d", text: "O batismo de Jesus" },
      ],
      correctAnswer: "q11b",
      points: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "q12",
      disciplineId: "disc-2",
      type: "discursive",
      text: "Descreva a importância teológica da Ressurreição de Cristo para a fé cristã, baseando-se em pelo menos um texto do Novo Testamento.",
      choices: [],
      correctAnswer: "",
      points: 2,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  ]
}
