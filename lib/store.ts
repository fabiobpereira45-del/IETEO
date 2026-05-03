import { createClient } from "@/lib/supabase/client"
// CACHE-BUSTER: v1.2.2-cloud - 2026-03-13 19:26
import { triggerN8nWebhook } from "@/lib/n8n"
export { triggerN8nWebhook }

// ─── Types ────────────────────────────────────────────────────────────────────
export type QuestionType = "multiple-choice" | "true-false" | "discursive" | "incorrect-alternative" | "fill-in-the-blank" | "matching"
export interface Choice { id: string; text: string }
export interface MatchingPair { id: string; left: string; right: string }
export interface Semester { id: string; name: string; order: number; shift?: string; isConcluded?: boolean; createdAt: string }
export interface Discipline { id: string; name: string; description?: string | null; semesterId?: string | null; semesterOrder?: number; semesterName?: string; professorName?: string | null; dayOfWeek?: string | null; shift?: string | null; order: number; applicationMonth?: string | null; applicationYear?: string | null; isConcluded?: boolean; createdAt: string }
export interface StudyMaterial { id: string; disciplineId: string; title: string; description?: string; fileUrl: string; createdAt: string }
export interface FinancialSettings { id: string; enrollmentFee: number; monthlyFee: number; secondCallFee: number; finalExamFee: number; totalMonths: number; proLaboreFeePerLesson: number; creditCardUrl?: string; pixKey?: string; updatedAt: string; }
export interface FinancialCharge {
  id: string;
  studentId?: string;
  type: "enrollment" | "monthly" | "second_call" | "final_exam" | "other" | "expense";
  description: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "cancelled" | "late" | "bolsa100" | "bolsa50" | "isento";
  paymentDate?: string;
  paymentMethod?: "cartao" | "pix" | "dinheiro" | "other";
  actualPaidAmount?: number;
  disciplineId?: string;
  professorId?: string;
  classId?: string;
  pixQrcode?: string;
  pixCopyPaste?: string;
  createdAt: string;
}
export interface Expense { id: string; description: string; amount: number; category: string; dueDate: string; status: "pending" | "paid" | "cancelled"; paidAt?: string; createdAt: string; }
export interface Question { id: string; disciplineId: string; type: QuestionType; text: string; choices: Choice[]; pairs?: MatchingPair[]; correctAnswer: string; points: number; createdAt: string }
export interface Assessment { id: string; title: string; disciplineId: string; professor: string; institution: string; questionIds: string[]; pointsPerQuestion: number; totalPoints: number; openAt: string | null; closeAt: string | null; isPublished: boolean; archived: boolean; shuffleVariants?: boolean; timeLimitMinutes?: number | null; logoBase64?: string; rules?: string; releaseResults?: boolean; modality?: "public" | "private"; createdAt: string }
export interface StudentAnswer { questionId: string; answer: string }
export interface StudentSubmission { id: string; assessmentId: string; studentId: string; studentName: string; studentEmail: string; answers: StudentAnswer[]; score: number; totalPoints: number; percentage: number; submittedAt: string; timeElapsedSeconds: number; focusLostCount?: number }
export interface ProfessorAccount { id: string; name: string; email: string; passwordHash: string; role: "master" | "professor"; avatar_url?: string | null; bio?: string | null; createdAt: string; active?: boolean }
export interface ProfessorSession { loggedIn: boolean; professorId: string; role: "master" | "professor"; avatar_url?: string | null; expiresAt: string }
export interface StudentSession { studentId: string; name: string; email: string; assessmentId: string; startedAt: string }
export interface StudentProfile { id: string; auth_user_id: string; name: string; email: string; cpf: string; enrollment_number: string; phone?: string; address?: string; church?: string; pastor_name?: string; class_id?: string; payment_status?: string; avatar_url?: string | null; bio?: string | null; status: "pending" | "active" | "inactive"; created_at: string; }
export interface ChatMessage { id: string; studentId: string; disciplineId: string; message: string; isFromStudent: boolean; read: boolean; createdAt: string; }
export interface Attendance { id: string; studentId: string; disciplineId: string; date: string; isPresent: boolean; createdAt: string; }
export interface AttendanceLock {
  id: string
  disciplineId: string
  date: string
  lockedBy: string
  lockedAt: string
}
export interface BoardMember { id: string; name: string; role: string; category: string; avatar_url?: string | null; createdAt: string; }
export interface ProfessorDiscipline { id: string; professorId: string; disciplineId: string; createdAt: string; }
export interface ClassRoom { id: string; name: string; shift: "morning" | "afternoon" | "evening" | "ead"; dayOfWeek?: string; maxStudents: number; studentCount?: number; createdAt: string; }
export interface ClassSchedule { id: string; classId: string; disciplineId: string; professorName: string; dayOfWeek: string; timeStart: string; timeEnd: string; lessonsCount: number; workload: number; startDate?: string; endDate?: string; createdAt: string; }
export interface StudentGrade {
  id: string;
  studentId?: string;       // Unique ID for security isolation
  student_id?: string;      // Compatibility with DB field name
  studentIdentifier: string; // Legacy CPF or Email
  studentName: string;
  disciplineId?: string;
  isPublic: boolean;
  examGrade: number;
  worksGrade: number;
  seminarGrade: number;
  participationBonus: number;
  attendanceScore: number;
  customDivisor: number;
  createdAt: string;
}

export interface GradeSettings {
  examWeight: number;
  testWeight: number;
  workWeight: number;
  bonusWeight: number;
  presenceValue: number;
  divisor: number;
  updatedAt: string;
}

export type ChallengeType = "riddle" | "quiz" | "reflection" | "decoding"

export interface Challenge {
  id: string
  disciplineId: string
  week: number
  title: string
  description: string
  type: ChallengeType
  content: any
  correctAnswer?: string
  points: number
  isActive: boolean
  createdAt: string
}

export interface ChallengeSubmission {
  id: string
  challengeId: string
  studentId: string
  answer: string
  isCorrect: boolean
  earnedPoints: number
  submittedAt: string
}

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
  email: "professor@ibad.com",
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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn("localStorage is not available:", err)
  }
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
export function saveProfessorSession(professorId: string, role: "master" | "professor", avatar_url?: string | null): void {
  try {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    writeLocal<ProfessorSession>(KEYS.PROFESSOR_SESSION, { loggedIn: true, professorId, role, avatar_url, expiresAt })
  } catch (err) {
    console.error("Erro ao salvar sessão do professor:", err)
  }
}
export function clearProfessorSession(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(KEYS.PROFESSOR_SESSION)
    } catch (err) {
      console.warn("Erro ao remover sessão do professor:", err)
    }
  }
}

export async function registerStudentAuth(name: string, cpf: string, password: string) {
  const supabase = createClient()
  const cleanCpf = cpf.replace(/\D/g, '')
  const email = `${cleanCpf}@student.ieteo.com`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, type: 'student' } }
  })
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error("Erro ao criar usuário na base de dados.")

  const matricula = `2026${Math.floor(1000 + Math.random() * 9000)}`

  const { error: dbError } = await supabase.from('students').insert({
    auth_user_id: authData.user.id,
    name,
    cpf: cleanCpf,
    email,
    enrollment_number: matricula
  })

  if (dbError) throw new Error(dbError.message)
  return { matricula, name }
}

export async function registerStudentByAdmin(data: any): Promise<void> {
  const supabase = createClient()

  // Vacancy check
  if (data.classId) {
    const { data: cls } = await supabase.from('classes').select('max_students').eq('id', data.classId).single()
    if (cls) {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', data.classId)
      if (count !== null && count >= cls.max_students) {
        throw new Error("Esta turma já está com as vagas esgotadas.")
      }
    }
  }

  const cleanCpf = data.cpf ? data.cpf.replace(/\D/g, '') : ""

  // Use email if provided, else generate fake one
  const email = data.email || `${cleanCpf || uid().slice(0, 11)}@student.ieteo.com`

  const nameUC = (data.name || "").toUpperCase().trim()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: { data: { name: nameUC, type: 'student' } }
  })
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error("Erro ao criar usuário na base de dados (Auth).")

  const matricula = `2026${Math.floor(1000 + Math.random() * 9000)}`

  const { error: dbError } = await supabase.from('students').insert({
    auth_user_id: authData.user.id,
    name: nameUC,
    cpf: cleanCpf,
    email,
    enrollment_number: matricula,
    phone: data.phone || null,
    address: data.address || null,
    church: data.church || null,
    pastor_name: data.pastor || null,
    class_id: data.classId || null
  })
  if (dbError) throw new Error(dbError.message)

  // Trigger n8n WhatsApp
  try {
    const student = { name: data.name, phone: data.phone };
    triggerN8nWebhook('matricula_confirmada', {
      type: 'enrollment',
      name: student.name,
      phone: student.phone,
      matricula
    });
  } catch (err) {
    console.error("Erro ao disparar WhatsApp n8n de boas-vindas:", err);
  }
}

export async function loginStudentAuth(identifier: string, password: string) {
  const supabase = createClient()
  let email = ''

  // Se for um e-mail, usa diretamente
  if (identifier.includes('@')) {
    email = identifier.trim().toLowerCase()
  } else {
    const cleanId = identifier.replace(/\D/g, '')
    if (cleanId.length === 11) {
      const { data: studentData } = await supabase.from('students').select('email').eq('cpf', cleanId).maybeSingle()
      email = studentData?.email || `${cleanId}@student.ieteo.com`
    } else {
      const { data } = await supabase.from('students').select('email').eq('enrollment_number', cleanId).maybeSingle()
      if (!data) throw new Error("Identificador não encontrado (CPF, Matrícula ou E-mail).")
      email = data.email
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error("Credenciais inválidas.")

  // Auto-healing: se logou mas o vínculo no DB está quebrado, conserta agora
  if (data.user) {
    const { data: profile } = await supabase.from('students').select('id, auth_user_id').eq('email', email).maybeSingle()
    if (profile && !profile.auth_user_id) {
      await supabase.from('students').update({ auth_user_id: data.user.id }).eq('id', profile.id)
    }
  }

  return data
}

export async function getStudentProfileAuth(): Promise<StudentProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.type !== 'student') return null

  const { data } = await supabase.from('students').select('*').eq('auth_user_id', user.id).maybeSingle()
  if (!data) return null
  return {
    ...data,
    avatar_url: data.avatar_url
  } as StudentProfile
}

export async function logoutStudentAuth() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export function getStudentSession(): StudentSession | null { return readLocal<StudentSession | null>(KEYS.STUDENT_SESSION, null) }
export function saveStudentSession(s: StudentSession): void { writeLocal(KEYS.STUDENT_SESSION, s) }
export function clearStudentSession(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(KEYS.STUDENT_SESSION)
      localStorage.removeItem(KEYS.DRAFT_ANSWERS)
    } catch (err) {
      console.warn("Erro ao limpar sessão do estudante:", err)
    }
  }
}

export function getDraftAnswers(): StudentAnswer[] { return readLocal<StudentAnswer[]>(KEYS.DRAFT_ANSWERS, []) }
export function saveDraftAnswers(answers: StudentAnswer[]): void { writeLocal(KEYS.DRAFT_ANSWERS, answers) }

