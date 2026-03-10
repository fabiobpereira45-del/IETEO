import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────────────────────
export type QuestionType = "multiple-choice" | "true-false" | "discursive" | "incorrect-alternative" | "fill-in-the-blank" | "matching"
export interface Choice { id: string; text: string }
export interface MatchingPair { id: string; left: string; right: string }
export interface Semester { id: string; name: string; order: number; shift?: string; createdAt: string }
export interface Discipline { id: string; name: string; description?: string; semesterId?: string; professorName?: string; dayOfWeek?: string; shift?: string; createdAt: string }
export interface StudyMaterial { id: string; disciplineId: string; title: string; description?: string; fileUrl: string; createdAt: string }
export interface FinancialSettings { id: string; enrollmentFee: number; monthlyFee: number; secondCallFee: number; finalExamFee: number; totalMonths: number; updatedAt: string; }
export interface PaypalConfig { id: string; clientId: string; secret: string; mode: "sandbox" | "live"; updatedAt: string; }
export interface AsaasConfig { id: string; apiKey: string; mode: "sandbox" | "production"; updatedAt: string; }
export interface FinancialCharge { id: string; studentId: string; type: "enrollment" | "monthly" | "second_call" | "final_exam" | "other"; description: string; amount: number; dueDate: string; status: "pending" | "paid" | "cancelled" | "late"; paymentDate?: string; paypalOrderId?: string; asaasPaymentId?: string; pixQrcode?: string; pixCopyPaste?: string; createdAt: string; }
export interface Question { id: string; disciplineId: string; type: QuestionType; text: string; choices: Choice[]; pairs?: MatchingPair[]; correctAnswer: string; points: number; createdAt: string }
export interface Assessment { id: string; title: string; disciplineId: string; professor: string; institution: string; questionIds: string[]; pointsPerQuestion: number; totalPoints: number; openAt: string | null; closeAt: string | null; isPublished: boolean; archived: boolean; shuffleVariants?: boolean; logoBase64?: string; rules?: string; releaseResults?: boolean; modality?: "public" | "private"; createdAt: string }
export interface StudentAnswer { questionId: string; answer: string }
export interface StudentSubmission { id: string; assessmentId: string; studentName: string; studentEmail: string; answers: StudentAnswer[]; score: number; totalPoints: number; percentage: number; submittedAt: string; timeElapsedSeconds: number }
export interface ProfessorAccount { id: string; name: string; email: string; passwordHash: string; role: "master" | "professor"; createdAt: string }
export interface ProfessorSession { loggedIn: boolean; professorId: string; role: "master" | "professor"; expiresAt: string }
export interface StudentSession { name: string; email: string; assessmentId: string; startedAt: string }
export interface StudentProfile { id: string; auth_user_id: string; name: string; cpf: string; enrollment_number: string; phone?: string; address?: string; church?: string; pastor_name?: string; class_id?: string; payment_status?: string; created_at: string; }
export interface ChatMessage { id: string; studentId: string; disciplineId: string; message: string; isFromStudent: boolean; read: boolean; createdAt: string; }
export interface Attendance { id: string; studentId: string; disciplineId: string; date: string; isPresent: boolean; createdAt: string; }
export interface ClassRoom { id: string; name: string; shift: "morning" | "afternoon" | "evening" | "ead"; dayOfWeek?: string; maxStudents: number; studentCount?: number; createdAt: string; }
export interface ClassSchedule { id: string; classId: string; disciplineId: string; professorName: string; dayOfWeek: string; timeStart: string; timeEnd: string; createdAt: string; }
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
export function saveProfessorSession(professorId: string, role: "master" | "professor"): void {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  writeLocal<ProfessorSession>(KEYS.PROFESSOR_SESSION, { loggedIn: true, professorId, role, expiresAt })
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
  const cleanCpf = data.cpf ? data.cpf.replace(/\D/g, '') : ""

  // Use email if provided, else generate fake one
  const email = data.email || `${cleanCpf || uid().slice(0, 11)}@student.ieteo.com`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: { data: { name: data.name, type: 'student' } }
  })
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error("Erro ao criar usuário na base de dados (Auth).")

  const matricula = `2026${Math.floor(1000 + Math.random() * 9000)}`

  const { error: dbError } = await supabase.from('students').insert({
    auth_user_id: authData.user.id,
    name: data.name,
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

  // Trigger Flow-Gravit WhatsApp
  try {
    const student = { name: data.name, phone: data.phone };
    await triggerFlowGravit('boas_vindas', {
      type: 'enrollment',
      name: student.name,
      phone: student.phone,
      matricula
    });
  } catch (err) {
    console.error("Erro ao disparar WhatsApp de boas-vindas:", err);
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
  return data
}

export async function getStudentProfileAuth(): Promise<StudentProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.type !== 'student') return null

  const { data } = await supabase.from('students').select('*').eq('auth_user_id', user.id).maybeSingle()
  return data as StudentProfile | null
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
function mapSemester(row: any): Semester { return { id: row.id, name: row.name, order: row.order, shift: row.shift || undefined, createdAt: row.created_at } }
function mapStudyMaterial(row: any): StudyMaterial { return { id: row.id, disciplineId: row.discipline_id, title: row.title, description: row.description || undefined, fileUrl: row.file_url, createdAt: row.created_at } }
function mapDiscipline(row: any): Discipline { return { id: row.id, name: row.name, description: row.description || undefined, semesterId: row.semester_id || undefined, professorName: row.professor_name || undefined, dayOfWeek: row.day_of_week || undefined, shift: row.shift || undefined, createdAt: row.created_at } }
function mapQuestion(row: any): Question { return { id: row.id, disciplineId: row.discipline_id, type: row.type, text: row.text, choices: row.choices, pairs: row.pairs, correctAnswer: row.correct_answer, points: row.points, createdAt: row.created_at } }
function mapAssessment(row: any): Assessment { return { id: row.id, title: row.title, disciplineId: row.discipline_id, professor: row.professor, institution: row.institution, questionIds: row.question_ids, pointsPerQuestion: row.points_per_question, totalPoints: row.total_points, openAt: row.open_at, closeAt: row.close_at, isPublished: row.is_published, archived: !!row.archived, shuffleVariants: row.shuffle_variants, logoBase64: row.logo_base64, rules: row.rules, releaseResults: row.release_results, modality: row.modality ?? "public", createdAt: row.created_at } }
function mapSubmission(row: any): StudentSubmission { return { id: row.id, assessmentId: row.assessment_id, studentName: row.student_name, studentEmail: row.student_email, answers: row.answers, score: row.score, totalPoints: row.total_points, percentage: row.percentage, submittedAt: row.submitted_at, timeElapsedSeconds: row.time_elapsed_seconds } }
function mapProfessor(row: any): ProfessorAccount { return { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash, role: row.role as any, createdAt: row.created_at } }
function mapFinancialSettings(row: any): FinancialSettings { return { id: row.id, enrollmentFee: Number(row.enrollment_fee), monthlyFee: Number(row.monthly_fee), secondCallFee: Number(row.second_call_fee), finalExamFee: Number(row.final_exam_fee), totalMonths: Number(row.total_months), updatedAt: row.updated_at } }
function mapPaypalConfig(row: any): PaypalConfig { return { id: row.id, clientId: row.client_id, secret: row.secret, mode: row.mode as "sandbox" | "live", updatedAt: row.updated_at } }
function mapAsaasConfig(row: any): AsaasConfig { return { id: row.id, apiKey: row.api_key, mode: row.mode as "sandbox" | "production", updatedAt: row.updated_at } }
function mapFinancialCharge(row: any): FinancialCharge { return { id: row.id, studentId: row.student_id, type: row.type, description: row.description, amount: Number(row.amount), dueDate: row.due_date, status: row.status, paymentDate: row.payment_date || undefined, paypalOrderId: row.paypal_order_id || undefined, asaasPaymentId: row.asaas_payment_id || undefined, pixQrcode: row.pix_qrcode || undefined, pixCopyPaste: row.pix_copy_paste || undefined, createdAt: row.created_at } }
function mapStudentProfile(row: any): StudentProfile { return { id: row.id, auth_user_id: row.auth_user_id, name: row.name, cpf: row.cpf, enrollment_number: row.enrollment_number, phone: row.phone || undefined, address: row.address || undefined, church: row.church || undefined, pastor_name: row.pastor_name || undefined, class_id: row.class_id || undefined, created_at: row.created_at } }
function mapChatMessage(row: any): ChatMessage { return { id: row.id, studentId: row.student_id, disciplineId: row.discipline_id, message: row.message, isFromStudent: row.is_from_student, read: row.read, createdAt: row.created_at } }
function mapAttendance(row: any): Attendance { return { id: row.id, studentId: row.student_id, disciplineId: row.discipline_id, date: row.date, isPresent: row.is_present, createdAt: row.created_at } }
function mapClassRoom(row: any): ClassRoom { return { id: row.id, name: row.name, shift: row.shift as ClassRoom['shift'], dayOfWeek: row.day_of_week || undefined, maxStudents: Number(row.max_students), studentCount: row.student_count !== undefined ? Number(row.student_count) : undefined, createdAt: row.created_at } }
function mapClassSchedule(row: any): ClassSchedule { return { id: row.id, classId: row.class_id, disciplineId: row.discipline_id, professorName: row.professor_name, dayOfWeek: row.day_of_week, timeStart: row.time_start, timeEnd: row.time_end, createdAt: row.created_at } }
function mapStudentGrade(row: any): StudentGrade { return { id: row.id, studentIdentifier: row.student_identifier, studentName: row.student_name, disciplineId: row.discipline_id || undefined, isPublic: row.is_public, examGrade: Number(row.exam_grade), worksGrade: Number(row.works_grade), seminarGrade: Number(row.seminar_grade), participationBonus: Number(row.participation_bonus), attendanceScore: Number(row.attendance_score), customDivisor: Number(row.custom_divisor), createdAt: row.created_at } }

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
    updated_at: new Date().toISOString()
  }
  const { data: existing } = await supabase.from('financial_settings').select('id').limit(1).maybeSingle()
  if (existing) {
    await supabase.from('financial_settings').update(dbData).eq('id', existing.id)
  } else {
    await supabase.from('financial_settings').insert(dbData)
  }
}

