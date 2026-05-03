
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- FETCHING ASSESSMENTS (EXCLUDING LOGO) ---');
  const { data, error } = await supabase.from('assessments').select('id, title, discipline_id, professor, institution, question_ids, is_published, modality, created_at');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total Assessments:', data.length);
  data.forEach(a => {
    console.log(`- ${a.title} (ID: ${a.id}, Discipline: ${a.discipline_id})`);
  });
}

check();
