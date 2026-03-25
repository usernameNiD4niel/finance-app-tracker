import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { RoundedCard } from './ui/RoundedCard';
import { formatCurrency } from '../utils/currency';
import type { CategoryTotal } from '../store/expenseStore';
import type { AppTheme } from '../theme';

interface Props {
  categoryTotals: CategoryTotal[];
  currency: string;
}

function AnimatedSegment({ flex, color, delay }: { flex: number; color: string; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    const timeout = setTimeout(() => {
      progress.value = withTiming(flex, { duration: 600 });
    }, delay);
    return () => clearTimeout(timeout);
  }, [flex]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: progress.value,
  }));

  return <Animated.View style={[{ backgroundColor: color, height: '100%' }, animatedStyle]} />;
}

export function CategoryRingChart({ categoryTotals, currency }: Props) {
  const theme = useTheme<AppTheme>();

  const sorted = [...categoryTotals].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const grandTotal = sorted.reduce((sum, c) => sum + (c.total ?? 0), 0);

  if (sorted.length === 0 || grandTotal === 0) {
    return (
      <RoundedCard>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
          Spending Distribution
        </Text>
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="chart-donut" size={40} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No spending data this month
          </Text>
        </View>
      </RoundedCard>
    );
  }

  return (
    <RoundedCard>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 14 }}>
        Spending Distribution
      </Text>

      {/* Stacked bar */}
      <View style={styles.stackedBar}>
        {sorted.map((cat, i) => (
          <AnimatedSegment
            key={cat.categoryId}
            flex={(cat.total ?? 0) / grandTotal}
            color={cat.categoryColor ?? theme.colors.primary}
            delay={i * 80}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {sorted.map((cat) => {
          const pct = Math.round(((cat.total ?? 0) / grandTotal) * 100);
          return (
            <View key={cat.categoryId} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: cat.categoryColor ?? theme.colors.primary }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
                {cat.categoryName ?? 'Unknown'}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 8 }}>
                {pct}%
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                {formatCurrency(cat.total ?? 0, currency)}
              </Text>
            </View>
          );
        })}
      </View>
    </RoundedCard>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stackedBar: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  legend: {
    marginTop: 14,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
});
