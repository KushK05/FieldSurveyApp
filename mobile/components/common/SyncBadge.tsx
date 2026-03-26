import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SyncStatus } from '../../types';
import { Colors } from '../../constants/Colors';

const STATUS_CONFIG: Record<SyncStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', dot: Colors.warning, label: 'Pending' },
  syncing: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', label: 'Syncing' },
  synced: { bg: '#DCFCE7', text: '#166534', dot: Colors.success, label: 'Synced' },
  failed: { bg: '#FEE2E2', text: '#991B1B', dot: Colors.danger, label: 'Failed' },
};

export function SyncBadge({ status }: { status: SyncStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
