import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MutedLabel } from './MutedLabel';
import type { AppTheme } from '../../theme';

interface Props {
  value: string;
  label?: string;
  color?: string;
  size?: number;
}

export function ValueDisplay({ value, label, color, size = 32 }: Props) {
  const theme = useTheme<AppTheme>();
  return (
    <View>
      {label && <MutedLabel>{label}</MutedLabel>}
      <Text style={[styles.value, { color: color ?? theme.colors.onSurface, fontSize: size }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
