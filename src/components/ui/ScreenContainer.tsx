import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: Props) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
