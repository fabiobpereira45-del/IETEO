
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const testGrade = {
    student_identifier: 'test@example.com',
    student_name: 'Test Student',
    discipline_id: 'd1', // Valid ID from previous check
    is_public: true,
    exam_grade: 10,
    works_grade: 10,
    seminar_grade: 10,
    participation_bonus: 0,
    attendance_score: 10,
    custom_divisor: 4,
    created_at: new Date().toISOString()
  };

  console.log('Attempting to insert WITH student_id...');
  const { error: error1 } = await supabase.from('student_grades').insert({ ...testGrade, student_id: null }).select();
  if (error1) console.error('Error with student_id:', error1.message);
  else console.log('Insert WITH student_id worked!');

  console.log('Attempting to insert WITHOUT student_id...');
  const { error: error2 } = await supabase.from('student_grades').insert(testGrade).select();
  if (error2) console.error('Error WITHOUT student_id:', error2.message);
  else console.log('Insert WITHOUT student_id worked!');
}

testInsert();
