import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, ActivityIndicator,
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

    const url = serverAddr.startsWith('http') ? serverAddr.trim() : `http://${serverAddr.trim()}`;

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
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconBox}>
            <Ionicons name="checkbox-outline" size={30} color={Colors.white} />
          </View>
          <Text style={styles.appName}>FieldSurvey</Text>
          <Text style={styles.tagline}>Offline-first data collection</Text>
          <Text style={styles.desc}>
            Collect survey data in the field — even without internet.
            Sync automatically when you're back at the office.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.heading}>Connect to Server</Text>
          <Text style={styles.subheading}>
            Enter the server address shown on the office PC.
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
              <Text style={styles.loginBtnText}>Log In</Text>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            Ask your admin for the server address and login credentials.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 26, fontWeight: '700', color: Colors.white },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 20 },
  form: { padding: 24, flex: 1 },
  heading: { fontSize: 18, fontWeight: '600', color: Colors.gray800 },
  subheading: { fontSize: 13, color: Colors.gray500, marginTop: 4, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: Colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: Colors.white,
    color: Colors.gray800,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  footerText: { fontSize: 12, color: Colors.gray400, textAlign: 'center', marginTop: 20 },
});
