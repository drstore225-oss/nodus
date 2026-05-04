-- ==========================================
-- SCHEMA DO NODUS (Gestão de Chamados)
-- ==========================================

-- 1. TIPOS CUSTOMIZADOS (ENUMS)
CREATE TYPE public.user_role AS ENUM ('SOLICITANTE', 'TECNICO', 'GESTOR', 'ADMIN', 'SUPERADMIN');
CREATE TYPE public.ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELED');
CREATE TYPE public.ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 2. TABELAS

-- Instituições (Tenants)
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj TEXT UNIQUE,
    fantasy_name TEXT NOT NULL,
    corporate_name TEXT NOT NULL,
    zip_code TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Centros de Custos
CREATE TABLE public.cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(institution_id, code)
);

-- Equipes
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Perfis (Profiles) - Extensão da tabela auth.users do Supabase
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.user_role DEFAULT 'SOLICITANTE'::public.user_role NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chamados (Tickets)
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status public.ticket_status DEFAULT 'OPEN'::public.ticket_status NOT NULL,
    priority public.ticket_priority DEFAULT 'LOW'::public.ticket_priority NOT NULL,
    category TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id), -- Solicitante
    assigned_to UUID REFERENCES public.profiles(id), -- Técnico
    team_id UUID REFERENCES public.teams(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    deadline_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    sla_breached BOOLEAN DEFAULT FALSE NOT NULL,
    estimated_cost NUMERIC(10, 2),
    approved_cost NUMERIC(10, 2),
    actual_cost NUMERIC(10, 2),
    cost_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Anexos (Attachments)
CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Logs dos Chamados
CREATE TABLE public.ticket_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. FUNÇÕES E TRIGGERS

-- Atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Handle New User (Cria perfil automaticamente ao criar usuário no Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Calcular SLA Deadline
CREATE OR REPLACE FUNCTION public.calculate_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.priority <> NEW.priority THEN
        IF NEW.priority = 'CRITICAL' THEN
            NEW.deadline_at = NEW.created_at + INTERVAL '4 hours';
        ELSIF NEW.priority = 'HIGH' THEN
            NEW.deadline_at = NEW.created_at + INTERVAL '24 hours';
        ELSIF NEW.priority = 'MEDIUM' THEN
            NEW.deadline_at = NEW.created_at + INTERVAL '72 hours';
        ELSIF NEW.priority = 'LOW' THEN
            NEW.deadline_at = NEW.created_at + INTERVAL '168 hours';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_sla
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE PROCEDURE public.calculate_sla_deadline();

-- Verificar SLA Breached
CREATE OR REPLACE FUNCTION public.check_sla_breached()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'RESOLVED' AND OLD.status <> 'RESOLVED' THEN
        NEW.resolved_at = timezone('utc'::text, now());
        IF NEW.resolved_at > NEW.deadline_at THEN
            NEW.sla_breached = TRUE;
        ELSE
            NEW.sla_breached = FALSE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_sla_breached
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE PROCEDURE public.check_sla_breached();

-- Registrar Logs Automaticamente
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_text TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_text := 'Ticket criado.';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status <> NEW.status THEN
            action_text := 'Status alterado de ' || OLD.status || ' para ' || NEW.status || '.';
        ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            IF NEW.assigned_to IS NULL THEN
                action_text := 'Técnico removido do chamado.';
            ELSE
                action_text := 'Chamado atribuído a um novo técnico.';
            END IF;
        ELSE
            action_text := 'Chamado atualizado.';
        END IF;
    END IF;

    -- O ideal é capturar o user_id real chamando a função da API do Supabase auth.uid()
    -- Mas como pode ser chamado pelo sistema/backend, deixamos flexível.
    INSERT INTO public.ticket_logs (ticket_id, action, user_id)
    VALUES (NEW.id, action_text, auth.uid());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_ticket_changes
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE PROCEDURE public.log_ticket_changes();


-- 4. ROW LEVEL SECURITY (RLS)

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para obter a instituição do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_institution_id()
RETURNS UUID AS $$
    SELECT institution_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Função auxiliar para verificar se o usuário é SUPERADMIN
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT role = 'SUPERADMIN' FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Função auxiliar para obter a role do usuário
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Função auxiliar para obter a equipe do usuário
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS UUID AS $$
    SELECT team_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- Políticas: Institutions
CREATE POLICY "Institutions: Superadmins veem tudo, outros veem a sua."
    ON public.institutions FOR SELECT
    USING (public.is_superadmin() OR id = public.get_my_institution_id());

-- Políticas: Cost Centers
CREATE POLICY "Cost Centers: Acesso para mesma instituição ou Superadmin"
    ON public.cost_centers FOR ALL
    USING (public.is_superadmin() OR institution_id = public.get_my_institution_id());

-- Políticas: Teams
CREATE POLICY "Teams: Acesso para mesma instituição ou Superadmin"
    ON public.teams FOR ALL
    USING (public.is_superadmin() OR institution_id = public.get_my_institution_id());

-- Políticas: Profiles
CREATE POLICY "Profiles: Visualização dentro da mesma instituição"
    ON public.profiles FOR SELECT
    USING (public.is_superadmin() OR institution_id = public.get_my_institution_id() OR id = auth.uid());

CREATE POLICY "Profiles: Apenas ADMIN ou SUPERADMIN podem alterar outros perfis"
    ON public.profiles FOR UPDATE
    USING (public.is_superadmin() OR (public.get_my_role() = 'ADMIN' AND institution_id = public.get_my_institution_id()) OR id = auth.uid());

-- Políticas: Tickets
CREATE POLICY "Tickets: Solicitante vê os seus"
    ON public.tickets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Tickets: Solicitante pode criar os seus"
    ON public.tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tickets: Tecnico vê os que estão atribuidos a ele e pode atualizar"
    ON public.tickets FOR SELECT
    USING (assigned_to = auth.uid());

CREATE POLICY "Tickets: Gestor vê os da sua equipe"
    ON public.tickets FOR SELECT
    USING (team_id = public.get_my_team_id());

CREATE POLICY "Tickets: Admin ou Superadmin veem todos na instituição"
    ON public.tickets FOR ALL
    USING (public.is_superadmin() OR (public.get_my_role() = 'ADMIN' AND institution_id = public.get_my_institution_id()));

-- Regras adicionais de Update para Técnicos e Gestores:
CREATE POLICY "Tickets: Técnico pode atualizar seus chamados"
    ON public.tickets FOR UPDATE
    USING (assigned_to = auth.uid());

CREATE POLICY "Tickets: Gestor pode atualizar chamados da equipe"
    ON public.tickets FOR UPDATE
    USING (team_id = public.get_my_team_id());


-- Políticas: Attachments
CREATE POLICY "Attachments: Leitura baseada no chamado"
    ON public.attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            -- O acesso real dependeria da política do ticket, mas não podemos aninhar RLS tão facilmente de forma performática.
            -- Simplificando: permite ler anexos de chamados da mesma instituição
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );

CREATE POLICY "Attachments: Inserção permitida para quem tiver acesso ao chamado"
    ON public.attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );

-- Políticas: Ticket Logs
CREATE POLICY "Ticket Logs: Leitura para chamados da mesma instituição"
    ON public.ticket_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );


-- 5. STORAGE BUCKETS (Necessário executar via interface gráfica do Supabase ou API Storage, mas deixamos o SQL se estiver usando Supabase CLI localmente)
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS (Leitura para todos que têm o link, inserção para autenticados)
CREATE POLICY "Imagens publicas" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Upload autenticado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
