import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────────────────────
export type QuestionType = "multiple-choice" | "true-false" | "discursive"
export interface Choice { id: string; text: string }
export interface Discipline { id: string; name: string; description?: string; createdAt: string }
export interface Question { id: string; disciplineId: string; type: QuestionType; text: string; choices: Choice[]; correctAnswer: string; points: number; createdAt: string }
export interface Assessment { id: string; title: string; disciplineId: string; professor: string; institution: string; questionIds: string[]; pointsPerQuestion: number; totalPoints: number; openAt: string | null; closeAt: string | null; isPublished: boolean; shuffleVariants?: boolean; logoBase64?: string; rules?: string; releaseResults?: boolean; createdAt: string }
export interface StudentAnswer { questionId: string; answer: string }
export interface StudentSubmission { id: string; assessmentId: string; studentName: string; studentEmail: string; answers: StudentAnswer[]; score: number; totalPoints: number; percentage: number; submittedAt: string; timeElapsedSeconds: number }
export interface ProfessorAccount { id: string; name: string; email: string; passwordHash: string; role: "master" | "professor"; createdAt: string }
export interface ProfessorSession { loggedIn: boolean; professorId: string; role: "master" | "professor"; expiresAt: string }
export interface StudentSession { name: string; email: string; assessmentId: string; startedAt: string }

export function hashPassword(plain: string): string {
  if (typeof window !== "undefined") return btoa(unescape(encodeURIComponent(plain)))
  return Buffer.from(plain).toString("base64")
}
export function checkPassword(plain: string, hash: string): boolean { return hashPassword(plain) === hash }

const KEYS = {
  PROFESSOR_SESSION: "ibad_professor_session",
  STUDENT_SESSION: "ibad_current_session",
  DRAFT_ANSWERS: "ibad_draft_answers",
} as const

export const MASTER_CREDENTIALS = {
  email: "professor@ieteo.com",
  password: "ieteo2026",
  name: "Pb. Fábio Barreto",
  role: "master" as const,
}
export const PROFESSOR_CREDENTIALS = MASTER_CREDENTIALS

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}
function writeLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ─── Auth / Session (Local Storage) ──────────────────────────────────────────

export function getProfessorSession(): ProfessorSession | null {
  const s = readLocal<ProfessorSession | null>(KEYS.PROFESSOR_SESSION, null)
  if (!s?.loggedIn) return null
  if (new Date(s.expiresAt) < new Date()) { clearProfessorSession(); return null }
  return s
}
export function saveProfessorSession(professorId: string, role: "master" | "professor"): void {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  writeLocal<ProfessorSession>(KEYS.PROFESSOR_SESSION, { loggedIn: true, professorId, role, expiresAt })
}
export function clearProfessorSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEYS.PROFESSOR_SESSION)
}

export function getStudentSession(): StudentSession | null { return readLocal<StudentSession | null>(KEYS.STUDENT_SESSION, null) }
export function saveStudentSession(s: StudentSession): void { writeLocal(KEYS.STUDENT_SESSION, s) }
export function clearStudentSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.STUDENT_SESSION)
    localStorage.removeItem(KEYS.DRAFT_ANSWERS)
  }
}

export function getDraftAnswers(): StudentAnswer[] { return readLocal<StudentAnswer[]>(KEYS.DRAFT_ANSWERS, []) }
export function saveDraftAnswers(answers: StudentAnswer[]): void { writeLocal(KEYS.DRAFT_ANSWERS, answers) }

// DB Mappers
function mapDiscipline(row: any): Discipline { return { id: row.id, name: row.name, description: row.description || undefined, createdAt: row.created_at } }
function mapQuestion(row: any): Question { return { id: row.id, disciplineId: row.discipline_id, type: row.type, text: row.text, choices: row.choices, correctAnswer: row.correct_answer, points: row.points, createdAt: row.created_at } }
function mapAssessment(row: any): Assessment { return { id: row.id, title: row.title, disciplineId: row.discipline_id, professor: row.professor, institution: row.institution, questionIds: row.question_ids, pointsPerQuestion: row.points_per_question, totalPoints: row.total_points, openAt: row.open_at, closeAt: row.close_at, isPublished: row.is_published, shuffleVariants: row.shuffle_variants, logoBase64: row.logo_base64, rules: row.rules, releaseResults: row.release_results, createdAt: row.created_at } }
function mapSubmission(row: any): StudentSubmission { return { id: row.id, assessmentId: row.assessment_id, studentName: row.student_name, studentEmail: row.student_email, answers: row.answers, score: row.score, totalPoints: row.total_points, percentage: row.percentage, submittedAt: row.submitted_at, timeElapsedSeconds: row.time_elapsed_seconds } }
function mapProfessor(row: any): ProfessorAccount { return { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash, role: row.role as any, createdAt: row.created_at } }

