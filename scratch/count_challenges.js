const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function count() {
  console.log("Counting challenges...")
  const { count, error } = await supabase.from('challenges').select('*', { count: 'exact', head: true })
  console.log("Count:", count, "Error:", error?.message)
}

count()
