import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, FAB, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BalanceCard } from '../../components/BalanceCard';
import { SalaryPeriodBar } from '../../components/SalaryPeriodBar';
import { ExpenseListItem } from '../../components/ExpenseListItem';
import { BudgetProgressBar } from '../../components/BudgetProgressBar';
import { useSettingsStore } from '../../store/settingsStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useTargetStore } from '../../store/targetStore';
import { calculateCurrentBalance, getUpcomingBills } from '../../services/balance';
import { getCurrentPeriodDates, getCurrentMonth } from '../../utils/date';
import { getDaysUntilDue } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import type { AppTheme } from '../../theme';
import type { UpcomingBill } from '../../services/balance';

export default function DashboardScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { expenses, loadExpenses, removeExpense } = useExpenseStore();
  const { currentTarget, categoryTargets, loadTargets } = useTargetStore();

  const [balanceData, setBalanceData] = useState<{
    salary: number; spent: number; billsDue: number; balance: number; period: 'first' | 'fifteenth';
  }>({
    salary: 0, spent: 0, billsDue: 0, balance: 0, period: 'first',
  });
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { start, end } = getCurrentPeriodDates();
    const month = getCurrentMonth();
    await Promise.all([
      loadExpenses({ startDate: start, endDate: end }),
      loadTargets(month),
    ]);
    const [balance, bills] = await Promise.all([
      calculateCurrentBalance(),
      getUpcomingBills(7),
    ]);
    setBalanceData(balance);
    setUpcomingBills(bills);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const recentExpenses = expenses.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
            Finance Tracker
          </Text>
          <MaterialCommunityIcons name="wallet" size={28} color={theme.colors.primary} />
        </View>

        {/* Balance Card */}
        <BalanceCard
          balance={balanceData.balance}
          salary={balanceData.salary}
          spent={balanceData.spent}
          billsDue={balanceData.billsDue}
          currency={currency}
          period={balanceData.period}
        />

        {/* Period Progress */}
        <SalaryPeriodBar />

        {/* Upcoming Bills */}
        {upcomingBills.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Upcoming Bills" onSeeAll={() => router.push('/(tabs)/bills')} />
            {upcomingBills.map((bill) => (
              <TouchableOpacity
                key={bill.id}
                style={[styles.upcomingBill, { backgroundColor: theme.custom.cardBg }]}
                onPress={() => router.push('/(tabs)/bills')}
              >
                <View style={[styles.billIcon, { backgroundColor: (bill.categoryColor ?? theme.colors.primary) + '22' }]}>
                  <MaterialCommunityIcons
                    name={(bill.categoryIcon ?? 'receipt') as any}
                    size={18}
                    color={bill.categoryColor ?? theme.colors.primary}
                  />
                </View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                  {bill.name}
                </Text>
                <Text variant="labelSmall" style={{ color: bill.daysUntilDue <= 2 ? theme.custom.expense : theme.colors.onSurfaceVariant }}>
                  {bill.daysUntilDue === 0 ? 'Today' : `${bill.daysUntilDue}d`}
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 8 }}>
                  {formatCurrency(bill.amount, currency)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Budget Progress */}
        {currentTarget?.overallLimit && (
          <View style={[styles.section, styles.card, { backgroundColor: theme.custom.cardBg }]}>
            <SectionHeader title="Monthly Budget" onSeeAll={() => router.push('/modals/budget-targets')} />
            <BudgetProgressBar
              label="Overall"
              spent={balanceData.spent}
              limit={currentTarget.overallLimit}
              currency={currency}
            />
            {categoryTargets.slice(0, 3).map((ct) => (
              <BudgetProgressBar
                key={ct.id}
                label={ct.categoryName ?? ''}
                icon={ct.categoryIcon ?? undefined}
                iconColor={ct.categoryColor ?? undefined}
                spent={0}
                limit={ct.limitAmount}
                currency={currency}
              />
            ))}
          </View>
        )}

        {/* Recent Expenses */}
        <View style={styles.section}>
          <SectionHeader title="Recent Expenses" onSeeAll={() => router.push('/(tabs)/expenses')} />
          {recentExpenses.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.custom.cardBg }]}>
              <MaterialCommunityIcons name="cash-remove" size={40} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                No expenses yet
              </Text>
            </View>
          ) : (
            recentExpenses.map((exp) => (
              <ExpenseListItem
                key={exp.id}
                id={exp.id}
                amount={exp.amount}
                note={exp.note ?? null}
                date={exp.date}
                categoryName={exp.categoryName ?? null}
                categoryIcon={exp.categoryIcon ?? null}
                categoryColor={exp.categoryColor ?? null}
                currency={currency}
                onDelete={removeExpense}
                onEdit={(id) => router.push({ pathname: '/modals/add-expense', params: { id } })}
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => router.push('/modals/add-expense')}
      />
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={sectionHeaderStyles.row}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {title}
      </Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text variant="labelMedium" style={{ color: theme.colors.primary }}>See All</Text>
      </TouchableOpacity>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  upcomingBill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
    gap: 10,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 18,
  },
});