export async function getPaypalConfig(): Promise<PaypalConfig | null> {
  const supabase = createClient()
  const { data } = await supabase.from('paypal_config').select('*').limit(1).maybeSingle()
  return data ? mapPaypalConfig(data) : null
}
export async function updatePaypalConfig(config: Omit<PaypalConfig, "id" | "updatedAt">): Promise<void> {
  const supabase = createClient()
  const dbData = {
    client_id: config.clientId,
    secret: config.secret,
    mode: config.mode,
    updated_at: new Date().toISOString()
  }
  const { data: existing } = await supabase.from('paypal_config').select('id').limit(1).maybeSingle()
  if (existing) {
    await supabase.from('paypal_config').update(dbData).eq('id', existing.id)
  } else {
    await supabase.from('paypal_config').insert(dbData)
  }
}

export async function getAsaasConfig(): Promise<AsaasConfig | null> {
  const supabase = createClient()
  const { data } = await supabase.from('asaas_config').select('*').limit(1).maybeSingle()
  return data ? mapAsaasConfig(data) : null
}
export async function updateAsaasConfig(config: Omit<AsaasConfig, "id" | "updatedAt">): Promise<void> {
  const supabase = createClient()
  const dbData = {
    api_key: config.apiKey,
    mode: config.mode,
    updated_at: new Date().toISOString()
  }
  const { data: existing } = await supabase.from('asaas_config').select('id').limit(1).maybeSingle()
  if (existing) {
    await supabase.from('asaas_config').update(dbData).eq('id', existing.id)
  } else {
    await supabase.from('asaas_config').insert(dbData)
  }
}

