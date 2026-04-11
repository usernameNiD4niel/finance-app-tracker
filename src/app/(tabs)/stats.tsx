import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { RoundedCard } from '../../components/ui/RoundedCard';
import { CompareSpending } from '../../components/CompareSpending';
import { DailySpendingChart } from '../../components/DailySpendingChart';
import { CategoryRingChart } from '../../components/CategoryRingChart';
import { PremiumModal } from '../../components/PremiumModal';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { getMonthBounds, formatMonthYear } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { format, subMonths } from 'date-fns';
import { neuChip, neuInset, neuButton } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const PLACEHOLDER_HEIGHTS = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.45];

export default function StatsScreen() {
  const theme = useTheme<AppTheme>();
  const { currency, isPremium } = useSettingsStore();
  const { user } = useAuthStore();
  const { expenses, categoryTotals, dailyTotals, loadExpenses, loadCategoryTotals, loadDailyTotals } = useExpenseStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isFocused, setIsFocused] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const load = useCallback(async () => {
    const { start, end } = getMonthBounds(selectedMonth);
    await loadExpenses({ startDate: start, endDate: end });
    await loadCategoryTotals(start, end);
    await loadDailyTotals(start, end);
  }, [selectedMonth]);

  useFocusEffect(useCallback(() => {
    if (!isPremium) return;
    setIsFocused(true);
    load();
    return () => setIsFocused(false);
  }, [load, isPremium]));

  // ── Non-premium: full-page gate ───────────────────────────────────────────
  if (!isPremium) {
    return (
      <ScreenContainer>
        <TopHeader title="Statistics" />
        <View style={styles.gateContainer}>
          <RoundedCard>
            <View style={styles.previewWrap}>
              {/* Placeholder bars */}
              <View style={styles.barsRow}>
                {PLACEHOLDER_HEIGHTS.map((h, i) => (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.placeholderBar,
                        { height: h * 100, backgroundColor: theme.custom.trackBg, opacity: 0.4 },
                      ]}
                    />
                  </View>
                ))}
              </View>

              {/* Overlay */}
              <View style={[styles.overlay, { backgroundColor: theme.custom.cardBg + 'dd' }]}>
                <View style={[styles.lockIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                  <MaterialCommunityIcons name="lock" size={28} color={theme.colors.primary} />
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 12 }}>
                  Premium Feature
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
                  Unlock detailed spending statistics,{'\n'}charts, and monthly comparisons
                </Text>
                <TouchableOpacity
                  style={[styles.upgradeBtn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
                  onPress={() => setShowPremiumModal(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="crown" size={16} color={theme.custom.buttonText} />
                  <Text variant="labelLarge" style={{ color: theme.custom.buttonText, fontWeight: '700', marginLeft: 6 }}>
                    Go Premium
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </RoundedCard>
        </View>

        <PremiumModal
          visible={showPremiumModal}
          userId={user?.uid ?? ''}
          userEmail={user?.email ?? ''}
          onSubscribeSuccess={() => setShowPremiumModal(false)}
          onDismiss={() => setShowPremiumModal(false)}
        />
      </ScreenContainer>
    );
  }

  // ── Premium: full stats ───────────────────────────────────────────────────
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

        {/* Graph Reports */}
        <View style={styles.cardWrap}>
          <DailySpendingChart dailyTotals={dailyTotals} month={selectedMonth} currency={currency} />
          <View style={{ height: 16 }} />
          <CategoryRingChart categoryTotals={categoryTotals} currency={currency} />
        </View>

        {/* Compare Spending */}
        <View style={styles.cardWrap}>
          <CompareSpending currency={currency} isVisible={isFocused} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <PremiumModal
        visible={showPremiumModal}
        userId={user?.uid ?? ''}
        userEmail={user?.email ?? ''}
        onSubscribeSuccess={() => {
          setShowPremiumModal(false);
          load();
        }}
        onDismiss={() => setShowPremiumModal(false)}
      />
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
