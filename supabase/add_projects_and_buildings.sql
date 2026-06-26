-- =====================================================================
-- MIGRATION: Módulo de Prédios e Detalhamento de Projetos em Obras
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para atualizar o schema.
-- =====================================================================

-- 1. Criação da tabela de Prédios
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_m2 NUMERIC NOT NULL CHECK (total_m2 > 0),
  floors INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para atualizar updated_at do prédio
CREATE OR REPLACE TRIGGER set_buildings_updated_at
BEFORE UPDATE ON public.buildings
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Habilitar RLS em buildings
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para buildings
CREATE POLICY "Buildings: leitura para mesma instituição"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR institution_id = public.get_my_institution_id()
  );

CREATE POLICY "Buildings: gerenciamento por ADMIN e GESTOR"
  ON public.buildings FOR ALL
  TO authenticated
  USING (
    public.is_superadmin()
    OR (
      institution_id = public.get_my_institution_id()
      AND public.get_my_role() IN ('ADMIN', 'GESTOR')
    )
  );

-- =====================================================================
-- 2. Alteração na tabela de Chamados (Tickets) para vincular a Prédios
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL;

-- =====================================================================
-- 3. Alteração na tabela de Obras para vincular a Prédios e adicionar descrição do Projeto
ALTER TABLE public.obras
ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS project_description TEXT;

-- =====================================================================
-- 4. Criação da tabela de Arquivos de Obra (Plantas e Galeria de Ideias)
CREATE TABLE IF NOT EXISTS public.obra_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('BLUEPRINT', 'IDEA_GALLERY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em obra_files
ALTER TABLE public.obra_files ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para obra_files
-- Leitura pública para que visitantes do QR Code também possam ver as fotos/plantas públicas da obra
CREATE POLICY "Obra Files: leitura pública"
  ON public.obra_files FOR SELECT
  USING (true);

-- Escrita restrita a ADMIN/GESTOR da instituição da obra vinculada
CREATE POLICY "Obra Files: inserção por ADMIN e GESTOR"
  ON public.obra_files FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = obra_id
      AND o.institution_id = public.get_my_institution_id()
      AND public.get_my_role() IN ('ADMIN', 'GESTOR')
    )
  );

CREATE POLICY "Obra Files: exclusão por ADMIN e GESTOR"
  ON public.obra_files FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = obra_id
      AND o.institution_id = public.get_my_institution_id()
      AND public.get_my_role() IN ('ADMIN', 'GESTOR')
    )
  );

-- =====================================================================
-- Verificação
SELECT 'Tabelas de Prédios e Projetos criadas com sucesso!' AS resultado;
