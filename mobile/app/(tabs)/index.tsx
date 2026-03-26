import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllForms, saveForms } from '../../lib/db';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { Colors } from '../../constants/Colors';
import type { SurveyForm } from '../../types';

export default function FormListScreen() {
  const router = useRouter();
  const { serverUrl, token } = useAuth();
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadForms = useCallback(async () => {
    const local = await getAllForms();
    setForms(local.filter((f) => f.status === 'published'));
    setLoading(false);
  }, []);

  const refreshFromServer = useCallback(async () => {
    if (!serverUrl || !token) return;
    setRefreshing(true);
    try {
      const remote = await api.forms.list(serverUrl, token);
      await saveForms(remote);
      setForms(remote.filter((f) => f.status === 'published'));
    } catch {
      // Use local forms
    } finally {
      setRefreshing(false);
    }
  }, [serverUrl, token]);

  useEffect(() => {
    loadForms().then(() => refreshFromServer());
  }, [loadForms, refreshFromServer]);

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
      contentContainerStyle={forms.length === 0 ? styles.empty : styles.content}
      data={forms}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={refreshFromServer}
      ListEmptyComponent={
        <EmptyState
          icon="checkbox-outline"
          title="No surveys available"
          description="Pull down to refresh, or check with your admin."
        />
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => router.push(`/form/${item.id}`)}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            )}
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>v{item.version}</Text>
              <Text style={styles.metaDot}> / </Text>
              <Text style={styles.metaText}>
                {item.schema.fields.filter((f) => f.type !== 'section_header').length} fields
              </Text>
            </View>
          </View>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 12 },
  empty: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray800 },
  cardDesc: { fontSize: 13, color: Colors.gray500, marginTop: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 12, color: Colors.gray400 },
  metaDot: { fontSize: 12, color: Colors.gray300 },
  cardArrow: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
