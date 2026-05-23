import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LendCard } from '../../components/LendCard';
import { SegmentedChips } from '../../components/ui/SegmentedChips';
import { useLendStore } from '../../store/lendStore';
import { useSettingsStore } from '../../store/settingsStore';
import { neuCard, neuButton } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
];

export default function LendsScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { lends, loadLends, markPaid, removeLend } = useLendStore();
  const [filter, setFilter] = useState<string | number | null>('active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLends();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLends();
    setRefreshing(false);
  };

  const filtered = lends.filter(l => {
    const paid = !!l.isPaid;
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
          Lends
        </Text>
        <TouchableOpacity onPress={() => router.push('/modals/add-lend')}>
          <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <SegmentedChips chips={FILTERS} selectedKey={filter} onSelect={setFilter} />
      </View>

      <ScrollView
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
            <MaterialCommunityIcons name="hand-coin" size={40} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              {filter === 'active' ? 'No active lends' : filter === 'paid' ? 'No paid lends' : 'No lends yet'}
            </Text>
          </View>
        ) : (
          filtered.map((lend, i) => (
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
              onDelete={removeLend}
              onEdit={(id) => router.push({ pathname: '/modals/add-lend', params: { id } })}
              index={i}
            />
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
