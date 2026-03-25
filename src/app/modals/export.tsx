import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { exportExpenses } from '../../services/export';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { neuButton, neuCard, neuChip } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

type ExportFormat = 'csv' | 'json';
type RangeOption = 'this-month' | 'last-month' | 'last-3-months' | 'all';

export default function ExportScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [rangeOption, setRangeOption] = useState<RangeOption>('this-month');
  const [exporting, setExporting] = useState(false);

  const getRangeDates = (): { start: string; end: string } => {
    const now = new Date();
    switch (rangeOption) {
      case 'this-month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'last-month':
        const last = subMonths(now, 1);
        return { start: format(startOfMonth(last), 'yyyy-MM-dd'), end: format(endOfMonth(last), 'yyyy-MM-dd') };
      case 'last-3-months':
        return { start: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'all':
        return { start: '2000-01-01', end: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { start, end } = getRangeDates();
      await exportExpenses(start, end, exportFormat);
    } catch (e) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const rangeOptions: { key: RangeOption; label: string }[] = [
    { key: 'this-month', label: 'This Month' },
    { key: 'last-month', label: 'Last Month' },
    { key: 'last-3-months', label: 'Last 3 Months' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Export Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
          Format
        </Text>
        <View style={styles.formatRow}>
          {(['csv', 'json'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.formatBtn,
                {
                  backgroundColor: exportFormat === f ? theme.colors.primary + '22' : theme.custom.cardBg,
                  boxShadow: exportFormat === f ? (neuChip(theme) as any) : undefined,
                },
              ]}
              onPress={() => setExportFormat(f)}
            >
              <MaterialCommunityIcons
                name={f === 'csv' ? 'file-delimited-outline' : 'code-json'}
                size={32}
                color={exportFormat === f ? theme.colors.primary : theme.colors.onSurface}
              />
              <Text variant="labelLarge" style={{ color: exportFormat === f ? theme.colors.primary : theme.colors.onSurface }}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12, marginTop: 24 }}>
          Date Range
        </Text>
        {rangeOptions.map(opt => {
          const isSelected = rangeOption === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.rangeOption,
                {
                  backgroundColor: isSelected ? theme.colors.primaryContainer : theme.custom.cardBg,
                  boxShadow: isSelected ? (neuCard(theme) as any) : undefined,
                },
              ]}
              onPress={() => setRangeOption(opt.key)}
            >
              <MaterialCommunityIcons
                name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[
            styles.exportBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: exporting ? 0.7 : 1,
              boxShadow: neuButton(theme) as any,
            },
          ]}
          onPress={handleExport}
          disabled={exporting}
        >
          <MaterialCommunityIcons name="export" size={20} color={theme.custom.buttonText} />
          <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>
            {exporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </Text>
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
  content: { padding: 20 },
  formatRow: { flexDirection: 'row', gap: 12 },
  formatBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 20, borderRadius: 16,
  },
  rangeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, marginBottom: 8,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 16, paddingVertical: 16, marginTop: 24,
  },
});