export async function getClasses(): Promise<ClassRoom[]> {
  const supabase = createClient()
  const { data } = await supabase.from('classes').select('*').order('created_at', { ascending: false })
  return (data || []).map(mapClassRoom)
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
    paypal_order_id: charge.paypalOrderId || null,
    created_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from('financial_charges').insert(dbData).select().single()
  if (error) throw new Error(error.message)
  return mapFinancialCharge(data)
}
export async function updateFinancialChargeStatus(id: string, status: FinancialCharge["status"]): Promise<void> {
  const supabase = createClient()
  const dbData: any = { status }
  if (status === 'paid') dbData.payment_date = new Date().toISOString()
  if (status === 'pending') dbData.payment_date = null
  await supabase.from('financial_charges').update(dbData).eq('id', id)

  // Trigger Flow-Gravit WhatsApp (Payment Confirmed)
  if (status === 'paid') {
    try {
      const { data: charge } = await supabase.from('financial_charges').select('*, students(*)').eq('id', id).single()
      if (charge) {
        await triggerFlowGravit('confirmacao_pagamento', {
          type: 'payment',
          name: charge.students?.name,
          phone: charge.students?.phone,
          amount: charge.amount,
          description: charge.description
        })
      }
    } catch (err) {
      console.error("Erro ao disparar WhatsApp de confirmação de pagamento:", err)
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
  const s = { name, order, shift: shift || null, created_at: new Date().toISOString() }
  const supabase = createClient()
  const { data, error } = await supabase.from('semesters').insert(s).select().single()
  if (error) throw new Error(error.message)
  return mapSemester(data)
}
export async function updateSemester(id: string, data: Partial<Pick<Semester, "name" | "order" | "shift">>): Promise<void> {
  const supabase = createClient()
  const updatePayload: any = {}
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.order !== undefined) updatePayload.order = data.order
  if (data.shift !== undefined) updatePayload.shift = data.shift || null
  await supabase.from('semesters').update(updatePayload).eq('id', id)
}
export async function deleteSemester(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('semesters').delete().eq('id', id)
}

export async function getDisciplines(): Promise<Discipline[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('disciplines').select('*')
  return (data || []).map(mapDiscipline).sort((a, b) => a.name.localeCompare(b.name))
}
export async function addDiscipline(name: string, description?: string, semesterId?: string, professorName?: string, dayOfWeek?: string, shift?: string): Promise<Discipline> {
  const d = { id: uid(), name, description: description || null, semester_id: semesterId || null, professor_name: professorName || null, day_of_week: dayOfWeek || null, shift: shift || null, created_at: new Date().toISOString() }
  const supabase = createClient()
  await supabase.from('disciplines').insert(d)
  return mapDiscipline(d)
}
export async function updateDiscipline(id: string, data: Partial<Pick<Discipline, "name" | "description" | "semesterId" | "professorName" | "dayOfWeek" | "shift">>): Promise<void> {
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.semesterId !== undefined) updateData.semester_id = data.semesterId || null
  if (data.professorName !== undefined) updateData.professor_name = data.professorName || null
  if (data.dayOfWeek !== undefined) updateData.day_of_week = data.dayOfWeek || null
  if (data.shift !== undefined) updateData.shift = data.shift || null
  const supabase = createClient()
  await supabase.from('disciplines').update(updateData).eq('id', id)
}
export async function deleteDiscipline(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('disciplines').delete().eq('id', id)
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
  const q = { id: uid(), discipline_id: data.disciplineId, type: data.type, text: data.text, choices: data.choices, pairs: data.pairs || null, correct_answer: data.correctAnswer, points: data.points, created_at: new Date().toISOString() }
  const supabase = createClient()
  const { error } = await supabase.from('questions').insert(q)
  if (error) throw new Error(`Erro ao salvar questão: ${error.message}`)
  return mapQuestion(q)
}
export async function updateQuestion(id: string, data: Partial<Omit<Question, "id" | "createdAt">>): Promise<void> {
  const updateData: any = {}
  if (data.disciplineId !== undefined) updateData.discipline_id = data.disciplineId
  if (data.type !== undefined) updateData.type = data.type
  if (data.text !== undefined) updateData.text = data.text
  if (data.choices !== undefined) updateData.choices = data.choices
  if (data.pairs !== undefined) updateData.pairs = data.pairs
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
  const dbData = { id: a.id, title: a.title, discipline_id: a.disciplineId, professor: a.professor, institution: a.institution, question_ids: a.questionIds, points_per_question: a.pointsPerQuestion, total_points: a.totalPoints, open_at: a.openAt, close_at: a.closeAt, is_published: a.isPublished, archived: a.archived, shuffle_variants: a.shuffleVariants, logo_base64: a.logoBase64, rules: a.rules, release_results: a.releaseResults, modality: a.modality ?? "public", created_at: a.createdAt }
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
  if (data.archived !== undefined) dbData.archived = data.archived
  if (data.shuffleVariants !== undefined) dbData.shuffle_variants = data.shuffleVariants
  if (data.logoBase64 !== undefined) dbData.logo_base64 = data.logoBase64
  if (data.rules !== undefined) dbData.rules = data.rules
  if (data.releaseResults !== undefined) dbData.release_results = data.releaseResults
  if (data.modality !== undefined) dbData.modality = data.modality

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
    time_elapsed_seconds: sub.timeElapsedSeconds
  }

  const { data, error } = await supabase.from('student_submissions').insert(record).select().single()
  if (error) throw new Error(error.message)
  const result = mapSubmission(data)

  // Trigger Flow-Gravit WhatsApp (Exam Completed)
  try {
    const assessment = await getAssessmentById(sub.assessmentId);
    if (assessment) {
      await triggerFlowGravit('conclusao_prova', {
        type: 'exam_completion',
        name: sub.studentName,
        phone: sub.studentEmail.split('@')[0], // Fallback
        title: assessment.title
      });
    }
  } catch (err) {
    console.error("Erro ao disparar WhatsApp de conclusão de prova:", err);
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
    time_end: data.timeEnd
  }
  const { error } = await supabase.from('class_schedules').insert(dbData)
  if (error) throw new Error(error.message)
}

