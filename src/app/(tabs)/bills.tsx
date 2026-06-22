import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { BillCard } from '../../components/BillCard';
import { useBillStore } from '../../store/billStore';
import { useSettingsStore } from '../../store/settingsStore';
import { cancelNotification } from '../../services/notifications';
import { formatCurrency } from '../../utils/currency';
import { neuButton } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

export default function BillsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currency } = useSettingsStore();
  const { bills, loadBills, editBill, removeBill } = useBillStore();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();
  const listRef = useRef<FlatList>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => { loadBills(); }, []));

  // Highlight the bill a notification tap points at, then fade it out.
  useEffect(() => {
    const idNum = Number(highlightId);
    if (!highlightId || Number.isNaN(idNum)) return;
    setHighlightedId(idNum);
    const t = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightId]);

  // Scroll the highlighted bill into view once the list has data.
  useEffect(() => {
    if (highlightedId == null) return;
    const index = bills.findIndex(b => b.id === highlightedId);
    if (index < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    });
  }, [highlightedId, bills.length]);

  const activeBills = bills.filter(b => b.isActive);
  const monthlyTotal = activeBills.reduce((sum, b) => sum + b.amount, 0);

  const handleToggle = (id: number, active: boolean) => {
    if (!active) {
      Alert.alert(
        'Disable Bill',
        'Are you sure? You will no longer be notified about this bill and it will be excluded from your totals.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const bill = bills.find(b => b.id === id);
              if (bill?.notificationId) await cancelNotification(bill.notificationId);
              await editBill(id, { isActive: false, notificationId: null });
            },
          },
        ],
      );
    } else {
      editBill(id, { isActive: true });
    }
  };

  const handleDelete = async (id: number) => {
    const bill = bills.find(b => b.id === id);
    if (bill?.notificationId) await cancelNotification(bill.notificationId);
    await removeBill(id);
  };

  return (
    <ScreenContainer>
      <TopHeader
        title="Bills"
        rightElement={
          <View style={styles.headerRight}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Monthly</Text>
            <Text style={{ color: theme.custom.expense, fontWeight: '700', fontSize: 16 }}>
              {formatCurrency(monthlyTotal, currency)}
            </Text>
          </View>
        }
      />

      <FlatList
        ref={listRef}
        data={bills}
        keyExtractor={(item) => String(item.id)}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 }), 250);
        }}
        renderItem={({ item, index }) => (
          <BillCard
            id={item.id}
            name={item.name}
            amount={item.amount}
            dueDay={item.dueDay}
            isActive={item.isActive}
            frequency={item.frequency}
            categoryIcon={item.categoryIcon ?? null}
            categoryColor={item.categoryColor ?? null}
            currency={currency}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={(id) => router.push({ pathname: '/modals/add-bill', params: { id } })}
            index={index}
            highlighted={highlightedId === item.id}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name={'receipt' as any} size={60} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No bills yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Tap + to add a recurring bill
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 150 }}
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
        onPress={() => router.push('/modals/add-bill')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRight: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 80 },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 20,
  },
});
