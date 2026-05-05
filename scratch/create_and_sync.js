const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
// Using anon key — for inserts we may need service role, let's try anon first
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function createMissingGradesAndSync() {
  console.log("=== CRIANDO REGISTROS FALTANTES E SINCRONIZANDO ===\n")

  // 1. Get settings
  const { data: settingsRow } = await supabase.from('grade_settings').select('*').eq('id', 'global').maybeSingle()
  const presenceValue = Number(settingsRow?.presence_value || 0.5)
  const divisor = Number(settingsRow?.divisor || 2)
  console.log(`Config: presença=${presenceValue}, divisor=${divisor}\n`)

  // 2. Get all students
  const { data: students } = await supabase.from('students').select('id, name, email, cpf, enrollment_number')
  console.log(`Alunos: ${students?.length}`)

  // 3. Get existing grade records
  const { data: existingGrades } = await supabase.from('student_grades').select('id, student_id, student_identifier, discipline_id')
  console.log(`Registros de notas existentes: ${existingGrades?.length}\n`)

  // 4. Get all presences grouped
  const { data: allAtt } = await supabase.from('attendances').select('student_id, discipline_id').eq('is_present', true)
  
  const counts = {}
  allAtt?.forEach(a => {
    const key = `${a.student_id}:${a.discipline_id}`
    counts[key] = (counts[key] || 0) + 1
  })
  console.log(`Pares aluno/disciplina com presença: ${Object.keys(counts).length}\n`)

  // 5. Build lookup maps
  const studentById = {}
  students?.forEach(s => { studentById[s.id] = s })

  // Build grade lookup by student_id + discipline_id
  const gradeKey = {}
  existingGrades?.forEach(g => {
    if (g.student_id) gradeKey[`${g.student_id}:${g.discipline_id}`] = g
  })

  // 6. Process each attendance pair
  let created = 0, updated = 0, errors = 0

  for (const [key, count] of Object.entries(counts)) {
    const [studentId, disciplineId] = key.split(':')
    const score = Math.min(count * presenceValue, 10.0)
    const student = studentById[studentId]

    if (!student) {
      console.log(`⚠️  Aluno ${studentId} não encontrado na tabela students`)
      errors++
      continue
    }

    const existing = gradeKey[key]

    if (existing) {
      // Update existing record
      const { error } = await supabase.from('student_grades')
        .update({ attendance_score: score, student_id: studentId })
        .eq('id', existing.id)
      
      if (error) {
        console.log(`❌ Erro ao atualizar ${student.name}: ${error.message}`)
        errors++
      } else {
        console.log(`✅ ATUALIZADO: ${student.name} | ${count} presenças → ${score} pts`)
        updated++
      }
    } else {
      // Create missing grade record
      const identifier = student.cpf?.replace(/\D/g, '') || student.email?.split('@')[0] || studentId
      const newRecord = {
        id: uid(),
        student_id: studentId,
        student_identifier: identifier,
        student_name: student.name,
        discipline_id: disciplineId,
        is_public: false,
        exam_grade: 0,
        works_grade: 0,
        seminar_grade: 0,
        participation_bonus: 0,
        attendance_score: score,
        custom_divisor: divisor,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase.from('student_grades').insert(newRecord)
      
      if (error) {
        console.log(`❌ Erro ao criar ${student.name}: ${error.message}`)
        errors++
      } else {
        console.log(`🆕 CRIADO: ${student.name} | ${count} presenças → ${score} pts`)
        created++
      }
    }
  }

  console.log(`\n=== RESULTADO FINAL ===`)
  console.log(`✅ Atualizados: ${updated}`)
  console.log(`🆕 Criados: ${created}`)
  console.log(`❌ Erros: ${errors}`)

  // Verify
  const { data: afterGrades } = await supabase.from('student_grades').select('*').gt('attendance_score', 0)
  console.log(`\nRegistros com presença > 0: ${afterGrades?.length}`)
}

createMissingGradesAndSync()
