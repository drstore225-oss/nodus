-- =====================================================================
-- SCHEMA: Módulo de Obras (Nodus)
-- =====================================================================
-- Execute este script no SQL Editor do Supabase.
-- =====================================================================

-- 1. ENUM de status da obra
CREATE TYPE public.obra_status AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'CANCELED'
);

-- 2. Tabela de obras
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,                            -- Local / área isolada
  status public.obra_status DEFAULT 'PLANNED'::public.obra_status NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  responsible_name TEXT,                    -- Responsável pela obra (pode ser externo)
  responsible_contact TEXT,                 -- Telefone / email do responsável
  public_notes TEXT,                        -- Avisos/observações visíveis no link público
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Trigger para atualizar updated_at
CREATE TRIGGER set_obras_updated_at
BEFORE UPDATE ON public.obras
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 4. RLS
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Leitura pública anônima (necessário para o link do QR code)
CREATE POLICY "Obras: leitura pública anônima"
  ON public.obras FOR SELECT
  TO anon
  USING (true);

-- Leitura por usuários autenticados da mesma instituição
CREATE POLICY "Obras: leitura para mesma instituição"
  ON public.obras FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR institution_id = public.get_my_institution_id()
  );

-- Criação: apenas ADMIN e GESTOR
CREATE POLICY "Obras: criação por ADMIN e GESTOR"
  ON public.obras FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR (
      institution_id = public.get_my_institution_id()
      AND public.get_my_role() IN ('ADMIN', 'GESTOR')
    )
  );

-- Atualização: apenas ADMIN e GESTOR
CREATE POLICY "Obras: atualização por ADMIN e GESTOR"
  ON public.obras FOR UPDATE
  USING (
    public.is_superadmin()
    OR (
      institution_id = public.get_my_institution_id()
      AND public.get_my_role() IN ('ADMIN', 'GESTOR')
    )
  );

-- Exclusão: apenas ADMIN
CREATE POLICY "Obras: exclusão por ADMIN"
  ON public.obras FOR DELETE
  USING (
    public.is_superadmin()
    OR (
      institution_id = public.get_my_institution_id()
      AND public.get_my_role() = 'ADMIN'
    )
  );

-- 5. Função pública para leitura segura via QR code (sem expor dados internos)
CREATE OR REPLACE FUNCTION public.get_public_obra(p_obra_id UUID)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT row_to_json(o) INTO result
  FROM (
    SELECT
      ob.id,
      ob.title,
      ob.description,
      ob.location,
      ob.status,
      ob.starts_at,
      ob.ends_at,
      ob.responsible_name,
      ob.responsible_contact,
      ob.public_notes,
      i.fantasy_name AS institution_name
    FROM public.obras ob
    JOIN public.institutions i ON i.id = ob.institution_id
    WHERE ob.id = p_obra_id
  ) o;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificação
SELECT 'Schema de obras criado com sucesso!' AS resultado;
