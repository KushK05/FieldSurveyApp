import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getResponsesByUser, getAllForms } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { SyncBadge } from '../../components/common/SyncBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Colors } from '../../constants/Colors';
import { api } from '../../lib/api';
import type { SurveyResponse, SurveyForm, SurveyResponseRecord, ResponseSummary } from '../../types';

export default function ResponsesScreen() {
  const { user, serverUrl, token } = useAuth();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [formMap, setFormMap] = useState<Record<string, SurveyForm>>({});
  const [loading, setLoading] = useState(true);
  const [remoteResponses, setRemoteResponses] = useState<SurveyResponseRecord[]>([]);
  const [summary, setSummary] = useState<ResponseSummary | null>(null);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const loadData = useCallback(async () => {
    if (!user) return;
    if (isAdmin) {
      if (!serverUrl || !token) return;
      try {
        const [summaryResult, responsesResult] = await Promise.all([
          api.responses.summary(serverUrl, token),
          api.responses.list(serverUrl, token, { limit: 50 }),
        ]);
        setSummary(summaryResult);
        setRemoteResponses(responsesResult);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load synced responses');
      } finally {
        setLoading(false);
      }
      return;
    }

    const [resps, forms] = await Promise.all([
      getResponsesByUser(user.id),
      getAllForms(),
    ]);
    setResponses(resps);
    const map: Record<string, SurveyForm> = {};
    forms.forEach((f) => { map[f.id] = f; });
    setFormMap(map);
    setLoading(false);
  }, [user, isAdmin, serverUrl, token]);

  // Reload when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAdmin) {
    return (
      <ScrollView style={styles.list} contentContainerStyle={styles.adminContent}>
        <View style={styles.summaryHero}>
          <Text style={styles.summaryLabel}>Total Synced</Text>
          <Text style={styles.summaryCount}>{summary?.total_responses ?? 0}</Text>
          <Text style={styles.summaryDesc}>Collected responses currently available in the backend.</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Form</Text>
          {(summary?.by_form || []).map((item) => (
            <View key={item.form_id} style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>{item.title}</Text>
              <Text style={styles.summaryCardMeta}>{item.response_count} responses / v{item.version}</Text>
              <Text style={styles.summaryCardDate}>
                {item.last_collected_at ? formatDate(item.last_collected_at) : 'No submissions yet'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Responses</Text>
          {remoteResponses.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No synced responses"
              description="Worker submissions will appear here after sync."
            />
          ) : (
            remoteResponses.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{item.form_title || item.form_id}</Text>
                    <Text style={styles.adminSubText}>{item.respondent_name || item.respondent_id}</Text>
                  </View>
                  <View style={styles.syncedPill}>
                    <Text style={styles.syncedPillText}>synced</Text>
                  </View>
                </View>
                <Text style={styles.cardDate}>{formatDate(item.collected_at)}</Text>
                <Text style={styles.payloadLabel}>Payload</Text>
                <Text style={styles.payloadText}>{JSON.stringify(item.data)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={responses.length === 0 ? styles.empty : styles.content}
      data={responses}
      keyExtractor={(item) => item.id}
      onRefresh={loadData}
      refreshing={false}
      ListHeaderComponent={
        responses.length > 0 ? (
          <Text style={styles.count}>
            {responses.length} response{responses.length !== 1 ? 's' : ''}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title="No responses yet"
          description="Fill out a survey to see your responses here."
        />
      }
      renderItem={({ item }) => {
        const form = formMap[item.form_id];
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {form?.title || 'Unknown Survey'}
                </Text>
              </View>
              <SyncBadge status={item.sync_status} />
            </View>
            <Text style={styles.cardDate}>{formatDate(item.collected_at)}</Text>
            {item.location && (
              <Text style={styles.cardGps}>
                GPS: {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16 },
  adminContent: { padding: 16, gap: 16, paddingBottom: 40 },
  empty: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  count: { fontSize: 13, color: Colors.gray500, marginBottom: 12 },
  summaryHero: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' },
  summaryCount: { fontSize: 34, fontWeight: '700', color: Colors.white, marginTop: 8 },
  summaryDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, lineHeight: 18 },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray800, marginBottom: 12 },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    marginBottom: 12,
  },
  summaryCardTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  summaryCardMeta: { fontSize: 12, color: Colors.gray500, marginTop: 4 },
  summaryCardDate: { fontSize: 11, color: Colors.gray400, marginTop: 6 },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray800 },
  adminSubText: { fontSize: 12, color: Colors.gray500, marginTop: 4 },
  cardDate: { fontSize: 12, color: Colors.gray400, marginTop: 4 },
  cardGps: { fontSize: 11, color: Colors.gray400, marginTop: 4 },
  syncedPill: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  syncedPillText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  payloadLabel: { fontSize: 11, color: Colors.gray500, marginTop: 10, textTransform: 'uppercase' },
  payloadText: { fontSize: 12, color: Colors.gray700, marginTop: 4, lineHeight: 18 },
});
