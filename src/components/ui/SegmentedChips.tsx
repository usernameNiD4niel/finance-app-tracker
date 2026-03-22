import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
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
        return (
          <Pressable
            key={String(chip.key)}
            onPress={() => onSelect(chip.key)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? primary + '22' : theme.colors.surfaceVariant,
                borderColor: isActive ? primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? primary : theme.colors.onSurface },
              ]}
            >
              {chip.label}
            </Text>
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
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
