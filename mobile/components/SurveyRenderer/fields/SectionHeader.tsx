import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SectionHeaderField } from '../../../types/form-schema';
import { Colors } from '../../../constants/Colors';

export function SectionHeader({ field }: { field: SectionHeaderField }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{field.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
  },
});