export async function deleteClassSchedule(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('class_schedules').delete().eq('id', id)
}

export async function getStudents(): Promise<StudentProfile[]> {
  const supabase = createClient()
  const { data } = await supabase.from('students').select('*').order('name', { ascending: true })
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
}): Promise<void> {
  const supabase = createClient()
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.cpf !== undefined) updateData.cpf = data.cpf.replace(/\D/g, '')
  if (data.phone !== undefined) updateData.phone = data.phone || null
  if (data.address !== undefined) updateData.address = data.address || null
  if (data.church !== undefined) updateData.church = data.church || null
  if (data.pastor_name !== undefined) updateData.pastor_name = data.pastor_name || null
  if (data.class_id !== undefined) updateData.class_id = data.class_id || null

  const { error } = await supabase.from('students').update(updateData).eq('id', id)
  if (error) throw new Error(error.message)
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
    const dbData = { student_id: studentId, discipline_id: disciplineId, date, is_present: isPresent, created_at: new Date().toISOString() }
    await supabase.from('attendances').insert(dbData)
  }
}

// ─── Flow-Gravit Integration ──────────────────────────────────────────────

export async function triggerFlowGravit(workflowId: string, payload: any): Promise<void> {
  // Use the environment variable for flexibility (local vs production)
  const FLOW_GRAVIT_BASE_URL = process.env.NEXT_PUBLIC_FLOW_GRAVIT_URL || "https://flow-gravit.vercel.app";
  const url = `${FLOW_GRAVIT_BASE_URL}/api/webhook/${workflowId}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Flow-Gravit trigger failed: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error("Flow-Gravit connection error:", error);
  }
}

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

export async function deleteStudentGrade(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('student_grades').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
