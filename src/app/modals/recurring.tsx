import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSourceStore } from '../../store/sourceStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/currency';
import { neuCard, neuListItem } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  start_of_month: 'Start of Month',
  end_of_month: 'End of Month',
  specific_day: 'Specific Day',
};

export default function RecurringScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { allRecurring, loadAllRecurring, sources, removeRecurring } = useSourceStore();

  useEffect(() => {
    loadAllRecurring();
  }, []);

  const getSource = (sourceId: number) =>
    sources.find(s => s.id === sourceId);

  const handleDelete = (id: number, sourceId: number) => {
    Alert.alert(
      'Remove Recurring',
      'Are you sure you want to remove this recurring transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeRecurring(id, sourceId) },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Recurring Transactions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {allRecurring.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
            <MaterialCommunityIcons name="refresh" size={40} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              No recurring transactions
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
              Add a recurring deposit or withdrawal from the Wallets tab
            </Text>
          </View>
        ) : (
          allRecurring.map((rt) => {
            const source = getSource(rt.sourceId);
            const isDeposit = rt.type === 'deposit';
            return (
              <View
                key={rt.id}
                style={[styles.card, { backgroundColor: theme.custom.cardBg, boxShadow: neuListItem(theme) as any }]}
              >
                {/* Source icon + info */}
                <View style={[styles.iconWrap, { backgroundColor: (source?.color ?? theme.colors.primary) + '22' }]}>
                  <MaterialCommunityIcons
                    name={(source?.icon ?? 'wallet-outline') as any}
                    size={20}
                    color={source?.color ?? theme.colors.primary}
                  />
                </View>

                <View style={styles.info}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {source?.name ?? 'Unknown Wallet'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {FREQ_LABELS[rt.frequency] ?? rt.frequency}
                    {rt.frequency === 'specific_day' && rt.dayOfMonth ? ` (Day ${rt.dayOfMonth})` : ''}
                    {rt.note ? ` · ${rt.note}` : ''}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    Next: {rt.nextRunDate}
                  </Text>
                </View>

                {/* Amount + type */}
                <View style={styles.right}>
                  <Text
                    variant="titleSmall"
                    style={{ color: isDeposit ? theme.custom.income : theme.custom.expense, fontWeight: '700' }}
                  >
                    {isDeposit ? '+' : '-'}{formatCurrency(rt.amount, currency)}
                  </Text>
                  <View style={[styles.typeBadge, { backgroundColor: (isDeposit ? theme.custom.income : theme.custom.expense) + '22' }]}>
                    <Text variant="labelSmall" style={{ color: isDeposit ? theme.custom.income : theme.custom.expense }}>
                      {isDeposit ? 'Deposit' : 'Withdraw'}
                    </Text>
                  </View>
                </View>

                {/* Delete button */}
                <TouchableOpacity onPress={() => handleDelete(rt.id, rt.sourceId)} style={styles.deleteBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deleteBtn: {
    padding: 4,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    marginTop: 24,
  },
});
