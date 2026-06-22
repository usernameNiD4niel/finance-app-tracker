import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SegmentedChips } from './ui/SegmentedChips';
import { RoundedCard } from './ui/RoundedCard';
import { getExpenseTotal } from '../db/queries';
import {
  getDayBounds, getWeekBounds, getMonthBounds,
} from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { subDays, subWeeks, subMonths, format } from 'date-fns';
import { neuInset } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

type PeriodType = 'day' | 'week' | 'month';

interface Props {
  currency: string;
  isVisible: boolean;
}

interface CompareData {
  currentTotal: number;
  previousTotal: number;
  currentCount: number;
  previousCount: number;
  currentLabel: string;
  previousLabel: string;
}

const PERIOD_CHIPS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

function getBoundsForPeriod(type: PeriodType) {
  const now = new Date();
  switch (type) {
    case 'day': {
      const current = getDayBounds(now);
      const previous = getDayBounds(subDays(now, 1));
      return {
        current, previous,
        currentLabel: 'Today',
        previousLabel: 'Yesterday',
      };
    }
    case 'week': {
      const current = getWeekBounds(now);
      const previous = getWeekBounds(subWeeks(now, 1));
      return {
        current, previous,
        currentLabel: 'This Week',
        previousLabel: 'Last Week',
      };
    }
    case 'month': {
      const current = getMonthBounds(now);
      const previous = getMonthBounds(subMonths(now, 1));
      return {
        current, previous,
        currentLabel: format(now, 'MMM yyyy'),
        previousLabel: format(subMonths(now, 1), 'MMM yyyy'),
      };
    }
  }
}

export function CompareSpending({ currency, isVisible }: Props) {
  const theme = useTheme<AppTheme>();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [data, setData] = useState<CompareData | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const bounds = getBoundsForPeriod(periodType);
    Promise.all([
      getExpenseTotal(bounds.current.start, bounds.current.end),
      getExpenseTotal(bounds.previous.start, bounds.previous.end),
    ]).then(([curr, prev]) => {
      setData({
        currentTotal: curr.total,
        previousTotal: prev.total,
        currentCount: curr.count,
        previousCount: prev.count,
        currentLabel: bounds.currentLabel,
        previousLabel: bounds.previousLabel,
      });
    });
  }, [periodType, isVisible]);

  const maxTotal = Math.max(data?.currentTotal ?? 0, data?.previousTotal ?? 0, 1);
  const currentRatio = (data?.currentTotal ?? 0) / maxTotal;
  const previousRatio = (data?.previousTotal ?? 0) / maxTotal;

  const diff = (data?.currentTotal ?? 0) - (data?.previousTotal ?? 0);
  const pctChange = (data?.previousTotal ?? 0) > 0
    ? Math.abs(diff / data!.previousTotal) * 100
    : (data?.currentTotal ?? 0) > 0 ? 100 : 0;

  let changeColor: string;
  let changeIcon: 'arrow-up' | 'arrow-down' | 'minus';
  let changeText: string;

  if (diff > 0) {
    changeColor = theme.custom.expense;
    changeIcon = 'arrow-up';
    changeText = `${formatCurrency(Math.abs(diff), currency)} (${pctChange.toFixed(1)}%) more`;
  } else if (diff < 0) {
    changeColor = theme.custom.income;
    changeIcon = 'arrow-down';
    changeText = `${formatCurrency(Math.abs(diff), currency)} (${pctChange.toFixed(1)}%) less`;
  } else {
    changeColor = theme.colors.onSurfaceVariant;
    changeIcon = 'minus';
    changeText = 'No change';
  }

  return (
    <View>
      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
      >
        Compare Spending
      </Text>

      <View style={styles.chipsWrap}>
        <SegmentedChips
          chips={PERIOD_CHIPS}
          selectedKey={periodType}
          onSelect={(key) => setPeriodType(key as PeriodType)}
        />
      </View>

      <RoundedCard>
        {/* Current period */}
        <View style={styles.periodRow}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {data?.currentLabel ?? '...'}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {formatCurrency(data?.currentTotal ?? 0, currency)}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: theme.custom.trackBg, boxShadow: neuInset(theme) as any }]}>
          <View
            style={[
              styles.barFill,
              { width: `${currentRatio * 100}%`, backgroundColor: theme.colors.primary },
            ]}
          />
        </View>

        {/* Previous period */}
        <View style={[styles.periodRow, { marginTop: 14 }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {data?.previousLabel ?? '...'}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {formatCurrency(data?.previousTotal ?? 0, currency)}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: theme.custom.trackBg, boxShadow: neuInset(theme) as any }]}>
          <View
            style={[
              styles.barFill,
              { width: `${previousRatio * 100}%`, backgroundColor: theme.colors.onSurfaceVariant },
            ]}
          />
        </View>

        {/* Change indicator */}
        <View style={[styles.changeRow, { marginTop: 14 }]}>
          <MaterialCommunityIcons name={changeIcon} size={16} color={changeColor} />
          <Text variant="bodySmall" style={{ color: changeColor, fontWeight: '600', marginLeft: 4 }}>
            {changeText}
          </Text>
        </View>
      </RoundedCard>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 10,
  },
  chipsWrap: {
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barTrack: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