// DB Mappers
// DB Mappers
function mapSemester(row: any): Semester { return { id: row.id, name: row.name, order: row.order, shift: row.shift || undefined, isConcluded: !!row.is_concluded, createdAt: row.created_at } }
function mapStudyMaterial(row: any): StudyMaterial { return { id: row.id, disciplineId: row.discipline_id, title: row.title, description: row.description || undefined, fileUrl: row.file_url, createdAt: row.created_at } }
function mapDiscipline(row: any): Discipline { return { id: row.id, name: row.name, description: row.description || undefined, semesterId: row.semester_id || undefined, professorName: row.professor_name || undefined, dayOfWeek: row.day_of_week || undefined, shift: row.shift || undefined, order: Number(row.order || 0), applicationMonth: row.application_month, applicationYear: row.application_year, isConcluded: !!row.is_concluded, createdAt: row.created_at } }
function mapQuestion(row: any): Question {
  const choices = Array.isArray(row.choices) ? row.choices : (row.choices?.options || [])
  const pairs = row.pairs || row.choices?.matchingPairs || undefined
  return { id: row.id, disciplineId: row.discipline_id, type: row.type, text: row.text, choices, pairs, correctAnswer: row.correct_answer, points: row.points, createdAt: row.created_at }
}
function mapAssessment(row: any): Assessment {
  const modality = (row.modality || "public") as string
  const isArchived = !!row.archived || modality.includes("_archived")
  const cleanModality = modality.replace("_archived", "") as "public" | "private"

  return {
    id: row.id,
    title: row.title,
    disciplineId: row.discipline_id,
    professor: row.professor,
    institution: row.institution,
    questionIds: row.question_ids,
    pointsPerQuestion: row.points_per_question,
    totalPoints: row.total_points,
    openAt: row.open_at,
    closeAt: row.close_at,
    isPublished: row.is_published,
    archived: isArchived,
    shuffleVariants: row.shuffle_variants,
    timeLimitMinutes: row.time_limit_minutes,
    logoBase64: row.logo_base64,
    rules: row.rules,
    releaseResults: row.release_results,
    modality: cleanModality,
    createdAt: row.created_at
  }
}
function mapSubmission(row: any): StudentSubmission {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    answers: row.answers,
    score: row.score,
    totalPoints: row.total_points,
    percentage: row.percentage,
    submittedAt: row.submitted_at,
    timeElapsedSeconds: row.time_elapsed_seconds,
    focusLostCount: row.focus_lost_count || 0
  }
}
function mapProfessor(p: any): ProfessorAccount {
  if (!p) {
    return {
      id: "unknown",
      name: "Professor",
      email: "",
      passwordHash: "",
      role: "professor",
      avatar_url: null,
      bio: null,
      createdAt: new Date().toISOString(),
      active: false
    }
  }
  return {
    id: p.id || "unknown",
    name: p.name || "Professor",
    email: p.email || "",
    passwordHash: p.password_hash || "",
    role: p.role || "professor",
    avatar_url: p.avatar_url,
    bio: p.bio || null,
    createdAt: p.created_at || new Date().toISOString(),
    active: p.active !== false // Default to true if null/undefined
  }
}
function mapFinancialSettings(row: any): FinancialSettings { return { id: row.id, enrollmentFee: Number(row.enrollment_fee), monthlyFee: Number(row.monthly_fee), secondCallFee: Number(row.second_call_fee), finalExamFee: Number(row.final_exam_fee), totalMonths: Number(row.total_months), proLaboreFeePerLesson: Number(row.pro_labore_fee_per_lesson || 0), creditCardUrl: row.credit_card_url || undefined, pixKey: row.pix_key || undefined, updatedAt: row.updated_at } }
function mapFinancialCharge(row: any): FinancialCharge {
  return {
    id: row.id,
    studentId: row.student_id,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    dueDate: row.due_date,
    status: row.status,
    paymentDate: row.payment_date || undefined,
    paymentMethod: row.payment_method || undefined,
    actualPaidAmount: row.actual_paid_amount !== null ? Number(row.actual_paid_amount) : undefined,
    disciplineId: row.discipline_id || undefined,
    professorId: row.professor_id || undefined,
    classId: row.class_id || undefined,
    pixQrcode: row.pix_qrcode || undefined,
    pixCopyPaste: row.pix_copy_paste || undefined,
    createdAt: row.created_at
  }
}
function mapExpense(row: any): Expense { return { id: row.id, description: row.description, amount: Number(row.amount), category: row.category, dueDate: row.due_date, status: row.status, paidAt: row.paid_at || undefined, createdAt: row.created_at } }
function mapStudentProfile(row: any): StudentProfile { return { id: row.id, auth_user_id: row.auth_user_id, name: row.name, email: row.email, cpf: row.cpf, enrollment_number: row.enrollment_number, phone: row.phone || undefined, address: row.address || undefined, church: row.church || undefined, pastor_name: row.pastor_name || undefined, class_id: row.class_id || undefined, payment_status: row.payment_status || undefined, avatar_url: row.avatar_url || null, bio: row.bio || null, status: (row.status || 'pending') as StudentProfile['status'], created_at: row.created_at } }
function mapChatMessage(row: any): ChatMessage { return { id: row.id, studentId: row.student_id, disciplineId: row.discipline_id, message: row.message, isFromStudent: row.is_from_student, read: row.read, createdAt: row.created_at } }
function mapAttendance(row: any): Attendance {
  return {
    id: row.id,
    studentId: String(row.student_id || ''),
    disciplineId: String(row.discipline_id || ''),
    date: row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0]) : '',
    isPresent: row.is_present === true || row.is_present === 1 || String(row.is_present) === 'true',
    createdAt: row.created_at
  }
}
function mapClassRoom(row: any): ClassRoom { return { id: row.id, name: row.name, shift: row.shift as ClassRoom['shift'], dayOfWeek: row.day_of_week || undefined, maxStudents: Number(row.max_students), studentCount: row.student_count !== undefined ? Number(row.student_count) : undefined, createdAt: row.created_at } }
function mapClassSchedule(row: any): ClassSchedule { return { id: row.id, classId: row.class_id, disciplineId: row.discipline_id, professorName: row.professor_name, dayOfWeek: row.day_of_week, timeStart: row.time_start, timeEnd: row.time_end, lessonsCount: Number(row.lessons_count || 1), workload: Number(row.workload || 0), startDate: row.start_date || undefined, endDate: row.end_date || undefined, createdAt: row.created_at } }
function mapStudentGrade(row: any): StudentGrade {
  return {
    id: row.id,
    studentIdentifier: row.student_identifier,
    studentName: row.student_name,
    disciplineId: row.discipline_id || undefined,
    isPublic: row.is_public,
    examGrade: Number(row.exam_grade),
    worksGrade: Number(row.works_grade),
    seminarGrade: Number(row.seminar_grade),
    participationBonus: Number(row.participation_bonus),
    attendanceScore: Number(row.attendance_score),
    customDivisor: Number(row.custom_divisor),
    createdAt: row.created_at
  }
}
function mapBoardMember(row: any): BoardMember { return { id: row.id, name: row.name, role: row.role, category: row.category, avatar_url: row.avatar_url, createdAt: row.created_at } }
function mapProfessorDiscipline(row: any): ProfessorDiscipline { return { id: row.id, professorId: row.professor_id, disciplineId: row.discipline_id, createdAt: row.created_at } }
function mapChallenge(row: any): Challenge {
  return {
    id: row.id,
    disciplineId: row.discipline_id,
    week: row.week,
    title: row.title,
    description: row.description,
    type: row.type as ChallengeType,
    content: row.content,
    correctAnswer: row.correct_answer,
    points: row.points,
    isActive: !!row.is_active,
    createdAt: row.created_at
  }
}
function mapChallengeSubmission(row: any): ChallengeSubmission {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    studentId: row.student_id,
    answer: row.answer,
    isCorrect: !!row.is_correct,
    earnedPoints: row.earned_points,
    submittedAt: row.submitted_at
  }
}

// ─── Async Supabase Operations ───────────────────────────────────────────────

export async function getFinancialSettings(): Promise<FinancialSettings | null> {
  const supabase = createClient()
  const { data } = await supabase.from('financial_settings').select('*').limit(1).maybeSingle()
  return data ? mapFinancialSettings(data) : null
}
export async function updateFinancialSettings(settings: Omit<FinancialSettings, "id" | "updatedAt">): Promise<void> {
  const supabase = createClient()
  const dbData = {
    enrollment_fee: settings.enrollmentFee,
    monthly_fee: settings.monthlyFee,
    second_call_fee: settings.secondCallFee,
    final_exam_fee: settings.finalExamFee,
    total_months: settings.totalMonths,
    pro_labore_fee_per_lesson: settings.proLaboreFeePerLesson,
    credit_card_url: settings.creditCardUrl || null,
    pix_key: settings.pixKey || null,
    updated_at: new Date().toISOString()
  }
  const { data: existing } = await supabase.from('financial_settings').select('id').limit(1).maybeSingle()
  if (existing) {
    await supabase.from('financial_settings').update(dbData).eq('id', existing.id)
  } else {
    await supabase.from('financial_settings').insert(dbData)
  }

  // --- RE-CALCULATE PENDING CHARGES GLOBALLY ---
  // 1. Update Pending Enrollment Fees
  await supabase.from('financial_charges')
    .update({ amount: settings.enrollmentFee })
    .match({ type: 'enrollment', status: 'pending' })

  // 2. Update Pending/Late Monthly Fees
  await supabase.from('financial_charges')
    .update({ amount: settings.monthlyFee })
    .eq('type', 'monthly')
    .in('status', ['pending', 'late'])

  // 3. Update Bolsa 50%
  await supabase.from('financial_charges')
    .update({ amount: settings.monthlyFee / 2 })
    .match({ type: 'monthly', status: 'bolsa50' })

  // 4. Update Bolsa 100%
  await supabase.from('financial_charges')
    .update({ amount: 0 })
    .match({ type: 'monthly', status: 'bolsa100' })
}

export async function getGradeSettings(): Promise<GradeSettings> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.from('grade_settings').select('*').eq('id', 'global').maybeSingle()
    if (error || !data) throw new Error("Not found")
    
    return {
      examWeight: Number(data.exam_weight || 10),
      testWeight: Number(data.test_weight || 0),
      workWeight: Number(data.work_weight || 0),
      bonusWeight: Number(data.bonus_weight || 0),
      presenceValue: Number(data.presence_value || 0.5),
      divisor: Number(data.divisor || 2),
      updatedAt: data.updated_at
    }
  } catch (err) {
    return {
      examWeight: 10,
      testWeight: 0,
      workWeight: 0,
      bonusWeight: 0,
      presenceValue: 0.5,
      divisor: 2,
      updatedAt: new Date().toISOString()
    }
  }
}

export async function saveGradeSettings(settings: GradeSettings): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('grade_settings').upsert({
    id: 'global',
    exam_weight: settings.examWeight,
    test_weight: settings.testWeight,
    work_weight: settings.workWeight,
    bonus_weight: settings.bonusWeight,
    presence_value: settings.presenceValue,
    divisor: settings.divisor,
    updated_at: new Date().toISOString()
  })
  if (error) throw new Error(error.message)
}


