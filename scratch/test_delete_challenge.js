const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDelete() {
  console.log("Fetching a challenge to test delete...")
  const { data: challenges } = await supabase.from('challenges').select('id, title').limit(1)
  
  if (challenges && challenges.length > 0) {
    const id = challenges[0].id
    console.log(`Attempting to delete challenge: ${id} (${challenges[0].title})`)
    
    const { error } = await supabase.from('challenges').delete().eq('id', id)
    if (error) {
      console.error("Delete Error:", error.message)
      if (error.message.includes("foreign key constraint")) {
        console.log("Confirmed: Foreign key constraint is blocking the delete.")
      }
    } else {
      console.log("Delete successful (at least in this test).")
    }
  } else {
    console.log("No challenges found to delete.")
  }
}

testDelete()
