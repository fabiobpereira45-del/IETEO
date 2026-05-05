import { createClient } from '../lib/supabase/client.js'

async function check() {
  const supabase = createClient()
  const { data } = await supabase.from('grade_settings').select('*').maybeSingle()
  console.log("Current Grade Settings:", data)
}

check()
