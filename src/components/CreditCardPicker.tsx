import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { neuChip } from '../theme/neumorphism';
import type { CreditCard } from '../db/schema';
import type { AppTheme } from '../theme';

interface Props {
  visible: boolean;
  cards: CreditCard[];
  selectedId: number | null;
  onSelect: (card: CreditCard) => void;
  onClose: () => void;
}

export function CreditCardPicker({ visible, cards, selectedId, onSelect, onClose }: Props) {
  const theme = useTheme<AppTheme>();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]}>
        <View style={[styles.sheet, { backgroundColor: theme.custom.cardBg }]}>
          <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: '700' }}>
            Select Credit Card
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {cards.filter(c => c.isActive).map((card) => {
                const isSelected = card.id === selectedId;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isSelected ? card.color + '22' : theme.custom.cardBg,
                        boxShadow: isSelected ? (neuChip(theme) as any) : undefined,
                      },
                    ]}
                    onPress={() => { onSelect(card); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name={card.icon as any} size={28} color={card.color} />
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurface, marginTop: 4, textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {card.name}
                    </Text>
                    {card.soaDay != null && (
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, textAlign: 'center', fontSize: 10 }}
                        numberOfLines={1}
                      >
                        SOA: day {card.soaDay}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {cards.filter(c => c.isActive).length === 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}>
                No credit cards yet. Add one from the Wallets tab.
              </Text>
            )}
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
