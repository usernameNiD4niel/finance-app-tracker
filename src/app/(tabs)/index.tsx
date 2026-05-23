import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Pressable, Text as RNText } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BalanceCard } from '../../components/BalanceCard';
import { ExpenseListItem } from '../../components/ExpenseListItem';
import { LendCard } from '../../components/LendCard';
import { BudgetProgressBar } from '../../components/BudgetProgressBar';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ActionButtonRow } from '../../components/ui/ActionButtonRow';
import { RoundedCard } from '../../components/ui/RoundedCard';
import { useSettingsStore } from '../../store/settingsStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useTargetStore } from '../../store/targetStore';
import { useLendStore } from '../../store/lendStore';
import { useSourceStore } from '../../store/sourceStore';
import { calculateCurrentBalance, getUpcomingBills } from '../../services/balance';
import { getCurrentMonth } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { neuCircle, neuListItem, neuCard } from '../../theme/neumorphism';
import { getUnreadNotificationCount } from '../../db/queries';
import type { AppTheme } from '../../theme';
import type { UpcomingBill } from '../../services/balance';

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly',
  start_of_month: 'Start of Month', end_of_month: 'End of Month', specific_day: 'Specific Day',
};

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
  const currency = useSettingsStore(s => s.currency);
  const expenses = useExpenseStore(s => s.expenses);
  const loadExpenses = useExpenseStore(s => s.loadExpenses);
  const removeExpense = useExpenseStore(s => s.removeExpense);
  const currentTarget = useTargetStore(s => s.currentTarget);
  const categoryTargets = useTargetStore(s => s.categoryTargets);
  const loadTargets = useTargetStore(s => s.loadTargets);
  const activeLends = useLendStore(s => s.activeLends);
  const loadActiveLends = useLendStore(s => s.loadActiveLends);
  const markLendPaid = useLendStore(s => s.markPaid);
  const allRecurring = useSourceStore(s => s.allRecurring);
  const loadAllRecurring = useSourceStore(s => s.loadAllRecurring);
  const sources = useSourceStore(s => s.sources);
  const [unreadCount, setUnreadCount] = useState(0);

  const [balanceData, setBalanceData] = useState<{
    spent: number; billsDue: number; walletBalance: number; balance: number;
  }>({
    spent: 0, billsDue: 0, walletBalance: 0, balance: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const month = getCurrentMonth();
    await Promise.all([
      loadExpenses({}),
      loadTargets(month),
      loadAllRecurring(),
      loadActiveLends(),
    ]);
    const [balance, bills] = await Promise.all([
      calculateCurrentBalance(),
      getUpcomingBills(7),
    ]);
    setBalanceData(balance);
    setUpcomingBills(bills);
  }, []);

  const markPaid = useCallback(async (id: number) => {
    await markLendPaid(id);
    const balance = await calculateCurrentBalance();
    setBalanceData(balance);
  }, [markLendPaid]);

  const onEdit = useCallback((id: number) => {
    router.push({ pathname: '/modals/add-expense', params: { id } });
  }, [router]);

  useFocusEffect(useCallback(() => {
    load();
    getUnreadNotificationCount().then(setUnreadCount);
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);
  const topCategoryTargets = useMemo(() => categoryTargets.slice(0, 3), [categoryTargets]);
  const topLends = useMemo(() => activeLends.slice(0, 3), [activeLends]);
  const topRecurring = useMemo(() => allRecurring.slice(0, 5), [allRecurring]);

  const sourceMap = useMemo(() => {
    const map = new Map<number, typeof sources[0]>();
    sources.forEach(s => map.set(s.id, s));
    return map;
  }, [sources]);

  const neuListItemShadow = useMemo(() => neuListItem(theme), [theme]);
  const neuCardShadow = useMemo(() => neuCard(theme), [theme]);
  const neuCircleShadow = useMemo(() => neuCircle(theme), [theme]);

  const billCardStyle = useMemo(() => ({
    backgroundColor: theme.custom.cardBg,
    boxShadow: neuListItemShadow as any,
  }), [theme.custom.cardBg, neuListItemShadow]);

  const recurringRowStyle = useMemo(() => ({
    backgroundColor: theme.custom.cardBg,
    boxShadow: neuListItemShadow as any,
  }), [theme.custom.cardBg, neuListItemShadow]);

  const emptyStyle = useMemo(() => ({
    backgroundColor: theme.custom.cardBg,
    boxShadow: neuCardShadow as any,
  }), [theme.custom.cardBg, neuCardShadow]);

  const notifBtnStyle = useMemo(() => ({
    backgroundColor: theme.custom.cardBg,
    boxShadow: neuCircleShadow as any,
  }), [theme.custom.cardBg, neuCircleShadow]);

  const goToBills = useCallback(() => router.push('/(tabs)/bills'), [router]);
  const goToRecurring = useCallback(() => router.push('/modals/recurring'), [router]);
  const goToBudgetTargets = useCallback(() => router.push('/modals/budget-targets'), [router]);
  const goToExpenses = useCallback(() => router.push('/(tabs)/expenses'), [router]);
  const goToLends = useCallback(() => router.push('/modals/lends'), [router]);
  const goToBill = useCallback((id: number) => router.push({ pathname: '/(tabs)/bills', params: { highlightId: String(id) } }), [router]);
  const goToLend = useCallback((id: number) => router.push({ pathname: '/modals/lends', params: { highlightId: String(id) } }), [router]);
  const goToNotifications = useCallback(() => router.push('/modals/notifications'), [router]);

  const goToAddExpense = useCallback(() => router.push('/modals/add-expense'), [router]);
  const goToAddLend = useCallback(() => router.push('/modals/add-lend'), [router]);

  const quickActions = useMemo(() => [
    { icon: 'plus', label: 'Add', color: theme.colors.primary, onPress: goToAddExpense },
    { icon: 'receipt', label: 'Bills', color: theme.custom.warning, onPress: goToBills },
    { icon: 'hand-coin', label: 'Lend', color: theme.colors.tertiary, onPress: goToAddLend },
    { icon: 'cash-multiple', label: 'Expenses', color: theme.colors.secondary, onPress: goToExpenses },
  ], [theme, goToAddExpense, goToBills, goToAddLend, goToExpenses]);

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
              Ledgerist
            </Text>
            <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>
              {formatTodayDate()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, notifBtnStyle]}
            onPress={goToNotifications}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={theme.colors.onSurface} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                <RNText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</RNText>
              </View>
            )}
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
                  style={[styles.upcomingBill, billCardStyle]}
                  onPress={() => goToBill(bill.id)}
                >
                  <View style={[styles.billIcon, { backgroundColor: (bill.categoryColor ?? theme.colors.primary) + '22' }]}>
                    <MaterialCommunityIcons
                      name={(bill.categoryIcon ?? 'receipt') as any}
                      size={18}
                      color={bill.categoryColor ?? theme.colors.primary}
                    />
                  </View>
                  <Text variant="bodyMedium" style={[styles.flex1, { color: theme.colors.onSurface }]}>
                    {bill.name}
                  </Text>
                  <View style={[styles.dueBadge, {
                    backgroundColor: bill.daysUntilDue <= 2
                      ? theme.custom.expense + '22'
                      : theme.colors.surfaceVariant,
                  }]}>
                    <Text variant="labelSmall" style={[styles.dueBadgeText, {
                      color: bill.daysUntilDue <= 2 ? theme.custom.expense : theme.colors.onSurfaceVariant,
                    }]}>
                      {bill.daysUntilDue === 0 ? 'Today' : `${bill.daysUntilDue}d`}
                    </Text>
                  </View>
                  <Text variant="labelMedium" style={[styles.billAmount, { color: theme.colors.onSurface }]}>
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
                  spent={0}
                  limit={ct.limitAmount}
                  currency={currency}
                />
              ))}
            </RoundedCard>
          </View>
        )}

        {/* Active Lends */}
        {(
          <View style={styles.section}>
            <SectionHeader title="Active Lends" onSeeAll={goToLends} />
            {activeLends.length === 0 ? (
              <View style={[styles.empty, emptyStyle]}>
                <MaterialCommunityIcons name="hand-coin" size={40} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  No active lends
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Tap Lend to track money you've lent out
                </Text>
              </View>
            ) : (
              topLends.map((lend, i) => (
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
                  onPress={goToLend}
                  onMarkPaid={markPaid}
                  index={i}
                />
              ))
            )}
          </View>
        )}

        {/* Recurring Transactions */}
        {allRecurring.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recurring Transactions"
              onSeeAll={allRecurring.length > 5 ? goToRecurring : undefined}
            />
            {topRecurring.map((rt) => {
              const source = sourceMap.get(rt.sourceId);
              const isDeposit = rt.type === 'deposit';
              return (
                <Pressable
                  key={rt.id}
                  style={[styles.recurringRow, recurringRowStyle]}
                  onPress={goToRecurring}
                >
                  <View style={[styles.recurringIcon, { backgroundColor: (source?.color ?? theme.colors.primary) + '22' }]}>
                    <MaterialCommunityIcons
                      name={(source?.icon ?? 'wallet-outline') as any}
                      size={18}
                      color={source?.color ?? theme.colors.primary}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text variant="bodyMedium" style={[styles.recurringName, { color: theme.colors.onSurface }]}>
                      {source?.name ?? 'Unknown Wallet'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {FREQ_LABELS[rt.frequency] ?? rt.frequency}
                      {rt.frequency === 'specific_day' && rt.dayOfMonth ? ` · Day ${rt.dayOfMonth}` : ''}
                    </Text>
                  </View>
                  <Text
                    variant="titleSmall"
                    style={[styles.recurringAmount, { color: isDeposit ? theme.custom.income : theme.custom.expense }]}
                  >
                    {isDeposit ? '+' : '-'}{formatCurrency(rt.amount, currency)}
                  </Text>
                </Pressable>
              );
            })}
            {allRecurring.length > 5 && (
              <Pressable
                style={[styles.seeAllRow, { backgroundColor: theme.custom.cardBg }]}
                onPress={goToRecurring}
              >
                <Text variant="bodySmall" style={[styles.seeAllText, { color: theme.colors.primary }]}>
                  See all {allRecurring.length} recurring transactions
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        {/* Recent Expenses */}
        <View style={styles.section}>
          <SectionHeader title="Recent Expenses" onSeeAll={goToExpenses} />
          {recentExpenses.length === 0 ? (
            <View style={[styles.empty, emptyStyle]}>
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
                onEdit={onEdit}
                index={i}
              />
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  quickActions: {
    marginTop: 22,
    marginBottom: 2,
  },
  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    marginBottom: 7,
    gap: 10,
  },
  recurringIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 4,
    marginTop: 2,
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
  flex1: {
    flex: 1,
  },
  seeAllText: {
    fontWeight: '600',
  },
  dueBadgeText: {
    fontWeight: '600',
  },
  billAmount: {
    fontWeight: '700',
    marginLeft: 8,
  },
  recurringName: {
    fontWeight: '600',
  },
  recurringAmount: {
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 120,
  },
});
