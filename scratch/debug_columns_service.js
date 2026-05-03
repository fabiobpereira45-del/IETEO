
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('Fetching one row from student_grades...');
  const { data, error } = await supabase.from('student_grades').select('*').limit(1);
  
  if (error) {
    console.error('Error with select *:', error);
    if (error.message.includes('student_id')) {
        console.log('Confirmed: student_id column is causing issues.');
    }
  } else {
    console.log('Success! Data:', data);
    if (data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, but select * worked.');
    }
  }
}

debug();
