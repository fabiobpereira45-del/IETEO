const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("Searching for student Neidival...")
  const { data: students, error: sErr } = await supabase.from('students').select('*').ilike('name', '%Neidival%')
  if (sErr) console.error(sErr)
  
  if (students && students.length > 0) {
    const student = students[0]
    console.log("Student Found:", student.id, student.name, student.email)
    
    console.log("Checking attendances for this student...")
    const { data: atts, error: aErr } = await supabase.from('attendances')
        .select('*')
        .eq('student_id', student.id)
        .eq('is_present', true)
    
    if (aErr) console.error(aErr)
    console.log("Present count:", atts?.length || 0)
    if (atts && atts.length > 0) {
        console.log("Sample attendance:", atts[0])
    }

    console.log("Checking student_grades for this student...")
    const { data: grades, error: gErr } = await supabase.from('student_grades')
        .select('*')
        .eq('student_identifier', student.email)
    
    if (gErr) console.error(gErr)
    console.log("Grades Found:", grades?.length || 0)
    if (grades && grades.length > 0) {
        console.log("First Grade Data:", grades[0])
    }
  } else {
    console.log("Student not found.")
  }
}

check()
