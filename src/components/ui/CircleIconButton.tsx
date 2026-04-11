import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

export function CircleIconButton({ icon, label, color, onPress }: Props) {
  const theme = useTheme<AppTheme>();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => { scale.value = withSpring(0.88, { damping: 10, stiffness: 300 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 300 }); }}
          style={styles.pressable}
        >
          <View style={[styles.circleOuter, { boxShadow: glassShadow(theme, 'sm') as any }]}>
            <BlurView intensity={50} tint={theme.custom.glassTint} style={styles.blur}>
              <View
                style={[
                  styles.circleInner,
                  {
                    backgroundColor: theme.custom.glassBg,
                    borderColor: theme.custom.glassBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons name={icon as any} size={26} color={color} />
              </View>
            </BlurView>
          </View>
          <Text style={[styles.label, { color }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  pressable: {
    alignItems: 'center',
    gap: 8,
  },
  circleOuter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
  circleInner: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
