import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../../theme';
import { GlassBackground } from './GlassBackground';

interface Props {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: Props) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[styles.container, { backgroundColor: theme.custom.bgGradientEnd }]}>
      <GlassBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
