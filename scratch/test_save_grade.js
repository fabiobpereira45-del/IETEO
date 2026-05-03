const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
  const studentId = '33836f65-0abe-40f2-9b2f-1494d62d32c8'
  const disciplineId = 'd1'
  const score = 10.0

  console.log(`Attempting update for Student: ${studentId}, Discipline: ${disciplineId}, Score: ${score}`)
  
  const { data, error } = await supabase.from('student_grades')
    .update({ attendance_score: score })
    .eq('student_id', studentId)
    .eq('discipline_id', disciplineId)
    .select()

  if (error) {
    console.error("Update Error:", error.message)
  } else {
    console.log("Update Result:", data)
  }
}

testUpdate()
