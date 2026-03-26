import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { NumberField as NumberFieldType } from '../../../types/form-schema';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: NumberFieldType;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function NumberField({ field, control, errors }: Props) {
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
          required: field.required ? 'This field is required' : false,
          validate: (val) => {
            if (val === '' || val === undefined) return true;
            const num = Number(val);
            if (isNaN(num)) return 'Must be a number';
            if (field.min !== undefined && num < field.min) return `Minimum is ${field.min}`;
            if (field.max !== undefined && num > field.max) return `Maximum is ${field.max}`;
            return true;
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, error && styles.inputError]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString() || ''}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
          />
        )}
      />
      {error && <Text style={styles.error}>{error.message as string}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray700 },
  required: { color: Colors.danger },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: Colors.white,
    color: Colors.gray800,
  },
  inputError: { borderColor: Colors.danger, backgroundColor: '#FEF2F2' },
  error: { fontSize: 12, color: Colors.danger },
});
