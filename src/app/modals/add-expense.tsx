import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryPicker } from '../../components/CategoryPicker';
import { useCategoryStore } from '../../store/categoryStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';
import { format } from 'date-fns';
import { neuButton, neuCard } from '../../theme/neumorphism';
import type { Category } from '../../db/schema';
import type { AppTheme } from '../../theme';

const schema = z.object({
  amount: z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  note: z.string().optional(),
  date: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function AddExpenseScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currency } = useSettingsStore();
  const { categories, loadCategories } = useCategoryStore();
  const { expenses, addExpense, editExpense } = useExpenseStore();
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!id;
  const existing = isEditing ? expenses.find(e => e.id === Number(id)) : null;

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: existing ? String(existing.amount) : '',
      note: existing?.note ?? '',
      date: existing?.date ?? format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    loadCategories();
    if (existing) {
      const cat = categories.find(c => c.id === existing.categoryId);
      if (cat) setSelectedCategory(cat);
    }
  }, [categories.length]);

  const onSubmit = async (data: FormData) => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        amount: Number(data.amount),
        categoryId: selectedCategory.id,
        note: data.note || null,
        date: data.date,
      };
      if (isEditing && id) {
        await editExpense(Number(id), payload);
      } else {
        await addExpense({ ...payload, createdAt: new Date().toISOString() });
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {isEditing ? 'Edit Expense' : 'Add Expense'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Amount</Text>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              mode="outlined"
              placeholder="0.00"
              left={<TextInput.Affix text={currency} />}
              error={!!errors.amount}
              style={styles.input}
            />
          )}
        />
        {errors.amount && <Text style={{ color: theme.custom.expense }}>{errors.amount.message}</Text>}

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Category</Text>
        <TouchableOpacity
          style={[styles.categoryBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
          onPress={() => setCategoryPickerVisible(true)}
        >
          {selectedCategory ? (
            <>
              <View style={[styles.catIconWrap, { backgroundColor: selectedCategory.color + '22' }]}>
                <MaterialCommunityIcons name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
              </View>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {selectedCategory.name}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="tag-outline" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Select Category
              </Text>
            </>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Note (optional)</Text>
        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              placeholder="What did you spend on?"
              style={styles.input}
            />
          )}
        />

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Date</Text>
        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              left={<TextInput.Icon icon="calendar" />}
              error={!!errors.date}
              style={styles.input}
            />
          )}
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: submitting ? 0.7 : 1,
              boxShadow: neuButton(theme) as any,
            },
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
        >
          <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CategoryPicker
        visible={categoryPickerVisible}
        categories={categories}
        selectedId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
        onClose={() => setCategoryPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  content: { padding: 20 },
  label: { marginBottom: 6, marginTop: 16 },
  input: { marginBottom: 4 },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
});
