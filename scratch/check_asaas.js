const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://plwqgvfbkjdnlzgljnef.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("=== Lendo asaas_config ===");
  const { data: asaas, error: err1 } = await supabase.from("asaas_config").select("*");
  if (err1) {
    console.error("Erro ao ler asaas_config:", err1);
  } else {
    console.log(JSON.stringify(asaas, null, 2));
  }

  console.log("\n=== Lendo financial_settings ===");
  const { data: fin, error: err2 } = await supabase.from("financial_settings").select("*");
  if (err2) {
    console.error("Erro ao ler financial_settings:", err2);
  } else {
    console.log(JSON.stringify(fin, null, 2));
  }
}

check();
