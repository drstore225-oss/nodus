-- ==========================================
-- SEED DE DADOS INICIAIS DO NODUS
-- Execute APÓS o schema.sql no Supabase SQL Editor
-- ==========================================

-- ATENÇÃO: Substitua os UUIDs de usuários pelos IDs reais
-- da tabela auth.users após criar os usuários manualmente

-- 1. Instituições de Exemplo
INSERT INTO public.institutions (id, cnpj, fantasy_name, corporate_name, zip_code, street, number, complement, neighborhood, city, state)
VALUES
  ('11111111-0000-0000-0000-000000000001', '12.345.678/0001-90', 'Edificio Central', 'Central Administracao e Manutencao Ltda', '01310-100', 'Av. Paulista', '1000', '10º Andar', 'Bela Vista', 'São Paulo', 'SP'),
  ('22222222-0000-0000-0000-000000000002', '98.765.432/0001-10', 'Torre Sul', 'Sul Predial Gestao e Servicos S.A.', '20040-020', 'Rua da Assembleia', '200', NULL, 'Centro', 'Rio de Janeiro', 'RJ')
ON CONFLICT (id) DO NOTHING;

-- 2. Centros de Custo
INSERT INTO public.cost_centers (id, institution_id, code, name)
VALUES
  ('cc111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'CC001', 'Manutenção Predial Geral'),
  ('cc111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'CC002', 'Infraestrutura de TI'),
  ('cc111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'CC003', 'Segurança Patrimonial'),
  ('cc222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'CC001', 'Operações e Facilities'),
  ('cc222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'CC002', 'Climatização e HVAC')
ON CONFLICT (id) DO NOTHING;

-- 3. Equipes
INSERT INTO public.teams (id, institution_id, name)
VALUES
  ('ee111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Equipe Elétrica'),
  ('ee111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Equipe Hidráulica'),
  ('ee111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Equipe Civil'),
  ('ee222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Facilities Sul'),
  ('ee222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Climatização Sul')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- COMO CONFIGURAR O PRIMEIRO SUPERADMIN:
-- 
-- 1. Crie um usuário no Supabase Auth (Authentication > Users > Add User)
-- 2. Anote o UUID gerado
-- 3. Execute a query abaixo substituindo <UUID_DO_SEU_USUARIO>:
--
-- UPDATE public.profiles 
-- SET role = 'SUPERADMIN', institution_id = NULL
-- WHERE id = '<UUID_DO_SEU_USUARIO>';
--
-- Pronto! Faça login com esse usuário para acessar o sistema completo.
-- ==========================================

-- EXEMPLO para criar um usuário Admin vinculado à instituição 1:
-- (Apenas após criar o usuário no Supabase Auth)
--
-- UPDATE public.profiles 
-- SET role = 'ADMIN', institution_id = '11111111-0000-0000-0000-000000000001'
-- WHERE email = 'admin@edificiocentral.com';
--
-- UPDATE public.profiles 
-- SET role = 'GESTOR', institution_id = '11111111-0000-0000-0000-000000000001', 
--     team_id = 'ee111111-0000-0000-0000-000000000001'
-- WHERE email = 'gestor@edificiocentral.com';
--
-- UPDATE public.profiles 
-- SET role = 'TECNICO', institution_id = '11111111-0000-0000-0000-000000000001',
--     team_id = 'ee111111-0000-0000-0000-000000000001'
-- WHERE email = 'tecnico@edificiocentral.com';
