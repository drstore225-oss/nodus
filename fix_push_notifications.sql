-- =============================================================
-- NODUS — Push Notifications: tabela de subscriptions + trigger
-- Execute no SQL Editor do Supabase Dashboard (tudo de uma vez)
-- =============================================================

-- 1. Habilitar extensão pg_net (se ainda não estiver)
-- Supabase → Integrations → pg_net → Enable
-- Ou via SQL:
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================
-- 2. Tabela para armazenar subscriptions Web Push por dispositivo
-- =============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário gerencia suas próprias subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- 3. Função que chama a Edge Function via pg_net
--    Usa URL hardcoded (pública) + anon_key (pública) no header
-- =============================================================
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://jxtbpmdknuionukxalwi.supabase.co/functions/v1/hyper-responder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dGJwbWRrbnVpb251a3hhbHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYzMTQsImV4cCI6MjA5MzQ5MjMxNH0.9auQKK1Cx6_coRrtNN0UmRv6ZFK1UvL4irmtFFIbVi8'
    ),
    body    := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id',         NEW.user_id,
      'title',           NEW.title,
      'body',            COALESCE(NEW.message, ''),
      'link',            COALESCE(NEW.link, '/')
    )
  );
  RETURN NEW;
END;
$$;

-- =============================================================
-- 4. Trigger: dispara ao inserir nova notificação
-- =============================================================
DROP TRIGGER IF EXISTS on_notification_inserted ON public.notifications;
CREATE TRIGGER on_notification_inserted
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();
