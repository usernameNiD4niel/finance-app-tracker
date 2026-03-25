import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { neuCardLg, neuChip } from '../theme/neumorphism';
import type { MoneySource } from '../db/schema';
import type { AppTheme } from '../theme';

interface Props {
  visible: boolean;
  sources: MoneySource[];
  selectedId: number | null;
  onSelect: (source: MoneySource) => void;
  onClose: () => void;
}

export function SourcePicker({ visible, sources, selectedId, onSelect, onClose }: Props) {
  const theme = useTheme<AppTheme>();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]}>
        <View style={[styles.sheet, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}>
          <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: '700' }}>
            Select Source
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {sources.filter(s => s.isActive).map((src) => {
                const isSelected = src.id === selectedId;
                return (
                  <TouchableOpacity
                    key={src.id}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isSelected ? src.color + '22' : theme.custom.cardBg,
                        boxShadow: isSelected ? (neuChip(theme) as any) : undefined,
                      },
                    ]}
                    onPress={() => { onSelect(src); onClose(); }}
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
