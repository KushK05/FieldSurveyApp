import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import type { RatingField as RatingFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: RatingFieldType;
  control: Control<Record<string, any>>;
}

export function RatingField({ field, control }: Props) {
  const maxStars = field.max_stars || 5;

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
          const current = (value as number) || 0;
          return (
            <View>
              <View style={styles.stars}>
                {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => onChange(star === current ? 0 : star)}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={star <= current ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= current ? Colors.accent : Colors.gray300}
                    />
                  </Pressable>
                ))}
              </View>
              {current > 0 && (
                <Text style={styles.count}>{current} of {maxStars} stars</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray700 },
  required: { color: Colors.danger },
  stars: { flexDirection: 'row', gap: 2 },
  starBtn: { padding: 2 },
  count: { fontSize: 12, color: Colors.gray500, marginTop: 4 },
});
