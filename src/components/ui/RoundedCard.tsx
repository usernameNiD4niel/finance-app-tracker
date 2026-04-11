import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { glassShadow } from '../../theme/glass';
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
        styles.outer,
        { boxShadow: glassShadow(theme, 'md') as any },
        style,
      ]}
    >
      <BlurView intensity={55} tint={theme.custom.glassTint} style={styles.blur}>
        <View
          style={[
            styles.inner,
            {
              backgroundColor: theme.custom.glassBg,
              borderColor: theme.custom.glassBorder,
              padding,
            },
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = {
  outer: {
    borderRadius: 22,
    overflow: 'hidden' as const,
  },
  blur: {
    flex: 1,
  },
  inner: {
    borderWidth: 1,
    borderRadius: 22,
  },
};
