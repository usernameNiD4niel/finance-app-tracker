import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
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
          borderColor: theme.custom.cardBorder,
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
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});
