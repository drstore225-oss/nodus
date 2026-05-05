import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCreateTicket, TicketPriority, TicketType } from '../../src/hooks/useTickets';

const PRIORITIES: { label: string; value: TicketPriority; color: string }[] = [
  { label: 'Baixa', value: 'LOW', color: '#10b981' },
  { label: 'Média', value: 'MEDIUM', color: '#0ea5e9' },
  { label: 'Alta', value: 'HIGH', color: '#f59e0b' },
  { label: 'Crítica', value: 'CRITICAL', color: '#ef4444' },
];

const CATEGORIES = [
  'Elétrica', 'Hidráulica', 'Climatização', 'Civil', 'Jardinagem', 'Limpeza', 'Marcenaria', 'Outros',
];

const TICKET_TYPES: { label: string; value: TicketType; icon: string; color: string; desc: string }[] = [
  { label: 'Corretiva', value: 'CORRECTIVE', icon: 'build-outline', color: '#ea580c', desc: 'Problema a resolver' },
  { label: 'Preventiva / Planejada', value: 'PREVENTIVE', icon: 'shield-checkmark-outline', color: '#7c3aed', desc: 'Tarefa programada' },
];

function formatForInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewTicketScreen() {
  const { user, profile } = useAuth();
  const createMutation = useCreateTicket();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('LOW');
  const [category, setCategory] = useState<string>('');
  const [ticketType, setTicketType] = useState<TicketType>('CORRECTIVE');
  const [scheduledAt, setScheduledAt] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título do chamado é obrigatório.');
      return;
    }
    if (!profile?.institution_id) {
      Alert.alert('Erro', 'Você não está vinculado a uma instituição.');
      return;
    }
    if (scheduledAt && deadlineAt && new Date(deadlineAt) < new Date(scheduledAt)) {
      Alert.alert('Datas inválidas', 'A data de término não pode ser anterior à data de início.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        ticket_type: ticketType,
        category: category || null,
        institution_id: profile.institution_id,
        user_id: user!.id,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : null,
      });

      Alert.alert('Sucesso', 'Chamado criado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao criar o chamado: ' + err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Chamado</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tipo do Chamado */}
        <View style={styles.section}>
          <Text style={styles.label}>TIPO DE CHAMADO <Text style={styles.required}>*</Text></Text>
          <View style={styles.typeRow}>
            {TICKET_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeOption,
                  ticketType === t.value && { borderColor: t.color, backgroundColor: t.color + '10' }
                ]}
                onPress={() => setTicketType(t.value)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={20} color={ticketType === t.value ? t.color : '#94a3b8'} />
                <View>
                  <Text style={[styles.typeLabel, ticketType === t.value && { color: t.color, fontWeight: '700' }]}>
                    {t.label}
                  </Text>
                  <Text style={styles.typeDesc}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>TÍTULO DO CHAMADO <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder={ticketType === 'PREVENTIVE' ? 'Ex: Pintura da fachada Norte' : 'Ex: Lâmpada queimada no corredor 2'}
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>DESCRIÇÃO</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalhe o problema ou a tarefa com o máximo de informações possível..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Período de Datas */}
        <View style={styles.section}>
          <Text style={styles.label}>PERÍODO {ticketType === 'PREVENTIVE' ? '(PLANEJAMENTO)' : '(PRAZO)'}</Text>
          <View style={styles.datesCard}>
            <View style={styles.dateField}>
              <Ionicons name="play-circle-outline" size={18} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateFieldLabel}>Data de Início</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="DD/MM/AAAA HH:MM"
                  placeholderTextColor="#94a3b8"
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateField}>
              <Ionicons name="flag-outline" size={18} color="#dc2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateFieldLabel}>Data de Término / Prazo</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="DD/MM/AAAA HH:MM"
                  placeholderTextColor="#94a3b8"
                  value={deadlineAt}
                  onChangeText={setDeadlineAt}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
          <Text style={styles.dateHint}>
            {ticketType === 'PREVENTIVE'
              ? 'Defina o período para ver a tarefa "esticada" no calendário da gestão.'
              : 'Opcional. Defina um prazo de entrega para este chamado.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PRIORIDADE <Text style={styles.required}>*</Text></Text>
          <View style={styles.optionsRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityOption,
                  priority === p.value && { borderColor: p.color, backgroundColor: p.color + '15' }
                ]}
                onPress={() => setPriority(p.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                <Text style={[
                  styles.priorityText,
                  priority === p.value && { color: p.color, fontWeight: '700' }
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>CATEGORIA</Text>
          <View style={styles.optionsGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.categoryOption,
                  category === c && styles.categoryOptionActive
                ]}
                onPress={() => setCategory(c === category ? '' : c)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.categoryText,
                  category === c && styles.categoryTextActive
                ]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !title.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!title.trim() || createMutation.isPending}
          activeOpacity={0.85}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Abrir Chamado</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  scroll: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 10 },
  required: { color: '#ef4444' },
  // Type Selection
  typeRow: { gap: 10 },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  typeLabel: { fontSize: 15, color: '#334155', fontWeight: '600' },
  typeDesc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  // Main Inputs
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 16, height: 50,
    fontSize: 15, color: '#0f172a',
  },
  textArea: { height: 120, paddingTop: 16 },
  // Date Fields
  datesCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', overflow: 'hidden',
  },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  dateDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 14 },
  dateFieldLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  dateInput: { fontSize: 14, color: '#0f172a', height: 24 },
  dateHint: { fontSize: 12, color: '#94a3b8', marginTop: 6, lineHeight: 17 },
  // Priority
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priorityOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    width: '48%',
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  // Category
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
  },
  categoryOptionActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  categoryText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
  // Footer
  footer: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 12, height: 52,
  },
  submitButtonDisabled: { backgroundColor: '#94a3b8' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
