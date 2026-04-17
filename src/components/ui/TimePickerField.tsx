import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { neuCard, neuCardLg } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

interface Props {
  value: string; // HH:MM (24h)
  onChange: (timeStr: string) => void;
  label: string;
  error?: boolean;
}

function parseTime(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 20 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

function toTimeStr(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function TimePickerField({ value, onChange, label, error = false }: Props) {
  const theme = useTheme<AppTheme>();
  const [showPicker, setShowPicker] = useState(false);
  const currentDate = parseTime(value);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) onChange(toTimeStr(selectedDate));
  };

  return (
    <View>
      <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: theme.custom.cardBg,
            boxShadow: neuCard(theme) as any,
            borderWidth: error ? 1 : 0,
            borderColor: error ? theme.custom.expense : 'transparent',
          },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
        </View>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
          {formatDisplay(value)}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={currentDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]}>
            <View style={[styles.sheet, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <View style={styles.sheetHeader}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {label}
                </Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, marginTop: 16 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iosPicker: { height: 200 },
});
