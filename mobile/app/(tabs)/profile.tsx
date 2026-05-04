import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUPERADMIN: { label: 'Super Admin', color: '#7c3aed', bg: '#f3e8ff' },
  ADMIN: { label: 'Administrador', color: '#1d4ed8', bg: '#dbeafe' },
  GESTOR: { label: 'Gestor', color: '#0369a1', bg: '#e0f2fe' },
  TECNICO: { label: 'Técnico', color: '#059669', bg: '#d1fae5' },
  SOLICITANTE: { label: 'Solicitante', color: '#475569', bg: '#f1f5f9' },
};

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const roleConfig = ROLE_CONFIG[profile?.role || ''] || ROLE_CONFIG['SOLICITANTE'];

  const handleSignOut = () => {
    Alert.alert(
      'Sair do Sistema',
      'Tem certeza que deseja encerrar a sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value?: string | null }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color="#94a3b8" style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.emailText}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleConfig.bg }]}>
          <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informações da Conta</Text>
        <InfoRow icon="mail-outline" label="E-mail" value={user?.email} />
        <View style={styles.divider} />
        <InfoRow icon="shield-checkmark-outline" label="Nível de Acesso" value={roleConfig.label} />
        <View style={styles.divider} />
        <InfoRow
          icon="business-outline"
          label="ID da Instituição"
          value={profile?.institution_id || 'Sem restrição (Superadmin)'}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="people-outline"
          label="Equipe"
          value={profile?.team_id || 'Não atribuído'}
        />
      </View>

      {/* SLA Guide Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Prazos de SLA</Text>
        {[
          { label: 'Crítica', time: '4 horas', color: '#dc2626' },
          { label: 'Alta', time: '24 horas', color: '#ea580c' },
          { label: 'Média', time: '72 horas', color: '#0ea5e9' },
          { label: 'Baixa', time: '168 horas (7 dias)', color: '#64748b' },
        ].map((item, i, arr) => (
          <View key={item.label}>
            <View style={styles.slaRow}>
              <View style={[styles.slaDot, { backgroundColor: item.color }]} />
              <Text style={styles.slaLabel}>{item.label}</Text>
              <Text style={styles.slaTime}>{item.time}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.signOutText}>Sair do Sistema</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Nodus v1.0.0 · Gestão de Manutenção Predial</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  emailText: { fontSize: 16, color: '#334155', fontWeight: '600', marginBottom: 10 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoIcon: { marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#334155', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },
  slaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  slaDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  slaLabel: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '600' },
  slaTime: { fontSize: 13, color: '#64748b' },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff7f7', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#fecaca', marginTop: 4,
  },
  signOutText: { fontSize: 15, color: '#dc2626', fontWeight: '700' },
  version: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 24 },
});
