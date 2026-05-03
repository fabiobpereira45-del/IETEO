
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listDisciplines() {
  const { data, error } = await supabase.from('disciplines').select('id, name');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Disciplines:', data);
  }
}

listDisciplines();
