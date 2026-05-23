import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorrowCard } from '../../components/BorrowCard';
import { SegmentedChips } from '../../components/ui/SegmentedChips';
import { useBorrowStore } from '../../store/borrowStore';
import { useSettingsStore } from '../../store/settingsStore';
import { neuCard } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'paid', label: 'Repaid' },
  { key: 'all', label: 'All' },
];

export default function BorrowsScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { borrows, loadBorrows, markPaid, removeBorrow } = useBorrowStore();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();
  const [filter, setFilter] = useState<string | number | null>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadBorrows();
  }, []);

  // Highlight the borrow a notification tap points at, then fade it out. Show it
  // under the "All" filter so a repaid/old borrow isn't hidden.
  useEffect(() => {
    const idNum = Number(highlightId);
    if (!highlightId || Number.isNaN(idNum)) return;
    setHighlightedId(idNum);
    setFilter('all');
    const t = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBorrows();
    setRefreshing(false);
  };

  const handleMarkPaid = useCallback(async (id: number) => {
    const result = await markPaid(id);
    if (!result.ok) {
      Alert.alert('Unable to Mark Repaid', result.message ?? 'Something went wrong.');
    }
  }, [markPaid]);

  const filtered = borrows.filter(b => {
    const paid = !!b.isPaid;
    if (filter === 'active') return !paid;
    if (filter === 'paid') return paid;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Borrows
        </Text>
        <TouchableOpacity onPress={() => router.push('/modals/add-borrow')}>
          <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <SegmentedChips chips={FILTERS} selectedKey={filter} onSelect={setFilter} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.list}
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
        {filtered.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
            <MaterialCommunityIcons name="cash-plus" size={40} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              {filter === 'active' ? 'No active borrows' : filter === 'paid' ? 'No repaid borrows' : 'No borrows yet'}
            </Text>
          </View>
        ) : (
          filtered.map((borrow, i) => (
            <View
              key={borrow.id}
              onLayout={highlightedId === borrow.id ? (e) => {
                const y = e.nativeEvent.layout.y;
                scrollRef.current?.scrollTo({ y: Math.max(y - 80, 0), animated: true });
              } : undefined}
            >
            <BorrowCard
              id={borrow.id}
              amount={borrow.amount}
              lenderName={borrow.lenderName}
              note={borrow.note}
              borrowDate={borrow.borrowDate}
              expectedPayDate={borrow.expectedPayDate}
              isPaid={borrow.isPaid}
              paidDate={borrow.paidDate}
              hasInterest={borrow.hasInterest}
              interestType={borrow.interestType}
              interestValue={borrow.interestValue}
              receivingSourceName={borrow.receivingSourceName}
              receivingSourceIcon={borrow.receivingSourceIcon}
              receivingSourceColor={borrow.receivingSourceColor}
              currency={currency}
              onMarkPaid={handleMarkPaid}
              onDelete={removeBorrow}
              onEdit={(id) => router.push({ pathname: '/modals/add-borrow', params: { id } })}
              index={i}
              highlighted={highlightedId === borrow.id}
            />
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
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
    paddingBottom: 12,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
  },
  empty: {
    alignItems: 'center',
    padding: 36,
    borderRadius: 18,
    gap: 4,
    marginTop: 20,
  },
});
