import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import type { AppTheme } from '../theme';

interface Props {
  label: string;
  icon?: string;
  iconColor?: string;
  spent: number;
  limit: number;
  currency: string;
}

export function BudgetProgressBar({ label, icon, iconColor, spent, limit, currency }: Props) {
  const theme = useTheme<AppTheme>();
  const ratio = Math.min(spent / limit, 1);
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(ratio, { duration: 600 });
  }, [ratio]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  const barColor =
    ratio >= 1 ? theme.custom.expense :
    ratio >= 0.8 ? theme.custom.warning :
    theme.colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: (iconColor ?? theme.colors.primary) + '22' }]}>
              <MaterialCommunityIcons name={icon as any} size={14} color={iconColor ?? theme.colors.primary} />
            </View>
          )}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
            {label}
          </Text>
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Animated.View style={[styles.fill, { backgroundColor: barColor }, barStyle]} />
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
        {Math.round(ratio * 100)}% used · {formatCurrency(Math.max(limit - spent, 0), currency)} remaining
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
