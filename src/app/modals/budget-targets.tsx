import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTargetStore } from '../../store/targetStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getCurrentMonth } from '../../utils/date';
import type { AppTheme } from '../../theme';

export default function BudgetTargetsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { categories, loadCategories } = useCategoryStore();
  const { currentTarget, categoryTargets, loadTargets, setOverallTarget, setCategoryTarget } = useTargetStore();

  const month = getCurrentMonth();
  const [overallAmount, setOverallAmount] = useState('');
  const [catLimits, setCatLimits] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadTargets(month);
  }, []);

  useEffect(() => {
    if (currentTarget?.overallLimit) setOverallAmount(String(currentTarget.overallLimit));
    const limits: Record<number, string> = {};
    for (const ct of categoryTargets) {
      limits[ct.categoryId] = String(ct.limitAmount);
    }
    setCatLimits(limits);
  }, [currentTarget, categoryTargets]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setOverallTarget(month, overallAmount ? Number(overallAmount) : null);
      for (const cat of categories) {
        const val = catLimits[cat.id];
        if (val && Number(val) > 0) {
          await setCategoryTarget(month, cat.id, Number(val));
        }
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Budget Targets</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.custom.cardBg, borderColor: theme.custom.cardBorder }]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
            Monthly Overall Limit
          </Text>
          <TextInput
            value={overallAmount}
            onChangeText={setOverallAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            placeholder="No limit"
            left={<TextInput.Affix text={currency} />}
          />
        </View>

        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
          Per Category Limits
        </Text>
        {categories.map(cat => (
          <View key={cat.id} style={[styles.catRow, { backgroundColor: theme.custom.cardBg, borderColor: theme.custom.cardBorder }]}>
            <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
              <MaterialCommunityIcons name={cat.icon as any} size={18} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 6 }}>{cat.name}</Text>
              <TextInput
                value={catLimits[cat.id] ?? ''}
                onChangeText={v => setCatLimits(prev => ({ ...prev, [cat.id]: v }))}
                keyboardType="decimal-pad"
                mode="outlined"
                placeholder="No limit"
                left={<TextInput.Affix text={currency} />}
                dense
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: saving ? 0.7 : 1,
              shadowColor: theme.colors.primary,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text variant="labelLarge" style={{ color: '#fff' }}>Save Targets</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  content: { padding: 20, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
