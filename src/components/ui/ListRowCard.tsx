import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { glassShadow } from '../../theme/glass';
import type { AppTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  index?: number;
  style?: ViewStyle;
}

export function ListRowCard({ children, onPress, onLongPress, index = 0, style }: Props) {
  const theme = useTheme<AppTheme>();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={pressStyle}>
      <View
        style={[
          styles.outer,
          { boxShadow: glassShadow(theme, 'sm') as any },
          style,
        ]}
      >
        <BlurView intensity={45} tint={theme.custom.glassTint} style={styles.blur}>
          <Pressable
            style={[
              styles.inner,
              {
                backgroundColor: theme.custom.glassBg,
                borderColor: theme.custom.glassBorder,
              },
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
          >
            {children}
          </Pressable>
        </BlurView>
      </View>
    </Animated.View>
  );
}

const styles = {
  outer: {
    borderRadius: 18,
    overflow: 'hidden' as const,
  },
  blur: {
    flex: 1,
  },
  inner: {
    borderWidth: 1,
    borderRadius: 18,
  },
};
