import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SourcePicker } from '../../components/SourcePicker';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { useLendStore } from '../../store/lendStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSourceStore } from '../../store/sourceStore';
import { scheduleLendNotification, cancelNotification } from '../../services/notifications';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import { neuButton, neuCard, neuChip } from '../../theme/neumorphism';
import type { MoneySource } from '../../db/schema';
import type { AppTheme } from '../../theme';

const schema = z.object({
  amount: z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  borrowerName: z.string().min(1, 'Required'),
  lendDate: z.string().min(1, 'Required'),
  expectedPayDate: z.string().min(1, 'Required'),
  note: z.string().optional(),
  interestValue: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddLendScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currency } = useSettingsStore();
  const { lends, addLend, editLend } = useLendStore();
  const { sources, loadSources } = useSourceStore();
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MoneySource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasInterest, setHasInterest] = useState(false);
  const [interestType, setInterestType] = useState<'fixed' | 'percentage'>('fixed');

  const isEditing = !!id;
  const existing = isEditing ? lends.find(l => l.id === Number(id)) : null;

  const { control, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: existing ? String(existing.amount) : '',
      borrowerName: existing?.borrowerName ?? '',
      lendDate: existing?.lendDate ?? format(new Date(), 'yyyy-MM-dd'),
      expectedPayDate: existing?.expectedPayDate ?? '',
      note: existing?.note ?? '',
      interestValue: existing?.interestValue ? String(existing.interestValue) : '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedInterest = watch('interestValue');

  // Only the principal is deducted from the wallet when lending.
  const principal = Number(watchedAmount) || 0;

  // Balance free for this lend. When editing an unpaid lend, the original
  // principal was already deducted from its source, so add it back.
  const availableFor = (src: MoneySource) =>
    isEditing && existing?.sourceId === src.id && !existing?.isPaid
      ? src.balance + existing.amount
      : src.balance;

  useEffect(() => {
    loadSources();
    if (existing) {
      if (existing.sourceId) {
        const src = sources.find(s => s.id === existing.sourceId);
        if (src) setSelectedSource(src);
      }
      if (existing.hasInterest) {
        setHasInterest(true);
        setInterestType((existing.interestType as 'fixed' | 'percentage') ?? 'fixed');
      }
    }
  }, [sources.length]);

  const computedTotal = (() => {
    const amt = Number(watchedAmount) || 0;
    const intVal = Number(watchedInterest) || 0;
    if (!hasInterest || !intVal) return amt;
    if (interestType === 'fixed') return amt + intVal;
    return amt + (amt * intVal / 100);
  })();

  const onSubmit = async (data: FormData) => {
    if (!selectedSource) {
      Alert.alert('Source Required', 'Please select a wallet source.');
      return;
    }
    const available = availableFor(selectedSource);
    if (Number(data.amount) > available) {
      Alert.alert(
        'Insufficient Balance',
        `${selectedSource.name} only has ${formatCurrency(available, currency)} available. The wallet can't go negative.`
      );
      return;
    }
    if (hasInterest) {
      const intVal = Number(data.interestValue);
      if (!intVal || intVal <= 0) {
        Alert.alert('Interest Required', 'Please enter a valid interest value.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        amount: Number(data.amount),
        sourceId: selectedSource.id,
        borrowerName: data.borrowerName,
        lendDate: data.lendDate,
        expectedPayDate: data.expectedPayDate,
        note: data.note || null,
        isPaid: false as const,
        hasInterest,
        interestType: hasInterest ? interestType : null,
        interestValue: hasInterest ? Number(data.interestValue) : null,
      };
      if (isEditing && id) {
        if (existing?.notificationId) await cancelNotification(existing.notificationId);
        const notificationId = await scheduleLendNotification(
          Number(id), payload.borrowerName, payload.amount, payload.expectedPayDate, currency
        );
        await editLend(Number(id), { ...payload, notificationId });
      } else {
        await addLend({ ...payload, createdAt: new Date().toISOString() });
        // Schedule notification after lend is created (need the new ID)
        const { lends } = useLendStore.getState();
        const newLend = lends[lends.length - 1];
        if (newLend) {
          const notificationId = await scheduleLendNotification(
            newLend.id, payload.borrowerName, payload.amount, payload.expectedPayDate, currency
          );
          if (notificationId) await editLend(newLend.id, { notificationId });
        }
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {isEditing ? 'Edit Lend' : 'Add Lend'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Borrower Name</Text>
        <Controller
          control={control}
          name="borrowerName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              placeholder="Who are you lending to?"
              error={!!errors.borrowerName}
              style={styles.input}
            />
          )}
        />
        {errors.borrowerName && <Text style={{ color: theme.custom.expense }}>{errors.borrowerName.message}</Text>}

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Source Wallet</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
          onPress={() => setSourcePickerVisible(true)}
        >
          {selectedSource ? (
            <>
              <View style={[styles.iconWrap, { backgroundColor: selectedSource.color + '22' }]}>
                <MaterialCommunityIcons name={selectedSource.icon as any} size={20} color={selectedSource.color} />
              </View>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {selectedSource.name}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="wallet-outline" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Select Source Wallet
              </Text>
            </>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Interest Toggle */}
        <View style={[styles.interestRow, { marginTop: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>With Interest</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Add interest to the lend amount
            </Text>
          </View>
          <Switch
            value={hasInterest}
            onValueChange={setHasInterest}
            trackColor={{ false: theme.custom.trackBg, true: theme.colors.primary + '66' }}
            thumbColor={hasInterest ? theme.colors.primary : theme.colors.surfaceVariant}
          />
        </View>

        {hasInterest && (
          <View style={styles.interestSection}>
            {/* Interest Type Selector */}
            <View style={styles.interestTypeRow}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: interestType === 'fixed' ? theme.colors.primary + '22' : theme.custom.cardBg,
                    boxShadow: interestType === 'fixed' ? (neuChip(theme) as any) : undefined,
                  },
                ]}
                onPress={() => setInterestType('fixed')}
              >
                <MaterialCommunityIcons name="currency-usd" size={16} color={interestType === 'fixed' ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                <Text variant="labelMedium" style={{ color: interestType === 'fixed' ? theme.colors.primary : theme.colors.onSurface, marginLeft: 4 }}>
                  Fixed Amount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: interestType === 'percentage' ? theme.colors.primary + '22' : theme.custom.cardBg,
                    boxShadow: interestType === 'percentage' ? (neuChip(theme) as any) : undefined,
                  },
                ]}
                onPress={() => setInterestType('percentage')}
              >
                <MaterialCommunityIcons name="percent" size={16} color={interestType === 'percentage' ? theme.colors.primary : theme.colors.onSurfaceVariant} />
                <Text variant="labelMedium" style={{ color: interestType === 'percentage' ? theme.colors.primary : theme.colors.onSurface, marginLeft: 4 }}>
                  Percentage
                </Text>
              </TouchableOpacity>
            </View>

            {/* Interest Value Input */}
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
              {interestType === 'fixed' ? 'Interest Amount' : 'Interest Rate (%)'}
            </Text>
            <Controller
              control={control}
              name="interestValue"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  placeholder={interestType === 'fixed' ? '0.00' : '0'}
                  left={interestType === 'fixed' ? <TextInput.Affix text={currency} /> : undefined}
                  right={interestType === 'percentage' ? <TextInput.Affix text="%" /> : undefined}
                  style={styles.input}
                />
              )}
            />

            {/* Total Preview */}
            {computedTotal > 0 && (
              <View style={[styles.totalPreview, { backgroundColor: theme.colors.primary + '10' }]}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Total repayment
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '800' }}>
                  {currency} {computedTotal.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        <Controller
          control={control}
          name="lendDate"
          render={({ field: { onChange, value } }) => (
            <DatePickerField
              label="Lend Date"
              value={value}
              onChange={onChange}
              error={!!errors.lendDate}
            />
          )}
        />

        <Controller
          control={control}
          name="expectedPayDate"
          render={({ field: { onChange, value } }) => (
            <DatePickerField
              label="Expected Pay Date"
              value={value}
              onChange={onChange}
              icon="calendar-clock"
              error={!!errors.expectedPayDate}
            />
          )}
        />

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Note (optional)</Text>
        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              placeholder="Any additional details"
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
            {isEditing ? 'Save Changes' : 'Add Lend'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SourcePicker
        visible={sourcePickerVisible}
        sources={sources}
        selectedId={selectedSource?.id ?? null}
        onSelect={setSelectedSource}
        onClose={() => setSourcePickerVisible(false)}
        currency={currency}
        requiredAmount={principal}
        getAvailableBalance={availableFor}
      />
    </KeyboardAvoidingView>
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interestSection: {
    marginTop: 8,
  },
  interestTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  totalPreview: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
});
