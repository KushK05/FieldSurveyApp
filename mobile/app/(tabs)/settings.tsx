import React from 'react';
import { View, Text, Pressable, Alert, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { Colors } from '../../constants/Colors';
import { api } from '../../lib/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, serverUrl, logout, setServerUrl } = useAuth();
  const { isOnline, isWifi, pendingCount, triggerSync } = useSyncStatus();
  const [draftServerUrl, setDraftServerUrlState] = React.useState(serverUrl);
  const [testing, setTesting] = React.useState(false);
  const [connectionMessage, setConnectionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraftServerUrlState(serverUrl);
  }, [serverUrl]);

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleSaveServer = async () => {
    await setServerUrl(draftServerUrl);
    setConnectionMessage('Server address saved.');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const reachable = await api.health.ping(draftServerUrl);
    setConnectionMessage(reachable ? 'Backend is reachable.' : 'Backend did not respond.');
    setTesting(false);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* User info */}
      <View style={styles.card}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.full_name}</Text>
            <Text style={styles.userRole}>{user?.role?.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>

      {/* Server */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Server</Text>
        <TextInput
          style={styles.input}
          value={draftServerUrl}
          onChangeText={setDraftServerUrlState}
          placeholder="http://192.168.1.100:3000"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryBtn} onPress={handleSaveServer}>
            <Text style={styles.secondaryBtnText}>Save</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleTestConnection}>
            <Text style={styles.secondaryBtnText}>{testing ? 'Testing...' : 'Test'}</Text>
          </Pressable>
        </View>
        {connectionMessage ? (
          <Text style={styles.helperText}>{connectionMessage}</Text>
        ) : null}
      </View>

      {/* Sync */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sync Status</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Connection</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.gray400 }]} />
            <Text style={styles.rowValue}>{isWifi ? 'WiFi' : isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Pending uploads</Text>
          <Text style={styles.rowValue}>{pendingCount}</Text>
        </View>
        {pendingCount > 0 && isOnline && (
          <Pressable style={styles.syncBtn} onPress={triggerSync}>
            <Ionicons name="sync" size={16} color={Colors.primary} />
            <Text style={styles.syncBtnText}>Sync Now</Text>
          </Pressable>
        )}
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          {isAdmin
            ? 'FieldSurvey admin mode on React Native. Manage forms, users, and synced data from the mobile app.'
            : 'FieldSurvey field mode for offline survey collection. Data syncs automatically when connected to the office WiFi.'}
        </Text>
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray700, marginBottom: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.gray800 },
  userRole: { fontSize: 12, color: Colors.gray400, textTransform: 'capitalize', marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 14, color: Colors.gray600 },
  rowValue: { fontSize: 14, fontWeight: '500', color: Colors.gray800, maxWidth: 200, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    color: Colors.gray800,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryBtn: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  helperText: { fontSize: 12, color: Colors.gray500, marginTop: 10, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    marginTop: 8,
  },
  syncBtnText: { fontSize: 14, fontWeight: '500', color: Colors.primary },
  aboutText: { fontSize: 12, color: Colors.gray500, lineHeight: 18 },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  logoutBtnText: { fontSize: 14, fontWeight: '600', color: Colors.danger },
});
