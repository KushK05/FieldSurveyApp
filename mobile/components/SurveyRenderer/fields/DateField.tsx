import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { DateField as DateFieldType, TimeField as TimeFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: DateFieldType | TimeFieldType;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function DateField({ field, control, errors }: Props) {
  const [show, setShow] = useState(false);
  const error = errors[field.key];
  const mode = field.type === 'time' ? 'time' : 'date';

  const formatValue = (val: string | undefined) => {
    if (!val) return '';
    if (mode === 'time') return val;
    try {
      return new Date(val).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return val;
    }
  };

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
        render={({ field: { onChange, value } }) => (
          <>
            <Pressable
              style={[styles.selector, error && styles.selectorError]}
              onPress={() => setShow(true)}
            >
              <Text style={[styles.selectorText, !value && styles.placeholder]}>
                {value ? formatValue(value) : `Select ${mode}...`}
              </Text>
              <Ionicons
                name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
                size={18}
                color={Colors.gray400}
              />
            </Pressable>

            {show && (
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode={mode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, selectedDate) => {
                  setShow(Platform.OS === 'ios');
                  if (selectedDate) {
                    if (mode === 'time') {
                      onChange(selectedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                    } else {
                      onChange(selectedDate.toISOString().split('T')[0]);
                    }
                  }
                }}
              />
            )}
          </>
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  selectorError: { borderColor: Colors.danger },
  selectorText: { fontSize: 16, color: Colors.gray800 },
  placeholder: { color: Colors.gray400 },
  error: { fontSize: 12, color: Colors.danger },
});
