const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("Searching for Hermeneutica...")
  const { data: disciplines } = await supabase.from('disciplines').select('*').ilike('name', '%Hermeneutica%')
  console.log("Disciplines found:", disciplines?.map(d => ({id: d.id, name: d.name})))
  
  if (disciplines && disciplines.length > 0) {
    const dId = disciplines[0].id
    console.log("Searching for grades in Hermeneutica...")
    const { data: grades } = await supabase.from('student_grades').select('*').eq('discipline_id', dId)
    console.log("Total grades for Hermeneutica:", grades?.length || 0)
    if (grades && grades.length > 0) {
        console.log("Sample grade record:", grades[0])
    }
  }
}

check()
