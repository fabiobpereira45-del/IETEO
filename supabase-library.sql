-- ==============================================================================
-- IETEO: Tabelas para o Módulo de Locação de Livros e Biblioteca Física
-- Execute este script no SQL Editor do Supabase para persistência remota
-- ==============================================================================

-- 1. Tabela de Livros (Acervo da Biblioteca)
CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT NOT NULL,
    publisher TEXT,
    publication_year INTEGER,
    isbn TEXT,
    category TEXT NOT NULL,
    cover_url TEXT,
    synopsis TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    location_shelf TEXT,
    polo_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Empréstimos e Reservas
CREATE TABLE IF NOT EXISTS public.book_loans (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    book_author TEXT NOT NULL,
    book_cover_url TEXT,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_email TEXT,
    student_phone TEXT,
    student_cpf TEXT,
    polo_id TEXT,
    requested_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    borrowed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'reserved', -- 'reserved', 'active', 'returned', 'late'
    notes TEXT,
    registered_by TEXT
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books (category);
CREATE INDEX IF NOT EXISTS idx_books_polo ON public.books (polo_id);
CREATE INDEX IF NOT EXISTS idx_loans_student ON public.book_loans (student_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.book_loans (status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON public.book_loans (due_date);

-- Habilitar RLS e Políticas
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de livros" ON public.books
    FOR SELECT USING (true);

CREATE POLICY "Acesso irrestrito a livros para autenticados e service_role" ON public.books
    FOR ALL USING (true);

CREATE POLICY "Leitura e criação de empréstimos" ON public.book_loans
    FOR ALL USING (true);