// ─── Async Supabase Operations ───────────────────────────────────────────────

export async function getDisciplines(): Promise<Discipline[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('disciplines').select('*')
  return (data || []).map(mapDiscipline).sort((a, b) => a.name.localeCompare(b.name))
}
export async function addDiscipline(name: string, description?: string): Promise<Discipline> {
  const d = { id: uid(), name, description: description || null, created_at: new Date().toISOString() }
  const supabase = createClient()
  await supabase.from('disciplines').insert(d)
  return mapDiscipline(d)
}
export async function updateDiscipline(id: string, data: Partial<Pick<Discipline, "name" | "description">>): Promise<void> {
  const supabase = createClient()
  await supabase.from('disciplines').update(data).eq('id', id)
}
export async function deleteDiscipline(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('disciplines').delete().eq('id', id)
}

export async function getQuestions(): Promise<Question[]> {
  const supabase = createClient()
  const { data } = await supabase.from('questions').select('*')
  return (data || []).map(mapQuestion)
}
export async function getQuestionsByDiscipline(disciplineId: string): Promise<Question[]> {
  const supabase = createClient()
  const { data } = await supabase.from('questions').select('*').eq('discipline_id', disciplineId)
  return (data || []).map(mapQuestion)
}
export async function addQuestion(data: Omit<Question, "id" | "createdAt">): Promise<Question> {
  const q = { id: uid(), discipline_id: data.disciplineId, type: data.type, text: data.text, choices: data.choices, correct_answer: data.correctAnswer, points: data.points, created_at: new Date().toISOString() }
  const supabase = createClient()
  await supabase.from('questions').insert(q)
  return mapQuestion(q)
}
export async function updateQuestion(id: string, data: Partial<Omit<Question, "id" | "createdAt">>): Promise<void> {
  const updateData: any = {}
  if (data.disciplineId !== undefined) updateData.discipline_id = data.disciplineId
  if (data.type !== undefined) updateData.type = data.type
  if (data.text !== undefined) updateData.text = data.text
  if (data.choices !== undefined) updateData.choices = data.choices
  if (data.correctAnswer !== undefined) updateData.correct_answer = data.correctAnswer
  if (data.points !== undefined) updateData.points = data.points
  const supabase = createClient()
  await supabase.from('questions').update(updateData).eq('id', id)
}
export async function deleteQuestion(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('questions').delete().eq('id', id)
}

export async function getAssessments(): Promise<Assessment[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('assessments').select('*').order('created_at', { ascending: false })
  return (data || []).map(mapAssessment)
}
export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('assessments').select('*').eq('id', id).single()
  return data ? mapAssessment(data) : null
}
export async function getActiveAssessment(): Promise<Assessment | null> {
  const now = new Date()
  const assessments = await getAssessments()
  return assessments.find((a) => {
    if (!a.isPublished) return false
    if (a.openAt && new Date(a.openAt) > now) return false
    if (a.closeAt && new Date(a.closeAt) < now) return false
    return true
  }) ?? null
}
export async function addAssessment(data: Omit<Assessment, "id" | "createdAt" | "releaseResults">): Promise<Assessment> {
  const a = { ...data, id: uid(), createdAt: new Date().toISOString(), releaseResults: false }
  const dbData = { id: a.id, title: a.title, discipline_id: a.disciplineId, professor: a.professor, institution: a.institution, question_ids: a.questionIds, points_per_question: a.pointsPerQuestion, total_points: a.totalPoints, open_at: a.openAt, close_at: a.closeAt, is_published: a.isPublished, shuffle_variants: a.shuffleVariants, logo_base64: a.logoBase64, rules: a.rules, release_results: a.releaseResults, created_at: a.createdAt }
  const supabase = createClient()
  await supabase.from('assessments').insert(dbData)
  return a
}
export async function updateAssessment(id: string, data: Partial<Omit<Assessment, "id" | "createdAt">>): Promise<void> {
  const dbData: any = {}
  if (data.title !== undefined) dbData.title = data.title
  if (data.disciplineId !== undefined) dbData.discipline_id = data.disciplineId
  if (data.professor !== undefined) dbData.professor = data.professor
  if (data.institution !== undefined) dbData.institution = data.institution
  if (data.questionIds !== undefined) dbData.question_ids = data.questionIds
  if (data.pointsPerQuestion !== undefined) dbData.points_per_question = data.pointsPerQuestion
  if (data.totalPoints !== undefined) dbData.total_points = data.totalPoints
  if (data.openAt !== undefined) dbData.open_at = data.openAt
  if (data.closeAt !== undefined) dbData.close_at = data.closeAt
  if (data.isPublished !== undefined) dbData.is_published = data.isPublished
  if (data.shuffleVariants !== undefined) dbData.shuffle_variants = data.shuffleVariants
  if (data.logoBase64 !== undefined) dbData.logo_base64 = data.logoBase64
  if (data.rules !== undefined) dbData.rules = data.rules
  if (data.releaseResults !== undefined) dbData.release_results = data.releaseResults

  const supabase = createClient()
  await supabase.from('assessments').update(dbData).eq('id', id)
}
export async function deleteAssessment(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('assessments').delete().eq('id', id)
}

