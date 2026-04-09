import { createClient } from "@/lib/supabase/client"
// CACHE-BUSTER: v1.2.2-cloud - 2026-03-13 19:26
import { triggerN8nWebhook } from "@/lib/n8n"
export { triggerN8nWebhook }

// ─── Types ────────────────────────────────────────────────────────────────────
export type QuestionType = "multiple-choice" | "true-false" | "discursive" | "incorrect-alternative" | "fill-in-the-blank" | "matching"
export interface Choice { id: string; text: string }
export interface MatchingPair { id: string; left: string; right: string }
export interface Semester { id: string; name: string; order: number; shift?: string; isConcluded?: boolean; createdAt: string }
export interface Discipline { id: string; name: string; description?: string | null; semesterId?: string | null; professorName?: string | null; dayOfWeek?: string | null; shift?: string | null; order: number; applicationMonth?: string | null; applicationYear?: string | null; isConcluded?: boolean; createdAt: string }
export interface StudyMaterial { id: string; disciplineId: string; title: string; description?: string; fileUrl: string; createdAt: string }
export interface FinancialSettings { id: string; enrollmentFee: number; monthlyFee: number; secondCallFee: number; finalExamFee: number; totalMonths: number; creditCardUrl?: string; pixKey?: string; updatedAt: string; }
export interface FinancialCharge { id: string; studentId: string; type: "enrollment" | "monthly" | "second_call" | "final_exam" | "other"; description: string; amount: number; dueDate: string; status: "pending" | "paid" | "cancelled" | "late" | "bolsa100" | "bolsa50"; paymentDate?: string; pixQrcode?: string; pixCopyPaste?: string; createdAt: string; }
export interface Question { id: string; disciplineId: string; type: QuestionType; text: string; choices: Choice[]; pairs?: MatchingPair[]; correctAnswer: string; points: number; createdAt: string }
export interface Assessment { id: string; title: string; disciplineId: string; professor: string; institution: string; questionIds: string[]; pointsPerQuestion: number; totalPoints: number; openAt: string | null; closeAt: string | null; isPublished: boolean; archived: boolean; shuffleVariants?: boolean; timeLimitMinutes?: number | null; logoBase64?: string; rules?: string; releaseResults?: boolean; modality?: "public" | "private"; createdAt: string }
export interface StudentAnswer { questionId: string; answer: string }
export interface StudentSubmission { id: string; assessmentId: string; studentName: string; studentEmail: string; answers: StudentAnswer[]; score: number; totalPoints: number; percentage: number; submittedAt: string; timeElapsedSeconds: number; focusLostCount?: number }
export interface ProfessorAccount { id: string; name: string; email: string; passwordHash: string; role: "master" | "professor"; avatar_url?: string | null; bio?: string | null; createdAt: string; active?: boolean }
export interface ProfessorSession { loggedIn: boolean; professorId: string; role: "master" | "professor"; avatar_url?: string | null; expiresAt: string }
export interface StudentSession { name: string; email: string; assessmentId: string; startedAt: string }
export interface StudentProfile { id: string; auth_user_id: string; name: string; cpf: string; enrollment_number: string; phone?: string; address?: string; church?: string; pastor_name?: string; class_id?: string; payment_status?: string; avatar_url?: string | null; bio?: string | null; status: "pending" | "active" | "inactive"; created_at: string; }
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
  studentIdentifier: string; // CPF or Email
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
export function saveProfessorSession(professorId: string, role: "master" | "professor", avatar_url?: string | null): void {
  try {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    writeLocal<ProfessorSession>(KEYS.PROFESSOR_SESSION, { loggedIn: true, professorId, role, avatar_url, expiresAt })
  } catch (err) {
    console.error("Erro ao salvar sessão do professor:", err)
  }
}
export function clearProfessorSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEYS.PROFESSOR_SESSION)
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
    await triggerN8nWebhook('matricula_confirmada', {
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
    localStorage.removeItem(KEYS.STUDENT_SESSION)
    localStorage.removeItem(KEYS.DRAFT_ANSWERS)
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
function mapSubmission(row: any): StudentSubmission { return { id: row.id, assessmentId: row.assessment_id, studentName: row.student_name, studentEmail: row.student_email, answers: row.answers, score: row.score, totalPoints: row.total_points, percentage: row.percentage, submittedAt: row.submitted_at, timeElapsedSeconds: row.time_elapsed_seconds, focusLostCount: row.focus_lost_count || 0 } }
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
function mapFinancialSettings(row: any): FinancialSettings { return { id: row.id, enrollmentFee: Number(row.enrollment_fee), monthlyFee: Number(row.monthly_fee), secondCallFee: Number(row.second_call_fee), finalExamFee: Number(row.final_exam_fee), totalMonths: Number(row.total_months), creditCardUrl: row.credit_card_url || undefined, pixKey: row.pix_key || undefined, updatedAt: row.updated_at } }
function mapFinancialCharge(row: any): FinancialCharge { return { id: row.id, studentId: row.student_id, type: row.type, description: row.description, amount: Number(row.amount), dueDate: row.due_date, status: row.status, paymentDate: row.payment_date || undefined, pixQrcode: row.pix_qrcode || undefined, pixCopyPaste: row.pix_copy_paste || undefined, createdAt: row.created_at } }
function mapStudentProfile(row: any): StudentProfile { return { id: row.id, auth_user_id: row.auth_user_id, name: row.name, cpf: row.cpf, enrollment_number: row.enrollment_number, phone: row.phone || undefined, address: row.address || undefined, church: row.church || undefined, pastor_name: row.pastor_name || undefined, class_id: row.class_id || undefined, payment_status: row.payment_status || undefined, avatar_url: row.avatar_url || null, bio: row.bio || null, status: (row.status || 'pending') as StudentProfile['status'], created_at: row.created_at } }
function mapChatMessage(row: any): ChatMessage { return { id: row.id, studentId: row.student_id, disciplineId: row.discipline_id, message: row.message, isFromStudent: row.is_from_student, read: row.read, createdAt: row.created_at } }
function mapAttendance(row: any): Attendance { return { id: row.id, studentId: row.student_id, disciplineId: row.discipline_id, date: row.date, isPresent: row.is_present, createdAt: row.created_at } }
function mapClassRoom(row: any): ClassRoom { return { id: row.id, name: row.name, shift: row.shift as ClassRoom['shift'], dayOfWeek: row.day_of_week || undefined, maxStudents: Number(row.max_students), studentCount: row.student_count !== undefined ? Number(row.student_count) : undefined, createdAt: row.created_at } }
function mapClassSchedule(row: any): ClassSchedule { return { id: row.id, classId: row.class_id, disciplineId: row.discipline_id, professorName: row.professor_name, dayOfWeek: row.day_of_week, timeStart: row.time_start, timeEnd: row.time_end, lessonsCount: Number(row.lessons_count || 1), workload: Number(row.workload || 0), startDate: row.start_date || undefined, endDate: row.end_date || undefined, createdAt: row.created_at } }
function mapStudentGrade(row: any): StudentGrade { return { id: row.id, studentIdentifier: row.student_identifier, studentName: row.student_name, disciplineId: row.discipline_id || undefined, isPublic: row.is_public, examGrade: Number(row.exam_grade), worksGrade: Number(row.works_grade), seminarGrade: Number(row.seminar_grade), participationBonus: Number(row.participation_bonus), attendanceScore: Number(row.attendance_score), customDivisor: Number(row.custom_divisor), createdAt: row.created_at } }
function mapBoardMember(row: any): BoardMember { return { id: row.id, name: row.name, role: row.role, category: row.category, avatar_url: row.avatar_url, createdAt: row.created_at } }
function mapProfessorDiscipline(row: any): ProfessorDiscipline { return { id: row.id, professorId: row.professor_id, disciplineId: row.discipline_id, createdAt: row.created_at } }

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
  let query = supabase.from('financial_charges').select('*').order('due_date', { ascending: false })
  if (studentId) query = query.eq('student_id', studentId)

  const { data } = await query
  return (data || []).map(mapFinancialCharge)
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
      await triggerN8nWebhook('pagamento_gerado', {
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
        await triggerN8nWebhook('pagamento_confirmado', {
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
  await supabase.from('semesters').update(updatePayload).eq('id', id)
}
export async function deleteSemester(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('semesters').delete().eq('id', id)
}

export async function getDisciplines(): Promise<Discipline[]> {
  const supabase = createClient()
  const { data } = await supabase.from('disciplines').select('*')
  return (data || [])
    .map(mapDiscipline)
    .sort((a, b) => {
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
  const ids = links.map(l => l.discipline_id)
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
export async function addDiscipline(name: string, description?: string | null, semesterId?: string | null, professorName?: string | null, dayOfWeek?: string | null, shift?: string | null, order?: number): Promise<Discipline> {
  const d = { 
    id: uid(), 
    name, 
    description: description || null, 
    semester_id: semesterId || null, 
    professor_name: professorName || null, 
    day_of_week: dayOfWeek || null, 
    shift: shift || null, 
    "order": order || 0,
    application_month: null, 
    application_year: null, 
    is_concluded: false,
    created_at: new Date().toISOString() 
  }
  const supabase = createClient()
  await supabase.from('disciplines').insert(d)
  return mapDiscipline(d)
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
  await supabase.from('disciplines').update(updateData).eq('id', id)
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
  const { data, error } = await supabase.from('assessments').select('*').order('created_at', { ascending: false })
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
        await triggerN8nWebhook('prova_publicada', {
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
      await triggerN8nWebhook('prova_concluida', {
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
      await triggerN8nWebhook('nova_mensagem_chat', {
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

export async function saveAttendance(studentId: string, disciplineId: string, date: string, isPresent: boolean): Promise<void> {
  const supabase = createClient()
  const { data: existing } = await supabase.from('attendances').select('id').match({ student_id: studentId, discipline_id: disciplineId, date }).maybeSingle()
  if (existing) {
    await supabase.from('attendances').update({ is_present: isPresent }).eq('id', existing.id)
  } else {
    await supabase.from('attendances').insert({ student_id: studentId, discipline_id: disciplineId, date, is_present: isPresent, created_at: new Date().toISOString() })
  }

  // --- AUTOMATIC ATTENDANCE SCORE UPDATE ---
  try {
    // 1. Get total lessons count for this discipline to calculate dynamic weight
    const { data: schedule } = await supabase.from('class_schedules')
      .select('lessons_count')
      .eq('discipline_id', disciplineId)
      .maybeSingle();
    
    const lessonsCount = schedule?.lessons_count || 4; // Default to 4 if not specified
    const weightPerPresence = 10 / lessonsCount;

    // 2. Count all presences for this student in this discipline
    const { data: allAtt } = await supabase.from('attendances')
      .select('is_present')
      .match({ student_id: studentId, discipline_id: disciplineId });
    
    const presenceCount = (allAtt || []).filter(a => a.is_present).length;
    const attendanceScore = parseFloat((presenceCount * weightPerPresence).toFixed(2));

    // 3. Get student info for the grade record
    const { data: student } = await supabase.from('students').select('name, email').eq('id', studentId).single();
    
    if (student) {
      // 4. Find/Update student_grade
      const { data: existingGrade } = await supabase.from('student_grades')
        .select('id')
        .match({ student_identifier: student.email, discipline_id: disciplineId })
        .maybeSingle();

      const gradeData = {
        student_identifier: student.email,
        student_name: student.name,
        discipline_id: disciplineId,
        attendance_score: attendanceScore,
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
      await triggerN8nWebhook('falta_registrada', {
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

// ─── Notas (Student Grades) ───────────────────────────────────────────────────

export async function getStudentGrades(): Promise<StudentGrade[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('student_grades').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map(mapStudentGrade)
}

export async function saveStudentGrade(grade: Omit<StudentGrade, 'id' | 'createdAt'>, id?: string): Promise<void> {
  const supabase = createClient()
  const dbData = {
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

  const totalCapacity = classesData.reduce((acc, curr) => acc + (curr.max_students || 0), 0)

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

export async function releaseAllGrades(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('student_grades').update({ is_public: true }).eq('is_public', false)
  if (error) throw new Error(error.message)
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
export async function generateMonthlyCharges(studentId: string, monthlyFee: number): Promise<void> {
  const supabase = createClient()
  const charges = []
  
  // Starting April 10th, 2026
  let currentMonth = 3 // April (0-indexed)
  let currentYear = 2026

  for (let i = 1; i <= 18; i++) {
    const dueDate = new Date(currentYear, currentMonth, 10)
    const dateStr = dueDate.toISOString().split('T')[0]
    
    charges.push({
      student_id: studentId,
      type: 'monthly',
      description: `Mensalidade ${i}/18`,
      amount: monthlyFee,
      due_date: dateStr,
      status: 'pending',
      created_at: new Date().toISOString()
    })

    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
  }

  const { error } = await supabase.from('financial_charges').insert(charges)
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

