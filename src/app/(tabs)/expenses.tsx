import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, FAB, Chip, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExpenseListItem } from '../../components/ExpenseListItem';
import { useExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getMonthBounds } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import type { AppTheme } from '../../theme';

export default function ExpensesScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { expenses, loadExpenses, removeExpense } = useExpenseStore();
  const { categories, loadCategories } = useCategoryStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    const { start, end } = getMonthBounds();
    loadCategories();
    loadExpenses({ startDate: start, endDate: end, categoryId: selectedCategory ?? undefined });
  }, [selectedCategory]));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
          Expenses
        </Text>
        <Text variant="titleMedium" style={{ color: theme.custom.expense, fontWeight: '700' }}>
          -{formatCurrency(total, currency)}
        </Text>
      </View>

      {/* Category Filter */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          data={[{ id: null as any, name: 'All', icon: 'filter', color: theme.colors.primary, isCustom: false, createdAt: '' }, ...categories]}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isActive = item.id === (selectedCategory ?? null);
            return (
              <Chip
                selected={isActive}
                onPress={() => setSelectedCategory(item.id ?? null)}
                style={{ backgroundColor: isActive ? theme.colors.primaryContainer : theme.colors.surfaceVariant }}
                textStyle={{ color: isActive ? theme.colors.primary : theme.colors.onSurface }}
              >
                {item.name}
              </Chip>
            );
          }}
        />
      </View>

      {/* Expense List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
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
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => router.push('/modals/add-expense')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    elevation: 2,
  },
  filterWrap: {
    paddingVertical: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 18,
  },
});
