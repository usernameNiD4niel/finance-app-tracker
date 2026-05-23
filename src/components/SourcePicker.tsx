import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { neuCardLg, neuChip } from '../theme/neumorphism';
import { formatCurrency } from '../utils/currency';
import type { MoneySource } from '../db/schema';
import type { AppTheme } from '../theme';

interface Props {
  visible: boolean;
  sources: MoneySource[];
  selectedId: number | null;
  onSelect: (source: MoneySource) => void;
  onClose: () => void;
  /** Currency code used to display each wallet's balance. */
  currency?: string;
  /**
   * Amount the user intends to spend. Wallets whose available balance is below
   * this (or below 1) are disabled so the wallet can never go negative.
   */
  requiredAmount?: number;
  /**
   * Returns the balance available for the operation. Lets callers account for
   * edit flows where the original amount has already been deducted.
   */
  getAvailableBalance?: (source: MoneySource) => number;
}

export function SourcePicker({
  visible, sources, selectedId, onSelect, onClose,
  currency = 'USD', requiredAmount = 0, getAvailableBalance,
}: Props) {
  const theme = useTheme<AppTheme>();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]}>
        <View style={[styles.sheet, { backgroundColor: theme.custom.cardBg }]}>
          <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: '700' }}>
            Select Source
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {sources.filter(s => s.isActive).map((src) => {
                const isSelected = src.id === selectedId;
                const available = getAvailableBalance ? getAvailableBalance(src) : src.balance;
                // A wallet can't sit negative: block empty wallets (< 1) and any
                // wallet that doesn't have enough to cover the intended amount.
                const disabled = available < 1 || (requiredAmount > 0 && available < requiredAmount);
                return (
                  <TouchableOpacity
                    key={src.id}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isSelected ? src.color + '22' : theme.custom.cardBg,
                        boxShadow: isSelected ? (neuChip(theme) as any) : undefined,
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                    onPress={() => { onSelect(src); onClose(); }}
                    disabled={disabled}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={src.icon as any}
                      size={28}
                      color={src.color}
                    />
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurface, marginTop: 4, textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {src.name}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: disabled ? theme.custom.expense : theme.colors.onSurfaceVariant,
                        marginTop: 2,
                        textAlign: 'center',
                        fontSize: 10,
                      }}
                      numberOfLines={1}
                    >
                      {formatCurrency(available, currency)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={onClose}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  item: {
    width: '22%',
    aspectRatio: 0.9,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  closeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
});
