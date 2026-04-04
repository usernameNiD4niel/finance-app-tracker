import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Switch, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoryPicker } from '../../components/CategoryPicker';
import { SourcePicker } from '../../components/SourcePicker';
import { useCategoryStore } from '../../store/categoryStore';
import { useBillStore } from '../../store/billStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSourceStore } from '../../store/sourceStore';
import { scheduleBillNotification, cancelNotification } from '../../services/notifications';
import { neuButton, neuCard, neuChip } from '../../theme/neumorphism';
import type { Category, MoneySource } from '../../db/schema';
import type { AppTheme } from '../../theme';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  dueDay: z.string().min(1, 'Required').refine(v => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 31;
  }, 'Enter a day 1-31'),
  notifyDaysBefore: z.string(),
});

type FormData = z.infer<typeof schema>;

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

export default function AddBillScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currency } = useSettingsStore();
  const { categories, loadCategories } = useCategoryStore();
  const { bills, addBill, editBill } = useBillStore();
  const { sources, loadSources } = useSourceStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSource, setSelectedSource] = useState<MoneySource | null>(null);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!id;
  const existing = isEditing ? bills.find(b => b.id === Number(id)) : null;

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? '',
      amount: existing ? String(existing.amount) : '',
      dueDay: existing ? String(existing.dueDay) : '',
      notifyDaysBefore: existing ? String(existing.notifyDaysBefore) : '1',
    },
  });

  useEffect(() => {
    loadCategories();
    loadSources();
    if (existing) {
      const cat = categories.find(c => c.id === existing.categoryId);
      if (cat) setSelectedCategory(cat);
      if (existing.sourceId) {
        const src = sources.find(s => s.id === existing.sourceId);
        if (src) setSelectedSource(src);
      }
      setFrequency(existing.frequency);
      setNotifyEnabled(existing.notifyDaysBefore > 0);
    }
  }, [categories.length, sources.length]);

  const onSubmit = async (data: FormData) => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }
    if (!selectedSource) {
      Alert.alert('Source Required', 'Please select a wallet source.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        amount: Number(data.amount),
        categoryId: selectedCategory.id,
        sourceId: selectedSource?.id ?? null,
        frequency,
        dueDay: Number(data.dueDay),
        notifyDaysBefore: notifyEnabled ? Number(data.notifyDaysBefore) : 0,
        isActive: true,
      };

      if (isEditing && id) {
        if (existing?.notificationId) await cancelNotification(existing.notificationId);
        let notificationId = null;
        if (notifyEnabled) {
          notificationId = await scheduleBillNotification(
            Number(id), payload.name, payload.amount, payload.dueDay, payload.notifyDaysBefore, currency, frequency
          );
        }
        await editBill(Number(id), { ...payload, notificationId });
      } else {
        const bill = await addBill({ ...payload, createdAt: new Date().toISOString() });
        if (bill && notifyEnabled) {
          const notificationId = await scheduleBillNotification(
            bill.id, payload.name, payload.amount, payload.dueDay, payload.notifyDaysBefore, currency, frequency
          );
          if (notificationId) await editBill(bill.id, { notificationId });
        }
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {isEditing ? 'Edit Bill' : 'Add Bill'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Bill Name</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput value={value} onChangeText={onChange} mode="outlined" placeholder="e.g. Netflix, Rent" error={!!errors.name} style={styles.input} />
          )}
        />

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Amount</Text>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" mode="outlined" placeholder="0.00" left={<TextInput.Affix text={currency} />} error={!!errors.amount} style={styles.input} />
          )}
        />

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
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{selectedCategory.name}</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="tag-outline" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Select Category</Text>
            </>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Source</Text>
        <TouchableOpacity
          style={[styles.categoryBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
          onPress={() => setSourcePickerVisible(true)}
        >
          {selectedSource ? (
            <>
              <View style={[styles.catIconWrap, { backgroundColor: selectedSource.color + '22' }]}>
                <MaterialCommunityIcons name={selectedSource.icon as any} size={20} color={selectedSource.color} />
              </View>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{selectedSource.name}</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="wallet-outline" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Select Source</Text>
            </>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Frequency</Text>
        <View style={styles.freqRow}>
          {FREQUENCIES.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.freqBtn,
                {
                  backgroundColor: frequency === f ? theme.colors.primary + '22' : theme.custom.cardBg,
                  boxShadow: frequency === f ? (neuChip(theme) as any) : undefined,
                },
              ]}
              onPress={() => setFrequency(f)}
            >
              <Text variant="labelMedium" style={{ color: frequency === f ? theme.colors.primary : theme.colors.onSurface, textTransform: 'capitalize' }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Due Day</Text>
        <Controller
          control={control}
          name="dueDay"
          render={({ field: { onChange, value } }) => (
            <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" mode="outlined" placeholder="e.g. 15" error={!!errors.dueDay} style={styles.input} />
          )}
        />

        <View style={styles.switchRow}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Notify before due</Text>
          <Switch value={notifyEnabled} onValueChange={setNotifyEnabled} color={theme.colors.primary} />
        </View>

        {notifyEnabled && (
          <>
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Days Before</Text>
            <Controller
              control={control}
              name="notifyDaysBefore"
              render={({ field: { onChange, value } }) => (
                <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" mode="outlined" placeholder="1" style={styles.input} />
              )}
            />
          </>
        )}

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
            {isEditing ? 'Save Changes' : 'Add Bill'}
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

      <SourcePicker
        visible={sourcePickerVisible}
        sources={sources}
        selectedId={selectedSource?.id ?? null}
        onSelect={setSelectedSource}
        onClose={() => setSourcePickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  content: { padding: 20 },
  label: { marginBottom: 6, marginTop: 16 },
  input: { marginBottom: 4 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 10,
  },
  catIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  freqRow: { flexDirection: 'row', gap: 10 },
  freqBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
});
