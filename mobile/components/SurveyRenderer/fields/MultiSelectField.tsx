import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { MultiSelectField as MultiSelectFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: MultiSelectFieldType;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function MultiSelectField({ field, control, errors }: Props) {
  const error = errors[field.key];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {field.label}
        {field.required && <Text style={styles.required}> *</Text>}
      </Text>
      <Controller
        control={control}
        name={field.key}
        rules={{
          validate: (val) =>
            field.required
              ? (Array.isArray(val) && val.length > 0) || 'Please select at least one option'
              : true,
        }}
        render={({ field: { onChange, value } }) => {
          const selected: string[] = Array.isArray(value) ? value : [];
          const toggle = (opt: string) => {
            if (selected.includes(opt)) {
              onChange(selected.filter((s) => s !== opt));
            } else {
              onChange([...selected, opt]);
            }
          };

          return (
            <View style={styles.options}>
              {field.options.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <Pressable
                    key={opt}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => toggle(opt)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                    </View>
                    <Text style={styles.optionText}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        }}
      />
      {error && <Text style={styles.error}>{error.message as string}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray700 },
  required: { color: Colors.danger },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    width: 20,
    height: 20,
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
