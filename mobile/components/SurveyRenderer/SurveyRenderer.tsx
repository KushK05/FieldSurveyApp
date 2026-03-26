import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import type { FormSchema, FormField as FormFieldDef } from '../../types/form-schema';
import { TextField } from './fields/TextField';
import { NumberField } from './fields/NumberField';
import { SelectField } from './fields/SelectField';
import { RadioField } from './fields/RadioField';
import { CheckboxField } from './fields/CheckboxField';
import { MultiSelectField } from './fields/MultiSelectField';
import { DateField } from './fields/DateField';
import { PhotoField } from './fields/PhotoField';
import { LocationField } from './fields/LocationField';
import { RatingField } from './fields/RatingField';
import { SectionHeader } from './fields/SectionHeader';
import { Colors } from '../../constants/Colors';

interface SurveyRendererProps {
  schema: FormSchema;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onSaveDraft?: (data: Record<string, unknown>) => void;
}

export function SurveyRenderer({ schema, defaultValues, onSubmit, onSaveDraft }: SurveyRendererProps) {
  const {
    control,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, any>>({
    defaultValues: (defaultValues as Record<string, any>) || {},
  });

  const fillableFields = useMemo(
    () => schema.fields.filter((f) => f.type !== 'section_header'),
    [schema.fields]
  );

  const watchAll = watch();
  const filledCount = useMemo(() => {
    return fillableFields.filter((f) => {
      const val = watchAll[f.key];
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }).length;
  }, [fillableFields, watchAll]);

  const progress = fillableFields.length > 0
    ? Math.round((filledCount / fillableFields.length) * 100)
    : 0;

  const renderField = (field: FormFieldDef) => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return <TextField key={field.key} field={field} control={control} errors={errors} />;
      case 'number':
        return <NumberField key={field.key} field={field} control={control} errors={errors} />;
      case 'select':
        return <SelectField key={field.key} field={field} control={control} errors={errors} />;
      case 'radio':
        return <RadioField key={field.key} field={field} control={control} errors={errors} />;
      case 'checkbox':
        return <CheckboxField key={field.key} field={field} control={control} errors={errors} />;
      case 'multi_select':
        return <MultiSelectField key={field.key} field={field} control={control} errors={errors} />;
      case 'date':
      case 'time':
        return <DateField key={field.key} field={field} control={control} errors={errors} />;
      case 'photo':
        return <PhotoField key={field.key} field={field} control={control} />;
      case 'location':
        return <LocationField key={field.key} field={field} control={control} />;
      case 'rating':
        return <RatingField key={field.key} field={field} control={control} />;
      case 'section_header':
        return <SectionHeader key={field.key} field={field} />;
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Progress bar */}
      {schema.settings?.show_progress_bar && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {/* Fields */}
      <View style={styles.fields}>
        {schema.fields.map(renderField)}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        {onSaveDraft && schema.settings?.allow_draft_save && (
          <Pressable
            style={styles.draftBtn}
            onPress={() => onSaveDraft(getValues())}
          >
            <Text style={styles.draftBtnText}>Save Draft</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingBottom: 40 },
  progressContainer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, fontWeight: '500', color: Colors.gray500 },
  progressValue: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  fields: { padding: 16, gap: 20 },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 8,
  },
  draftBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
  },
  draftBtnText: { fontSize: 15, fontWeight: '600', color: Colors.gray700 },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
