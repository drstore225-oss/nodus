import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notification as DbNotification } from '../types/database.types';

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? window.Notification.permission : 'default'
  );

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    try {
      const p = await window.Notification.requestPermission();
      setPermission(p);
      return p === 'granted';
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  };

  // Buscar notificações
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

  // Inscrever-se para atualizações em tempo real
  useEffect(() => {
    if (!user) return;

    // Usamos um ID único para o canal para evitar conflitos quando o componente
    // é renderizado múltiplas vezes na tela (ex: header mobile e header desktop)
    const channelId = `notifications-${user.id}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId);
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalida a query para buscar os dados atualizados
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });

          // Se for uma inserção (nova notificação) e tivermos permissão, exibe no SO
          if (
            payload.eventType === 'INSERT' &&
            'Notification' in window &&
            window.Notification.permission === 'granted'
          ) {
            const newNotification = payload.new as DbNotification;
            
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(newNotification.title, {
                  body: newNotification.message || '',
                  icon: '/logo.png',
                  badge: '/favicon.svg',
                  data: { link: newNotification.link }
                });
              });
            } else {
              new window.Notification(newNotification.title, {
                body: newNotification.message || '',
                icon: '/logo.png'
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Marcar como lida
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

  // Marcar todas como lidas
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
