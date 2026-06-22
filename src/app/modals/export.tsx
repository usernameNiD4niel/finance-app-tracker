import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { exportData, type DataType, type ExportFormat } from '../../services/export';
import { neuButton, neuCard, neuChip } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DATA_TYPES: { key: DataType; label: string; icon: string; dateNote?: string }[] = [
  { key: 'expenses', label: 'Expenses',  icon: 'cash-minus' },
  { key: 'bills',    label: 'Bills',     icon: 'file-clock-outline',  dateNote: 'all' },
  { key: 'stats',    label: 'Stats',     icon: 'chart-bar' },
  { key: 'wallets',  label: 'Wallets',   icon: 'wallet-outline',      dateNote: 'all' },
  { key: 'lends',    label: 'Lends',     icon: 'hand-coin-outline' },
  { key: 'borrows',  label: 'Borrows',   icon: 'cash-plus' },
];

export default function ExportScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedTypes, setSelectedTypes] = useState<Set<DataType>>(new Set(['expenses']));
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  function toggleType(key: DataType) {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Returns true if the selected types include at least one with a dateNote of 'all'
  // (Bills & Wallets), used to show the hint.
  const hasDateIgnoredType = DATA_TYPES.some(
    d => d.dateNote === 'all' && selectedTypes.has(d.key)
  );

  async function handleExport() {
    if (selectedTypes.size === 0) {
      Alert.alert('No data selected', 'Please select at least one data type to export.');
      return;
    }

    const start = startDate.trim() || null;
    const end = endDate.trim() || null;

    if (start && !DATE_RE.test(start)) {
      Alert.alert('Invalid date', 'Start date must be in YYYY-MM-DD format.');
      return;
    }
    if (end && !DATE_RE.test(end)) {
      Alert.alert('Invalid date', 'End date must be in YYYY-MM-DD format.');
      return;
    }
    if (start && end && start > end) {
      Alert.alert('Invalid range', 'Start date must be before or equal to the end date.');
      return;
    }

    setExporting(true);
    try {
      await exportData(Array.from(selectedTypes), start, end, exportFormat);
      Alert.alert(
        'Export Successful',
        `Your data has been exported as ${exportFormat.toUpperCase()}.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  const s = theme.colors.onSurface;
  const muted = theme.colors.onSurfaceVariant;
  const card = theme.custom.cardBg;
  const outline = theme.colors.outline;
  const primary = theme.colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={s} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: s, fontWeight: '700' }}>Export Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Data Types ────────────────────────────────────────────────── */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: s }]}>
          Data to Export
        </Text>
        <View style={styles.typeGrid}>
          {DATA_TYPES.map(dt => {
            const active = selectedTypes.has(dt.key);
            return (
              <TouchableOpacity
                key={dt.key}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: active ? primary + '22' : card,
                    borderColor: active ? primary : outline,
                    boxShadow: active ? (neuChip(theme) as any) : undefined,
                  },
                ]}
                onPress={() => toggleType(dt.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={dt.icon as any}
                  size={20}
                  color={active ? primary : muted}
                />
                <Text
                  variant="labelMedium"
                  style={{ color: active ? primary : s, fontWeight: active ? '700' : '400', marginTop: 4 }}
                >
                  {dt.label}
                </Text>
                {active && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={primary}
                    style={{ position: 'absolute', top: 6, right: 6 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Format ───────────────────────────────────────────────────── */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: s }]}>
          Format
        </Text>
        <View style={styles.formatRow}>
          {(['csv', 'json'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.formatBtn,
                {
                  backgroundColor: exportFormat === f ? primary + '22' : card,
                  boxShadow: exportFormat === f ? (neuChip(theme) as any) : undefined,
                },
              ]}
              onPress={() => setExportFormat(f)}
            >
              <MaterialCommunityIcons
                name={f === 'csv' ? 'file-delimited-outline' : 'code-json'}
                size={32}
                color={exportFormat === f ? primary : s}
              />
              <Text variant="labelLarge" style={{ color: exportFormat === f ? primary : s }}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Date Range ───────────────────────────────────────────────── */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: s }]}>
          Date Range
          <Text variant="bodySmall" style={{ color: muted, fontWeight: '400' }}> (optional)</Text>
        </Text>
        <View style={styles.dateRow}>
          <View style={[styles.dateField, { backgroundColor: card, borderColor: outline, boxShadow: neuCard(theme) as any }]}>
            <MaterialCommunityIcons name="calendar-start" size={16} color={muted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.dateInput, { color: s }]}
              placeholder="Start  YYYY-MM-DD"
              placeholderTextColor={muted}
              value={startDate}
              onChangeText={setStartDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              editable={!exporting}
            />
          </View>
          <View style={[styles.dateField, { backgroundColor: card, borderColor: outline, boxShadow: neuCard(theme) as any }]}>
            <MaterialCommunityIcons name="calendar-end" size={16} color={muted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.dateInput, { color: s }]}
              placeholder="End  YYYY-MM-DD"
              placeholderTextColor={muted}
              value={endDate}
              onChangeText={setEndDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              editable={!exporting}
            />
          </View>
        </View>
        <Text variant="bodySmall" style={{ color: muted, marginBottom: 4 }}>
          Leave both empty to export all dates.
        </Text>
        {hasDateIgnoredType && (
          <Text variant="bodySmall" style={{ color: muted }}>
            Bills and Wallets always export in full regardless of date range.
          </Text>
        )}

        {/* ── Export Button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.exportBtn,
            {
              backgroundColor: primary,
              opacity: exporting || selectedTypes.size === 0 ? 0.6 : 1,
              boxShadow: neuButton(theme) as any,
            },
          ]}
          onPress={handleExport}
          disabled={exporting || selectedTypes.size === 0}
        >
          <MaterialCommunityIcons name="export" size={20} color={theme.custom.buttonText} />
          <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>
            {exporting ? 'Exporting…' : `Export as ${exportFormat.toUpperCase()}`}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeChip: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  formatBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    borderRadius: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 20,
  },
});
