const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
  console.log("Listing tables via RPC or direct select if possible...")
  // Note: Supabase doesn't easily let you list tables from the anon key unless an RPC exists.
  // But I can try to select from likely names.
  const tables = ['challenges', 'weekly_challenges', 'student_challenges', 'missions']
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (!error) {
        console.log(`Table '${table}' exists and has ${count} rows.`)
    } else {
        console.log(`Table '${table}' error: ${error.message}`)
    }
  }
}

listTables()
