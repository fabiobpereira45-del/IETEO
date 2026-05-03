
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if the RPC doesn't exist
  if (error) {
    // Try querying pg_catalog if we have permissions
    const { data: tables, error: tError } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
     if (tError) {
        console.error('Tables Error:', tError);
        // Try another way: query information_schema
        const { data: isTables, error: isError } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
        if (isError) {
           console.error('IS Tables Error:', isError);
        } else {
           console.log('Tables:', isTables.map(t => t.table_name));
        }
     } else {
        console.log('Tables:', tables.map(t => t.tablename));
     }
  } else {
    console.log('Tables:', data);
  }
}

check();
