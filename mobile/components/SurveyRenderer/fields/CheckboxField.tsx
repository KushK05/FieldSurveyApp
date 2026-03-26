import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { CheckboxField as CheckboxFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: CheckboxFieldType;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function CheckboxField({ field, control, errors }: Props) {
  const error = errors[field.key];

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name={field.key}
        render={({ field: { onChange, value } }) => (
          <Pressable
            style={[styles.option, value && styles.optionSelected]}
            onPress={() => onChange(!value)}
          >
            <View style={[styles.checkbox, value && styles.checkboxSelected]}>
              {value && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={styles.optionText}>{field.label}</Text>
          </Pressable>
        )}
      />
      {error && <Text style={styles.error}>{error.message as string}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: { fontSize: 14, color: Colors.gray700 },
  error: { fontSize: 12, color: Colors.danger },
});
