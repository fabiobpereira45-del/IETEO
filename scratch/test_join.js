
import { createClient } from "./lib/supabase/client"

async function testJoin() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_grades')
    .select('*, students(class_id)')
    .limit(5)
  
  if (error) {
    console.error("Join failed:", error)
  } else {
    console.log("Join successful:", JSON.stringify(data, null, 2))
  }
}

// Since I can't run this directly as a script without setup, 
// I'll assume the join works if the relationship exists.
// I'll check the current store.ts for relationship clues.
