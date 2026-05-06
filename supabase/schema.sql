-- ==========================================
-- SCHEMA DO NODUS (Gestão de Chamados)
-- ==========================================

-- 1. TIPOS CUSTOMIZADOS (ENUMS)
CREATE TYPE public.user_role AS ENUM ('SOLICITANTE', 'TECNICO', 'GESTOR', 'ADMIN', 'SUPERADMIN');
CREATE TYPE public.ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELED');
CREATE TYPE public.ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE public.ticket_type AS ENUM ('CORRECTIVE', 'PREVENTIVE');
CREATE TYPE public.maintenance_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE public.notification_type AS ENUM ('TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_ASSIGNED', 'SLA_BREACHED', 'SYSTEM');

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
    ticket_type public.ticket_type DEFAULT 'CORRECTIVE'::public.ticket_type NOT NULL,
    status public.ticket_status DEFAULT 'OPEN'::public.ticket_status NOT NULL,
    priority public.ticket_priority DEFAULT 'LOW'::public.ticket_priority NOT NULL,
    category TEXT,
    user_id UUID REFERENCES public.profiles(id), -- Solicitante (opcional para chamados públicos)
    requester_name TEXT, -- Nome do solicitante (chamados públicos)
    requester_email TEXT, -- Email do solicitante (chamados públicos)
    public_observation TEXT, -- Observação pública sobre o andamento
    assigned_to UUID REFERENCES public.profiles(id), -- Técnico
    team_id UUID REFERENCES public.teams(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    scheduled_at TIMESTAMP WITH TIME ZONE,
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

-- Checklists de Chamados (Itens que o técnico precisa marcar)
CREATE TABLE public.ticket_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Planos de Manutenção Preventiva (Modelos para gerar chamados)
CREATE TABLE public.maintenance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority public.ticket_priority DEFAULT 'MEDIUM'::public.ticket_priority NOT NULL,
    category TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    team_id UUID REFERENCES public.teams(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    frequency public.maintenance_frequency NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Itens do Checklist do Plano de Manutenção
CREATE TABLE public.maintenance_plan_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notificações (Notificações in-app em tempo real)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type DEFAULT 'SYSTEM'::public.notification_type NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
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

CREATE TRIGGER set_maintenance_plans_updated_at
BEFORE UPDATE ON public.maintenance_plans
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
        action_text := 'Chamado criado.';
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
            -- Se for uma mudança irrelevante para o usuário público, não loga aqui ou ajusta as regras
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

-- Gerar Notificações Automáticas
CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
    profile_record RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Notify all ADMINs and GESTORs in the institution
        FOR profile_record IN 
            SELECT id FROM public.profiles 
            WHERE institution_id = NEW.institution_id 
              AND role IN ('ADMIN', 'SUPERADMIN', 'GESTOR')
        LOOP
            -- Don't notify the person who created it if they happen to be an ADMIN
            IF auth.uid() IS NULL OR profile_record.id <> auth.uid() THEN
                INSERT INTO public.notifications (institution_id, user_id, title, message, type, link)
                VALUES (NEW.institution_id, profile_record.id, 'Novo Chamado', 'Chamado "' || NEW.title || '" foi aberto.', 'TICKET_CREATED', '/chamados?ticket=' || NEW.id);
            END IF;
        END LOOP;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
            -- Notify the assigned technician
            IF auth.uid() IS NULL OR NEW.assigned_to <> auth.uid() THEN
                INSERT INTO public.notifications (institution_id, user_id, title, message, type, link)
                VALUES (NEW.institution_id, NEW.assigned_to, 'Chamado Atribuído', 'Você foi encarregado do chamado "' || NEW.title || '".', 'TICKET_ASSIGNED', '/chamados?ticket=' || NEW.id);
            END IF;
        END IF;

        IF OLD.status <> NEW.status THEN
            -- Notify requester
            IF NEW.user_id IS NOT NULL AND (auth.uid() IS NULL OR NEW.user_id <> auth.uid()) THEN
                INSERT INTO public.notifications (institution_id, user_id, title, message, type, link)
                VALUES (NEW.institution_id, NEW.user_id, 'Atualização de Status', 'O chamado "' || NEW.title || '" mudou de status.', 'TICKET_UPDATED', '/chamados?ticket=' || NEW.id);
            END IF;
        END IF;
        
        IF NEW.sla_breached = TRUE AND OLD.sla_breached = FALSE THEN
            -- Notify Gestores
            FOR profile_record IN 
                SELECT id FROM public.profiles 
                WHERE institution_id = NEW.institution_id 
                  AND role IN ('ADMIN', 'SUPERADMIN', 'GESTOR')
            LOOP
                INSERT INTO public.notifications (institution_id, user_id, title, message, type, link)
                VALUES (NEW.institution_id, profile_record.id, 'SLA Atrasado', 'O prazo do chamado "' || NEW.title || '" expirou.', 'SLA_BREACHED', '/chamados?ticket=' || NEW.id);
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_ticket_changes
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE PROCEDURE public.notify_ticket_changes();


-- Acompanhamento Público de Chamados
CREATE OR REPLACE FUNCTION public.get_public_ticket(p_ticket_id UUID)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT row_to_json(t) INTO result
    FROM (
        SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, 
            t.created_at, t.resolved_at, t.deadline_at, t.requester_name, t.requester_email,
            t.public_observation,
            i.fantasy_name AS institution_name
        FROM public.tickets t
        JOIN public.institutions i ON i.id = t.institution_id
        WHERE t.id = p_ticket_id
    ) t;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_public_ticket_logs(p_ticket_id UUID)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(l)) INTO result
    FROM (
        SELECT id, action, created_at
        FROM public.ticket_logs
        WHERE ticket_id = p_ticket_id
        ORDER BY created_at ASC
    ) l;
    
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gerador de Preventivas Automáticas (Roda via pg_cron diariamente)
CREATE OR REPLACE FUNCTION public.generate_preventive_tickets()
RETURNS void AS $$
DECLARE
    plan RECORD;
    new_ticket_id UUID;
    chk RECORD;
    should_generate BOOLEAN;
BEGIN
    FOR plan IN 
        SELECT * FROM public.maintenance_plans WHERE is_active = TRUE
    LOOP
        should_generate := FALSE;
        
        IF plan.last_generated_at IS NULL THEN
            should_generate := TRUE;
        ELSE
            IF plan.frequency = 'DAILY' AND plan.last_generated_at < (now() - interval '23 hours') THEN
                should_generate := TRUE;
            ELSIF plan.frequency = 'WEEKLY' AND plan.last_generated_at < (now() - interval '6 days') THEN
                should_generate := TRUE;
            ELSIF plan.frequency = 'MONTHLY' AND plan.last_generated_at < (now() - interval '27 days') THEN
                should_generate := TRUE;
            ELSIF plan.frequency = 'QUARTERLY' AND plan.last_generated_at < (now() - interval '89 days') THEN
                should_generate := TRUE;
            ELSIF plan.frequency = 'YEARLY' AND plan.last_generated_at < (now() - interval '360 days') THEN
                should_generate := TRUE;
            END IF;
        END IF;

        IF should_generate THEN
            -- Insere o Chamado (Ticket)
            INSERT INTO public.tickets (
                institution_id, title, description, ticket_type, priority, category,
                assigned_to, team_id, cost_center_id, scheduled_at
            ) VALUES (
                plan.institution_id, plan.title, plan.description, 'PREVENTIVE'::public.ticket_type, plan.priority, plan.category,
                plan.assigned_to, plan.team_id, plan.cost_center_id, timezone('utc'::text, now())
            ) RETURNING id INTO new_ticket_id;

            -- Insere os Checklists associados ao modelo
            FOR chk IN SELECT item_text FROM public.maintenance_plan_checklists WHERE plan_id = plan.id
            LOOP
                INSERT INTO public.ticket_checklists (ticket_id, item_text)
                VALUES (new_ticket_id, chk.item_text);
            END LOOP;

            -- Atualiza o last_generated_at do plano
            UPDATE public.maintenance_plans 
            SET last_generated_at = timezone('utc'::text, now())
            WHERE id = plan.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ROW LEVEL SECURITY (RLS)

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Institutions: Acesso publico anônimo para leitura"
    ON public.institutions FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Institutions: Superadmins veem tudo, outros veem a sua."
    ON public.institutions FOR SELECT
    TO authenticated
    USING (public.is_superadmin() OR id = public.get_my_institution_id());

CREATE POLICY "Institutions: Superadmins podem inserir"
    ON public.institutions FOR INSERT
    WITH CHECK (public.is_superadmin());

CREATE POLICY "Institutions: Superadmins podem deletar"
    ON public.institutions FOR DELETE
    USING (public.is_superadmin());

CREATE POLICY "Institutions: Atualização por Superadmins ou Gestores da propria instituicao"
    ON public.institutions FOR UPDATE
    USING (public.is_superadmin() OR (id = public.get_my_institution_id() AND public.get_my_role() IN ('ADMIN', 'GESTOR')));

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
CREATE POLICY "Tickets: Chamado publico anônimo"
    ON public.tickets FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL AND institution_id IS NOT NULL);

