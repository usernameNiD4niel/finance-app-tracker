import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settingsStore';
import { CURRENCIES } from '../../utils/currency';
import { neuListItem } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

export default function CurrencyPickerScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currency, setCurrency } = useSettingsStore();
  const [selected, setSelected] = useState(currency);

  const handleSelect = async (code: string) => {
    setSelected(code);
    await setCurrency(code);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Select Currency</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={CURRENCIES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isSelected = item.code === selected;
          return (
            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: isSelected ? theme.colors.primaryContainer : theme.custom.cardBg,
                  boxShadow: neuListItem(theme) as any,
                },
              ]}
              onPress={() => handleSelect(item.code)}
            >
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {item.symbol} {item.code}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                {item.name}
              </Text>
              {isSelected && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16,
  },
});
