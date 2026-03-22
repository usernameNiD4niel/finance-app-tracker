import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface Props {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

export function CircleIconButton({ icon, label, color, onPress }: Props) {
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
          <View
            style={[
              styles.circle,
              {
                backgroundColor: color + '22',
                borderColor: color + '33',
              },
            ]}
          >
            <MaterialCommunityIcons name={icon as any} size={26} color={color} />
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
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
