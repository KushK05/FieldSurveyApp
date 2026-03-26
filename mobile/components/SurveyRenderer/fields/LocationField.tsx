import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import type { LocationField as LocationFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { useGPS } from '../../../hooks/useGPS';

interface Props {
  field: LocationFieldType;
  control: Control<Record<string, any>>;
}

export function LocationField({ field, control }: Props) {
  const { position, loading, error, capture } = useGPS();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {field.label}
        {field.required && <Text style={styles.required}> *</Text>}
      </Text>
      <Controller
        control={control}
        name={field.key}
        render={({ field: { onChange, value } }) => {
          // Auto-capture on mount
          useEffect(() => {
            if (field.auto_capture && !value) {
              capture();
            }
          }, []);

          // Update form value when position changes
          useEffect(() => {
            if (position && !value) {
              onChange(position);
            }
          }, [position]);

          const currentPos = value || position;

          if (currentPos) {
            return (
              <View style={styles.captured}>
                <View style={styles.capturedHeader}>
                  <Ionicons name="location" size={16} color={Colors.success} />
                  <Text style={styles.capturedTitle}>Location captured</Text>
                </View>
                <Text style={styles.coords}>
                  {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
                  {currentPos.accuracy ? ` (${Math.round(currentPos.accuracy)}m)` : ''}
                </Text>
              </View>
            );
          }

          return (
            <Pressable style={styles.captureBtn} onPress={capture} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.gray500} />
              ) : (
                <Ionicons name="navigate" size={20} color={Colors.gray500} />
              )}
              <Text style={styles.captureBtnText}>
                {loading ? 'Getting location...' : 'Capture GPS location'}
              </Text>
            </Pressable>
          );
        }}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray700 },
  required: { color: Colors.danger },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  captureBtnText: { fontSize: 14, color: Colors.gray600 },
  captured: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  capturedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  capturedTitle: { fontSize: 14, fontWeight: '500', color: '#166534' },
  coords: { fontSize: 12, color: '#15803D' },
  error: { fontSize: 12, color: Colors.danger },
});