export async function getClasses(): Promise<ClassRoom[]> {
  const supabase = createClient()
  const { data: classes } = await supabase.from('classes').select('*').order('created_at', { ascending: false })
  const { data: counts } = await supabase.from('students').select('class_id')

  const studentCounts: Record<string, number> = {}
  counts?.forEach(s => {
    if (s.class_id) studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1
  })

  return (classes || []).map(c => ({
    ...mapClassRoom(c),
    studentCount: studentCounts[c.id] || 0
  }))
}

export async function getPublicClasses(): Promise<ClassRoom[]> {
  const supabase = createClient()
  const { data: classes } = await supabase.from('classes').select('*').order('name', { ascending: true })
  const { data: counts } = await supabase.from('students').select('class_id')

  const studentCounts: Record<string, number> = {}
  counts?.forEach(s => {
    if (s.class_id) studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1
  })

  return (classes || []).map(c => ({
    ...mapClassRoom(c),
    studentCount: studentCounts[c.id] || 0
  }))
}
export async function addClass(cls: Omit<ClassRoom, 'id' | 'createdAt' | 'studentCount'>): Promise<ClassRoom> {
  const supabase = createClient()
  const { data, error } = await supabase.from('classes').insert({
    name: cls.name, shift: cls.shift, day_of_week: cls.dayOfWeek || null, max_students: cls.maxStudents
  }).select().single()
  if (error) throw error
  return mapClassRoom(data)
}
export async function updateClass(id: string, cls: Partial<Omit<ClassRoom, 'id' | 'createdAt'>>): Promise<void> {
  const supabase = createClient()
  const dbData: any = {}
  if (cls.name !== undefined) dbData.name = cls.name
  if (cls.shift !== undefined) dbData.shift = cls.shift
  if (cls.maxStudents !== undefined) dbData.max_students = cls.maxStudents
  if (cls.dayOfWeek !== undefined) dbData.day_of_week = cls.dayOfWeek || null
  await supabase.from('classes').update(dbData).eq('id', id)
}
export async function deleteClass(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('classes').delete().eq('id', id)
}

