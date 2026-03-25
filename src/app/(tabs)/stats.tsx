import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { RoundedCard } from '../../components/ui/RoundedCard';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getMonthBounds, formatMonthYear } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { format, subMonths } from 'date-fns';
import { neuChip, neuInset } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

export default function StatsScreen() {
  const theme = useTheme<AppTheme>();
  const { currency } = useSettingsStore();
  const { expenses, categoryTotals, loadExpenses, loadCategoryTotals } = useExpenseStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const load = useCallback(async () => {
    const { start, end } = getMonthBounds(selectedMonth);
    await loadExpenses({ startDate: start, endDate: end });
    await loadCategoryTotals(start, end);
  }, [selectedMonth]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxCategoryTotal = Math.max(...categoryTotals.map(c => c.total ?? 0), 1);

  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  const primary = theme.colors.primary;

  return (
    <ScreenContainer>
      <TopHeader title="Statistics" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthRow}
        >
          {months.map((m, i) => {
            const isSelected = format(m, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: isSelected ? primary + '22' : theme.custom.cardBg,
                    boxShadow: isSelected ? (neuChip(theme) as any) : undefined,
                  },
                ]}
                onPress={() => setSelectedMonth(m)}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: isSelected ? primary : theme.colors.onSurface },
                  ]}
                >
                  {format(m, 'MMM')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary */}
        <View style={styles.cardWrap}>
          <RoundedCard>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatMonthYear(format(selectedMonth, 'yyyy-MM-dd'))}
            </Text>
            <Text variant="displaySmall" style={{ color: theme.custom.expense, fontWeight: '800', marginTop: 4 }}>
              {formatCurrency(total, currency)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
            </Text>
          </RoundedCard>
        </View>

        {/* Category Bar Chart */}
        {categoryTotals.length > 0 ? (
          <View style={styles.cardWrap}>
            <RoundedCard>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
                By Category
              </Text>
              {categoryTotals
                .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
                .map((cat) => {
                  const ratio = (cat.total ?? 0) / maxCategoryTotal;
                  return (
                    <View key={cat.categoryId} style={styles.catRow}>
                      <View style={[styles.catIcon, { backgroundColor: (cat.categoryColor ?? theme.colors.primary) + '22' }]}>
                        <MaterialCommunityIcons
                          name={(cat.categoryIcon ?? 'dots-horizontal') as any}
                          size={16}
                          color={cat.categoryColor ?? theme.colors.primary}
                        />
                      </View>
                      <View style={styles.catInfo}>
                        <View style={styles.catHeader}>
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                            {cat.categoryName ?? 'Unknown'}
                          </Text>
                          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            {formatCurrency(cat.total ?? 0, currency)}
                          </Text>
                        </View>
                        <View style={[styles.barTrack, { backgroundColor: theme.custom.trackBg, boxShadow: neuInset(theme) as any }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${ratio * 100}%`,
                                backgroundColor: cat.categoryColor ?? theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {Math.round(ratio * 100)}% of total
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </RoundedCard>
          </View>
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="chart-bar" size={60} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No data for this month
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfo: { flex: 1 },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barTrack: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
});
