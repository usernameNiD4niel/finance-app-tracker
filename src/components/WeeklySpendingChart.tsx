import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { RoundedCard } from './ui/RoundedCard';
import { AnimatedBar } from './DailySpendingChart';
import { neuInset } from '../theme/neumorphism';
import { formatCurrency } from '../utils/currency';
import type { DailyTotal } from '../store/expenseStore';
import type { AppTheme } from '../theme';

interface Props {
  dailyTotals: DailyTotal[];
  week: Date;
  currency: string;
}

const CHART_HEIGHT = 140;

export function WeeklySpendingChart({ dailyTotals, week, currency }: Props) {
  const theme = useTheme<AppTheme>();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { days, dailyMap, maxDaily, peakLabel, peakAmount } = useMemo(() => {
    const start = startOfWeek(week, { weekStartsOn: 1 });
    const end = endOfWeek(week, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    const map = new Map<string, number>();
    for (const dt of dailyTotals) map.set(dt.date, dt.total);
    const max = Math.max(...days.map(d => map.get(d) ?? 0), 1);
    let pLabel = '';
    let pAmount = 0;
    for (const d of days) {
      const total = map.get(d) ?? 0;
      if (total > pAmount) {
        pAmount = total;
        pLabel = format(new Date(d), 'EEE');
      }
    }
    return { days, dailyMap: map, maxDaily: max, peakLabel: pLabel, peakAmount: pAmount };
  }, [dailyTotals, week]);

  if (dailyTotals.length === 0) {
    return (
      <RoundedCard>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
          Daily Trend
        </Text>
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="chart-bar" size={40} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No spending data this week
          </Text>
        </View>
      </RoundedCard>
    );
  }

  return (
    <RoundedCard>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
        Daily Trend
      </Text>

      <View style={[styles.chartTrack, { backgroundColor: theme.custom.trackBg, boxShadow: neuInset(theme) as any }]}>
        <View style={styles.barsRow}>
          {days.map((d, i) => {
            const total = dailyMap.get(d) ?? 0;
            const barHeight = total > 0 ? Math.max((total / maxDaily) * CHART_HEIGHT, 4) : 0;
            const isToday = d === todayStr;
            return (
              <View key={d} style={styles.barCol}>
                <View style={styles.barWrap}>
                  <AnimatedBar
                    height={barHeight}
                    color={isToday ? theme.colors.primary : theme.colors.primary + '88'}
                    delay={i * 40}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.labelsRow}>
        {days.map(d => (
          <View key={d} style={styles.barCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}>
              {format(new Date(d), 'EEE')}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
        Peak: {peakLabel} — {formatCurrency(peakAmount, currency)}
      </Text>
    </RoundedCard>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  chartTrack: {
    borderRadius: 10,
    padding: 8,
    paddingBottom: 4,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    justifyContent: 'space-around',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrap: {
    width: 24,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
