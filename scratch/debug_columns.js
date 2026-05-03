
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('student_grades').select('*').limit(1);
  if (error) {
    console.error('Error fetching data:', error);
    // If table is empty, we might not get keys. Try information_schema.
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'student_grades' }); // This might not exist
    
    if (colError) {
       console.error('RPC failed, trying information_schema...');
       const { data: isCols, error: isError } = await supabase
         .from('information_schema.columns')
         .select('column_name')
         .eq('table_name', 'student_grades');
       
       if (isError) {
         console.error('Information schema failed:', isError);
       } else {
         console.log('Columns from information_schema:', isCols.map(c => c.column_name));
       }
    } else {
      console.log('Columns from RPC:', columns);
    }
    return;
  }
  if (data.length > 0) {
    console.log('Columns from data:', Object.keys(data[0]));
  } else {
    console.log('Table is empty. Trying information_schema...');
    const { data: isCols, error: isError } = await supabase.from('information_schema.columns').select('column_name').eq('table_name', 'student_grades');
    if (isError) console.error(isError);
    else console.log('Columns:', isCols.map(c => c.column_name));
  }
}

checkColumns();
