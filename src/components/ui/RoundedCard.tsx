import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { neuCard } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function RoundedCard({ children, style, padding = 16 }: Props) {
  const theme = useTheme<AppTheme>();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.custom.cardBg,
          boxShadow: neuCard(theme) as any,
        },
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
  },
});
