import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { BalanceCard } from '../../components/BalanceCard';
import { ExpenseListItem } from '../../components/ExpenseListItem';
import { LendCard } from '../../components/LendCard';
import { BudgetProgressBar } from '../../components/BudgetProgressBar';
import { PremiumModal } from '../../components/PremiumModal';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ActionButtonRow } from '../../components/ui/ActionButtonRow';
import { RoundedCard } from '../../components/ui/RoundedCard';
import { useSettingsStore } from '../../store/settingsStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useTargetStore } from '../../store/targetStore';
import { useLendStore } from '../../store/lendStore';
import { getDashboardData, calculateCurrentBalance } from '../../services/balance';
import { getCurrentMonth } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { useNeuStyle } from '../../hooks/useNeuStyle';
import { neuCircle, neuListItem, neuCard } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';
import type { UpcomingBill } from '../../services/balance';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DashboardScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Phase 1: Zustand selectors
  const { currency, isPremium } = useSettingsStore(
    useShallow(s => ({ currency: s.currency, isPremium: s.isPremium }))
  );
  const expenses = useExpenseStore(s => s.expenses);
  const loadExpenses = useExpenseStore(s => s.loadExpenses);
  const removeExpense = useExpenseStore(s => s.removeExpense);
  const categoryTotals = useExpenseStore(s => s.categoryTotals);
  const loadCategoryTotals = useExpenseStore(s => s.loadCategoryTotals);
  const { currentTarget, categoryTargets } = useTargetStore(
    useShallow(s => ({ currentTarget: s.currentTarget, categoryTargets: s.categoryTargets }))
  );
  const loadTargets = useTargetStore(s => s.loadTargets);
  const activeLends = useLendStore(s => s.activeLends);
  const loadActiveLends = useLendStore(s => s.loadActiveLends);
  const markLendPaid = useLendStore(s => s.markPaid);

  const [premiumVisible, setPremiumVisible] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    spent: number; billsDue: number; walletBalance: number; balance: number;
  }>({
    spent: 0, billsDue: 0, walletBalance: 0, balance: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Phase 4: Memoized shadows
  const circleShadow = useNeuStyle(neuCircle);
  const listItemShadow = useNeuStyle(neuListItem);
  const cardShadow = useNeuStyle(neuCard);

  // Phase 5: Consolidated DB queries
  const load = useCallback(async () => {
    const today = new Date();
    const month = getCurrentMonth();
    const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    const promises: Promise<any>[] = [
      loadExpenses({}),
      loadTargets(month),
      getDashboardData(),
      loadCategoryTotals(startOfMonth, endOfMonth),
    ];
    if (isPremium) {
      promises.push(loadActiveLends());
    }
    const results = await Promise.all(promises);
    const dashData = results[2];
    setBalanceData(dashData.balance);
    setUpcomingBills(dashData.upcomingBills);
  }, [isPremium, loadExpenses, loadTargets, loadCategoryTotals, loadActiveLends]);

  const markPaid = useCallback(async (id: number) => {
    await markLendPaid(id);
    const balance = await calculateCurrentBalance();
    setBalanceData(balance);
  }, [markLendPaid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Phase 2: Memoized callbacks
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goToBills = useCallback(() => router.push('/(tabs)/bills'), [router]);
  const goToExpenses = useCallback(() => router.push('/(tabs)/expenses'), [router]);
  const goToBudgetTargets = useCallback(() => router.push('/modals/budget-targets'), [router]);
  const goToLends = useCallback(() => router.push('/modals/lends'), [router]);
  const goToNotifications = useCallback(() => router.push('/modals/notifications'), [router]);
  const goToAddExpense = useCallback(() => router.push('/modals/add-expense'), [router]);
  const goToAddLend = useCallback(
    () => isPremium ? router.push('/modals/add-lend') : setPremiumVisible(true),
    [router, isPremium]
  );
  const handleEditExpense = useCallback(
    (id: number) => router.push({ pathname: '/modals/add-expense', params: { id } }),
    [router]
  );
  const dismissPremium = useCallback(() => setPremiumVisible(false), []);

  // Phase 2: Memoized derived data
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  const quickActions = useMemo(() => [
    { icon: 'plus', label: 'Add', color: theme.colors.primary, onPress: goToAddExpense },
    { icon: 'receipt', label: 'Bills', color: theme.custom.warning, onPress: goToBills },
    { icon: 'hand-coin', label: 'Lend', color: theme.colors.tertiary, onPress: goToAddLend },
    { icon: 'cash-multiple', label: 'Expenses', color: theme.colors.secondary, onPress: goToExpenses },
  ], [theme.colors.primary, theme.custom.warning, theme.colors.tertiary, theme.colors.secondary, goToAddExpense, goToBills, goToAddLend, goToExpenses]);

  const topCategoryTargets = useMemo(() => categoryTargets.slice(0, 3), [categoryTargets]);
  const topActiveLends = useMemo(() => activeLends.slice(0, 3), [activeLends]);

  // Phase 6: Category spent lookup map
  const categorySpentMap = useMemo(
    () => new Map(categoryTotals.map(ct => [ct.categoryId, ct.total])),
    [categoryTotals]
  );

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}>
              {getGreeting()} 👋
            </Text>
            <Text style={[styles.appTitle, { color: theme.colors.onSurface }]}>
              Finance Tracker
            </Text>
            <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>
              {formatTodayDate()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: theme.custom.cardBg, boxShadow: circleShadow as any }]}
            onPress={goToNotifications}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <BalanceCard
          balance={balanceData.balance}
          walletBalance={balanceData.walletBalance}
          spent={balanceData.spent}
          billsDue={balanceData.billsDue}
          currency={currency}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionButtonRow actions={quickActions} />
        </View>

        {/* Upcoming Bills */}
        {upcomingBills.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Upcoming Bills" onSeeAll={goToBills} />
            {upcomingBills.map((bill) => (
              <View key={bill.id}>
                <Pressable
                  style={[
                    styles.upcomingBill,
                    {
                      backgroundColor: theme.custom.cardBg,
                      boxShadow: listItemShadow as any,
                    },
                  ]}
                  onPress={goToBills}
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
                  <View style={[styles.dueBadge, {
                    backgroundColor: bill.daysUntilDue <= 2
                      ? theme.custom.expense + '22'
                      : theme.colors.surfaceVariant,
                  }]}>
                    <Text variant="labelSmall" style={{
                      color: bill.daysUntilDue <= 2 ? theme.custom.expense : theme.colors.onSurfaceVariant,
                      fontWeight: '600',
                    }}>
                      {bill.daysUntilDue === 0 ? 'Today' : `${bill.daysUntilDue}d`}
                    </Text>
                  </View>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 8 }}>
                    {formatCurrency(bill.amount, currency)}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Budget Progress */}
        {currentTarget?.overallLimit && (
          <View style={styles.section}>
            <RoundedCard>
              <SectionHeader title="Monthly Budget" onSeeAll={goToBudgetTargets} />
              <BudgetProgressBar
                label="Overall"
                spent={balanceData.spent}
                limit={currentTarget.overallLimit}
                currency={currency}
              />
              {topCategoryTargets.map((ct) => (
                <BudgetProgressBar
                  key={ct.id}
                  label={ct.categoryName ?? ''}
                  icon={ct.categoryIcon ?? undefined}
                  iconColor={ct.categoryColor ?? undefined}
                  spent={categorySpentMap.get(ct.categoryId) ?? 0}
                  limit={ct.limitAmount}
                  currency={currency}
                />
              ))}
            </RoundedCard>
          </View>
        )}

        {/* Active Lends (Premium) */}
        {isPremium && (
          <View style={styles.section}>
            <SectionHeader title="Active Lends" onSeeAll={goToLends} />
            {activeLends.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: theme.custom.cardBg, boxShadow: cardShadow as any }]}>
                <MaterialCommunityIcons name="hand-coin" size={40} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  No active lends
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Tap Lend to track money you've lent out
                </Text>
              </View>
            ) : (
              topActiveLends.map((lend, i) => (
                <LendCard
                  key={lend.id}
                  id={lend.id}
                  amount={lend.amount}
                  borrowerName={lend.borrowerName}
                  note={lend.note}
                  lendDate={lend.lendDate}
                  expectedPayDate={lend.expectedPayDate}
                  isPaid={lend.isPaid}
                  paidDate={lend.paidDate}
                  hasInterest={lend.hasInterest}
                  interestType={lend.interestType}
                  interestValue={lend.interestValue}
                  sourceName={lend.sourceName}
                  sourceIcon={lend.sourceIcon}
                  sourceColor={lend.sourceColor}
                  currency={currency}
                  onMarkPaid={markPaid}
                  index={i}
                />
              ))
            )}
          </View>
        )}

        {/* Recent Expenses */}
        <View style={styles.section}>
          <SectionHeader title="Recent Expenses" onSeeAll={goToExpenses} />
          {recentExpenses.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.custom.cardBg, boxShadow: cardShadow as any }]}>
              <MaterialCommunityIcons name="cash-remove" size={40} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                No expenses yet
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Tap Add to record your first expense
              </Text>
            </View>
          ) : (
            recentExpenses.map((exp, i) => (
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
                onEdit={handleEditExpense}
                index={i}
              />
            ))
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <PremiumModal
        visible={premiumVisible}
        onSubscribe={dismissPremium}
        onDismiss={dismissPremium}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  quickActions: {
    marginTop: 22,
    marginBottom: 2,
  },
  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  upcomingBill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 18,
    marginBottom: 7,
    gap: 10,
  },
  billIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  empty: {
    alignItems: 'center',
    padding: 36,
    borderRadius: 18,
    gap: 4,
  },
});
