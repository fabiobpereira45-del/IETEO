const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://plwqgvfbkjdnlzgljnef.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("=== Lendo primeira linha de financial_charges ===");
  const { data, error } = await supabase.from("financial_charges").select("*").limit(1);
  if (error) {
    console.error("Erro ao ler:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