CREATE POLICY "Tickets: Solicitante vê os seus"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Tickets: Solicitante pode criar os seus"
    ON public.tickets FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tickets: Tecnicos e Gestores veem todos da instituicao"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (
        (public.get_my_role() IN ('TECNICO', 'GESTOR') AND institution_id = public.get_my_institution_id())
        OR assigned_to = auth.uid()
    );

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

-- Políticas: Ticket Checklists
CREATE POLICY "Ticket Checklists: Leitura para chamados da mesma instituição"
    ON public.ticket_checklists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );

CREATE POLICY "Ticket Checklists: Atualização para responsáveis"
    ON public.ticket_checklists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );

CREATE POLICY "Ticket Checklists: Gestores podem inserir"
    ON public.ticket_checklists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );
    
CREATE POLICY "Ticket Checklists: Gestores podem deletar"
    ON public.ticket_checklists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
            AND (t.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );

-- Políticas: Maintenance Plans
CREATE POLICY "Maintenance Plans: Acesso para mesma instituição"
    ON public.maintenance_plans FOR ALL
    USING (public.is_superadmin() OR institution_id = public.get_my_institution_id());

CREATE POLICY "Maintenance Plan Checklists: Acesso para mesma instituição"
    ON public.maintenance_plan_checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.maintenance_plans p WHERE p.id = plan_id
            AND (p.institution_id = public.get_my_institution_id() OR public.is_superadmin())
        )
    );

-- Políticas: Notifications
CREATE POLICY "Notifications: Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Notifications: Users can update their own notifications (mark as read)"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());


-- 5. STORAGE BUCKETS (Necessário executar via interface gráfica do Supabase ou API Storage, mas deixamos o SQL se estiver usando Supabase CLI localmente)
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS (Leitura para todos que têm o link, inserção para autenticados)
CREATE POLICY "Imagens publicas" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Upload autenticado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
