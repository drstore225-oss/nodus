-- =============================================================
-- NODUS — Adicionar campo da Chave API do Gemini à tabela de Instituições
-- Execute este bloco no SQL Editor do seu console Supabase.
-- =============================================================

-- Adiciona a coluna gemini_api_key na tabela de instituições
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
