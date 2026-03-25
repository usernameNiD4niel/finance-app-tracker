import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import { getPeriodProgress } from '../utils/date';
import { neuCard, neuInset } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

export function SalaryPeriodBar() {
  const theme = useTheme<AppTheme>();
  const progress = getPeriodProgress();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withDelay(100, withTiming(progress, { duration: 900 }));
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  const daysLeft = Math.max(Math.round((1 - progress) * 14), 0);
  const pct = Math.round(progress * 100);

  const barColor =
    progress >= 0.85 ? theme.custom.expense :
    progress >= 0.6  ? theme.custom.warning :
    theme.colors.primary;

  return (
    <Animated.View
      entering={FadeInDown.delay(160).duration(400).springify()}
      style={[
        styles.container,
        {
          backgroundColor: theme.custom.cardBg,
          boxShadow: neuCard(theme) as any,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons name="timer-outline" size={15} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Period Progress</Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: barColor + '20' }]}>
          <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: theme.custom.trackBg, boxShadow: neuInset(theme) as any }]}>
        <Animated.View style={[styles.fill, { backgroundColor: barColor }, barStyle]} />
      </View>

      <Text style={[styles.subLabel, { color: theme.colors.onSurfaceVariant }]}>
        {daysLeft === 0 ? 'Last day of period' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  pctBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  subLabel: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: '400',
  },
});
