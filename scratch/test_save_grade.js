
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSave() {
  const testGrade = {
    student_identifier: 'test@example.com',
    student_name: 'Test Student',
    is_public: true,
    exam_grade: 10,
    works_grade: 10,
    seminar_grade: 10,
    participation_bonus: 0,
    attendance_score: 10,
    custom_divisor: 4,
    created_at: new Date().toISOString()
  };

  console.log('Attempting to save test grade...');
  const { data, error } = await supabase.from('student_grades').insert(testGrade).select();
  
  if (error) {
    console.error('Error saving grade:', error);
  } else {
    console.log('Successfully saved grade:', data);
    // Cleanup
    await supabase.from('student_grades').delete().eq('id', data[0].id);
  }
}

testSave();
