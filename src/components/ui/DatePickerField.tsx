import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { glassShadow } from '../../theme/glass';
import type { AppTheme } from '../../theme';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label: string;
  icon?: string;
  placeholder?: string;
  error?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return format(parseDate(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function DatePickerField({
  value,
  onChange,
  label,
  icon = 'calendar',
  placeholder = 'Select date',
  error = false,
  minimumDate,
  maximumDate,
}: Props) {
  const theme = useTheme<AppTheme>();
  const [showPicker, setShowPicker] = useState(false);
  const currentDate = parseDate(value);
  const displayText = value ? formatDisplay(value) : '';

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleConfirmIOS = () => {
    setShowPicker(false);
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
            backgroundColor: theme.custom.glassBg,
            borderWidth: 1,
            borderColor: error ? theme.custom.expense : theme.custom.glassBorder,
            boxShadow: glassShadow(theme, 'sm') as any,
          },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        {displayText ? (
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
            {displayText}
          </Text>
        ) : (
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
            {placeholder}
          </Text>
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>

      {/* Android: renders as a native dialog */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: renders in a bottom sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]}>
            <View style={[styles.sheet, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderTopColor: theme.custom.glassBorder, borderLeftColor: theme.custom.glassBorder, borderRightColor: theme.custom.glassBorder, borderBottomWidth: 0, boxShadow: glassShadow(theme, 'lg') as any }]}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <View style={styles.sheetHeader}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {label}
                </Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
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
  label: {
    marginBottom: 6,
    marginTop: 16,
  },
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
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  iosPicker: {
    height: 200,
  },
});
