import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTabStore } from '../../store/tabStore';
import { glassShadow } from '../../theme/glass';
import type { AppTheme } from '../../theme';

const TAB_CONFIG = [
  { name: 'index',    icon: 'view-dashboard-outline', activeIcon: 'view-dashboard',  label: 'Home' },
  { name: 'expenses', icon: 'cash-multiple',           activeIcon: 'cash-multiple',   label: 'Expenses' },
  { name: 'bills',    icon: 'receipt-outline',         activeIcon: 'receipt',         label: 'Bills' },
  { name: 'wallets',  icon: 'wallet-outline',          activeIcon: 'wallet',          label: 'Wallets' },
  { name: 'stats',    icon: 'chart-bar-stacked',       activeIcon: 'chart-bar',       label: 'Stats' },
  { name: 'settings', icon: 'cog-outline',             activeIcon: 'cog',             label: 'Settings' },
] as const;

function TabItem({
  icon,
  activeIcon,
  label,
  focused,
  color,
  onPress,
  onLongPress,
}: {
  icon: string;
  activeIcon: string;
  label: string;
  focused: boolean;
  color: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pillOpacity = useSharedValue(0);
  const pillScaleX = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 14, stiffness: 220 });
    pillOpacity.value = withTiming(focused ? 1 : 0, { duration: 180 });
    pillScaleX.value = withSpring(focused ? 1 : 0.5, { damping: 14, stiffness: 220 });
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scaleX: pillScaleX.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.pill, { backgroundColor: color + '1a' }, pillStyle]} />
      <Animated.View style={iconStyle}>
        <MaterialCommunityIcons
          name={(focused ? activeIcon : icon) as any}
          size={22}
          color={color}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: any) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { setTab } = useTabStore();

  return (
    <View
      style={[styles.outerContainer, { bottom: insets.bottom + 10 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.barOuter, { boxShadow: glassShadow(theme, 'lg') as any }]}>
        <BlurView intensity={70} tint={theme.custom.glassTint} style={styles.blur}>
          <View
            style={[
              styles.bar,
              {
                backgroundColor: theme.custom.glassBg,
                borderColor: theme.custom.glassBorder,
              },
            ]}
          >
        {state.routes.map((route: any, index: number) => {
          const config = TAB_CONFIG.find((t) => t.name === route.name);
          const focused = state.index === index;
          const color = focused
            ? theme.colors.primary
            : theme.colors.onSurfaceVariant;

          return (
            <TabItem
              key={route.key}
              icon={config?.icon ?? 'circle-outline'}
              activeIcon={config?.activeIcon ?? 'circle'}
              label={config?.label ?? ''}
              focused={focused}
              color={color}
              onPress={() => {
                setTab(index);
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, {});
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
            />
          );
        })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme<AppTheme>();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: theme.custom.bgGradientEnd }}
    />
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  barOuter: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    gap: 2,
  },
  pill: {
    position: 'absolute',
    width: 46,
    height: 36,
    borderRadius: 18,
    top: 4,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
