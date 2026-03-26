import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverAddr, setServerAddr] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!serverAddr.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    const url = serverAddr.startsWith('http')
      ? serverAddr.trim()
      : `http://${serverAddr.trim()}`;

    setLoading(true);
    try {
      await login(url, username.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="leaf-outline" size={26} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>FieldSurvey</Text>
          <Text style={styles.tagline}>
            Simple, reliable data collection for NGO field teams.
          </Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="cloud-offline-outline" size={14} color={Colors.primary} />
              <Text style={styles.chipText}>Offline-ready</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.primary} />
              <Text style={styles.chipText}>Secure</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="sync-outline" size={14} color={Colors.primary} />
              <Text style={styles.chipText}>Fast sync</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Sign in to continue</Text>
          <Text style={styles.subheading}>
            Use the server address and login shared by your admin.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Server Address</Text>
            <TextInput
              style={styles.input}
              value={serverAddr}
              onChangeText={setServerAddr}
              placeholder="192.168.1.100:3000"
              placeholderTextColor={Colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Colors.gray400}
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color={Colors.white} />
                <Text style={styles.loginBtnText}>Sign In</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            Need help? Ask your coordinator for access details.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

  const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  hero: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 28, fontWeight: '700', color: Colors.gray800 },
  tagline: { fontSize: 14, color: Colors.gray600, marginTop: 6, lineHeight: 20 },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.gray100,
  },
  chipText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },

  card: {
    marginTop: 6,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    shadowColor: Colors.gray800,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heading: { fontSize: 18, fontWeight: '600', color: Colors.gray800 },
  subheading: { fontSize: 13, color: Colors.gray500, marginTop: 6, marginBottom: 20 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: Colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.gray50,
    color: Colors.gray800,
  },

  loginBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: '600', color: Colors.white },

  footerText: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 16,
  },
});