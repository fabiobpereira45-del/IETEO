
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  const titlesToPublish = [
    'Avaliação Homilética',
    'Avaliação de Heremnêutica',
    'Hermeneutica'
  ];

  console.log('Restoring assessments...');
  
  for (const title of titlesToPublish) {
    const { data, error } = await supabase
      .from('assessments')
      .update({ is_published: true })
      .eq('title', title);
      
    if (error) {
      console.error(`Error publishing ${title}:`, error);
    } else {
      console.log(`Published ${title}.`);
    }
  }
}

restore();
