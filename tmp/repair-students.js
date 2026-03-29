const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function repair() {
    console.log('--- INICIANDO REPARO GERAL ---');

    // 1. Fetch Students & Auth Users
    const { data: dbStudents } = await supabase.from('students').select('*');
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUsers = authData.users;

    console.log(`Encontrados ${dbStudents.length} alunos no DB e ${authUsers.length} usuários no Auth.`);

    let fixedLinks = 0;
    let fixedPass = 0;

    // 2. Fix Broken Links (auth_user_id null)
    for (const student of dbStudents) {
        if (!student.auth_user_id) {
            const cleanCpf = student.cpf.replace(/\D/g, '');
            const expectedEmail = `${cleanCpf}@student.ieteo.com`.toLowerCase();
            
            const match = authUsers.find(u => u.email.toLowerCase() === expectedEmail);
            if (match) {
                console.log(`Vinculando student ${student.name} ao Auth ID ${match.id}...`);
                const { error } = await supabase.from('students').update({ auth_user_id: match.id }).eq('id', student.id);
                if (error) console.error(`Erro ao vincular ${student.name}:`, error.message);
                else fixedLinks++;
            }
        }
    }

    // 3. Reset Passwords to '123456'
    console.log('Iniciando reset de senhas para todos os alunos...');
    for (const user of authUsers) {
        if (user.user_metadata?.type === 'student' || user.email.includes('@student.ieteo.com')) {
            console.log(`Resetando senha para ${user.email}...`);
            const { error } = await supabase.auth.admin.updateUserById(user.id, { password: '123456' });
            if (error) console.error(`Erro ao resetar senha de ${user.email}:`, error.message);
            else fixedPass++;
        }
    }

    console.log('--- REPARO CONCLUÍDO ---');
    console.log(`Vínculos Corrigidos: ${fixedLinks}`);
    console.log(`Senhas Resetadas: ${fixedPass}`);
}

repair().catch(err => console.error('Erro no script:', err));
