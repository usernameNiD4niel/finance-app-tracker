import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTheme } from '../../theme';

interface Props {
  title: string;
  rightElement?: React.ReactNode;
}

export function TopHeader({ title, rightElement }: Props) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={60}
      tint={theme.custom.glassTint}
      style={[
        styles.header,
        {
          paddingTop: insets.top + 16,
          backgroundColor: theme.custom.glassBg,
          borderBottomColor: theme.custom.glassBorder,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
      {rightElement && <View>{rightElement}</View>}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
