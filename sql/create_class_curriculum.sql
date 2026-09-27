-- Execute manualmente no SQL Editor do Supabase do projeto IETEO.
-- Cria a tabela de grade curricular por turma (class_curriculum).
-- Não altera nem apaga nenhuma tabela existente.

-- Observação: `classes.id` é uuid, mas `disciplines.id` é text neste banco.
-- As chaves estrangeiras abaixo seguem exatamente o tipo de cada tabela referenciada.
create table if not exists class_curriculum (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  discipline_id text not null references disciplines(id) on delete cascade,
  "order" integer not null default 0,
  application_month text,
  application_year text,
  is_concluded boolean not null default false,
  professor_name text,
  created_at timestamptz not null default now(),
  unique (class_id, discipline_id)
);

create index if not exists idx_class_curriculum_class_id on class_curriculum(class_id);
create index if not exists idx_class_curriculum_discipline_id on class_curriculum(discipline_id);

-- IMPORTANTE: antes de continuar, rode isto para ver se `class_schedules`/`disciplines`
-- têm RLS habilitado e quais policies usam:
--   select relname, relrowsecurity from pg_class where relname in ('class_schedules','disciplines');
--   select * from pg_policies where tablename in ('class_schedules','disciplines');
--
-- Se elas NÃO tiverem RLS habilitado (relrowsecurity = false), NÃO habilite RLS aqui também,
-- para manter o mesmo comportamento e não bloquear acidentalmente o app. Se tiverem, replique
-- as mesmas policies para `class_curriculum`, por exemplo:
--
-- alter table class_curriculum enable row level security;
-- create policy "Allow authenticated read" on class_curriculum for select using (true);
-- create policy "Allow authenticated write" on class_curriculum for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
