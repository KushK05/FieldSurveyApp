import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Controller, type Control } from 'react-hook-form';
import type { PhotoField as PhotoFieldType } from '../../../types/form-schema';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { compressImage } from '../../../lib/compress';

interface Props {
  field: PhotoFieldType;
  control: Control<Record<string, any>>;
}

export function PhotoField({ field, control }: Props) {
  const [loading, setLoading] = useState(false);

  const pickImage = async (onChange: (val: string) => void, useCamera: boolean) => {
    setLoading(true);
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const compressed = await compressImage(result.assets[0].uri);
        onChange(compressed);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setLoading(false);
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
        render={({ field: { onChange, value } }) => (
          <>
            {value ? (
              <View style={styles.preview}>
                <Image source={{ uri: value }} style={styles.image} />
                <Pressable style={styles.removeBtn} onPress={() => onChange(undefined)}>
                  <Ionicons name="close" size={18} color={Colors.white} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.buttons}>
                <Pressable
                  style={styles.captureBtn}
                  onPress={() => pickImage(onChange, true)}
                  disabled={loading}
                >
                  <Ionicons name="camera" size={24} color={Colors.gray500} />
                  <Text style={styles.captureBtnText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  style={styles.captureBtn}
                  onPress={() => pickImage(onChange, false)}
                  disabled={loading}
                >
                  <Ionicons name="images" size={24} color={Colors.gray500} />
                  <Text style={styles.captureBtnText}>Gallery</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray700 },
  required: { color: Colors.danger },
  buttons: { flexDirection: 'row', gap: 10 },
  captureBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  captureBtnText: { fontSize: 13, color: Colors.gray500 },
  preview: { position: 'relative' },
  image: { width: '100%', height: 200, borderRadius: 10 },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
