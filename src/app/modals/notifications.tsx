import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUpcomingBills } from '../../services/balance';
import { formatCurrency } from '../../utils/currency';
import { useSettingsStore } from '../../store/settingsStore';
import { neuListItem } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';
import type { UpcomingBill } from '../../services/balance';

export default function NotificationsScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const [bills, setBills] = useState<UpcomingBill[]>([]);

  useEffect(() => {
    getUpcomingBills(30).then(setBills);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Notifications
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {bills.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-off-outline" size={56} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No upcoming bills
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
              Bills due within the next 30 days will appear here
            </Text>
          </View>
        ) : (
          <>
            <Text variant="bodySmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              UPCOMING BILLS — NEXT 30 DAYS
            </Text>
            {bills.map((bill) => (
              <View
                key={bill.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.custom.cardBg,
                    boxShadow: neuListItem(theme) as any,
                  },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: (bill.categoryColor ?? theme.colors.primary) + '22' }]}>
                  <MaterialCommunityIcons
                    name={(bill.categoryIcon ?? 'receipt') as any}
                    size={20}
                    color={bill.categoryColor ?? theme.colors.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {bill.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {bill.daysUntilDue === 0
                      ? 'Due today'
                      : bill.daysUntilDue === 1
                      ? 'Due tomorrow'
                      : `Due in ${bill.daysUntilDue} days`}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="titleSmall" style={{ color: theme.custom.expense, fontWeight: '800' }}>
                    {formatCurrency(bill.amount, currency)}
                  </Text>
                  {bill.daysUntilDue <= 3 && (
                    <View style={[styles.urgentBadge, { backgroundColor: theme.custom.expense + '22' }]}>
                      <Text variant="labelSmall" style={{ color: theme.custom.expense, fontWeight: '700' }}>
                        Soon
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
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
  content: { padding: 20, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
