import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { RoundedCard } from '../../components/ui/RoundedCard';
import { SegmentedChips } from '../../components/ui/SegmentedChips';
import { CompareSpending } from '../../components/CompareSpending';
import { DailySpendingChart } from '../../components/DailySpendingChart';
import { WeeklySpendingChart } from '../../components/WeeklySpendingChart';
import { CategoryRingChart } from '../../components/CategoryRingChart';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getMonthBounds, getWeekBounds, formatMonthYear, formatWeekRange } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { format, subMonths, subWeeks, startOfWeek } from 'date-fns';
import { neuChip, neuInset, neuButton } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const PLACEHOLDER_HEIGHTS = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.45];

type ViewPeriod = 'week' | 'month';

const VIEW_PERIOD_CHIPS = [
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

export default function StatsScreen() {
  const theme = useTheme<AppTheme>();
  const { currency } = useSettingsStore();
  const { expenses, categoryTotals, dailyTotals, loadExpenses, loadCategoryTotals, loadDailyTotals } = useExpenseStore();
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [isFocused, setIsFocused] = useState(false);

  const load = useCallback(async () => {
    const { start, end } = viewPeriod === 'month' ? getMonthBounds(selectedMonth) : getWeekBounds(selectedWeek);
    await loadExpenses({ startDate: start, endDate: end });
    await loadCategoryTotals(start, end);
    await loadDailyTotals(start, end);
  }, [viewPeriod, selectedMonth, selectedWeek]);

  useFocusEffect(useCallback(() => {
    setIsFocused(true);
    load();
    return () => setIsFocused(false);
  }, [load]));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxCategoryTotal = Math.max(...categoryTotals.map(c => c.total ?? 0), 1);
  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  const weeks = Array.from({ length: 8 }, (_, i) => subWeeks(new Date(), 7 - i));
  const primary = theme.colors.primary;

  return (
    <ScreenContainer>
      <TopHeader title="Statistics" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Weekly / Monthly toggle */}
        <View style={styles.viewToggleWrap}>
          <SegmentedChips
            chips={VIEW_PERIOD_CHIPS}
            selectedKey={viewPeriod}
            onSelect={(key) => setViewPeriod(key as ViewPeriod)}
          />
        </View>

        {/* Period Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthRow}
        >
          {viewPeriod === 'month' ? months.map((m, i) => {
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
          }) : weeks.map((w, i) => {
            const isSelected = format(startOfWeek(w, { weekStartsOn: 1 }), 'yyyy-MM-dd')
              === format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const isCurrentWeek = i === weeks.length - 1;
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
                onPress={() => setSelectedWeek(w)}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: isSelected ? primary : theme.colors.onSurface },
                  ]}
                >
                  {isCurrentWeek ? 'This Week' : format(startOfWeek(w, { weekStartsOn: 1 }), 'MMM d')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary */}
        <View style={styles.cardWrap}>
          <RoundedCard>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {viewPeriod === 'month'
                ? formatMonthYear(format(selectedMonth, 'yyyy-MM-dd'))
                : formatWeekRange(format(selectedWeek, 'yyyy-MM-dd'))}
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
              No data for this {viewPeriod}
            </Text>
          </View>
        )}

        {/* Graph Reports */}
        <View style={styles.cardWrap}>
          {viewPeriod === 'month' ? (
            <DailySpendingChart dailyTotals={dailyTotals} month={selectedMonth} currency={currency} />
          ) : (
            <WeeklySpendingChart dailyTotals={dailyTotals} week={selectedWeek} currency={currency} />
          )}
          <View style={{ height: 16 }} />
          <CategoryRingChart categoryTotals={categoryTotals} currency={currency} />
        </View>

        {/* Compare Spending */}
        <View style={styles.cardWrap}>
          <CompareSpending currency={currency} isVisible={isFocused} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // ── Gate styles ──────────────────────────────────────────────────────────
  gateContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  previewWrap: {
    minHeight: 260,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  placeholderBar: {
    width: '100%',
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  // ── Stats styles ─────────────────────────────────────────────────────────
  viewToggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
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
