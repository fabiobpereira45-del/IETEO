
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('student_grades').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data in assessments table.');
  }
}

check();
