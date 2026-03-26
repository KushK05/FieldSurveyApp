import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { Colors } from '../../constants/Colors';
import type { AdminManagedUser } from '../../types';

export default function UsersScreen() {
  const { user, serverUrl, token } = useAuth();
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'field_worker'>('field_worker');
  const [deliveryChannel, setDeliveryChannel] = useState<'manual' | 'sms' | 'whatsapp'>('manual');
  const canManageUsers = user?.role === 'admin';

  const loadUsers = useCallback(async () => {
    if (!canManageUsers || !serverUrl || !token) return;
    setLoading(true);
    try {
      const rows = await api.users.list(serverUrl, token);
      setUsers(rows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [canManageUsers, serverUrl, token]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const handleCreate = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const result = await api.users.create(serverUrl, token, {
        full_name: fullName,
        username: username || undefined,
        role,
        phone: phone || undefined,
        delivery_channel: deliveryChannel,
      });
      setGeneratedPassword(result.generated_password);
      setFullName('');
      setUsername('');
      setPhone('');
      setRole('field_worker');
      setDeliveryChannel('manual');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (id: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const result = await api.users.resendCredentials(serverUrl, token, id);
      setGeneratedPassword(result.generated_password);
      await loadUsers();
      Alert.alert('Credentials reset', `New password: ${result.generated_password}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend credentials');
    } finally {
      setSaving(false);
    }
  };

  if (!canManageUsers) {
    return (
      <View style={styles.center}>
        <EmptyState icon="lock-closed-outline" title="Admin only" description="Only admin accounts can create users and send credentials." />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create User</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {generatedPassword ? (
          <View style={styles.passwordCard}>
            <Text style={styles.passwordLabel}>Generated Password</Text>
            <Text style={styles.passwordValue}>{generatedPassword}</Text>
          </View>
        ) : null}

        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username (optional)" autoCapitalize="none" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone (optional)" keyboardType="phone-pad" />

        <View style={styles.choiceRow}>
          {(['field_worker', 'supervisor', 'admin'] as const).map((item) => (
            <Pressable key={item} style={[styles.choice, role === item && styles.choiceActive]} onPress={() => setRole(item)}>
              <Text style={[styles.choiceText, role === item && styles.choiceTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.choiceRow}>
          {(['manual', 'sms', 'whatsapp'] as const).map((item) => (
            <Pressable key={item} style={[styles.choice, deliveryChannel === item && styles.choiceActive]} onPress={() => setDeliveryChannel(item)}>
              <Text style={[styles.choiceText, deliveryChannel === item && styles.choiceTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleCreate} disabled={saving || !fullName.trim()}>
          <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Create User'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Users</Text>
        {users.length === 0 ? (
          <EmptyState icon="people-outline" title="No users yet" description="Create your first user above." />
        ) : (
          users.map((item) => (
            <View key={item.id} style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={styles.userMeta}>
                  <Text style={styles.userName}>{item.full_name}</Text>
                  <Text style={styles.userSub}>@{item.username} / {item.role}</Text>
                  <Text style={styles.userSub}>{item.phone || 'No phone'} / {item.delivery_channel || 'manual'}</Text>
                </View>
                <Pressable style={styles.smallBtn} onPress={() => handleResend(item.id)} disabled={saving}>
                  <Text style={styles.smallBtnText}>Resend</Text>
                </Pressable>
              </View>
              {item.latest_delivery ? (
                <Text style={styles.deliveryText}>
                  {item.latest_delivery.status} via {item.latest_delivery.channel || 'manual'}
                  {item.latest_delivery.destination ? ` to ${item.latest_delivery.destination}` : ''}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.gray100 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray800, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    color: Colors.gray800,
    marginBottom: 10,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  choice: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.gray200 },
  choiceActive: { backgroundColor: '#F0FDF4', borderColor: Colors.primary },
  choiceText: { fontSize: 12, color: Colors.gray600, textTransform: 'capitalize' },
  choiceTextActive: { color: Colors.primary, fontWeight: '600' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  primaryBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  userCard: { borderRadius: 12, borderWidth: 1, borderColor: Colors.gray100, padding: 14, marginTop: 10, backgroundColor: Colors.surface },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  userMeta: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  userSub: { fontSize: 12, color: Colors.gray500, marginTop: 3 },
  smallBtn: { backgroundColor: '#F0FDF4', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  deliveryText: { fontSize: 12, color: Colors.gray500, marginTop: 10 },
  passwordCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 12 },
  passwordLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' },
  passwordValue: { fontSize: 13, fontWeight: '600', color: '#78350F', marginTop: 6 },
  errorText: { fontSize: 12, color: '#B91C1C', marginBottom: 10 },
});
