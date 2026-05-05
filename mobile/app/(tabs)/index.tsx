import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMyTickets, MobileTicket, TicketStatus, TicketPriority, TicketType } from '../../src/hooks/useTickets';

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; label: string }> = {
  OPEN: { bg: '#dbeafe', text: '#1d4ed8', label: 'Aberto' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#d97706', label: 'Em Andamento' },
  RESOLVED: { bg: '#d1fae5', text: '#059669', label: 'Resolvido' },
  CANCELED: { bg: '#f1f5f9', text: '#64748b', label: 'Cancelado' },
};

const PRIORITY_COLORS: Record<TicketPriority, { dot: string; label: string }> = {
  CRITICAL: { dot: '#dc2626', label: 'Crítica' },
  HIGH: { dot: '#ea580c', label: 'Alta' },
  MEDIUM: { dot: '#0ea5e9', label: 'Média' },
  LOW: { dot: '#94a3b8', label: 'Baixa' },
};

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  });
}

function getSLARemaining(deadline: string | null | undefined): string {
  if (!deadline) return '';
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'SLA Expirado';
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d restante`;
  return `${hours}h restante`;
}

function TicketListItem({ ticket }: { ticket: MobileTicket }) {
  const status = STATUS_COLORS[ticket.status];
  const priority = PRIORITY_COLORS[ticket.priority];
  const isPreventive = ticket.ticket_type === 'PREVENTIVE';
  const isActive = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';
  const hasPeriod = ticket.scheduled_at && ticket.deadline_at;
  const sla = !isPreventive ? getSLARemaining(ticket.deadline_at) : '';
  const slaExpired = !isPreventive && (ticket.sla_breached || sla === 'SLA Expirado');

  return (
    <TouchableOpacity
      style={[styles.card, slaExpired && isActive && styles.cardAlert]}
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{ticket.title}</Text>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
          {isPreventive && (
            <View style={styles.prevBadge}>
              <Text style={styles.prevBadgeText}>PREV</Text>
            </View>
          )}
        </View>
      </View>

      {hasPeriod && (
        <View style={styles.periodRow}>
          <Ionicons name="calendar-outline" size={12} color="#7c3aed" />
          <Text style={styles.periodText}>
            {formatDateShort(ticket.scheduled_at)} → {formatDateShort(ticket.deadline_at)}
          </Text>
        </View>
      )}

      {ticket.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{ticket.description}</Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.priorityRow}>
          <View style={[styles.dot, { backgroundColor: priority.dot }]} />
          <Text style={styles.priorityText}>{priority.label}</Text>
          {ticket.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{ticket.category}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isActive && sla && (
            <View style={[styles.slaTag, slaExpired && styles.slaTagExpired]}>
              <Ionicons
                name={slaExpired ? 'warning-outline' : 'time-outline'}
                size={11}
                color={slaExpired ? '#dc2626' : '#64748b'}
              />
              <Text style={[styles.slaText, slaExpired && styles.slaTextExpired]}>{sla}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TicketsScreen() {
  const { user } = useAuth();
  const { data: tickets = [], isLoading, refetch, isFetching } = useMyTickets(user?.id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TicketType | ''>('');

  const STATUS_FILTERS: { value: TicketStatus | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'OPEN', label: 'Abertos' },
    { value: 'IN_PROGRESS', label: 'Andamento' },
    { value: 'RESOLVED', label: 'Resolvidos' },
  ];

  const TYPE_FILTERS: { value: TicketType | ''; label: string; icon: string }[] = [
    { value: '', label: 'Todos tipos', icon: 'apps-outline' },
    { value: 'CORRECTIVE', label: 'Corretivos', icon: 'build-outline' },
    { value: 'PREVENTIVE', label: 'Preventivos', icon: 'shield-checkmark-outline' },
  ];

  const filtered = tickets
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter((t) => !typeFilter || t.ticket_type === typeFilter)
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
    );

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const pendingChecklists = tickets.filter(
    (t) => (t.ticket_checklists || []).some((c) => !c.is_completed)
  ).length;

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      {(openCount > 0 || inProgressCount > 0) && (
        <View style={styles.statsBar}>
          {openCount > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{openCount}</Text>
              <Text style={styles.statLabel}>Abertos</Text>
            </View>
          )}
          {inProgressCount > 0 && (
            <View style={[styles.statItem, { backgroundColor: '#fef9c3', borderColor: '#fde047' }]}>
              <Text style={[styles.statNumber, { color: '#ca8a04' }]}>{inProgressCount}</Text>
              <Text style={[styles.statLabel, { color: '#a16207' }]}>Em andamento</Text>
            </View>
          )}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar chamados..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFiltersScroll} contentContainerStyle={styles.typeFiltersRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.typeFilterChip, typeFilter === f.value && styles.typeFilterChipActive]}
            onPress={() => setTypeFilter(f.value)}
          >
            <Ionicons
              name={f.icon as any}
              size={14}
              color={typeFilter === f.value ? '#fff' : '#64748b'}
            />
            <Text style={[styles.typeFilterText, typeFilter === f.value && styles.typeFilterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter Pills */}
      <View style={styles.filtersRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterPill, statusFilter === f.value && styles.filterPillActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="clipboard-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Nenhum chamado encontrado</Text>
          <Text style={styles.emptySubtitle}>
            {search || statusFilter || typeFilter ? 'Tente ajustar os filtros.' : 'Você não possui chamados atribuídos.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TicketListItem ticket={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB - New Ticket */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/ticket/new')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  statsBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  statItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  statItemWarning: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  statNumber: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  statNumberWarning: { color: '#ea580c' },
  statLabel: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  statLabelWarning: { color: '#ea580c' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a' },
  typeFiltersScroll: { maxHeight: 44 },
  typeFiltersRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  typeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  typeFilterChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  typeFilterText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  typeFilterTextActive: { color: '#fff' },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  filterPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardAlert: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '600' },
  prevBadge: { backgroundColor: '#f3e8ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  prevBadgeText: { fontSize: 9, fontWeight: '800', color: '#7c3aed', letterSpacing: 0.5 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  periodText: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  categoryTag: {
    backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryText: { fontSize: 11, color: '#64748b' },
  checklistBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  checklistBadgeText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  checklistBadgeTextDone: { color: '#059669' },
  slaTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  slaTagExpired: {},
  slaText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  slaTextExpired: { color: '#dc2626' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
