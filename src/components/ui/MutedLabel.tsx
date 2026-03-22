import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  uppercase?: boolean;
  style?: object;
}

export function MutedLabel({ children, uppercase, style }: Props) {
  const theme = useTheme<AppTheme>();
  return (
    <Text
      style={[
        styles.label,
        { color: theme.custom.mutedText },
        uppercase && styles.upper,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  upper: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
