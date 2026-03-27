import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSalaryStore } from '../../store/salaryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSourceStore } from '../../store/sourceStore';
import { SourcePicker } from '../../components/SourcePicker';
import { format } from 'date-fns';
import { neuButton, neuCard } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';
import type { MoneySource } from '../../db/schema';

export default function SalaryScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { salaryFirst, salaryFifteenth, loadSalary, setSalary } = useSalaryStore();
  const { sources, loadSources } = useSourceStore();

  const [firstAmount, setFirstAmount] = useState('');
  const [fifteenthAmount, setFifteenthAmount] = useState('');
  const [firstSource, setFirstSource] = useState<MoneySource | null>(null);
  const [fifteenthSource, setFifteenthSource] = useState<MoneySource | null>(null);
  const [firstPickerVisible, setFirstPickerVisible] = useState(false);
  const [fifteenthPickerVisible, setFifteenthPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSalary();
    loadSources();
  }, []);

  useEffect(() => {
    if (salaryFirst) {
      setFirstAmount(String(salaryFirst.amount));
      if (salaryFirst.sourceId) {
        const src = sources.find(s => s.id === salaryFirst.sourceId);
        if (src) setFirstSource(src);
      }
    }
    if (salaryFifteenth) {
      setFifteenthAmount(String(salaryFifteenth.amount));
      if (salaryFifteenth.sourceId) {
        const src = sources.find(s => s.id === salaryFifteenth.sourceId);
        if (src) setFifteenthSource(src);
      }
    }
  }, [salaryFirst, salaryFifteenth, sources.length]);

  const handleSave = async () => {
    const hasFirst = firstAmount && Number(firstAmount) > 0;
    const hasFifteenth = fifteenthAmount && Number(fifteenthAmount) > 0;

    if (hasFirst && !firstSource) {
      Alert.alert('Source Required', 'Please select a money source for the 1st period salary.');
      return;
    }
    if (hasFifteenth && !fifteenthSource) {
      Alert.alert('Source Required', 'Please select a money source for the 2nd period salary.');
      return;
    }

    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (hasFirst) {
        await setSalary({ amount: Number(firstAmount), period: 'first', sourceId: firstSource!.id, effectiveDate: today, createdAt: new Date().toISOString() });
      }
      if (hasFifteenth) {
        await setSalary({ amount: Number(fifteenthAmount), period: 'fifteenth', sourceId: fifteenthSource!.id, effectiveDate: today, createdAt: new Date().toISOString() });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const renderSourceButton = (selected: MoneySource | null, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.sourceBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: selected ? selected.color : theme.colors.outline, borderWidth: 1 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {selected ? (
        <>
          <MaterialCommunityIcons name={selected.icon as any} size={18} color={selected.color} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginLeft: 8, flex: 1 }}>{selected.name}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="bank-outline" size={18} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }}>Select source</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Salary Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.primary, flex: 1 }}>
            Your salary is split into two periods: 1st–14th and 15th–end of month.
          </Text>
        </View>

        <View style={[styles.periodCard, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
          <View style={styles.periodHeader}>
            <View style={[styles.badge, { backgroundColor: theme.custom.income + '22' }]}>
              <Text variant="labelSmall" style={{ color: theme.custom.income }}>1st Period</Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Jan 1 – Jan 14</Text>
          </View>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Salary Amount
          </Text>
          <TextInput
            value={firstAmount}
            onChangeText={setFirstAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            placeholder="0.00"
            left={<TextInput.Affix text={currency} />}
          />
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 8 }}>
            Money Source
          </Text>
          {renderSourceButton(firstSource, () => setFirstPickerVisible(true))}
        </View>

        <View style={[styles.periodCard, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
          <View style={styles.periodHeader}>
            <View style={[styles.badge, { backgroundColor: theme.custom.income + '22' }]}>
              <Text variant="labelSmall" style={{ color: theme.custom.income }}>2nd Period</Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Jan 15 – Jan 31</Text>
          </View>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Salary Amount
          </Text>
          <TextInput
            value={fifteenthAmount}
            onChangeText={setFifteenthAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            placeholder="0.00"
            left={<TextInput.Affix text={currency} />}
          />
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 8 }}>
            Money Source
          </Text>
          {renderSourceButton(fifteenthSource, () => setFifteenthPickerVisible(true))}
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: saving ? 0.7 : 1,
              boxShadow: neuButton(theme) as any,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save Salary</Text>
        </TouchableOpacity>
      </ScrollView>

      <SourcePicker
        visible={firstPickerVisible}
        sources={sources}
        selectedId={firstSource?.id ?? null}
        onSelect={setFirstSource}
        onClose={() => setFirstPickerVisible(false)}
      />
      <SourcePicker
        visible={fifteenthPickerVisible}
        sources={sources}
        selectedId={fifteenthSource?.id ?? null}
        onSelect={setFifteenthSource}
        onClose={() => setFifteenthPickerVisible(false)}
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
  content: { padding: 20, gap: 16 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 16, padding: 14,
  },
  periodCard: { borderRadius: 18, padding: 16 },
  periodHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sourceBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
});
