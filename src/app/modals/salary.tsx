import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSalaryStore } from '../../store/salaryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { format } from 'date-fns';
import type { AppTheme } from '../../theme';

export default function SalaryScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { salaryFirst, salaryFifteenth, loadSalary, setSalary } = useSalaryStore();

  const [firstAmount, setFirstAmount] = useState('');
  const [fifteenthAmount, setFifteenthAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSalary();
  }, []);

  useEffect(() => {
    if (salaryFirst) setFirstAmount(String(salaryFirst.amount));
    if (salaryFifteenth) setFifteenthAmount(String(salaryFifteenth.amount));
  }, [salaryFirst, salaryFifteenth]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (firstAmount && Number(firstAmount) > 0) {
        await setSalary({ amount: Number(firstAmount), period: 'first', effectiveDate: today, createdAt: new Date().toISOString() });
      }
      if (fifteenthAmount && Number(fifteenthAmount) > 0) {
        await setSalary({ amount: Number(fifteenthAmount), period: 'fifteenth', effectiveDate: today, createdAt: new Date().toISOString() });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
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

        <View style={[styles.periodCard, { backgroundColor: theme.custom.cardBg }]}>
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
        </View>

        <View style={[styles.periodCard, { backgroundColor: theme.custom.cardBg }]}>
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
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text variant="labelLarge" style={{ color: '#fff' }}>Save Salary</Text>
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
  content: { padding: 20, gap: 16 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, padding: 14,
  },
  periodCard: { borderRadius: 16, padding: 16 },
  periodHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
});
