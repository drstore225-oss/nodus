-- =============================================================
-- NODUS — Diagnóstico: Push Notifications
-- Execute cada bloco separadamente no SQL Editor
-- =============================================================

-- 1. Verificar se a tabela push_subscriptions existe e tem dados
SELECT 
  id,
  user_id,
  left(endpoint, 60) AS endpoint_preview,
  left(p256dh, 20)   AS p256dh_preview,
  created_at
FROM public.push_subscriptions
ORDER BY created_at DESC
LIMIT 10;

-- Se retornar vazio: o dispositivo nunca salvou a subscription.
-- Solução: Ver instruções abaixo.

-- =============================================================
-- 2. Verificar as últimas notificações geradas (para confirmar trigger ativo)
-- =============================================================
SELECT id, user_id, title, message, created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 5;

-- =============================================================
-- 3. Verificar logs das chamadas HTTP via pg_net
-- =============================================================
SELECT
  id,
  status_code,
  left(body::text, 300) AS response_preview,
  error_msg,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

