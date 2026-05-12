-- =====================================================================
-- MIGRATION: Adicionar campos de execução e orçamento às Obras
-- =====================================================================
-- Execute este script no SQL Editor do Supabase.
-- =====================================================================

ALTER TABLE public.obras
ADD COLUMN IF NOT EXISTS executor_type TEXT CHECK (executor_type IN ('INTERNAL', 'EXTERNAL')) DEFAULT 'INTERNAL',
ADD COLUMN IF NOT EXISTS materials_budget TEXT;

-- Nota: Não precisamos adicionar esses campos na função get_public_obra
-- pois são informações internas de gestão, não públicas.
