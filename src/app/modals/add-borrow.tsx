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
import { useBorrowStore } from '../../store/borrowStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSourceStore } from '../../store/sourceStore';
import { scheduleBorrowNotification, cancelNotification } from '../../services/notifications';
import { format } from 'date-fns';
import { neuButton, neuCard, neuChip } from '../../theme/neumorphism';
import type { MoneySource } from '../../db/schema';
import type { AppTheme } from '../../theme';

const schema = z.object({
  amount: z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  lenderName: z.string().min(1, 'Required'),
  borrowDate: z.string().min(1, 'Required'),
  expectedPayDate: z.string().min(1, 'Required'),
  note: z.string().optional(),
  interestValue: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddBorrowScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currency } = useSettingsStore();
  const { borrows, addBorrow, editBorrow } = useBorrowStore();
  const { sources, loadSources } = useSourceStore();
  const [receivingPickerVisible, setReceivingPickerVisible] = useState(false);
  const [repaymentPickerVisible, setRepaymentPickerVisible] = useState(false);
  const [receivingSource, setReceivingSource] = useState<MoneySource | null>(null);
  const [repaymentSource, setRepaymentSource] = useState<MoneySource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasInterest, setHasInterest] = useState(false);
  const [interestType, setInterestType] = useState<'fixed' | 'percentage'>('fixed');

  const isEditing = !!id;
  const existing = isEditing ? borrows.find(b => b.id === Number(id)) : null;

  const { control, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: existing ? String(existing.amount) : '',
      lenderName: existing?.lenderName ?? '',
      borrowDate: existing?.borrowDate ?? format(new Date(), 'yyyy-MM-dd'),
      expectedPayDate: existing?.expectedPayDate ?? '',
      note: existing?.note ?? '',
      interestValue: existing?.interestValue ? String(existing.interestValue) : '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedInterest = watch('interestValue');

  useEffect(() => {
    loadSources();
    if (existing) {
      const recv = sources.find(s => s.id === existing.receivingSourceId);
      if (recv) setReceivingSource(recv);
      const repay = sources.find(s => s.id === existing.repaymentSourceId);
      if (repay) setRepaymentSource(repay);
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
    if (!receivingSource) {
      Alert.alert('Receiving Wallet Required', 'Please select the wallet that received the money.');
      return;
    }
    if (!repaymentSource) {
      Alert.alert('Repayment Wallet Required', 'Please select the wallet you will repay from.');
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
        receivingSourceId: receivingSource.id,
        repaymentSourceId: repaymentSource.id,
        lenderName: data.lenderName,
        borrowDate: data.borrowDate,
        expectedPayDate: data.expectedPayDate,
        note: data.note || null,
        isPaid: false as const,
        hasInterest,
        interestType: hasInterest ? interestType : null,
        interestValue: hasInterest ? Number(data.interestValue) : null,
      };
      if (isEditing && id) {
        if (existing?.notificationId) await cancelNotification(existing.notificationId);
        const notificationId = await scheduleBorrowNotification(
          Number(id), payload.lenderName, payload.amount, payload.expectedPayDate, currency
        );
        await editBorrow(Number(id), { ...payload, notificationId });
      } else {
        await addBorrow({ ...payload, createdAt: new Date().toISOString() });
        // Schedule notification after the borrow is created (need the new ID).
        const { borrows } = useBorrowStore.getState();
        const newBorrow = borrows[borrows.length - 1];
        if (newBorrow) {
          const notificationId = await scheduleBorrowNotification(
            newBorrow.id, payload.lenderName, payload.amount, payload.expectedPayDate, currency
          );
          if (notificationId) await editBorrow(newBorrow.id, { notificationId });
        }
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  const renderWalletPicker = (
    label: string,
    placeholder: string,
    selected: MoneySource | null,
    onOpen: () => void,
  ) => (
    <>
      <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
        onPress={onOpen}
      >
        {selected ? (
          <>
            <View style={[styles.iconWrap, { backgroundColor: selected.color + '22' }]}>
              <MaterialCommunityIcons name={selected.icon as any} size={20} color={selected.color} />
            </View>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              {selected.name}
            </Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="wallet-outline" size={20} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {placeholder}
            </Text>
          </>
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    </>
  );

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
          {isEditing ? 'Edit Borrow' : 'Add Borrow'}
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

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Lender Name</Text>
        <Controller
          control={control}
          name="lenderName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              placeholder="Who are you borrowing from?"
              error={!!errors.lenderName}
              style={styles.input}
            />
          )}
        />
        {errors.lenderName && <Text style={{ color: theme.custom.expense }}>{errors.lenderName.message}</Text>}

        {renderWalletPicker(
          'Receiving Wallet',
          'Where did the money go?',
          receivingSource,
          () => setReceivingPickerVisible(true),
        )}

        {renderWalletPicker(
          'Repayment Wallet',
          'Which wallet will you repay from?',
          repaymentSource,
          () => setRepaymentPickerVisible(true),
        )}

        {/* Interest Toggle */}
        <View style={[styles.interestRow, { marginTop: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>With Interest</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Add interest to the borrowed amount
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
          name="borrowDate"
          render={({ field: { onChange, value } }) => (
            <DatePickerField
              label="Borrow Date"
              value={value}
              onChange={onChange}
              error={!!errors.borrowDate}
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
            {isEditing ? 'Save Changes' : 'Add Borrow'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SourcePicker
        visible={receivingPickerVisible}
        sources={sources}
        selectedId={receivingSource?.id ?? null}
        onSelect={setReceivingSource}
        onClose={() => setReceivingPickerVisible(false)}
        currency={currency}
      />

      <SourcePicker
        visible={repaymentPickerVisible}
        sources={sources}
        selectedId={repaymentSource?.id ?? null}
        onSelect={setRepaymentSource}
        onClose={() => setRepaymentPickerVisible(false)}
        currency={currency}
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
