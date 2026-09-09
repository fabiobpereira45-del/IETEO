-- Migração: Prova Final de Recuperação (is_final_exam)
-- Execute no SQL Editor do Supabase (uma vez por projeto)
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS is_final_exam BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assessments_final_exam
  ON public.assessments (is_final_exam);

-- Migração complementar: cancelamento de reservas de livros (caso ainda não aplicada)
ALTER TABLE public.book_loans
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.book_loans
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.book_loans
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
