-- =============================================================
-- NODUS — Fix: Permitir upload anônimo de anexos em chamados públicos
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- 1. Tabela `attachments`: permitir INSERT anônimo (link público)
-- Usuários autenticados já são cobertos pelas políticas existentes.
-- Esta policy permite que o formulário público insira registros.

DROP POLICY IF EXISTS "Allow anon insert attachments" ON public.attachments;

CREATE POLICY "Allow anon insert attachments"
ON public.attachments
FOR INSERT
TO anon
WITH CHECK (true);

-- Também permitir SELECT anônimo (para exibir as fotos no link de acompanhamento)
DROP POLICY IF EXISTS "Allow anon select attachments" ON public.attachments;

CREATE POLICY "Allow anon select attachments"
ON public.attachments
FOR SELECT
TO anon
USING (true);

-- =============================================================
-- 2. Storage bucket `attachments`: permitir upload anônimo
-- No painel Supabase: Storage > Buckets > attachments > Policies
-- Ou via SQL abaixo (storage.objects):
-- =============================================================

-- Permitir INSERT anônimo no bucket "attachments" (pasta tickets/)
DROP POLICY IF EXISTS "Allow anon upload to attachments bucket" ON storage.objects;

CREATE POLICY "Allow anon upload to attachments bucket"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'attachments'
  AND name LIKE 'tickets/%'
);

-- Permitir SELECT público (leitura das imagens)
DROP POLICY IF EXISTS "Allow public read from attachments bucket" ON storage.objects;

CREATE POLICY "Allow public read from attachments bucket"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'attachments');

-- =============================================================
-- 3. Garantir que o bucket está como público
-- (Alternativa mais simples: marcar o bucket como "Public" no painel)
-- =============================================================
-- UPDATE storage.buckets SET public = true WHERE id = 'attachments';