export async function getSubmissions(): Promise<StudentSubmission[]> {
  const supabase = createClient()
  const { data } = await supabase.from('student_submissions').select('*')
  return (data || []).map(mapSubmission)
}
export async function getSubmissionsByAssessment(assessmentId: string): Promise<StudentSubmission[]> {
  const supabase = createClient()
  const { data } = await supabase.from('student_submissions').select('*').eq('assessment_id', assessmentId)
  return (data || []).map(mapSubmission)
}
export async function saveSubmission(sub: StudentSubmission): Promise<void> {
  const record = { id: sub.id, assessment_id: sub.assessmentId, student_name: sub.studentName, student_email: sub.studentEmail, answers: sub.answers, score: sub.score, total_points: sub.totalPoints, percentage: sub.percentage, submitted_at: sub.submittedAt, time_elapsed_seconds: sub.timeElapsedSeconds }
  const supabase = createClient()
  await supabase.from('student_submissions').delete().match({ assessment_id: sub.assessmentId, student_email: sub.studentEmail })
  await supabase.from('student_submissions').insert(record)
}
export async function deleteSubmission(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('student_submissions').delete().eq('id', id)
}
export async function hasStudentSubmitted(email: string, assessmentId: string): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase.from('student_submissions').select('*', { count: 'exact', head: true }).match({ assessment_id: assessmentId, student_email: email })
  return (count || 0) > 0
}
export async function getSubmissionByEmailAndAssessment(email: string, assessmentId: string): Promise<StudentSubmission | null> {
  const supabase = createClient()
  const { data } = await supabase.from('student_submissions').select('*').match({ assessment_id: assessmentId, student_email: email }).maybeSingle()
  return data ? mapSubmission(data) : null
}

export async function getProfessorAccounts(): Promise<ProfessorAccount[]> {
  const supabase = createClient()
  const { data } = await supabase.from('professor_accounts').select('*')
  return (data || []).map(mapProfessor)
}
export async function addProfessorAccount(data: Omit<ProfessorAccount, "id" | "createdAt" | "passwordHash"> & { password: string }): Promise<ProfessorAccount> {
  const account = { id: uid(), name: data.name, email: data.email.toLowerCase().trim(), password_hash: hashPassword(data.password), role: data.role, created_at: new Date().toISOString() }
  const supabase = createClient()
  await supabase.from('professor_accounts').insert(account)
  return mapProfessor(account)
}
export async function updateProfessorAccount(id: string, data: Partial<Pick<ProfessorAccount, "name" | "email" | "role">> & { password?: string }): Promise<void> {
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim()
  if (data.role !== undefined) updateData.role = data.role
  if (data.password !== undefined) updateData.password_hash = hashPassword(data.password)
  const supabase = createClient()
  await supabase.from('professor_accounts').update(updateData).eq('id', id)
}
export async function deleteProfessorAccount(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('professor_accounts').delete().eq('id', id)
}

export async function authenticateProfessor(email: string, password: string): Promise<ProfessorAccount | "master" | null> {
  if (email.trim().toLowerCase() === MASTER_CREDENTIALS.email && password === MASTER_CREDENTIALS.password) {
    return "master"
  }
  const supabase = createClient()
  const { data } = await supabase.from('professor_accounts').select('*').eq('email', email.trim().toLowerCase()).maybeSingle()
  if (data) {
    const acc = mapProfessor(data)
    if (checkPassword(password, acc.passwordHash)) return acc
  }
  return null
}

export function calculateScore(answers: StudentAnswer[], questions: Question[], pointsPerQuestion: number) {
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
