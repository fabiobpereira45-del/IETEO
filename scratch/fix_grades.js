import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGrades() {
  console.log("Updating grade settings to divisor = 2, presenceValue = 2.5...");
  const { error: sErr } = await supabase.from('grade_settings').upsert({
    id: 'global',
    divisor: 2,
    presence_value: 2.5,
    updated_at: new Date().toISOString()
  });

  if (sErr) {
    console.error("Error updating settings:", sErr);
    return;
  }

  console.log("Settings updated. Synchronizing attendance scores retrospectively...");

  // Similar to syncAllAttendanceScores in store.ts
  const { data: allAtt, error: attError } = await supabase
    .from('attendances')
    .select('student_id, discipline_id')
    .eq('is_present', true);
  
  if (attError) {
    console.error("Error fetching attendances:", attError);
    return;
  }

  const counts = {};
  allAtt.forEach(a => {
    const key = `${a.student_id}:${a.discipline_id}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  console.log(`Found ${Object.keys(counts).length} student/discipline pairs to update.`);

  const { data: students } = await supabase.from('students').select('id, name, email, cpf');
  const studentMap = {};
  students?.forEach(s => { studentMap[s.id] = s; });

  let updatedCount = 0;

  for (const [key, count] of Object.entries(counts)) {
    const [studentId, disciplineId] = key.split(':');
    const score = Math.min(count * 2.5, 10.0);
    const student = studentMap[studentId];
    
    const { data: updated, error: uErr } = await supabase.from('student_grades')
      .update({ attendance_score: score, student_id: studentId })
      .eq('student_id', studentId)
      .eq('discipline_id', disciplineId)
      .select();

    if (!uErr && (!updated || updated.length === 0) && student) {
      const identifiers = [student.email, student.cpf, student.email?.split('@')[0]].filter(Boolean);
      
      for (const ident of identifiers) {
        const { data: up2 } = await supabase.from('student_grades')
          .update({ attendance_score: score, student_id: studentId }) 
          .eq('student_identifier', ident)
          .eq('discipline_id', disciplineId)
          .select();
        
        if (up2 && up2.length > 0) {
            updatedCount++;
            break;
        }
      }
    } else if (updated && updated.length > 0) {
        updatedCount++;
    }
  }

  console.log(`Successfully synced ${updatedCount} grade records with correct presence scores!`);
}

fixGrades();
