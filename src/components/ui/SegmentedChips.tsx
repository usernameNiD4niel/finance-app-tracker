import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import type { AppTheme } from '../../theme';

interface Chip {
  key: string | number;
  label: string;
}

interface Props {
  chips: Chip[];
  selectedKey: string | number | null;
  onSelect: (key: string | number | null) => void;
}

export function SegmentedChips({ chips, selectedKey, onSelect }: Props) {
  const theme = useTheme<AppTheme>();
  const primary = theme.colors.primary;

  return (
    <View style={styles.row}>
      {chips.map((chip) => {
        const isActive = chip.key === selectedKey;
        return isActive ? (
          <View key={String(chip.key)} style={styles.chipOuter}>
            <BlurView intensity={50} tint={theme.custom.glassTint} style={styles.blur}>
              <Pressable
                onPress={() => onSelect(chip.key)}
                style={[
                  styles.chipInner,
                  {
                    backgroundColor: primary + '20',
                    borderColor: primary + '50',
                  },
                ]}
              >
                <Text style={[styles.label, { color: primary }]}>{chip.label}</Text>
              </Pressable>
            </BlurView>
          </View>
        ) : (
          <Pressable
            key={String(chip.key)}
            onPress={() => onSelect(chip.key)}
            style={[
              styles.chipOuter,
              styles.chipInactive,
              { backgroundColor: theme.custom.glassBg, borderColor: theme.custom.glassBorder },
            ]}
          >
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chipOuter: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  chipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  blur: {
    flex: 1,
  },
  chipInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
