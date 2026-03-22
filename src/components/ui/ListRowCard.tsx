import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
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
    <Animated.View>
      <Animated.View style={pressStyle}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.custom.cardBg,
              borderColor: theme.custom.cardBorder,
            },
            style,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
