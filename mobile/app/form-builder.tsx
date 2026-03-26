import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Colors } from '../constants/Colors';
import type { FormSchema, SurveyForm } from '../types';

const defaultSchema: FormSchema = {
  fields: [
    { key: 'name', type: 'text', label: 'Name', required: true },
    { key: 'age', type: 'number', label: 'Age', min: 0, max: 120 },
    { key: 'notes', type: 'textarea', label: 'Notes' },
  ],
  settings: {
    allow_draft_save: true,
    show_progress_bar: true,
  },
};

export default function FormBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { serverUrl, token, user } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [schemaText, setSchemaText] = useState(JSON.stringify(defaultSchema, null, 2));
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canManageForms = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const item = await api.forms.get(serverUrl, token, id);
        setForm(item);
        setTitle(item.title);
        setDescription(item.description || '');
        setStatus(item.status);
        setSchemaText(JSON.stringify(item.schema, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, serverUrl, token]);

  const saveLabel = useMemo(() => (saving ? 'Saving...' : form ? 'Save Changes' : 'Create Form'), [saving, form]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const parsedSchema = JSON.parse(schemaText) as FormSchema;
      const payload = {
        title,
        description: description || undefined,
        status,
        schema: parsedSchema,
      };

      if (form) {
        await api.forms.update(serverUrl, token, form.id, payload);
      } else {
        await api.forms.create(serverUrl, token, payload);
      }

      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    if (!form || !token) return;
    Alert.alert('Archive form', 'Archive this form?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.forms.archive(serverUrl, token, form.id);
            router.back();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to archive form');
          }
        },
      },
    ]);
  };

  if (!canManageForms) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>Only admin accounts can create or edit forms.</Text>
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
        <Text style={styles.headerTitle}>{form ? 'Edit Form' : 'New Form'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {loading ? <Text style={styles.helper}>Loading form...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Form title" />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
        />

        <View style={styles.choiceRow}>
          {(['draft', 'published', 'archived'] as const).map((item) => (
            <Pressable key={item} style={[styles.choice, status === item && styles.choiceActive]} onPress={() => setStatus(item)}>
              <Text style={[styles.choiceText, status === item && styles.choiceTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.schemaLabel}>Schema JSON</Text>
        <TextInput
          style={[styles.input, styles.schemaInput]}
          value={schemaText}
          onChangeText={setSchemaText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={saving || !title.trim()}>
          <Text style={styles.primaryBtnText}>{saveLabel}</Text>
        </Pressable>

        {form ? (
          <Pressable style={styles.archiveBtn} onPress={handleArchive}>
            <Text style={styles.archiveBtnText}>Archive Form</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    color: Colors.gray800,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  schemaLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginTop: 4 },
  schemaInput: { minHeight: 320, textAlignVertical: 'top', fontFamily: 'Courier' },
  helper: { fontSize: 13, color: Colors.gray500 },
  error: { fontSize: 13, color: '#B91C1C' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200 },
  choiceActive: { backgroundColor: '#F0FDF4', borderColor: Colors.primary },
  choiceText: { fontSize: 12, color: Colors.gray600, textTransform: 'capitalize' },
  choiceTextActive: { color: Colors.primary, fontWeight: '600' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  primaryBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  archiveBtn: { borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', alignItems: 'center', paddingVertical: 14 },
  archiveBtnText: { color: Colors.danger, fontSize: 14, fontWeight: '600' },
});
