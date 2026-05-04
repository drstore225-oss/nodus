import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMyTickets, MobileTicket, TicketStatus, TicketPriority } from '../../src/hooks/useTickets';

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
  const sla = getSLARemaining(ticket.deadline_at);
  const slaExpired = ticket.sla_breached || sla === 'SLA Expirado';
  const isActive = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';

  return (
    <TouchableOpacity
      style={[styles.card, slaExpired && isActive && styles.cardAlert]}
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{ticket.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

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
    </TouchableOpacity>
  );
}

export default function TicketsScreen() {
  const { user } = useAuth();
  const { data: tickets = [], isLoading, refetch, isFetching } = useMyTickets(user?.id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');

  const FILTERS: { value: TicketStatus | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'OPEN', label: 'Abertos' },
    { value: 'IN_PROGRESS', label: 'Em Andamento' },
    { value: 'RESOLVED', label: 'Resolvidos' },
  ];

  const filtered = tickets
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
    );

  return (
    <View style={styles.container}>
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
      </View>

      {/* Filter Pills */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
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
            {search || statusFilter ? 'Tente ajustar os filtros.' : 'Você não possui chamados atribuídos.'}
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a' },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  filterPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  categoryTag: {
    backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryText: { fontSize: 11, color: '#64748b' },
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
