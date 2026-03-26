import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, SafeAreaView, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import { getForm, saveResponse, addToSyncQueue } from '../../lib/db';
import { createSyncQueueItem } from '../../lib/sync';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineForm } from '../../hooks/useOfflineForm';
import { SurveyRenderer } from '../../components/SurveyRenderer/SurveyRenderer';
import { Colors } from '../../constants/Colors';
import type { SurveyForm, SurveyResponse } from '../../types';

export default function FillFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    getForm(id).then((f) => {
      if (f) {
        setForm(f);
        const newResponse: SurveyResponse = {
          id: uuidv4(),
          form_id: f.id,
          form_version: f.version,
          respondent_id: user?.id || 'unknown',
          data: {},
          location: null,
          collected_at: new Date().toISOString(),
          synced_at: null,
          device_id: `expo-${Platform.OS}`,
          sync_status: 'pending',
        };
        setResponse(newResponse);
      }
      setLoading(false);
    });
  }, [id, user?.id]);

  const getData = useCallback(() => response?.data || {}, [response?.data]);
  useOfflineForm(response, getData);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!response || !form) return;

    const finalResponse: SurveyResponse = {
      ...response,
      data,
      collected_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    await saveResponse(finalResponse);
    await addToSyncQueue(createSyncQueueItem('response', finalResponse.id));
    setSubmitted(true);
  };

  const handleSaveDraft = async (data: Record<string, unknown>) => {
    if (!response) return;
    const draft: SurveyResponse = { ...response, data, sync_status: 'pending' };
    await saveResponse(draft);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!form) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Not Found</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>This survey could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Submitted</Text>
        </View>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={44} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Response Saved!</Text>
          <Text style={styles.successDesc}>
            Your response has been saved and will sync automatically when you're on the office WiFi.
          </Text>
          <View style={styles.successButtons}>
            <Pressable
              style={styles.outlineBtn}
              onPress={() => {
                setSubmitted(false);
                setResponse({
                  ...response!,
                  id: uuidv4(),
                  data: {},
                  collected_at: new Date().toISOString(),
                });
              }}
            >
              <Text style={styles.outlineBtnText}>Fill Another</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
              <Text style={styles.primaryBtnText}>All Surveys</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{form.title}</Text>
      </View>
      <SurveyRenderer
        schema={form.schema}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </SafeAreaView>
  );
}

// Need to import Platform
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.white,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  notFoundText: { fontSize: 14, color: Colors.gray500 },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: Colors.gray800, marginBottom: 8 },
  successDesc: { fontSize: 14, color: Colors.gray500, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  successButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
});
