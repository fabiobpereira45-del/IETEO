
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRelease() {
  console.log('Checking current private grades...');
  const { data: privates, error: err1 } = await supabase.from('student_grades').select('id').eq('is_public', false);
  if (err1) return console.error(err1);
  console.log(`Found ${privates.length} private grades.`);

  if (privates.length > 0) {
    console.log('Attempting to release all...');
    const { error: err2 } = await supabase.from('student_grades').update({ is_public: true }).eq('is_public', false);
    if (err2) console.error('Update failed:', err2.message);
    else console.log('Update successful!');
  } else {
    // Try to make one private first
    console.log('No private grades found. Making one private for testing...');
    const { data: all } = await supabase.from('student_grades').select('id').limit(1);
    if (all.length > 0) {
        await supabase.from('student_grades').update({ is_public: false }).eq('id', all[0].id);
        console.log('Made one private. Now releasing...');
        const { error: err3 } = await supabase.from('student_grades').update({ is_public: true }).eq('is_public', false);
        if (err3) console.error('Update failed:', err3.message);
        else console.log('Update successful!');
    }
  }
}

testRelease();
