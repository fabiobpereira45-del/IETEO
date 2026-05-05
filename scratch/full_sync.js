const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fullSync() {
  console.log("=== SINCRONIZAÇÃO COMPLETA DE PRESENÇAS ===\n")

  // 1. Get settings
  const { data: settingsRow } = await supabase.from('grade_settings').select('*').eq('id', 'global').maybeSingle()
  const presenceValue = Number(settingsRow?.presence_value || 0.5)
  const divisor = Number(settingsRow?.divisor || 2)
  console.log(`Configuração: valor por presença = ${presenceValue}, divisor = ${divisor}\n`)

  // 2. Get all students
  const { data: students } = await supabase.from('students').select('id, name, email, cpf')
  console.log(`Total de alunos: ${students?.length || 0}`)

  // 3. Get all grades
  const { data: allGrades } = await supabase.from('student_grades').select('*')
  console.log(`Total de registros de notas: ${allGrades?.length || 0}\n`)

  // 4. Get all presences
  const { data: allAtt } = await supabase.from('attendances').select('student_id, discipline_id').eq('is_present', true)
  console.log(`Total de presenças registradas: ${allAtt?.length || 0}\n`)

  // 5. Group presences
  const counts = {}
  allAtt?.forEach(a => {
    const key = `${a.student_id}:${a.discipline_id}`
    counts[key] = (counts[key] || 0) + 1
  })

  console.log(`Pares aluno/disciplina com presenças: ${Object.keys(counts).length}\n`)

  // 6. Build student lookup maps
  const studentById = {}
  const studentByEmail = {}
  const studentByCpf = {}
  students?.forEach(s => {
    studentById[s.id] = s
    if (s.email) studentByEmail[s.email.toLowerCase()] = s
    if (s.cpf) studentByCpf[s.cpf] = s
    // Also index by CPF without formatting
    if (s.cpf) studentByCpf[s.cpf.replace(/\D/g, '')] = s
  })

  // 7. Build grades lookup - try to find by student_id first, then by identifiers
  let updatedCount = 0
  let notFoundCount = 0

  for (const [key, count] of Object.entries(counts)) {
    const [studentId, disciplineId] = key.split(':')
    const score = Math.min(count * presenceValue, 10.0)
    const student = studentById[studentId]

    // Try update by student_id
    const { data: updated, error: uErr } = await supabase.from('student_grades')
      .update({ attendance_score: score, student_id: studentId })
      .eq('student_id', studentId)
      .eq('discipline_id', disciplineId)
      .select('id')

    if (updated && updated.length > 0) {
      console.log(`✅ ${student?.name || studentId} | ${disciplineId} | ${count} presenças → ${score} pts`)
      updatedCount++
      continue
    }

    // Try by various identifiers
    let found = false
    if (student) {
      const identifiers = [
        student.email,
        student.cpf,
        student.cpf?.replace(/\D/g, ''),
        student.email?.split('@')[0]
      ].filter(Boolean)

      for (const ident of identifiers) {
        const { data: up2, error: e2 } = await supabase.from('student_grades')
          .update({ attendance_score: score, student_id: studentId })
          .eq('student_identifier', ident)
          .eq('discipline_id', disciplineId)
          .select('id')

        if (up2 && up2.length > 0) {
          console.log(`✅ [LEGADO] ${student.name} | id=${ident} | ${count} presenças → ${score} pts`)
          updatedCount++
          found = true
          break
        }
      }
    }

    if (!found) {
      console.log(`❌ NÃO ENCONTRADO: student_id=${studentId} | discipline=${disciplineId} | ${count} presenças`)
      notFoundCount++
    }
  }

  console.log(`\n=== RESULTADO ===`)
  console.log(`✅ Atualizados: ${updatedCount}`)
  console.log(`❌ Não encontrados: ${notFoundCount}`)

  // 8. Also show what's in student_grades that has attendance_score = 0
  const { data: zeros } = await supabase.from('student_grades').select('*').eq('attendance_score', 0)
  console.log(`\nRegistros ainda com presença = 0: ${zeros?.length || 0}`)
  if (zeros && zeros.length > 0) {
    zeros.forEach(g => console.log(`  - ${g.student_name} | discipline=${g.discipline_id} | identifier=${g.student_identifier} | student_id=${g.student_id}`))
  }
}

fullSync()
