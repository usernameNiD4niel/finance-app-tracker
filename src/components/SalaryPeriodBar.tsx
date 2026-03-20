import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { getPeriodProgress } from '../utils/date';
import type { AppTheme } from '../theme';

export function SalaryPeriodBar() {
  const theme = useTheme<AppTheme>();
  const progress = getPeriodProgress();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(progress, { duration: 800 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  const daysLeft = Math.round((1 - progress) * 14);

  return (
    <View style={[styles.container, { backgroundColor: theme.custom.cardBg }]}>
      <View style={styles.row}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Period Progress
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: theme.colors.primary }, barStyle]}
        />
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        ~{daysLeft} days remaining in period
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
