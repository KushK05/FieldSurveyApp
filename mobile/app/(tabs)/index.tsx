import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllForms, saveForms } from '../../lib/db';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { Colors } from '../../constants/Colors';
import type { SurveyForm } from '../../types';

export default function FormListScreen() {
  const router = useRouter();
  const { serverUrl, token, user } = useAuth();
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const canViewAdminForms = user?.role === 'admin' || user?.role === 'supervisor';
  const canManageForms = user?.role === 'admin';

  const loadForms = useCallback(async () => {
    if (canViewAdminForms) {
      if (!serverUrl || !token) return;
      try {
        const remote = await api.forms.list(serverUrl, token);
        setForms(remote);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forms');
      } finally {
        setLoading(false);
      }
      return;
    }

    const local = await getAllForms();
    setForms(local.filter((f) => f.status === 'published'));
    setLoading(false);
  }, [canViewAdminForms, serverUrl, token]);

  const refreshFromServer = useCallback(async () => {
    if (!serverUrl || !token) return;
    setRefreshing(true);
    try {
      const remote = await api.forms.list(serverUrl, token);
      if (!canViewAdminForms) {
        await saveForms(remote);
        setForms(remote.filter((f) => f.status === 'published'));
      } else {
        setForms(remote);
      }
      setError('');
    } catch (err) {
      if (canViewAdminForms) {
        setError(err instanceof Error ? err.message : 'Failed to refresh forms');
      }
    } finally {
      setRefreshing(false);
    }
  }, [serverUrl, token, canViewAdminForms]);

  useEffect(() => {
    loadForms().then(() => refreshFromServer());
  }, [loadForms, refreshFromServer]);

  useFocusEffect(
    useCallback(() => {
      loadForms();
    }, [loadForms])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (canViewAdminForms) {
    return (
      <ScrollView style={styles.list} contentContainerStyle={styles.adminContent}>
        <View style={styles.adminHeader}>
          <View>
            <Text style={styles.adminTitle}>Mobile Forms</Text>
            <Text style={styles.adminSubtitle}>
              {canManageForms
                ? 'Create and update forms directly from the React Native app.'
                : 'View the latest backend forms and submission counts.'}
            </Text>
          </View>
          {canManageForms ? (
            <Pressable style={styles.newButton} onPress={() => router.push('/form-builder')}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.newButtonText}>New Form</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {forms.length === 0 ? (
          <EmptyState
            icon="layers-outline"
            title="No forms yet"
            description="Create the first form from this admin view."
          />
        ) : (
          forms.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.adminCardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[
                    styles.statusPill,
                    item.status === 'published' ? styles.statusPublished : item.status === 'draft' ? styles.statusDraft : styles.statusArchived,
                  ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
                {item.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                )}
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>v{item.version}</Text>
                  <Text style={styles.metaDot}> / </Text>
                  <Text style={styles.metaText}>{item.response_count ?? 0} responses</Text>
                </View>
              </View>
              {canManageForms ? (
                <Pressable
                  style={styles.cardArrow}
                  onPress={() => router.push({ pathname: '/form-builder', params: { id: item.id } })}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.primary} />
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
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
  adminContent: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  adminTitle: { fontSize: 20, fontWeight: '700', color: Colors.gray800 },
  adminSubtitle: { fontSize: 13, color: Colors.gray500, marginTop: 4, maxWidth: 240 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  newButtonText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
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
  adminCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray800 },
  cardDesc: { fontSize: 13, color: Colors.gray500, marginTop: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 12, color: Colors.gray400 },
  metaDot: { fontSize: 12, color: Colors.gray300 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPublished: { backgroundColor: '#DCFCE7' },
  statusDraft: { backgroundColor: '#FEF3C7' },
  statusArchived: { backgroundColor: '#E5E7EB' },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', color: Colors.gray700 },
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
