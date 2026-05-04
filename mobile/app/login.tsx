import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos obrigatórios', 'Preencha e-mail e senha.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert(
        'Erro ao entrar',
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message
      );
    }
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>📋</Text>
          </View>
          <Text style={styles.title}>Nodus</Text>
          <Text style={styles.subtitle}>Gestão de Manutenção Predial</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Bem-vindo(a) de volta</Text>
          <Text style={styles.formSubtitle}>Faça login para continuar</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Nodus · Sistema de Manutenção Predial</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  logoIcon: { fontSize: 36 },
  title: { fontSize: 32, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  form: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#0f172a', backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8, shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 32 },
});
