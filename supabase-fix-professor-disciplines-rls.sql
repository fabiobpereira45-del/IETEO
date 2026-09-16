-- ====================================================================
-- Script completo: Criação e Permissões da tabela professor_disciplines
-- Projeto Supabase do IETEO (plwqgvfbkjdnlzgljnef)
-- ====================================================================

-- 1. Criar a tabela se ainda não existir
CREATE TABLE IF NOT EXISTS public.professor_disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id TEXT NOT NULL,
    discipline_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_professor_discipline UNIQUE (professor_id, discipline_id)
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.professor_disciplines ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas antigas para evitar conflito
DROP POLICY IF EXISTS "Allow public read on professor_disciplines" ON public.professor_disciplines;
DROP POLICY IF EXISTS "Allow public insert on professor_disciplines" ON public.professor_disciplines;
DROP POLICY IF EXISTS "Allow public delete on professor_disciplines" ON public.professor_disciplines;
DROP POLICY IF EXISTS "Allow public update on professor_disciplines" ON public.professor_disciplines;
DROP POLICY IF EXISTS "Enable all access for all users on professor_disciplines" ON public.professor_disciplines;

-- 4. Criar política aberta para permitir todas as operações (anon, authenticated, service_role)
CREATE POLICY "Enable all access for all users on professor_disciplines"
ON public.professor_disciplines
FOR ALL
TO public, anon, authenticated
USING (true)
WITH CHECK (true);
