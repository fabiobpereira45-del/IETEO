
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInserted() {
  const { data, error } = await supabase.from('student_grades').select('*').limit(1);
  if (error) console.error(error);
  else {
    console.log('Columns in student_grades:', Object.keys(data[0]));
    // Cleanup
    await supabase.from('student_grades').delete().eq('id', data[0].id);
  }
}

checkInserted();
