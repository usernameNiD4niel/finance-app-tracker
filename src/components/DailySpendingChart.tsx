import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { getDaysInMonth, getDate, format } from 'date-fns';
import { RoundedCard } from './ui/RoundedCard';
import { neuInset } from '../theme/neumorphism';
import { formatCurrency } from '../utils/currency';
import type { DailyTotal } from '../store/expenseStore';
import type { AppTheme } from '../theme';

interface Props {
  dailyTotals: DailyTotal[];
  month: Date;
  currency: string;
}

const CHART_HEIGHT = 140;

function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    const timeout = setTimeout(() => {
      progress.value = withTiming(1, { duration: 500 });
    }, delay);
    return () => clearTimeout(timeout);
  }, [height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: progress.value * height,
  }));

  return <Animated.View style={[styles.barFill, { backgroundColor: color }, animatedStyle]} />;
}

export function DailySpendingChart({ dailyTotals, month, currency }: Props) {
  const theme = useTheme<AppTheme>();
  const daysInMonth = getDaysInMonth(month);
  const today = new Date();
  const isCurrentMonth = format(today, 'yyyy-MM') === format(month, 'yyyy-MM');
  const todayDay = getDate(today);

  const { dailyMap, maxDaily, peakDay, peakAmount } = useMemo(() => {
    const map = new Map<number, number>();
    for (const dt of dailyTotals) {
      const day = parseInt(dt.date.split('-')[2], 10);
      map.set(day, dt.total);
    }
    const max = Math.max(...Array.from(map.values()), 1);
    let pDay = 0;
    let pAmount = 0;
    map.forEach((total, day) => {
      if (total > pAmount) {
        pAmount = total;
        pDay = day;
      }
    });
    return { dailyMap: map, maxDaily: max, peakDay: pDay, peakAmount: pAmount };
  }, [dailyTotals]);

  if (dailyTotals.length === 0) {
    return (
      <RoundedCard>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
          Daily Trend
        </Text>
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="chart-bar" size={40} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No spending data this month
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          <View style={[styles.chartTrack, { backgroundColor: theme.custom.trackBg, boxShadow: neuInset(theme) as any }]}>
            <View style={styles.barsRow}>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const total = dailyMap.get(day) ?? 0;
                const barHeight = total > 0 ? Math.max((total / maxDaily) * CHART_HEIGHT, 4) : 0;
                const isToday = isCurrentMonth && day === todayDay;

                return (
                  <View key={day} style={styles.barCol}>
                    <View style={styles.barWrap}>
                      <AnimatedBar
                        height={barHeight}
                        color={isToday ? theme.colors.primary : theme.colors.primary + '88'}
                        delay={i * 20}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.labelsRow}>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const showLabel = day === 1 || day % 5 === 0 || day === daysInMonth;
              return (
                <View key={day} style={styles.barCol}>
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, opacity: showLabel ? 1 : 0 }}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
        Peak: Day {peakDay} — {formatCurrency(peakAmount, currency)}
      </Text>
    </RoundedCard>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  chartContainer: {
    paddingRight: 8,
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
  },
  barCol: {
    width: 14,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  barWrap: {
    width: 8,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
