import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { TextField as TextFieldType, TextareaField } from '../../../types/form-schema';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: TextFieldType | TextareaField;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function TextField({ field, control, errors }: Props) {
  const error = errors[field.key];
  const isTextarea = field.type === 'textarea';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {field.label}
        {field.required && <Text style={styles.required}> *</Text>}
      </Text>
      <Controller
        control={control}
        name={field.key}
        rules={{ required: field.required ? 'This field is required' : false }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[
              styles.input,
              isTextarea && styles.textarea,
              error && styles.inputError,
            ]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value || ''}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.gray400}
            multiline={isTextarea}
            numberOfLines={isTextarea ? 4 : 1}
            textAlignVertical={isTextarea ? 'top' : 'center'}
            maxLength={'maxLength' in field ? field.maxLength : undefined}
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
  textarea: { minHeight: 100 },
  inputError: { borderColor: Colors.danger, backgroundColor: '#FEF2F2' },
  error: { fontSize: 12, color: Colors.danger },
});
