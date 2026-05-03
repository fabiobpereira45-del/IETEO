const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("Checking grade_settings table...")
  const { data, error } = await supabase.from('grade_settings').select('*').limit(1)
  if (error) {
    console.error("Error accessing grade_settings:", error.message)
    if (error.message.includes("relation \"grade_settings\" does not exist")) {
      console.log("\nSQL TO CREATE TABLE:\n")
      console.log(`
CREATE TABLE grade_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  exam_weight NUMERIC DEFAULT 10,
  test_weight NUMERIC DEFAULT 0,
  work_weight NUMERIC DEFAULT 0,
  presence_value NUMERIC DEFAULT 0.5,
  bonus_weight NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS se necessário, ou apenas garantir acesso
ALTER TABLE grade_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON grade_settings FOR ALL USING (true);

-- Insert default row if not exists
INSERT INTO grade_settings (id, exam_weight, test_weight, work_weight, presence_value, bonus_weight)
VALUES ('global', 10, 0, 0, 0.5, 0)
ON CONFLICT (id) DO NOTHING;
      `)
    }
  } else {
    console.log("Table grade_settings EXISTS.")
    console.log("Data:", data)
  }

  console.log("\nChecking attendances...")
  const { count, error: attErr } = await supabase.from('attendances').select('*', { count: 'exact', head: true })
  console.log("Attendances count:", count, "Error:", attErr?.message)
}

check()
