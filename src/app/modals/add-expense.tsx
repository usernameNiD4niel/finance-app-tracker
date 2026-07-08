import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryPicker } from '../../components/CategoryPicker';
import { SourcePicker } from '../../components/SourcePicker';
import { CreditCardPicker } from '../../components/CreditCardPicker';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { useCategoryStore } from '../../store/categoryStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSourceStore } from '../../store/sourceStore';
import { useCreditCardStore } from '../../store/creditCardStore';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import { neuButton, neuChip, neuCard } from '../../theme/neumorphism';
import type { Category, MoneySource, CreditCard } from '../../db/schema';
import type { AppTheme } from '../../theme';

type PaymentType = 'wallet' | 'credit_card';

const schema = z.object({
  amount: z.string().min(1, 'Required').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  note: z.string().optional(),
  date: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function AddExpenseScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currency } = useSettingsStore();
  const { categories, loadCategories } = useCategoryStore();
  const { expenses, addExpense, editExpense } = useExpenseStore();
  const { sources, loadSources } = useSourceStore();
  const { cards, loadCards } = useCreditCardStore();
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [cardPickerVisible, setCardPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSource, setSelectedSource] = useState<MoneySource | null>(null);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('wallet');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!id;
  const existing = isEditing ? expenses.find(e => e.id === Number(id)) : null;

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: existing ? String(existing.amount) : '',
      note: existing?.note ?? '',
      date: existing?.date ?? format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const watchedAmount = Number(watch('amount')) || 0;

  // Balance a wallet has free for this expense. When editing, the original
  // amount was already deducted from its source, so add it back.
  const availableFor = (src: MoneySource) =>
    isEditing && existing?.sourceId === src.id ? src.balance + existing.amount : src.balance;

  useEffect(() => {
    loadCategories();
    loadSources();
    loadCards();
    if (existing) {
      const cat = categories.find(c => c.id === existing.categoryId);
      if (cat) setSelectedCategory(cat);
      if (existing.creditCardId) {
        setPaymentType('credit_card');
        const card = cards.find(c => c.id === existing.creditCardId);
        if (card) setSelectedCard(card);
      } else if (existing.sourceId) {
        setPaymentType('wallet');
        const src = sources.find(s => s.id === existing.sourceId);
        if (src) setSelectedSource(src);
      }
    }
  }, [categories.length, sources.length, cards.length]);

  const onSubmit = async (data: FormData) => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }
    if (paymentType === 'wallet') {
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
    } else {
      if (!selectedCard) {
        Alert.alert('Credit Card Required', 'Please select a credit card.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        amount: Number(data.amount),
        categoryId: selectedCategory.id,
        sourceId: paymentType === 'wallet' ? (selectedSource?.id ?? null) : null,
        creditCardId: paymentType === 'credit_card' ? (selectedCard?.id ?? null) : null,
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {isEditing ? 'Edit Expense' : 'Add Expense'}
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

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Pay With</Text>
        <View style={styles.paymentTypeRow}>
          {(['wallet', 'credit_card'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.paymentTypeChip,
                {
                  backgroundColor: paymentType === type ? theme.colors.primary + '22' : theme.custom.cardBg,
                  boxShadow: paymentType === type ? (neuChip(theme) as any) : undefined,
                },
              ]}
              onPress={() => setPaymentType(type)}
            >
              <MaterialCommunityIcons
                name={type === 'wallet' ? 'wallet-outline' : 'credit-card-outline'}
                size={18}
                color={paymentType === type ? theme.colors.primary : theme.colors.onSurface}
              />
              <Text
                variant="labelMedium"
                style={{ color: paymentType === type ? theme.colors.primary : theme.colors.onSurface, marginLeft: 6 }}
              >
                {type === 'wallet' ? 'Wallet' : 'Credit Card'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {paymentType === 'wallet' ? (
          <TouchableOpacity
            style={[styles.categoryBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
            onPress={() => setSourcePickerVisible(true)}
          >
            {selectedSource ? (
              <>
                <View style={[styles.catIconWrap, { backgroundColor: selectedSource.color + '22' }]}>
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
                  Select Source
                </Text>
              </>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.categoryBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
            onPress={() => setCardPickerVisible(true)}
          >
            {selectedCard ? (
              <>
                <View style={[styles.catIconWrap, { backgroundColor: selectedCard.color + '22' }]}>
                  <MaterialCommunityIcons name={selectedCard.icon as any} size={20} color={selectedCard.color} />
                </View>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  {selectedCard.name}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="credit-card-outline" size={20} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  Select Credit Card
                </Text>
              </>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

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

        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, value } }) => (
            <DatePickerField
              label="Date"
              value={value}
              onChange={onChange}
              error={!!errors.date}
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

      <SourcePicker
        visible={sourcePickerVisible}
        sources={sources}
        selectedId={selectedSource?.id ?? null}
        onSelect={setSelectedSource}
        onClose={() => setSourcePickerVisible(false)}
        currency={currency}
        requiredAmount={watchedAmount}
        getAvailableBalance={availableFor}
      />

      <CreditCardPicker
        visible={cardPickerVisible}
        cards={cards}
        selectedId={selectedCard?.id ?? null}
        onSelect={setSelectedCard}
        onClose={() => setCardPickerVisible(false)}
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
  paymentTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  paymentTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
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
