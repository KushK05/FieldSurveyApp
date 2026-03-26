import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { SelectField as SelectFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface Props {
  field: SelectFieldType;
  control: Control<Record<string, any>>;
  errors: FieldErrors;
}

export function SelectField({ field, control, errors }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
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
          <>
            <Pressable
              style={[styles.selector, error && styles.selectorError]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={[styles.selectorText, !value && styles.placeholder]}>
                {value || 'Select...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.gray400} />
            </Pressable>

            <Modal visible={modalVisible} transparent animationType="slide">
              <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
                <View style={styles.modal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{field.label}</Text>
                    <Pressable onPress={() => setModalVisible(false)}>
                      <Ionicons name="close" size={24} color={Colors.gray600} />
                    </Pressable>
                  </View>
                  <FlatList
                    data={field.options}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <Pressable
                        style={[styles.option, value === item && styles.optionSelected]}
                        onPress={() => {
                          onChange(item);
                          setModalVisible(false);
                        }}
                      >
                        <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>
                          {item}
                        </Text>
                        {value === item && (
                          <Ionicons name="checkmark" size={20} color={Colors.primary} />
                        )}
                      </Pressable>
                    )}
                  />
                </View>
              </Pressable>
            </Modal>
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray800 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  optionSelected: { backgroundColor: '#F0FDF4' },
  optionText: { fontSize: 16, color: Colors.gray700 },
  optionTextSelected: { color: Colors.primary, fontWeight: '500' },
  error: { fontSize: 12, color: Colors.danger },
});
