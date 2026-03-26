import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getResponsesByUser, getAllForms } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { SyncBadge } from '../../components/common/SyncBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Colors } from '../../constants/Colors';
import type { SurveyResponse, SurveyForm } from '../../types';

export default function ResponsesScreen() {
  const { user } = useAuth();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [formMap, setFormMap] = useState<Record<string, SurveyForm>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [resps, forms] = await Promise.all([
      getResponsesByUser(user.id),
      getAllForms(),
    ]);
    setResponses(resps);
    const map: Record<string, SurveyForm> = {};
    forms.forEach((f) => { map[f.id] = f; });
    setFormMap(map);
    setLoading(false);
  }, [user]);

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
  empty: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  count: { fontSize: 13, color: Colors.gray500, marginBottom: 12 },
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
  cardDate: { fontSize: 12, color: Colors.gray400, marginTop: 4 },
  cardGps: { fontSize: 11, color: Colors.gray400, marginTop: 4 },
});
