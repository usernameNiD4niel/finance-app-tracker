import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, FAB, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subMonths } from 'date-fns';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { ExpenseListItem } from '../../components/ExpenseListItem';
import { useExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getMonthBounds } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { neuChip, neuButton } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

export default function ExpensesScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currency } = useSettingsStore();
  const { expenses, loadExpenses, removeExpense } = useExpenseStore();
  const { categories, loadCategories } = useCategoryStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  // null = All Time (no date filter)
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i));

  useFocusEffect(useCallback(() => {
    loadCategories();
    if (selectedMonth) {
      const { start, end } = getMonthBounds(selectedMonth);
      loadExpenses({ startDate: start, endDate: end, categoryId: selectedCategory ?? undefined });
    } else {
      loadExpenses({ categoryId: selectedCategory ?? undefined });
    }
  }, [selectedCategory, selectedMonth]));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const primary = theme.colors.primary;

  const categoryChips = [
    { key: null as number | null, label: 'All' },
    ...categories.map(c => ({ key: c.id as number | null, label: c.name })),
  ];

  return (
    <ScreenContainer>
      <TopHeader
        title="Expenses"
        rightElement={
          <Text style={{ color: theme.custom.expense, fontWeight: '700', fontSize: 16 }}>
            -{formatCurrency(total, currency)}
          </Text>
        }
      />

      {/* Month Filter */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <View style={[styles.chip, { backgroundColor: selectedMonth === null ? primary + '22' : theme.custom.cardBg, boxShadow: selectedMonth === null ? (neuChip(theme) as any) : undefined }]}>
            <Text onPress={() => setSelectedMonth(null)} style={[styles.chipLabel, { color: selectedMonth === null ? primary : theme.colors.onSurface }]}>
              All Time
            </Text>
          </View>
          {months.map((m) => {
            const isActive = selectedMonth !== null && format(m, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
            return (
              <View key={m.toISOString()} style={[styles.chip, { backgroundColor: isActive ? primary + '22' : theme.custom.cardBg, boxShadow: isActive ? (neuChip(theme) as any) : undefined }]}>
                <Text onPress={() => setSelectedMonth(m)} style={[styles.chipLabel, { color: isActive ? primary : theme.colors.onSurface }]}>
                  {format(m, 'MMM yyyy')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Filter */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {categoryChips.map((chip) => {
            const isActive = chip.key === selectedCategory;
            return (
              <View
                key={chip.key === null ? 'all' : String(chip.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? primary + '22' : theme.custom.cardBg,
                    boxShadow: isActive ? (neuChip(theme) as any) : undefined,
                  },
                ]}
              >
                <Text
                  onPress={() => setSelectedCategory(chip.key)}
                  style={[styles.chipLabel, { color: isActive ? primary : theme.colors.onSurface }]}
                >
                  {chip.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Expense List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <ExpenseListItem
            id={item.id}
            amount={item.amount}
            note={item.note ?? null}
            date={item.date}
            categoryName={item.categoryName ?? null}
            categoryIcon={item.categoryIcon ?? null}
            categoryColor={item.categoryColor ?? null}
            currency={currency}
            onDelete={removeExpense}
            onEdit={(id) => router.push({ pathname: '/modals/add-expense', params: { id } })}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="cash-remove" size={60} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No expenses found
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Tap + to add your first expense
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 150, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            bottom: insets.bottom + 90,
            backgroundColor: theme.colors.primary,
            boxShadow: neuButton(theme) as any,
          },
        ]}
        color={theme.custom.buttonText}
        onPress={() => router.push('/modals/add-expense')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterWrap: {
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 20,
  },
});
