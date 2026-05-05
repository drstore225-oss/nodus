import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMyTickets, MobileTicket, TicketStatus } from '../../src/hooks/useTickets';

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; label: string }> = {
  OPEN: { bg: '#dbeafe', text: '#1d4ed8', label: 'Aberto' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#d97706', label: 'Andamento' },
  RESOLVED: { bg: '#d1fae5', text: '#059669', label: 'Resolvido' },
  CANCELED: { bg: '#f1f5f9', text: '#64748b', label: 'Cancelado' },
};

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const date = new Date(dateStr);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isTodayInRange(scheduled_at: string | null, deadline_at: string | null): boolean {
  if (!scheduled_at || !deadline_at) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(scheduled_at);
  start.setHours(0, 0, 0, 0);
  const end = new Date(deadline_at);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

export default function AgendaScreen() {
  const { user, profile } = useAuth();
  const { data: tickets = [], isLoading, refetch, isFetching } = useMyTickets(user?.id);

  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  // Tickets de hoje (agendados ou com period cobrindo hoje)
  const todayTickets = tickets.filter((t) => {
    if (t.status === 'RESOLVED' || t.status === 'CANCELED') return false;
    if (t.scheduled_at && t.deadline_at) return isTodayInRange(t.scheduled_at, t.deadline_at);
    if (t.scheduled_at) return isToday(t.scheduled_at);
    return false;
  });

  // Próximos chamados (nos próximos 7 dias)
  const nextWeekTickets = tickets.filter((t) => {
    if (t.status === 'RESOLVED' || t.status === 'CANCELED') return false;
    if (!t.scheduled_at) return false;
    const date = new Date(t.scheduled_at);
    const diff = date.getTime() - today.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  // Stats gerais
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;

  const AgendaCard = ({ ticket }: { ticket: MobileTicket }) => {
    const hasPeriod = ticket.scheduled_at && ticket.deadline_at;

    return (
      <TouchableOpacity
        style={styles.agendaCard}
        onPress={() => router.push(`/ticket/${ticket.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.agendaCardLeft}>
          <View style={[
            styles.agendaTypeDot,
            { backgroundColor: ticket.ticket_type === 'PREVENTIVE' ? '#7c3aed' : '#2563eb' }
          ]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.agendaTitle} numberOfLines={2}>{ticket.title}</Text>
          {hasPeriod && (
            <Text style={styles.agendaPeriod}>
              {formatDateShort(ticket.scheduled_at)} → {formatDateShort(ticket.deadline_at)}
            </Text>
          )}
          <View style={styles.agendaFooter}>
            <View style={[styles.smallBadge, { backgroundColor: STATUS_COLORS[ticket.status].bg }]}>
              <Text style={[styles.smallBadgeText, { color: STATUS_COLORS[ticket.status].text }]}>
                {STATUS_COLORS[ticket.status].label}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{getGreeting()}, {profile?.name || user?.email?.split('@')[0]}! 👋</Text>
        <Text style={styles.todayDate}>{todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}</Text>
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: '#bfdbfe' }]}>
          <Text style={[styles.statNum, { color: '#2563eb' }]}>{openCount}</Text>
          <Text style={[styles.statLabel, { color: '#3b82f6' }]}>Abertos</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#fde68a' }]}>
          <Text style={[styles.statNum, { color: '#d97706' }]}>{inProgressCount}</Text>
          <Text style={[styles.statLabel, { color: '#d97706' }]}>Andamento</Text>
        </View>
      </View>

      {/* Hoje */}
      <View style={styles.sectionHeader}>
        <Ionicons name="today-outline" size={18} color="#0f172a" />
        <Text style={styles.sectionTitle}>Agenda de Hoje</Text>
        {todayTickets.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{todayTickets.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#2563eb" style={{ marginVertical: 24 }} />
      ) : todayTickets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
          <Text style={styles.emptyText}>Nada agendado para hoje!</Text>
        </View>
      ) : (
        <View style={styles.agendaList}>
          {todayTickets.map((t) => <AgendaCard key={t.id} ticket={t} />)}
        </View>
      )}

      {/* Próximos 7 dias */}
      {nextWeekTickets.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#0f172a" />
            <Text style={styles.sectionTitle}>Próximos 7 dias</Text>
          </View>
          <View style={styles.agendaList}>
            {nextWeekTickets.map((t) => <AgendaCard key={t.id} ticket={t} />)}
          </View>
        </>
      )}

      {/* Ação Rápida */}
      <TouchableOpacity
        style={styles.newTicketButton}
        onPress={() => router.push('/ticket/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.newTicketButtonText}>Novo Chamado / Tarefa</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  greetingSection: { paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  todayDate: { fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
  countBadge: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8, marginBottom: 24,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  emptyText: { fontSize: 14, color: '#059669', fontWeight: '600' },
  agendaList: { gap: 10, marginBottom: 24 },
  agendaCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  agendaCardLeft: { alignItems: 'center' },
  agendaTypeDot: { width: 4, height: 40, borderRadius: 2 },
  agendaTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  agendaPeriod: { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginBottom: 6 },
  agendaFooter: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  smallBadgeText: { fontSize: 11, fontWeight: '600' },
  checkBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkBadgeText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  newTicketButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, marginTop: 8,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  newTicketButtonText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
