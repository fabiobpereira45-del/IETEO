
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('student_grades').select('*').limit(1);
  if (error) console.error(error);
  else if (data.length > 0) console.log('Columns:', Object.keys(data[0]));
  else {
      // Try to get columns by inserting a dummy row with only 'student_name' (which usually exists)
      console.log('Table empty. Attempting minimal insert...');
      const { data: insData, error: insError } = await supabase.from('student_grades').insert({ student_name: 'Temp' }).select();
      if (insError) {
          console.error('Insert failed:', insError.message);
          // If insert failed, maybe student_name doesn't exist either. 
          // Try to get ANY row even if deleted? No.
      } else {
          console.log('Inserted row columns:', Object.keys(insData[0]));
          await supabase.from('student_grades').delete().eq('id', insData[0].id);
      }
  }
}

check();
