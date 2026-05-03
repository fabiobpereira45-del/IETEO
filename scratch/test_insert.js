
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const id = 'test-' + Date.now();
  const dbData = {
    id: id,
    title: 'Teste de Conexão',
    discipline_id: 'd1',
    professor: 'Teste',
    institution: 'IETEO',
    question_ids: [],
    points_per_question: 1,
    total_points: 0,
    is_published: true,
    modality: 'public',
    created_at: new Date().toISOString()
  };

  console.log('Inserting test assessment...');
  const { error } = await supabase.from('assessments').insert(dbData);
  if (error) {
    console.error('Insert Error:', error);
    return;
  }
  console.log('Insert successful.');

  const { data, error: qError } = await supabase.from('assessments').select('*').eq('id', id);
  if (qError) {
    console.error('Query Error:', qError);
    return;
  }
  console.log('Query result:', data);
}

test();
