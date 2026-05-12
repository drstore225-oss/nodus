-- =====================================================================
-- FIX: SLA breach para chamados expirados ainda ABERTOS / EM ANDAMENTO
-- =====================================================================
-- Problema: o trigger trg_check_sla_breached só marcava sla_breached = TRUE
-- quando o chamado era RESOLVIDO. Chamados que passaram do prazo e continuaram
-- abertos nunca eram marcados, causando distorção no dashboard.
--
-- Solução em 2 partes:
--   1. Trigger atualizado: marca sla_breached = TRUE ao resolver (mantido)
--      E também ao atualizar qualquer campo se o prazo já passou e o chamado ainda está ativo.
--   2. Update pontual: marca todos os chamados ativos já expirados.
-- =====================================================================

-- 1. Recriar a função do trigger com a lógica corrigida
CREATE OR REPLACE FUNCTION public.check_sla_breached()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso 1: chamado sendo resolvido agora
    IF NEW.status = 'RESOLVED' AND OLD.status <> 'RESOLVED' THEN
        NEW.resolved_at = timezone('utc'::text, now());
        IF NEW.resolved_at > NEW.deadline_at THEN
            NEW.sla_breached = TRUE;
        ELSE
            NEW.sla_breached = FALSE;
        END IF;

    -- Caso 2: chamado ainda ativo mas já passou do prazo
    ELSIF NEW.status IN ('OPEN', 'IN_PROGRESS')
          AND NEW.deadline_at IS NOT NULL
          AND NEW.deadline_at < timezone('utc'::text, now())
    THEN
        NEW.sla_breached = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Marcar IMEDIATAMENTE todos os chamados ativos já expirados que não foram marcados
UPDATE public.tickets
SET sla_breached = TRUE
WHERE status IN ('OPEN', 'IN_PROGRESS')
  AND deadline_at IS NOT NULL
  AND deadline_at < timezone('utc'::text, now())
  AND sla_breached = FALSE;

-- Verificação: quantos chamados foram corrigidos
SELECT
  COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS') AND sla_breached = TRUE AND deadline_at < now()) AS expirados_ativos_sla_marcado,
  COUNT(*) FILTER (WHERE status = 'RESOLVED' AND sla_breached = TRUE) AS resolvidos_com_sla_estourado,
  COUNT(*) AS total
FROM public.tickets;
