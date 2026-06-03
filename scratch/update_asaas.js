const { createClient } = require('@supabase/supabase-js');

// Values from .env.local
const supabaseUrl = "https://plwqgvfbkjdnlzgljnef.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAsaas() {
  const apiKey = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjNiYWM5NDVmLTEzNTktNGI5Zi05NmE2LTc4YzUxZWUzMzMxZjo6JGFhY2hfNzE2MTZhNDktMjkxNS00NmVlLWJjMGEtMDQyYTYzMzVlNDhk";
  const mode = "production";

  console.log("Checking for existing config...");
  const { data: existing, error: fetchError } = await supabase
    .from('asaas_config')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching config:", fetchError);
    return;
  }

  const dbData = {
    api_key: apiKey,
    mode: mode,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    console.log("Updating existing config with ID:", existing.id);
    const { error: updateError } = await supabase
      .from('asaas_config')
      .update(dbData)
      .eq('id', existing.id);
    if (updateError) console.error("Update error:", updateError);
    else console.log("Update successful!");
  } else {
    console.log("Inserting new config...");
    const { error: insertError } = await supabase
      .from('asaas_config')
      .insert(dbData);
    if (insertError) console.error("Insert error:", insertError);
    else console.log("Insert successful!");
  }
}

updateAsaas();
