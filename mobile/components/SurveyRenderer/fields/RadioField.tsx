import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { RadioField as RadioFieldType } from '../../../types/form-schema';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: RadioFieldType;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function RadioField({ field, control, errors }: Props) {
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
        rules={{ required: field.required ? 'Please select an option' : false }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.options}>
            {field.options.map((opt) => {
              const selected = value === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onChange(opt)}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
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
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionText: { fontSize: 14, color: Colors.gray700 },
  error: { fontSize: 12, color: Colors.danger },
});