export async function getFinancialCharges(studentId?: string): Promise<FinancialCharge[]> {
  const supabase = createClient()
  let allData: any[] = []
  let hasMore = true
  let page = 0
  const limitSize = 1000

  while (hasMore) {
    let query = supabase.from('financial_charges').select('*').order('due_date', { ascending: false }).range(page * limitSize, (page + 1) * limitSize - 1)
    if (studentId) query = query.eq('student_id', studentId)

    const { data, error } = await query
    if (error) break

    if (data && data.length > 0) {
      allData = [...allData, ...data]
      if (data.length < limitSize) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  return allData.map(mapFinancialCharge)
}
export async function addFinancialCharge(charge: Omit<FinancialCharge, "id" | "createdAt" | "status" | "paymentDate">): Promise<FinancialCharge> {
  const supabase = createClient()
  const dbData = {
    student_id: charge.studentId,
    type: charge.type,
    description: charge.description,
    amount: charge.amount,
    due_date: charge.dueDate,
    status: 'pending',
    created_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from('financial_charges').insert(dbData).select().single()
  if (error) throw new Error(error.message)

  // Trigger n8n for new charge
  try {
    const { data: student } = await supabase.from('students').select('name, phone').eq('id', charge.studentId).maybeSingle()
    if (student) {
      triggerN8nWebhook('pagamento_gerado', {
        type: 'financial',
        studentName: student.name,
        studentPhone: student.phone,
        amount: charge.amount,
        description: charge.description,
        dueDate: charge.dueDate
      });
    }
  } catch (err) {
    console.error("Erro ao disparar WhatsApp n8n financeiro:", err);
  }

  return mapFinancialCharge(data)
}
export async function updateFinancialChargesStatusBatch(ids: string[], status: FinancialCharge["status"]): Promise<void> {
  const supabase = createClient()
  const dbData: any = { status }
  if (status === 'paid') dbData.payment_date = new Date().toISOString()
  if (status === 'pending') dbData.payment_date = null

  const { error } = await supabase.from('financial_charges').update(dbData).in('id', ids)
  if (error) throw new Error(error.message)
}

export async function updateFinancialChargeStatus(id: string, status: FinancialCharge["status"]): Promise<void> {
  const supabase = createClient()
  const dbData: any = { status }
  if (status === 'paid') dbData.payment_date = new Date().toISOString()
  if (status === 'pending') dbData.payment_date = null
  await supabase.from('financial_charges').update(dbData).eq('id', id)

  // Trigger actions on payment
  if (status === 'paid') {
    try {
      const { data: charge } = await supabase.from('financial_charges').select('*, students(*)').eq('id', id).single()
      if (charge) {
        // 1. Trigger n8n WhatsApp (Payment Confirmed)
        triggerN8nWebhook('pagamento_confirmado', {
          type: 'payment',
          name: charge.students?.name,
          phone: charge.students?.phone,
          amount: charge.amount,
          description: charge.description
        })

        // 2. If it's an enrollment charge, activate the student
        if (charge.type === 'enrollment' && charge.student_id) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : 'https://ieteo-dashboard.vercel.app')
          await fetch(`${baseUrl}/api/student/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: charge.student_id })
          }).catch(e => console.error("Activation fetch error:", e))
        }
      }
    } catch (err) {
      console.error("Error in post-payment actions:", err)
    }
  }
}
export async function deleteFinancialCharge(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('financial_charges').delete().eq('id', id)
}

// ─── Expenses CRUD ───────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const supabase = createClient()
  const { data } = await supabase.from('expenses').select('*').order('due_date', { ascending: false })
  return (data || []).map(mapExpense)
}

export async function addExpense(expense: Omit<Expense, "id" | "createdAt" | "status" | "paidAt">): Promise<Expense> {
  const supabase = createClient()
  const dbData = {
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    due_date: expense.dueDate,
    status: 'pending',
    created_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from('expenses').insert(dbData).select().single()
  if (error) throw new Error(error.message)
  return mapExpense(data)
}

export async function addExpenseBatch(expenses: Omit<Expense, "id" | "createdAt" | "status" | "paidAt">[]): Promise<void> {
  const supabase = createClient()
  const dbData = expenses.map(exp => ({
    description: exp.description,
    amount: exp.amount,
    category: exp.category,
    due_date: exp.dueDate,
    status: 'pending',
    created_at: new Date().toISOString()
  }))
  if (dbData.length > 0) {
    const { error } = await supabase.from('expenses').insert(dbData)
    if (error) throw new Error(error.message)
  }
}

export async function updateExpense(id: string, data: Partial<Omit<Expense, "id" | "createdAt">>): Promise<void> {
  const supabase = createClient()
  const dbData: any = {}
  if (data.description !== undefined) dbData.description = data.description
  if (data.amount !== undefined) dbData.amount = data.amount
  if (data.category !== undefined) dbData.category = data.category
  if (data.dueDate !== undefined) dbData.due_date = data.dueDate
  if (data.status !== undefined) {
    dbData.status = data.status
    if (data.status === 'paid') dbData.paid_at = new Date().toISOString()
    else dbData.paid_at = null
  }
  const { error } = await supabase.from('expenses').update(dbData).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('expenses').delete().eq('id', id)
}

export async function getSemesters(): Promise<Semester[]> {
  const supabase = createClient()
  const { data } = await supabase.from('semesters').select('*').order('order', { ascending: true })
  return (data || []).map(mapSemester)
}

export async function addSemester(name: string, order: number, shift?: string): Promise<Semester> {
  const s = { name, order, shift: shift || null, is_concluded: false, created_at: new Date().toISOString() }
  const supabase = createClient()
  const { data, error } = await supabase.from('semesters').insert(s).select().single()
  if (error) throw new Error(error.message)
  return mapSemester(data)
}
export async function updateSemester(id: string, data: Partial<Pick<Semester, "name" | "order" | "shift" | "isConcluded">>): Promise<void> {
  const supabase = createClient()
  const updatePayload: any = {}
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.order !== undefined) updatePayload.order = data.order
  if (data.shift !== undefined) updatePayload.shift = data.shift || null
  if (data.isConcluded !== undefined) updatePayload.is_concluded = data.isConcluded

  const { error, count } = await supabase.from('semesters').update(updatePayload).eq('id', id).select('id', { count: 'exact' })
  if (error) {
    console.error("Error updating semester:", error)
    throw new Error(`Falha ao atualizar semestre: ${error.message}`)
  }
  console.log(`Semester ${id} updated status. Rows affected: ${count}`)
}
export async function deleteSemester(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('semesters').delete().eq('id', id)
}

export async function getDisciplines(): Promise<Discipline[]> {
  const supabase = createClient()
  const [dRes, sRes] = await Promise.all([
    supabase.from('disciplines').select('*'),
    supabase.from('semesters').select('id, name, order')
  ])
  
  const semesters = sRes.data || []

  return (dRes.data || [])
    .map(d => {
      const disc = mapDiscipline(d)
      const sem = semesters.find(s => s.id === disc.semesterId)
      return {
        ...disc,
        semesterOrder: sem?.order ?? 999,
        semesterName: sem?.name || ''
      }
    })
    .sort((a, b) => {
      if (a.semesterOrder !== b.semesterOrder) return (a.semesterOrder ?? 999) - (b.semesterOrder ?? 999)
      if (a.order !== b.order) return a.order - b.order
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
}

export async function getDisciplinesByProfessor(professorId: string): Promise<Discipline[]> {
  const supabase = createClient()

  // Try to find the professor account by the provided ID (UUID or custom ID)
  // or by email if the ID is a UUID from auth
  let internalId = professorId

  const { data: profAcc } = await supabase
    .from('professor_accounts')
    .select('id, email')
    .or(`id.eq.${professorId},id.eq.${professorId}`) // This is a bit redundant but safe
    .maybeSingle()

  if (!profAcc) {
    // If not found by ID, maybe it's an auth user UUID, let's try to find by email if we can get the email from auth
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === professorId) {
      const { data: profByEmail } = await supabase
        .from('professor_accounts')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()
      if (profByEmail) internalId = profByEmail.id
    }
  } else {
    internalId = profAcc.id
  }

  const { data: links } = await supabase.from('professor_disciplines').select('discipline_id').eq('professor_id', internalId)
  if (!links || links.length === 0) return []
  const ids = links.map((l: any) => l.discipline_id)
  const { data } = await supabase.from('disciplines').select('*').in('id', ids)
  return (data || []).map(mapDiscipline)
}

export async function getProfessorDisciplines(professorId: string): Promise<ProfessorDiscipline[]> {
  const supabase = createClient()
  const { data } = await supabase.from('professor_disciplines').select('*').eq('professor_id', professorId)
  return (data || []).map(mapProfessorDiscipline)
}

export async function getAllProfessorDisciplines(): Promise<ProfessorDiscipline[]> {
  const supabase = createClient()
  const { data } = await supabase.from('professor_disciplines').select('*')
  return (data || []).map(mapProfessorDiscipline)
}

// ─── Challenges ─────────────────────────────────────────────────────────────

export async function getChallenges(disciplineId?: string): Promise<Challenge[]> {
  const url = disciplineId 
    ? `/api/admin/challenges?disciplineId=${encodeURIComponent(disciplineId)}` 
    : `/api/admin/challenges`
  
  const res = await fetch(url)
  const result = await res.json()
  
  if (!res.ok) {
    console.error("Error fetching challenges:", result.error)
    return []
  }
  
  return (result.data || []).map(mapChallenge)
}

export async function addChallenge(challenge: Omit<Challenge, "id" | "createdAt">): Promise<void> {
  // We use a safe string ID that works with both TEXT and UUID columns if needed
  const dbData = {
    id: uid(),
    discipline_id: challenge.disciplineId || null,
    week: challenge.week,
    title: challenge.title,
    description: challenge.description,
    type: challenge.type,
    content: challenge.content,
    correct_answer: challenge.correctAnswer || null,
    points: Math.round(Number(challenge.points || 0)),
    is_active: challenge.isActive,
    created_at: new Date().toISOString()
  }
  
  const res = await fetch("/api/admin/challenges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dbData)
  })
  
  const result = await res.json()
  if (!res.ok) throw new Error(result.error)
  return mapChallenge(result.data) as any
}

export async function updateChallenge(id: string, data: Partial<Omit<Challenge, "id" | "createdAt">>): Promise<void> {
  const dbData: any = { id }
  if (data.disciplineId !== undefined) dbData.discipline_id = data.disciplineId
  if (data.week !== undefined) dbData.week = data.week
  if (data.title !== undefined) dbData.title = data.title
  if (data.description !== undefined) dbData.description = data.description
  if (data.type !== undefined) dbData.type = data.type
  if (data.content !== undefined) dbData.content = data.content
  if (data.correctAnswer !== undefined) dbData.correct_answer = data.correctAnswer
  if (data.points !== undefined) dbData.points = Math.round(Number(data.points || 0))
  if (data.isActive !== undefined) dbData.is_active = data.isActive
  
  const res = await fetch("/api/admin/challenges", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dbData)
  })
  
  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error)
  }
}

export async function deleteChallenge(id: string): Promise<void> {
  const res = await fetch(`/api/admin/challenges?id=${id}`, {
    method: "DELETE"
  })
  
  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error)
  }
}

export async function getChallengeSubmissions(studentId: string): Promise<ChallengeSubmission[]> {
  try {
    const res = await fetch(`/api/student/challenge-submissions?studentId=${studentId}`)
    if (!res.ok) {
      console.error("Erro na resposta getChallengeSubmissions")
      return []
    }
    const data = await res.json()
    return (data || []).map(mapChallengeSubmission)
  } catch (err) {
    console.error("Falha de rede em getChallengeSubmissions:", err)
    return []
  }
}

export async function saveChallengeSubmission(sub: Omit<ChallengeSubmission, "id" | "submittedAt">): Promise<void> {
  const dbData = {
    id: uid(),
    challenge_id: sub.challengeId,
    student_id: sub.studentId,
    answer: sub.answer,
    is_correct: sub.isCorrect,
    earned_points: sub.earnedPoints,
    submitted_at: new Date().toISOString()
  }
  
  const res = await fetch("/api/student/challenge-submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dbData)
  })
  
  if (!res.ok) {
    const err = await res.json()
    console.error("Erro ao salvar submissão:", err)
    throw new Error(err.error || "Erro ao salvar na base de dados")
  }
}

export async function getProLaboreCalculations() {
  const supabase = createClient()
  const [professors, links, schedules, settings, charges, allClasses, allDisciplines] = await Promise.all([
    getProfessorAccounts(),
    getAllProfessorDisciplines(),
    getClassSchedules(),
    getFinancialSettings(),
    getFinancialCharges(), // This includes expenses
    supabase.from('classes').select('id, name').then(r => r.data || []),
    getDisciplines() // Fetch full discipline objects
  ])

  const fee = settings?.proLaboreFeePerLesson || 0
  const calculations: any[] = []

  // Default to 4 lessons if not specified in schedule
  const DEFAULT_LESSONS = 4

  allDisciplines.forEach(discipline => {
    // 1. Find professor(s) for this discipline
    // Priority: professor_disciplines link table
    let linkedProfessorIds = links
      .filter(l => l.disciplineId === discipline.id)
      .map(l => l.professorId)

    // Fallback: If no links in table, try to find by name in the disciplines table
    if (linkedProfessorIds.length === 0 && discipline.professorName) {
      const profByName = professors.find(p => p.name === discipline.professorName)
      if (profByName) linkedProfessorIds = [profByName.id]
    }

    linkedProfessorIds.forEach(profId => {
      const prof = professors.find(p => p.id === profId)
      if (!prof) return

      // 2. Iterate over ALL classes
      allClasses.forEach((classInfo: any) => {
        // Find if there's a specific schedule for this discipline + class
        const sched = schedules.find(s => s.disciplineId === discipline.id && s.classId === classInfo.id)

        // Use scheduled lessons count or fallback to default
        const lessonsCount = sched ? sched.lessonsCount : DEFAULT_LESSONS

        // Check if already paid
        const matchingCharge = (charges || []).find(c =>
          (c.type as any) === 'expense' &&
          c.professorId === prof.id &&
          c.disciplineId === discipline.id &&
          c.classId === classInfo.id
        )

        const isPaid = matchingCharge?.status === 'paid'

        calculations.push({
          professorId: prof.id,
          professorName: prof.name,
          disciplineId: discipline.id,
          disciplineName: discipline.name,
          applicationMonth: discipline.applicationMonth, // Fixed mapping
          applicationYear: discipline.applicationYear,   // Fixed mapping
          classId: classInfo.id,
          className: classInfo.name,
          lessonsCount: lessonsCount,
          feePerLesson: fee,
          totalAmount: lessonsCount * fee,
          isPaid,
          chargeId: matchingCharge?.id
        })
      })
    })
  })

  return calculations
}

export async function settleProLabore(data: {
  professorId: string,
  disciplineId: string,
  classId: string,
  amount: number,
  description: string,
  date?: string
}): Promise<{ id: string }> {
  console.log("Settling Pro-labore:", data)
  const supabase = createClient()
  const useDate = data.date || new Date().toISOString().split('T')[0]
  
  const dbData = {
    type: 'expense',
    description: data.description,
    amount: data.amount,
    professor_id: data.professorId,
    discipline_id: data.disciplineId,
    class_id: data.classId,
    status: 'paid',
    due_date: useDate,
    payment_date: useDate,
    payment_method: 'other',
    created_at: new Date().toISOString()
  }
  
  const { data: insertedData, error } = await supabase
    .from('financial_charges')
    .insert(dbData)
    .select('id')
    .single()
    
  if (error) {
    console.error("Error settling pro-labore (SQL Error):", error)
    // Se o erro for de restrição NOT NULL em student_id, avisamos o usuário sobre o SQL
    if (error.message.includes("student_id") && error.message.includes("not-null")) {
      throw new Error("Erro de banco de dados: O campo student_id não permite valores nulos na tabela financial_charges. É necessário rodar o comando SQL de ajuste no Supabase.")
    }
    throw new Error(error.message)
  }
  return insertedData
}


export async function linkProfessorToDiscipline(professorId: string, disciplineId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('professor_disciplines').upsert({ professor_id: professorId, discipline_id: disciplineId }, { onConflict: 'professor_id,discipline_id' })
}

export async function unlinkProfessorFromDiscipline(professorId: string, disciplineId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('professor_disciplines').delete().match({ professor_id: professorId, discipline_id: disciplineId })
}

export async function getBoardMembers(): Promise<BoardMember[]> {
  const supabase = createClient()
  const { data } = await supabase.from('board_members').select('*').order('category', { ascending: false })
  return (data || []).map(mapBoardMember)
}
export async function addDiscipline(
  name: string,
  description?: string | null,
  semesterId?: string | null,
  professorName?: string | null,
  dayOfWeek?: string | null,
  shift?: string | null,
  order?: number,
  applicationMonth?: string | null,
  applicationYear?: string | null,
  isConcluded?: boolean
): Promise<Discipline> {
  const d = {
    id: uid(),
    name,
    description: description || null,
    semester_id: semesterId || null,
    professor_name: professorName || null,
    day_of_week: dayOfWeek || null,
    shift: shift || null,
    "order": order || 0,
    application_month: applicationMonth || null,
    application_year: applicationYear || null,
    is_concluded: isConcluded || false,
    created_at: new Date().toISOString()
  }
  const supabase = createClient()
  const { data, error } = await supabase.from('disciplines').insert(d).select().single()
  if (error) {
    console.error("Error adding discipline:", error)
    throw new Error(`Falha ao adicionar disciplina: ${error.message}`)
  }
  console.log("Discipline added successfully:", data.id)
  return mapDiscipline(data)
}

export async function updateDiscipline(id: string, data: Partial<Pick<Discipline, "name" | "description" | "semesterId" | "professorName" | "dayOfWeek" | "shift" | "order" | "applicationMonth" | "applicationYear" | "isConcluded">>): Promise<void> {
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.semesterId !== undefined) updateData.semester_id = data.semesterId || null
  if (data.professorName !== undefined) updateData.professor_name = data.professorName || null
  if (data.dayOfWeek !== undefined) updateData.day_of_week = data.dayOfWeek || null
  if (data.shift !== undefined) updateData.shift = data.shift || null
  if (data.order !== undefined) updateData.order = data.order
  if (data.applicationMonth !== undefined) updateData.application_month = data.applicationMonth || null
  if (data.applicationYear !== undefined) updateData.application_year = data.applicationYear || null
  if (data.isConcluded !== undefined) updateData.is_concluded = data.isConcluded

  const supabase = createClient()
  const { error, count } = await supabase.from('disciplines').update(updateData).eq('id', id).select('id', { count: 'exact' })

  if (error) {
    console.error("Error updating discipline:", error)
    throw new Error(`Falha ao atualizar disciplina: ${error.message}`)
  }

  console.log(`Discipline ${id} updated status. Rows affected: ${count}`)
}
export async function deleteDiscipline(id: string): Promise<void> {
  const supabase = createClient()
  // First, delete related entries to avoid foreign key constraints
  await supabase.from('questions').delete().eq('discipline_id', id)
  await supabase.from('study_materials').delete().eq('discipline_id', id)
  const { error } = await supabase.from('disciplines').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getStudyMaterials(disciplineId?: string): Promise<StudyMaterial[]> {
  const supabase = createClient()
  let query = supabase.from('study_materials').select('*').order('created_at', { ascending: false })
  if (disciplineId) query = query.eq('discipline_id', disciplineId)

  const { data } = await query
  return (data || []).map(mapStudyMaterial)
}
export async function addStudyMaterial(material: Omit<StudyMaterial, "id" | "createdAt">): Promise<StudyMaterial> {
  const supabase = createClient()
  const dbData = { discipline_id: material.disciplineId, title: material.title, description: material.description, file_url: material.fileUrl, created_at: new Date().toISOString() }
  const { data, error } = await supabase.from('study_materials').insert(dbData).select().single()
  if (error) throw new Error(error.message)
  return mapStudyMaterial(data)
}
export async function deleteStudyMaterial(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('study_materials').delete().eq('id', id)
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

export async function getDisciplineQuestionCounts(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase.from('questions').select('discipline_id')
  const counts: Record<string, number> = {}
  if (data) {
    for (const q of data) {
      counts[q.discipline_id] = (counts[q.discipline_id] || 0) + 1
    }
  }
  return counts
}
export async function addQuestion(data: Omit<Question, "id" | "createdAt">): Promise<Question> {
  const q: any = {
    id: uid(),
    discipline_id: data.disciplineId,
    type: data.type,
    text: data.text,
    choices: data.choices,
    correct_answer: data.correctAnswer,
    points: data.points,
    created_at: new Date().toISOString()
  }
  // Store pairs inside choices since DB column might be missing
  if (data.pairs && data.pairs.length > 0) {
    q.choices = { options: data.choices || [], matchingPairs: data.pairs }
  }

  const supabase = createClient()
  const { error } = await supabase.from('questions').insert(q)
  if (error) throw new Error(`Erro ao salvar questão: ${error.message}`)

  // Create a proper Question object for the return
  return mapQuestion({
    ...q,
    discipline_id: q.discipline_id,
    correct_answer: q.correct_answer,
    created_at: q.created_at
  })
}

export async function addQuestionsBatch(questions: Omit<Question, "id" | "createdAt">[]): Promise<string[]> {
  const supabase = createClient()
  const dbRows = questions.map(q => {
    const id = uid()
    const row: any = {
      id,
      discipline_id: q.disciplineId,
      type: q.type,
      text: q.text,
      choices: q.choices,
      correct_answer: q.correctAnswer,
      points: q.points,
      created_at: new Date().toISOString()
    }
    
    // Support matching pairs inside choices object
    if (q.pairs && q.pairs.length > 0) {
      row.choices = { options: q.choices || [], matchingPairs: q.pairs }
    }
    
    return row
  })

  const { error } = await supabase.from('questions').insert(dbRows)
  if (error) throw new Error(`Erro ao salvar lote de questões: ${error.message}`)
  
  return dbRows.map(r => r.id)
}
export async function updateQuestion(id: string, data: Partial<Omit<Question, "id" | "createdAt">>): Promise<void> {
  const updateData: any = {}
  if (data.disciplineId !== undefined) updateData.discipline_id = data.disciplineId
  if (data.type !== undefined) updateData.type = data.type
  if (data.text !== undefined) updateData.text = data.text
  if (data.points !== undefined) updateData.points = data.points

  if (data.choices !== undefined || data.pairs !== undefined) {
    const finalChoices = data.choices || []
    const finalPairs = data.pairs || []
    if (finalPairs.length > 0) {
      updateData.choices = { options: finalChoices, matchingPairs: finalPairs }
      // Explicitly avoid sending pairs column
    } else {
      updateData.choices = finalChoices
    }
  }

  const supabase = createClient()
  const { error } = await supabase.from('questions').update(updateData).eq('id', id)
  if (error) throw new Error(`Erro ao atualizar questão: ${error.message}`)
}
export async function deleteQuestion(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('questions').delete().eq('id', id)
}

export async function getAssessments(): Promise<Assessment[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('assessments')
    .select('id, title, discipline_id, professor, institution, question_ids, points_per_question, total_points, open_at, close_at, is_published, shuffle_variants, rules, release_results, modality, created_at, time_limit_minutes')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error("Error fetching assessments:", error)
    return []
  }
  return (data || []).map(mapAssessment)
}
export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('assessments').select('*').eq('id', id).single()
  return data ? mapAssessment(data) : null
}
export async function getActiveAssessment(assessmentId?: string): Promise<Assessment | null> {
  if (assessmentId) {
    return await getAssessmentById(assessmentId)
  }
  const assessments = await getAssessments()
  // Return the first assessment (most recently created) to serve as the default
  return assessments[0] ?? null
}
export async function addAssessment(data: Omit<Assessment, "id" | "createdAt" | "releaseResults" | "archived">): Promise<Assessment> {
  const a = { ...data, id: uid(), createdAt: new Date().toISOString(), releaseResults: false, archived: false }
  const dbData = { id: a.id, title: a.title, discipline_id: a.disciplineId, professor: a.professor, institution: a.institution, question_ids: a.questionIds, points_per_question: a.pointsPerQuestion, total_points: a.totalPoints, open_at: a.openAt, close_at: a.closeAt, is_published: a.isPublished, shuffle_variants: a.shuffleVariants, time_limit_minutes: a.timeLimitMinutes, logo_base64: a.logoBase64, rules: a.rules, release_results: a.releaseResults, modality: a.modality ?? "public", created_at: a.createdAt }
  const supabase = createClient()
  const { error } = await supabase.from('assessments').insert(dbData)
  if (error) throw new Error(error.message)
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
  if (data.timeLimitMinutes !== undefined) dbData.time_limit_minutes = data.timeLimitMinutes

  const supabase = createClient()

  // Workaround for missing 'archived' column
  if (data.archived !== undefined || data.modality !== undefined) {
    const { data: current } = await supabase.from('assessments').select('modality').eq('id', id).maybeSingle()
    const currentModality = (current?.modality || "public").replace("_archived", "")
    const newModalityBase = data.modality || currentModality
    const newArchived = data.archived !== undefined ? data.archived : (current?.modality?.includes("_archived") || false)

    dbData.modality = newArchived ? `${newModalityBase}_archived` : newModalityBase
  }
  const { error } = await supabase.from('assessments').update(dbData).eq('id', id)
  if (error) throw new Error(error.message)

  // Trigger n8n if published
  if (data.isPublished === true) {
    try {
      const { data: assessment } = await supabase.from('assessments').select('title, discipline_id').eq('id', id).maybeSingle()
      if (assessment) {
        const { data: discipline } = await supabase.from('disciplines').select('name').eq('id', assessment.discipline_id).maybeSingle()
        triggerN8nWebhook('prova_publicada', {
          type: 'assessment',
          assessmentTitle: assessment.title,
          disciplineName: discipline?.name || 'Disciplina',
          assessmentId: id
        });
      }
    } catch (err) {
      console.error("Erro ao disparar WhatsApp n8n de prova:", err);
    }
  }
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
export async function saveSubmission(sub: StudentSubmission): Promise<StudentSubmission> {
  const supabase = createClient()

  const record = {
    id: sub.id,
    assessment_id: sub.assessmentId,
    student_id: sub.studentId,
    student_name: sub.studentName,
    student_email: sub.studentEmail,
    answers: sub.answers,
    score: sub.score,
    total_points: sub.totalPoints,
    percentage: sub.percentage,
    submitted_at: sub.submittedAt,
    time_elapsed_seconds: sub.timeElapsedSeconds,
    focus_lost_count: sub.focusLostCount || 0
  }

  const { data, error } = await supabase.from('student_submissions').insert(record).select().single()
  if (error) throw new Error(error.message)
  const result = mapSubmission(data)

  // --- AUTOMATIC GRADE MIGRATION ---
  try {
    // Attempt to find student by email
    const { data: student } = await supabase.from('students').select('name').eq('email', sub.studentEmail).maybeSingle();

    if (student) {
      const { data: existingGrade } = await supabase.from('student_grades')
        .select('id')
        .match({ student_identifier: sub.studentEmail, discipline_id: sub.assessmentId ? (await getAssessmentById(sub.assessmentId))?.disciplineId : null })
        .maybeSingle();

      const assessment = await getAssessmentById(sub.assessmentId);
      const disciplineId = assessment?.disciplineId || null;

      const gradeData = {
        student_identifier: sub.studentEmail,
        student_name: sub.studentName,
        discipline_id: disciplineId,
        exam_grade: sub.score,
        is_public: false // Hidden until professor releases
      };

      if (existingGrade) {
        await supabase.from('student_grades').update(gradeData).eq('id', existingGrade.id);
      } else {
        await supabase.from('student_grades').insert({ ...gradeData, created_at: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error("Erro ao migrar nota da prova para o boletim:", err);
  }

  // Trigger n8n WhatsApp (Exam Completed)
  try {
    const assessment = await getAssessmentById(sub.assessmentId);
    if (assessment) {
      triggerN8nWebhook('prova_concluida', {
        type: 'exam_completion',
        name: sub.studentName,
        phone: sub.studentEmail.split('@')[0], // Fallback/Identifier
        title: assessment.title,
        score: sub.score,
        totalPoints: sub.totalPoints
      });
    }
  } catch (err) {
    console.error("Erro ao disparar WhatsApp n8n de conclusão de prova:", err);
  }

  return result
}
export async function updateSubmissionScore(id: string, score: number, totalPoints: number): Promise<void> {
  const supabase = createClient()
  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0
  const { error } = await supabase.from('student_submissions').update({ score, percentage }).eq('id', id)
  if (error) throw new Error(error.message)
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
  const nameUC = (data.name || "").toUpperCase().trim()
  const account = { id: uid(), name: nameUC, email: data.email.toLowerCase().trim(), password_hash: hashPassword(data.password), role: data.role, created_at: new Date().toISOString() }
  const supabase = createClient()
  await supabase.from('professor_accounts').insert(account)
  return mapProfessor(account)
}
/**
 * Fetches a professor profile by email.
 */
export async function getProfessorByEmail(email: string): Promise<ProfessorAccount | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('professor_accounts')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar professor por e-mail:", error)
    return null
  }

  if (!data && email === MASTER_CREDENTIALS.email) {
    return {
      id: 'master',
      name: 'Administrador Master',
      email: MASTER_CREDENTIALS.email,
      role: 'master',
      active: true,
      avatar_url: null,
      passwordHash: '',
      createdAt: new Date().toISOString()
    }
  }

  return data ? mapProfessor(data) : null
}

export async function updateProfessorAccount(id: string, data: Partial<Pick<ProfessorAccount, "name" | "email" | "role" | "active" | "bio">> & { password?: string }): Promise<ProfessorAccount> {
  const supabase = createClient()

  if (id === "master") {
    // For master account, we use upsert to ensure the record exists
    const { data: dbData, error: dbError } = await supabase
      .from('professor_accounts')
      .upsert({
        name: data.name,
        email: MASTER_CREDENTIALS.email,
        password_hash: data.password ? hashPassword(data.password) : undefined,
        role: "master",
        active: true
      }, { onConflict: 'email' })
      .select()
      .single()

    if (dbError) throw new Error("Erro no Banco (Master): " + dbError.message)

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: MASTER_CREDENTIALS.email,
        password: data.password,
        name: data.name,
        role: "master"
      })
    })

    if (!res.ok) {
      const err = await res.json()
      console.warn("Sincronização Auth Master falhou:", err)
    }

    // Fetch newly updated/created master record
    const updatedMaster = await getProfessorByEmail(MASTER_CREDENTIALS.email)
    if (!updatedMaster) throw new Error("Falha ao recuperar conta Master após salvamento")
    return updatedMaster
  }

  // Get current email if not provided, to find user in Auth
  let syncEmail = data.email
  if (!syncEmail) {
    const { data: current } = await supabase.from('professor_accounts').select('email').eq('id', id).single()
    if (current) syncEmail = current.email
  }

  // Sync with Supabase Auth if password, name, or role is updated
  if (syncEmail && (data.password || data.name || data.role)) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: syncEmail,
        password: data.password,
        name: data.name,
        role: data.role
      })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error("Erro de sincronização S-Auth: " + (err.error || res.statusText))
    }
  }

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name.toUpperCase().trim()
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim()
  if (data.role !== undefined) updateData.role = data.role
  if (data.active !== undefined) updateData.active = data.active
  if (data.bio !== undefined) updateData.bio = data.bio
  if (data.password !== undefined) updateData.password_hash = hashPassword(data.password)

  // Try updating by ID first
  let { data: updated, error } = await supabase.from('professor_accounts').update(updateData).eq('id', id).select().maybeSingle()

  if (!updated) {
    // If ID update fails, try by email (to handle ID mismatch cases)
    const fallbackEmail = data.email || syncEmail
    if (fallbackEmail) {
      const { data: updated2, error: error2 } = await supabase.from('professor_accounts').update(updateData).eq('email', fallbackEmail.toLowerCase().trim()).select().maybeSingle()
      if (error2) throw new Error("Erro ao atualizar por E-mail: " + error2.message)
      if (!updated2) throw new Error("Nenhum professor encontrado com ID " + id + " ou E-mail " + fallbackEmail)
      updated = updated2
    } else {
      throw new Error("Erro ao atualizar: Professor não encontrado e e-mail não disponível.")
    }
  }
  return mapProfessor(updated)
}

/**
 * Ensures a professor's database ID matches their Supabase Auth ID.
 * This solves the mismatch between random uid() and Auth ID.
 */
export async function ensureProfessorSync(email: string, authId: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('professor_accounts')
    .update({ id: authId })
    .eq('email', email.toLowerCase().trim())
    .neq('id', authId) // Only update if they differ

  if (error) console.error("Falha ao sincronizar ID de professor:", error)
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
  let score = 0
  questions.forEach((q) => {
    const ans = answers.find((a) => a.questionId === q.id)
    if (!ans) return

    if (q.type === "multiple-choice" || q.type === "true-false" || q.type === "incorrect-alternative") {
      if (ans.answer === q.correctAnswer) score += pointsPerQuestion
    } else if (q.type === "fill-in-the-blank") {
      const matches = q.text.match(/\[\[(.*?)\]\]/g)
      if (matches) {
        const correctWords = matches.map(m => m.slice(2, -2).trim().toLowerCase())
        try {
          const studentData = JSON.parse(ans.answer)
          let correctBlanks = 0
          correctWords.forEach((word, idx) => {
            const studentWord = (studentData[`blank_${idx}`] || "").trim().toLowerCase()
            if (studentWord === word) correctBlanks++
          })
          score += (correctBlanks / correctWords.length) * pointsPerQuestion
        } catch { }
      }
    } else if (q.type === "matching" && q.pairs) {
      try {
        const studentData = JSON.parse(ans.answer)
        let correctPairs = 0
        q.pairs.forEach(p => {
          if (studentData[p.id] === p.right) correctPairs++
        })
        score += (correctPairs / q.pairs.length) * pointsPerQuestion
      } catch { }
    }
  })
  const totalPoints = questions.length * pointsPerQuestion
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
  return { score, totalPoints, percentage }
}

export async function getClassSchedules(): Promise<ClassSchedule[]> {
  const supabase = createClient()
  const { data } = await supabase.from('class_schedules').select('*').order('day_of_week', { ascending: true })
  return (data || []).map(mapClassSchedule)
}

export async function addClassSchedule(data: Omit<ClassSchedule, "id" | "createdAt">): Promise<void> {
  const supabase = createClient()
  const dbData = {
    class_id: data.classId,
    discipline_id: data.disciplineId,
    professor_name: data.professorName,
    day_of_week: data.dayOfWeek,
    time_start: data.timeStart,
    time_end: data.timeEnd,
    lessons_count: data.lessonsCount,
    workload: data.workload,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    created_at: new Date().toISOString()
  }
  const { error } = await supabase.from('class_schedules').insert(dbData)
  if (error) throw new Error(error.message)
}

export async function updateClassSchedule(id: string, data: Partial<Omit<ClassSchedule, "id" | "createdAt">>): Promise<void> {
  const supabase = createClient()
  const updateData: any = {}
  if (data.classId !== undefined) updateData.class_id = data.classId
  if (data.disciplineId !== undefined) updateData.discipline_id = data.disciplineId
  if (data.professorName !== undefined) updateData.professor_name = data.professorName
  if (data.dayOfWeek !== undefined) updateData.day_of_week = data.dayOfWeek
  if (data.timeStart !== undefined) updateData.time_start = data.timeStart
  if (data.timeEnd !== undefined) updateData.time_end = data.timeEnd
  if (data.lessonsCount !== undefined) updateData.lessons_count = data.lessonsCount
  if (data.workload !== undefined) updateData.workload = data.workload
  if (data.startDate !== undefined) updateData.start_date = data.startDate || null
  if (data.endDate !== undefined) updateData.end_date = data.endDate || null

  const { error } = await supabase.from('class_schedules').update(updateData).eq('id', id)
  if (error) throw new Error(error.message)
}


export async function deleteClassSchedule(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('class_schedules').delete().eq('id', id)
}

export async function getStudents(): Promise<StudentProfile[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('students')
    .select('*')
    .order('name', { ascending: true })
  return (data || []).map(mapStudentProfile)
}


export async function updateStudent(id: string, data: {
  name?: string
  cpf?: string
  phone?: string
  address?: string
  church?: string
  pastor_name?: string
  class_id?: string | null
  payment_status?: string
  status?: "pending" | "active" | "inactive"
  password?: string
}): Promise<void> {
  const supabase = createClient()

  // Sync with Supabase Auth if password is provided
  if (data.password || data.name) {
    try {
      const { data: stu } = await supabase.from('students').select('auth_user_id').eq('id', id).single()
      if (stu?.auth_user_id) {
        await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: stu.auth_user_id,
            password: data.password,
            name: data.name
          })
        })
      }
    } catch (err) {
      console.error("Error syncing student with Auth:", err)
    }
  }

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name.toUpperCase().trim()
  if (data.cpf !== undefined) updateData.cpf = data.cpf.replace(/\D/g, '')
  if (data.phone !== undefined) updateData.phone = data.phone || null
  if (data.address !== undefined) updateData.address = data.address || null
  if (data.church !== undefined) updateData.church = data.church || null
  if (data.pastor_name !== undefined) updateData.pastor_name = data.pastor_name || null
  if (data.class_id !== undefined) updateData.class_id = data.class_id || null
  if (data.payment_status !== undefined) updateData.payment_status = data.payment_status || null
  if (data.status !== undefined) updateData.status = data.status

  const { error } = await supabase.from('students').update(updateData).eq('id', id)
  if (error) throw new Error(error.message)

  // Trigger activation if payment_status changed to paid
  if (data.payment_status === 'paid') {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : 'https://ieteo-dashboard.vercel.app')
    fetch(`${baseUrl}/api/student/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id })
    }).catch(e => console.error("Manual Activation trigger error:", e))
  }
}

export async function deleteStudent(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getChatMessages(disciplineId: string, studentId: string): Promise<ChatMessage[]> {
  const supabase = createClient()
  const { data } = await supabase.from('chats').select('*').match({ discipline_id: disciplineId, student_id: studentId }).order('created_at', { ascending: true })
  return (data || []).map(mapChatMessage)
}

export async function sendChatMessage(studentId: string, disciplineId: string, message: string, isFromStudent: boolean): Promise<ChatMessage> {
  const supabase = createClient()
  const dbData = { student_id: studentId, discipline_id: disciplineId, message, is_from_student: isFromStudent, read: false, created_at: new Date().toISOString() }
  const { data, error } = await supabase.from('chats').insert(dbData).select().single()
  if (error) throw new Error(error.message)

  // Trigger n8n if message is from professor to student
  if (!isFromStudent) {
    const { data: student } = await supabase.from('students').select('name, phone').eq('id', studentId).single();
    if (student) {
      triggerN8nWebhook('nova_mensagem_chat', {
        type: 'chat',
        studentName: student.name,
        phone: student.phone,
        message: message
      });
    }
  }

  return mapChatMessage(data)
}

export async function markChatAsRead(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('chats').update({ read: true }).eq('id', id)
}

export async function getAttendances(disciplineId: string): Promise<Attendance[]> {
  const supabase = createClient()
  const { data } = await supabase.from('attendances').select('*').eq('discipline_id', disciplineId).order('date', { ascending: false })
  return (data || []).map(mapAttendance)
}

export async function getAttendanceAnalysis(disciplineId: string, students: StudentProfile[]) {
  const supabase = createClient()
  const records = await getAttendances(disciplineId)

  const stats = {
    totalStudents: students.length,
    totalRecords: records.length,
    present: records.filter(r => r.isPresent).length,
    absent: records.filter(r => !r.isPresent).length,
    absenceRate: records.length > 0 ? (records.filter(r => !r.isPresent).length / records.length * 100).toFixed(1) : "0"
  }

  const issues: { type: string, severity: 'Alta' | 'Média' | 'Baixa', description: string }[] = []

  // Issue 1: Students with 0 records
  students.forEach(s => {
    const hasRecords = records.some(r => r.studentId === s.id)
    if (!hasRecords) {
      issues.push({
        type: "Aluno sem registros",
        severity: "Alta",
        description: `O aluno ${s.name} não possui nenhum registro de frequência nesta disciplina.`
      })
    }
  })

  // Issue 2: High absence rate (> 25%)
  students.forEach(s => {
    const sAtt = records.filter(r => String(r.studentId) === String(s.id))
    const total = sAtt.length
    if (total > 0) {
      const absent = sAtt.filter(r => !r.isPresent).length
      const rate = (absent / total) * 100
      if (rate > 25) {
        issues.push({
          type: "Taxa de falta elevada",
          severity: rate > 75 ? "Alta" : "Média",
          description: `O aluno ${s.name} possui uma taxa de falta de ${rate.toFixed(1)}% (${absent}/${total} aulas).`
        })
      }
    }
  })

  // Issue 3: Incomplete dates (< 80% students)
  const dateCounts: Record<string, number> = {}
  records.forEach(r => {
    dateCounts[r.date] = (dateCounts[r.date] || 0) + 1
  })

  Object.entries(dateCounts).forEach(([date, count]) => {
    if (count < students.length * 0.8) {
      issues.push({
        type: "Registro incompleto",
        severity: "Média",
        description: `No dia ${date.split('-').reverse().join('/')}, apenas ${count}/${students.length} alunos foram registrados na chamada.`
      })
    }
  })

  return { stats, issues }
}

export async function triggerAttendanceAlerts(disciplineId: string, disciplineName: string, students: StudentProfile[]): Promise<{ count: number }> {
  const records = await getAttendances(disciplineId)
  let count = 0

  for (const s of students) {
    const sAtt = records.filter(r => String(r.studentId) === String(s.id))
    const total = sAtt.length
    if (total === 0) continue

    const absent = sAtt.filter(r => !r.isPresent).length
    const rate = (absent / total) * 100

    if (rate > 25) { // Threshold for alert
      triggerN8nWebhook('alerta_frequencia', {
        type: 'absenteeism_alert',
        studentId: s.id,
        studentName: s.name,
        phone: s.phone,
        disciplineName,
        absenceRate: rate.toFixed(1),
        currentAbsences: absent,
        totalClasses: total
      })
      count++
    }
  }

  return { count }
}

export async function saveAttendance(studentId: string, disciplineId: string, date: string, isPresent: boolean): Promise<void> {
  const supabase = createClient()

  // Strict check for existing record
  const { data: existing, error: fetchError } = await supabase.from('attendances')
    .select('id')
    .match({ student_id: studentId, discipline_id: disciplineId, date })
    .maybeSingle()

  if (fetchError) {
    console.error("Supabase Fetch Error (Attendance):", fetchError)
    throw new Error(`Erro de consulta: ${fetchError.message}`)
  }

  if (existing) {
    const { error: updateError } = await supabase.from('attendances')
      .update({ is_present: isPresent })
      .eq('id', existing.id)

    if (updateError) {
      console.error("Supabase Update Error (Attendance):", updateError)
      throw new Error(`Erro ao atualizar banco: ${updateError.message}`)
    }
  } else {
    const { error: insertError } = await supabase.from('attendances')
      .insert({
        student_id: studentId,
        discipline_id: disciplineId,
        date,
        is_present: isPresent,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error("Supabase Insert Error (Attendance):", insertError)
      throw new Error(`Erro ao gravar no banco: ${insertError.message}`)
    }
  }

  // --- AUTOMATIC ATTENDANCE SCORE UPDATE ---
  try {
    // 1. Get total lessons count for this discipline to calculate dynamic weight
    const { data: schedule } = await supabase.from('class_schedules')
      .select('lessons_count')
      .eq('discipline_id', disciplineId)
      .maybeSingle();

    // 1.5 Get Grade Settings for presence value
    const gSettings = await getGradeSettings();
    const weightPerPresence = gSettings?.presenceValue || 0.5;
    const maxAttendanceScore = 10.0;

    // 2. Count all presences for this student in this discipline
    const { data: allAtt } = await supabase.from('attendances')
      .select('is_present')
      .match({ student_id: studentId, discipline_id: disciplineId });

    const presenceCount = (allAtt || []).filter((a: any) => a.is_present).length;
    const attendanceScore = Math.min(presenceCount * weightPerPresence, maxAttendanceScore);

    // 3. Get student info for the grade record
    const { data: student } = await supabase.from('students').select('id, name, email').eq('id', studentId).single();

    if (student) {
      // 4. Find/Update student_grade using student_id (Migration to ID-based matching)
      const { data: existingGrade } = await supabase.from('student_grades')
        .select('id')
        .match({ student_id: studentId, discipline_id: disciplineId })
        .maybeSingle();

      const gradeData: any = {
        student_id: studentId,
        student_name: student.name,
        discipline_id: disciplineId,
        attendance_score: attendanceScore,
        student_identifier: student.email // Keep for backwards compatibility if needed, but primary is student_id
      };

      if (existingGrade) {
        await supabase.from('student_grades').update(gradeData).eq('id', existingGrade.id);
      } else {
        await supabase.from('student_grades').insert({ ...gradeData, is_public: false, created_at: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar nota de presença no boletim:", err);
  }

  // Trigger n8n if absent
  if (!isPresent) {
    const { data: student } = await supabase.from('students').select('name, phone').eq('id', studentId).single();
    const { data: discipline } = await supabase.from('disciplines').select('name').eq('id', disciplineId).single();
    if (student) {
      triggerN8nWebhook('falta_registrada', {
        type: 'attendance',
        studentName: student.name,
        phone: student.phone,
        disciplineName: discipline?.name || "Disciplina",
        date: date
      });
    }
  }
}

export async function getAttendanceLock(disciplineId: string, date: string): Promise<AttendanceLock | null> {
  const supabase = createClient()
  const { data } = await supabase.from('attendance_locks').select('*').match({ discipline_id: disciplineId, date }).maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    disciplineId: data.discipline_id,
    date: data.date,
    lockedBy: data.locked_by,
    lockedAt: data.locked_at
  }
}

export async function lockAttendance(disciplineId: string, date: string, lockedBy: string): Promise<void> {
  const supabase = createClient()
  // Ensure we don't hit UUID error with 'master'
  const userId = lockedBy === 'master' ? '00000000-0000-0000-0000-000000000000' : lockedBy

  await supabase.from('attendance_locks').insert({
    discipline_id: disciplineId,
    date,
    locked_by: userId,
    locked_at: new Date().toISOString()
  })
}

export async function unlockAttendance(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('attendance_locks').delete().eq('id', id)
}

// ─── n8n WhatsApp Integration ──────────────────────────────────────────────

// ─── Notas (Student Grades) ───────────────────────────────────────────

export async function getStudentGrades(): Promise<StudentGrade[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_grades')
    .select('id, student_identifier, student_name, discipline_id, is_public, exam_grade, works_grade, seminar_grade, participation_bonus, attendance_score, custom_divisor, created_at, student_id')
    .order('created_at', { ascending: false })
    .limit(500) // Safety cap - prevents unbounded queries
  if (error) throw new Error(error.message)
  return (data || []).map(mapStudentGrade)
}

/**
 * Robustly links student_grades records to the correct student_id (UUID)
 * based on the identifier (CPF/Email).
 */
export async function syncStudentGrades(studentId: string, cpf?: string, email?: string): Promise<{ affected: number }> {
  const supabase = createClient()
  const cleanCpf = cpf?.replace(/\D/g, '') || ""

  // Find records that don't have student_id but match CPF or Email
  let query = supabase.from('student_grades')
    .select('id')
    .is('student_id', null)

  const conditions = []
  if (cleanCpf) conditions.push(`student_identifier.eq.${cleanCpf}`)
  if (email) conditions.push(`student_identifier.eq.${email.toLowerCase().trim()}`)

  if (conditions.length === 0) return { affected: 0 }

  const { data: orphans } = await query.or(conditions.join(','))

  if (!orphans || orphans.length === 0) return { affected: 0 }

  const ids = orphans.map((o: any) => o.id)
  const { error } = await supabase.from('student_grades')
    .update({ student_id: studentId })
    .in('id', ids)

  if (error) {
    console.error("Error during grade sync:", error)
    return { affected: 0 }
  }

  return { affected: ids.length }
}

/**
 * Bulk repairs grade records for all students.
 */
export async function bulkSyncGrades(): Promise<{ totalAffected: number }> {
  const students = await getStudents()
  let totalAffected = 0
  for (const student of students) {
    const { affected } = await syncStudentGrades(student.id, student.cpf, student.email)
    totalAffected += affected
  }
  return { totalAffected }
}

/**
 * Fetches all attendances for a specific student in a single call.
 */
export async function getStudentAttendances(studentId: string): Promise<Attendance[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('attendances')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })

  if (error) {
    console.error("Error fetching student attendances:", error)
    return []
  }

  return (data || []).map(mapAttendance)
}

export async function saveStudentGrade(grade: Omit<StudentGrade, 'id' | 'createdAt'>, id?: string): Promise<void> {
  const supabase = createClient()
  let student_id = grade.studentId || grade.student_id || null

  // Auto-link ID if missing but identifier exists
  if (!student_id && grade.studentIdentifier) {
    const cleanId = grade.studentIdentifier.replace(/\D/g, '')
    const { data: std } = await supabase.from('students')
      .select('id')
      .or(`cpf.eq.${cleanId},email.eq.${grade.studentIdentifier}`)
      .maybeSingle()
    if (std) student_id = std.id
  }

  const dbData: any = {
    student_identifier: grade.studentIdentifier,
    student_name: grade.studentName,
    discipline_id: grade.disciplineId || null,
    is_public: grade.isPublic,
    exam_grade: grade.examGrade,
    works_grade: grade.worksGrade,
    seminar_grade: grade.seminarGrade,
    participation_bonus: grade.participationBonus,
    attendance_score: grade.attendanceScore,
    custom_divisor: grade.customDivisor,
  }

  if (id) {
    const { error } = await supabase.from('student_grades').update(dbData).eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('student_grades').insert({ ...dbData, created_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
  }
}

export async function getAvailableSlots(): Promise<number> {
  const supabase = createClient()

  // Get total capacity from classes
  const { data: classesData, error: classesError } = await supabase
    .from('classes')
    .select('max_students')

  if (classesError) {
    console.error("Error fetching classes capacity:", classesError)
    return 0
  }

  const totalCapacity = classesData.reduce((acc: number, curr: any) => acc + (curr.max_students || 0), 0)

  // Get current student count
  const { count, error: studentsError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  if (studentsError) {
    console.error("Error fetching student count:", studentsError)
    return 0
  }

  const currentStudents = count || 0
  const available = totalCapacity - currentStudents

  return available > 0 ? available : 0
}


export async function deleteStudentGrade(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('student_grades').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function releaseAllGrades(classId?: string): Promise<void> {
  const supabase = createClient()
  
  if (classId && classId !== 'all') {
    // 1. Find students in this class
    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('cpf, enrollment_number, email')
      .eq('class_id', classId)
    
    if (sErr) throw new Error(sErr.message)
    
    if (students && students.length > 0) {
      // 2. Extract all possible identifiers (CPF, enrollment, email)
      const identifiers = Array.from(new Set(
        students.flatMap(s => [
          s.cpf?.replace(/\D/g, ''), 
          s.enrollment_number, 
          s.email?.toLowerCase().trim()
        ].filter(Boolean))
      ))

      if (identifiers.length > 0) {
        const { error: uErr } = await supabase
          .from('student_grades')
          .update({ is_public: true })
          .in('student_identifier', identifiers)
        
        if (uErr) throw new Error(uErr.message)
      }
    }
  } else {
    // 3. Global Release: Update all records where is_public is not true
    // We use a dummy filter that is always true for all records (id is not null)
    const { error: uErr } = await supabase
      .from('student_grades')
      .update({ is_public: true })
      .filter('id', 'neq', '00000000-0000-0000-0000-000000000000')
    
    if (uErr) throw new Error(uErr.message)
  }
}

/**
 * Standardized average calculation using global settings.
 * formula: (Grade/10 * Weight) for each category + AttendanceScore (already in points)
 */
export function calculateGlobalAverage(grade: StudentGrade, settings: GradeSettings): string {
  const exam = (grade.examGrade || 0)
  const test = (grade.seminarGrade || 0)
  const work = (grade.worksGrade || 0)
  const bonus = (grade.participationBonus || 0)
  const presence = (grade.attendanceScore || 0)
  
  // If divisor is set (greater than 1), use simple sum divided by divisor
  if (settings.divisor > 1) {
    const sum = exam + test + work + bonus + presence
    return (sum / settings.divisor).toFixed(2)
  }

  // Fallback to weighted system
  const e = (exam / 10) * (settings.examWeight || 0)
  const t = (test / 10) * (settings.testWeight || 0)
  const w = (work / 10) * (settings.workWeight || 0)
  const b = (bonus / 10) * (settings.bonusWeight || 0)
  const p = presence
  
  return (e + t + w + b + p).toFixed(2)
}

/**
 * Retrospectively syncs all attendance scores in student_grades table
 * based on the current presenceValue in settings.
 */
export async function syncAllAttendanceScores(): Promise<void> {
  const supabase = createClient()
  const settings = await getGradeSettings()
  if (!settings) throw new Error("Configurações não encontradas.")
  
  console.log("DEBUG: Iniciando sincronização retrospectiva...");
  
  // 1. Get all presences
  const { data: allAtt, error: attError } = await supabase
    .from('attendances')
    .select('student_id, discipline_id')
    .eq('is_present', true)
  
  if (attError) throw new Error("Erro ao buscar presenças: " + attError.message)
  if (!allAtt || allAtt.length === 0) {
    console.log("DEBUG: Nenhuma presença encontrada para sincronizar.");
    return
  }

  // 2. Group by student and discipline
  const counts: Record<string, number> = {}
  allAtt.forEach(a => {
    const key = `${a.student_id}:${a.discipline_id}`
    counts[key] = (counts[key] || 0) + 1
  })

  console.log(`DEBUG: Processando ${Object.keys(counts).length} pares aluno/disciplina...`);

  // 3. Update student_grades
  const { data: students } = await supabase.from('students').select('id, name, email, cpf')
  const studentMap: Record<string, any> = {}
  students?.forEach(s => { studentMap[s.id] = s })

  // Process sequentially to avoid Supabase connection overhead/timeouts
  for (const [key, count] of Object.entries(counts)) {
    const [studentId, disciplineId] = key.split(':')
    const score = Math.min(count * settings.presenceValue, 10.0)
    const student = studentMap[studentId]
    
    // Attempt 1: by student_id
    const { data: updated, error: uErr } = await supabase.from('student_grades')
      .update({ attendance_score: score, student_id: studentId })
      .eq('student_id', studentId)
      .eq('discipline_id', disciplineId)
      .select()

    // Attempt 2: by legacy identifier (email/cpf) if Attempt 1 found nothing
    if (!uErr && (!updated || updated.length === 0) && student) {
      const identifiers = [student.email, student.cpf, student.email?.split('@')[0]].filter(Boolean)
      
      for (const ident of identifiers) {
        const { data: up2 } = await supabase.from('student_grades')
          .update({ attendance_score: score, student_id: studentId }) 
          .eq('student_identifier', ident)
          .eq('discipline_id', disciplineId)
          .select()
        
        if (up2 && up2.length > 0) break;
      }
    }
  }

  console.log("DEBUG: Sincronização concluída.");
}

// ─── Profile / Avatar Management ──────────────────────────────────────────

export async function uploadAvatar(file: File, userId: string, folder: 'students' | 'professors' | 'board'): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file)

  if (uploadError) throw new Error(uploadError.message)

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string,
  type: 'student' | 'professor' | 'board'
): Promise<void> {
  const supabase = createClient()

  // 1. Special Case: Master Professor Account
  if (type === 'professor' && (userId === 'master' || userId === MASTER_CREDENTIALS.email)) {
    console.log("DEBUG-V1.2.2: Atualizando Avatar do Master...");
    const { error: masterError } = await supabase
      .from('professor_accounts')
      .upsert({
        email: MASTER_CREDENTIALS.email,
        avatar_url: avatarUrl,
        name: MASTER_CREDENTIALS.name,
        role: 'master',
        active: true
      }, { onConflict: 'email' })

    if (masterError) {
      console.error("DEBUG-V1.2.2: Erro ao dar upsert no Master:", masterError.message);
      throw new Error("Erro ao atualizar foto do Master: " + masterError.message);
    }
    return;
  }

  // 2. Normal Case: Other Users
  let table = ''
  if (type === 'student') table = 'students'
  else if (type === 'professor') table = 'professor_accounts'
  else if (type === 'board') table = 'board_members'

  if (!table) throw new Error("Tipo de perfil inválido para atualização de avatar.");

  let success = false;
  let lastError = "";

  // Attempt 1: Update by ID
  console.log(`DEBUG-V1.2.2: Tentando atualizar avatar na tabela ${table} por ID: ${userId}`);
  const { data: idUpdate, error: idError } = await supabase
    .from(table)
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
    .select()
    .maybeSingle()

  if (idUpdate && !idError) {
    success = true;
    console.log("DEBUG-V1.2.2: Atualização por ID concluída com sucesso.");
  } else {
    lastError = idError?.message || "Nenhum registro encontrado por ID.";
    console.warn("DEBUG-V1.2.2: Atualização por ID falhou ou não encontrou registro:", lastError);
  }

  // Attempt 2: Fallback to Email (for professors or students where we might have email)
  if (!success && (type === 'professor' || type === 'student')) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const emailToTry = user?.email;

      if (emailToTry) {
        console.log(`DEBUG-V1.2.2: Tentando fallback por Email: ${emailToTry}`);
        const { data: emailUpdate, error: emailError } = await supabase
          .from(table)
          .update({ avatar_url: avatarUrl })
          .eq('email', emailToTry.toLowerCase().trim())
          .select()
          .maybeSingle();

        if (emailUpdate && !emailError) {
          success = true;
          console.log("DEBUG-V1.2.2: Atualização por Email concluída com sucesso.");
        } else {
          lastError = emailError?.message || "Nenhum registro encontrado por Email.";
          console.warn("DEBUG-V1.2.2: Fallback por email falhou:", lastError);
        }
      }
    } catch (e: any) {
      console.error("DEBUG-V1.2.2: Erro durante tentativa de fallback por email:", e);
    }
  }

  if (!success) {
    throw new Error(`Falha ao atualizar avatar em ${table}: ${lastError}`);
  }
}

export async function getStudentProfile(id: string): Promise<StudentProfile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as StudentProfile
}

export async function getClassmates(classId: string): Promise<StudentProfile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('name')

  if (error) return []
  return data as StudentProfile[]
}

export async function getProfessorAccount(id: string): Promise<ProfessorAccount | null> {
  const supabase = createClient()

  if (id === 'master') {
    const { data, error } = await supabase
      .from('professor_accounts')
      .select('*')
      .eq('email', MASTER_CREDENTIALS.email)
      .maybeSingle()

    if (data) return mapProfessor(data)
    // Fallback to hardcoded credentials if DB record doesn't exist yet
    return { ...MASTER_CREDENTIALS, id: 'master', passwordHash: '', createdAt: new Date().toISOString() }
  }

  const { data, error } = await supabase
    .from('professor_accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return mapProfessor(data)
}
export async function syncStudentTuitionByDisciplines(studentId: string): Promise<void> {
  const supabase = createClient()

  // 1. Get Student and their Class
  const { data: student } = await supabase.from('students').select('class_id, created_at').eq('id', studentId).single()
  if (!student) return

  // 2. Get All Semesters and All Curriculum Disciplines
  const [semestersResult, disciplinesResult] = await Promise.all([
    supabase.from('semesters').select('*').order('order', { ascending: true }),
    supabase.from('disciplines').select('*')
  ])

  const semesters = semestersResult.data || []
  const currDisciplines = (disciplinesResult.data || []).map(mapDiscipline)
  if (currDisciplines.length === 0) return

  const monthMap: Record<string, number> = {
    'Jan': 1, 'Fev': 2, 'Mar': 3, 'Abr': 4, 'Mai': 5, 'Jun': 6,
    'Jul': 7, 'Ago': 8, 'Set': 9, 'Out': 10, 'Nov': 11, 'Dez': 12
  }

  // Sort disciplines strictly by Semester Order then Discipline Order
  const disciplines = currDisciplines
    .sort((a: any, b: any) => {
      const semA = semesters.find((s: any) => s.id === a.semesterId)
      const semB = semesters.find((s: any) => s.id === b.semesterId)
      const semOrderA = semA?.order ?? 999
      const semOrderB = semB?.order ?? 999

      if (semOrderA !== semOrderB) return semOrderA - semOrderB
      return a.order - b.order
    })

  // 3. Get Settings
  const settings = await getFinancialSettings()
  if (!settings) return

  const charges = []

  // 4. Add Enrollment Fee (Taxa de Matrícula) - ALWAYS FIRST
  // Use a date slightly before any possible discipline to force it to the top
  const enrollmentDate = new Date(student.created_at || Date.now())
  enrollmentDate.setHours(0, 0, 0, 0)

  charges.push({
    student_id: studentId,
    type: 'enrollment',
    description: 'Taxa de Matrícula',
    amount: settings.enrollmentFee,
    due_date: enrollmentDate.toISOString().split('T')[0],
    status: 'pending',
    created_at: new Date().toISOString()
  })

  // 5. Add Discipline-based Monthly Fees (Exactly 18)
  disciplines.forEach((disp: any, index: number) => {
    let year = parseInt(disp.applicationYear || "2026")
    let monthNum = 1

    if (disp.applicationMonth) {
      if (monthMap[disp.applicationMonth]) {
        monthNum = monthMap[disp.applicationMonth]
      } else {
        monthNum = parseInt(disp.applicationMonth) || 1
      }
    }

    // Ensure due date is at least the next day or in correct sequence
    const dueDate = new Date(year, monthNum - 1, 10)

    // Safety check: if due date ends up being before enrollment date,
    // we still keep it but the ordering in UI will be clarified by creation order too

    charges.push({
      student_id: studentId,
      type: 'monthly',
      description: `Mensalidade: ${disp.name}`,
      discipline_id: disp.id,
      amount: settings.monthlyFee,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString()
    })
  })

  // 6. Bulk Sync Logic (Fixing divergence)
  // Get existing charges to preserve "paid" ones
  const { data: existing } = await supabase.from('financial_charges')
    .select('id, description, status, amount, type')
    .eq('student_id', studentId)
    .neq('type', 'expense')

  // Identify charges to insert or update
  const finalCharges = charges.filter(nc => {
    // Check if this specific charge is already paid
    if (nc.type === 'enrollment') {
      return !(existing || []).some((ex: any) => ex.type === 'enrollment' && ex.status === 'paid')
    }
    return !(existing || []).some((ex: any) => ex.description === nc.description && ex.status === 'paid')
  })

  // Clean up ALL non-paid charges to ensure the new list is exactly 18+1
  await supabase.from('financial_charges')
    .delete()
    .eq('student_id', studentId)
    .neq('type', 'expense')
    .neq('status', 'paid')

  // Insert the missing/updated charges
  if (finalCharges.length > 0) {
    const { error } = await supabase.from('financial_charges').insert(finalCharges)
    if (error) throw new Error(error.message)
  }
}

export async function settleFinancialCharge(id: string, data: {
  paidAmount: number,
  method: "cartao" | "pix" | "dinheiro",
  date: string
}): Promise<void> {
  const supabase = createClient()
  const dbData = {
    status: 'paid',
    actual_paid_amount: data.paidAmount,
    payment_method: data.method,
    payment_date: data.date
  }
  const { error } = await supabase.from('financial_charges').update(dbData).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reverseFinancialCharge(id: string): Promise<void> {
  const supabase = createClient()
  const dbData = {
    status: 'pending',
    actual_paid_amount: null,
    payment_method: null,
    payment_date: null
  }
  const { error } = await supabase.from('financial_charges').update(dbData).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateFinancialCharge(id: string, data: {
  amount?: number
  description?: string
  dueDate?: string
  status?: FinancialCharge["status"]
}): Promise<void> {
  const supabase = createClient()
  const dbData: any = {}
  if (data.amount !== undefined) dbData.amount = data.amount
  if (data.description !== undefined) dbData.description = data.description
  if (data.dueDate !== undefined) dbData.due_date = data.dueDate
  if (data.status !== undefined) dbData.status = data.status

  const { error } = await supabase.from('financial_charges').update(dbData).eq('id', id)
  if (error) throw new Error(error.message)
}

// Build timestamp: 2026-03-13 10:59

