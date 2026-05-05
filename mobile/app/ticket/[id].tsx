import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTicketById, useUpdateTicketStatus, useUpdateChecklistItem, TicketStatus } from '../../src/hooks/useTickets';

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Aberto', color: '#1d4ed8', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#d97706', bg: '#fef3c7' },
  RESOLVED: { label: 'Resolvido', color: '#059669', bg: '#d1fae5' },
  CANCELED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: [],
  CANCELED: ['OPEN'],
};

const NEXT_LABELS: Record<TicketStatus, string> = {
  IN_PROGRESS: 'Iniciar Atendimento',
  RESOLVED: 'Marcar como Resolvido',
  OPEN: 'Reabrir Chamado',
  CANCELED: 'Cancelar Chamado',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { data: ticket, isLoading } = useTicketById(id);
  const updateStatus = useUpdateTicketStatus();
  const updateChecklist = useUpdateChecklistItem();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  if (isLoading || !ticket) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  const status = STATUS_CONFIG[ticket.status];
  const nextStatuses = STATUS_TRANSITIONS[ticket.status];
  const isActive = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';
  const isPreventive = ticket.ticket_type === 'PREVENTIVE';
  const hasPeriod = ticket.scheduled_at && ticket.deadline_at;
  const checklists = ticket.ticket_checklists || [];
  const doneCount = checklists.filter((c) => c.is_completed).length;
  const canModify = ['GESTOR', 'ADMIN', 'SUPERADMIN', 'TECNICO'].includes(profile?.role || '');

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (newStatus === 'RESOLVED' && !ticket.assigned_to) {
      Alert.alert('Ação inválida', 'Não é possível resolver um chamado sem técnico atribuído.');
      return;
    }

    Alert.alert(
      'Confirmar ação',
      `Alterar status para "${STATUS_CONFIG[newStatus].label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await updateStatus.mutateAsync({ id: ticket.id, status: newStatus });
            router.back();
          },
        },
      ]
    );
  };

  const handleToggleChecklist = (chkId: string, currentValue: boolean) => {
    updateChecklist.mutate({ id: chkId, is_completed: !currentValue });
  };

  const handleUploadPhoto = async (fromCamera: boolean) => {
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar fotos.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria de fotos para enviar anexos.');
        return;
      }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const fileName = `${ticket.id}/${Date.now()}.jpg`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      await supabase.from('attachments').insert({
        ticket_id: ticket.id,
        file_url: urlData.publicUrl,
      });

      setUploadedUrls((prev) => [...prev, urlData.publicUrl]);
      Alert.alert('Sucesso', 'Foto enviada com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao enviar a foto: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Adicionar Foto', 'Escolha a origem da foto:', [
      { text: 'Câmera', onPress: () => handleUploadPhoto(true) },
      { text: 'Galeria', onPress: () => handleUploadPhoto(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status / Priority / Type Header */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.badgeTextGray}>
              {ticket.priority === 'CRITICAL' ? '🔴' : ticket.priority === 'HIGH' ? '🟠' : ticket.priority === 'MEDIUM' ? '🔵' : '⚪'}{' '}
              {ticket.priority === 'CRITICAL' ? 'Crítica' : ticket.priority === 'HIGH' ? 'Alta' : ticket.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
            </Text>
          </View>
          {isPreventive && (
            <View style={[styles.badge, { backgroundColor: '#f3e8ff' }]}>
              <Text style={[styles.badgeText, { color: '#7c3aed' }]}>🛡 Preventiva</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{ticket.title}</Text>

        {/* Period Banner */}
        {hasPeriod && (
          <View style={styles.periodBanner}>
            <Ionicons name="calendar-outline" size={16} color="#7c3aed" />
            <Text style={styles.periodBannerText}>
              Período: {formatDateShort(ticket.scheduled_at)} → {formatDateShort(ticket.deadline_at)}
            </Text>
          </View>
        )}

        {/* Description */}
        {ticket.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DESCRIÇÃO</Text>
            <Text style={styles.description}>{ticket.description}</Text>
          </View>
        )}

        {/* Public Observation */}
        {ticket.public_observation && (
          <View style={styles.observationCard}>
            <View style={styles.observationHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
              <Text style={styles.observationTitle}>Atualização do Técnico</Text>
            </View>
            <Text style={styles.observationText}>{ticket.public_observation}</Text>
          </View>
        )}

        {/* SLA Alert */}
        {isActive && ticket.sla_breached && (
          <View style={styles.slaAlert}>
            <Ionicons name="warning" size={18} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.slaAlertTitle}>SLA Estourado!</Text>
              <Text style={styles.slaAlertSub}>O prazo de atendimento expirou. Ação imediata necessária.</Text>
            </View>
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>INFORMAÇÕES</Text>
          {[
            { icon: 'person-outline', label: 'Solicitante', value: (ticket.requester as any)?.email },
            { icon: 'people-outline', label: 'Equipe', value: (ticket.team as any)?.name },
            { icon: 'pricetag-outline', label: 'Categoria', value: ticket.category },
            { icon: 'calendar-outline', label: 'Criado em', value: formatDate(ticket.created_at) },
            { icon: 'play-outline', label: 'Início', value: hasPeriod ? formatDateShort(ticket.scheduled_at) : null },
            { icon: 'flag-outline', label: 'Término / Prazo', value: hasPeriod ? formatDateShort(ticket.deadline_at) : ticket.deadline_at ? formatDate(ticket.deadline_at) : null },
          ].map((item) => (
            item.value ? (
              <View key={item.label} style={styles.metaRow}>
                <Ionicons name={item.icon as any} size={16} color="#94a3b8" />
                <Text style={styles.metaLabel}>{item.label}</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{item.value}</Text>
              </View>
            ) : null
          ))}
        </View>

        {/* Checklist Section */}
        {checklists.length > 0 && (
          <View style={styles.card}>
            <View style={styles.checklistHeader}>
              <Text style={styles.sectionLabel}>CHECKLIST</Text>
              <View style={styles.checklistProgress}>
                <Text style={[styles.checklistProgressText, doneCount === checklists.length && styles.checklistProgressTextDone]}>
                  {doneCount}/{checklists.length} concluídos
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[
                styles.progressBarFill,
                {
                  width: `${checklists.length > 0 ? (doneCount / checklists.length) * 100 : 0}%` as any,
                  backgroundColor: doneCount === checklists.length ? '#059669' : '#2563eb',
                }
              ]} />
            </View>

            <View style={styles.checklistItems}>
              {checklists.map((chk) => (
                <TouchableOpacity
                  key={chk.id}
                  style={[styles.checklistItem, chk.is_completed && styles.checklistItemDone]}
                  onPress={() => handleToggleChecklist(chk.id, chk.is_completed)}
                  disabled={updateChecklist.isPending}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checklistCircle, chk.is_completed && styles.checklistCircleDone]}>
                    {chk.is_completed && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checklistText, chk.is_completed && styles.checklistTextDone]}>
                      {chk.item_text}
                    </Text>
                    {chk.is_completed && chk.profiles?.email && (
                      <Text style={styles.checklistCompletedBy}>
                        por {chk.profiles.email.split('@')[0]}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Upload Section */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ANEXOS / FOTOS</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={showPhotoOptions}
            disabled={uploadingPhoto}
            activeOpacity={0.85}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color="#2563eb" size="small" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color="#2563eb" />
                <Text style={styles.uploadText}>Adicionar Foto / Anexo</Text>
              </>
            )}
          </TouchableOpacity>

          {uploadedUrls.length > 0 && (
            <View style={styles.photosGrid}>
              {uploadedUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.photoThumb} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {nextStatuses.length > 0 && (
        <View style={styles.actionsBar}>
          {nextStatuses.map((nextStatus, index) => (
            <TouchableOpacity
              key={nextStatus}
              style={[
                styles.actionButton,
                index === 0 ? styles.actionButtonPrimary : styles.actionButtonSecondary,
                nextStatus === 'RESOLVED' && styles.actionButtonResolved,
                nextStatus === 'CANCELED' && styles.actionButtonCancel,
              ]}
              onPress={() => handleStatusChange(nextStatus)}
              disabled={updateStatus.isPending}
              activeOpacity={0.85}
            >
              {updateStatus.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={nextStatus === 'RESOLVED' ? 'checkmark-circle-outline' : 'arrow-forward-outline'}
                    size={18}
                    color={index === 0 ? '#fff' : '#475569'}
                  />
                  <Text style={[styles.actionText, index > 0 && styles.actionTextSecondary]}>
                    {NEXT_LABELS[nextStatus]}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextGray: { fontSize: 12, fontWeight: '600', color: '#475569' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', lineHeight: 28, marginBottom: 12 },
  periodBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3e8ff', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#ddd6fe',
  },
  periodBannerText: { fontSize: 13, color: '#7c3aed', fontWeight: '700' },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 22 },
  observationCard: {
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12,
  },
  observationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  observationTitle: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  observationText: { fontSize: 14, color: '#1e40af', lineHeight: 20 },
  slaAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 16,
  },
  slaAlertTitle: { fontSize: 14, fontWeight: '700', color: '#dc2626', marginBottom: 2 },
  slaAlertSub: { fontSize: 13, color: '#ef4444' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
  metaLabel: { width: 90, fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  metaValue: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '600', textAlign: 'right' },
  // Checklist
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checklistProgress: {},
  checklistProgressText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  checklistProgressTextDone: { color: '#059669' },
  progressBarBg: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginBottom: 12 },
  progressBarFill: { height: 4, borderRadius: 2 },
  checklistItems: { gap: 8 },
  checklistItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  checklistItemDone: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  checklistCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checklistCircleDone: { backgroundColor: '#059669', borderColor: '#059669' },
  checklistText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  checklistTextDone: { color: '#94a3b8', textDecorationLine: 'line-through' },
  checklistCompletedBy: { fontSize: 11, color: '#86efac', marginTop: 2 },
  // Upload
  uploadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: '#bfdbfe', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14, backgroundColor: '#eff6ff',
  },
  uploadText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e2e8f0' },
  // Actions
  actionsBar: {
    backgroundColor: '#fff', padding: 16, gap: 8,
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 5,
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14,
  },
  actionButtonPrimary: { backgroundColor: '#2563eb' },
  actionButtonSecondary: { backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  actionButtonResolved: { backgroundColor: '#059669' },
  actionButtonCancel: { backgroundColor: '#f8fafc', borderColor: '#fecaca' },
  actionText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  actionTextSecondary: { color: '#475569' },
});
