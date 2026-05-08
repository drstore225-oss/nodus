import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notification as DbNotification } from '../types/database.types';

// Chave pública VAPID — gerada em 2026-05-08
// Para regenerar: npx web-push generate-vapid-keys --json
const VAPID_PUBLIC_KEY = 'BJ7S-bRDmQHUmwe1JcMe6RDS6arlpfwvDKUCmK7UqnTe09QNB1LW_7DHbwzdj5e9QyG-DjwNrVIP6AMWzRkNBRg';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Salva a subscription Push no banco para que o servidor possa enviar push */
async function saveSubscription(subscription: PushSubscription, userId: string): Promise<string | null> {
  const sub = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: (sub.keys as Record<string, string>)?.p256dh,
      auth: (sub.keys as Record<string, string>)?.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' }
  );
  if (error) {
    console.error('[push] saveSubscription error:', error);
    return error.message;
  }
  console.log('[push] Subscription saved successfully');
  return null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? window.Notification.permission : 'default'
  );

  // ── Pedir permissão + subscrever Push API ──────────────────────────────────
  const requestNotificationPermission = async (): Promise<{ granted: boolean; error?: string }> => {
    if (!('Notification' in window)) return { granted: false, error: 'Notificações não suportadas neste navegador.' };
    try {
      const p = await window.Notification.requestPermission();
      setPermission(p);
      if (p !== 'granted') return { granted: false, error: 'Permissão negada pelo usuário.' };

      if (!('serviceWorker' in navigator)) return { granted: false, error: 'Service Worker não suportado.' };

      const registration = await navigator.serviceWorker.ready;
      console.log('[push] SW ready, getting subscription...');

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('[push] No existing subscription, creating new...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      } else {
        console.log('[push] Existing subscription found, re-saving...');
      }

      if (!user) return { granted: false, error: 'Usuário não autenticado.' };

      const saveError = await saveSubscription(subscription, user.id);
      if (saveError) {
        return { granted: true, error: `Permissão concedida, mas falha ao salvar: ${saveError}` };
      }

      return { granted: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[push] Error registering push:', e);
      return { granted: false, error: msg };
    }
  };

  // ── Renegocia a subscription ao logar (caso já tenha permissão) ─────────────
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;
    if (window.Notification.permission !== 'granted') return;

    navigator.serviceWorker.ready.then(async (registration) => {
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        } catch {
          // Pode falhar se a permissão foi revogada
          return;
        }
      }
      if (subscription) {
        await saveSubscription(subscription, user.id);
      }
    });
  }, [user]);

  // ── Buscar notificações ────────────────────────────────────────────────────
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as DbNotification[];
    },
    enabled: !!user,
  });

  // ── Realtime: invalida lista + exibe notificação no SO (foreground) ────────
  useEffect(() => {
    if (!user) return;

    const channelId = `notifications-${user.id}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });

          // Notificação foreground via Service Worker (funciona mesmo sem push server)
          if (
            'Notification' in window &&
            window.Notification.permission === 'granted' &&
            'serviceWorker' in navigator
          ) {
            const n = payload.new as DbNotification;
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(n.title, {
                body: n.message || '',
                icon: '/logo.png',
                badge: '/logo.png',
                vibrate: [200, 100, 200],
                tag: n.id,
                data: { link: n.link },
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // ── Marcar como lida ───────────────────────────────────────────────────────
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarking: markAsRead.isPending || markAllAsRead.isPending,
    permission,
    requestNotificationPermission,
  };
};
