import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Category } from '../db/schema';
import type { AppTheme } from '../theme';

interface Props {
  visible: boolean;
  categories: Category[];
  selectedId: number | null;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export function CategoryPicker({ visible, categories, selectedId, onSelect, onClose }: Props) {
  const theme = useTheme<AppTheme>();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: '700' }}>
            Select Category
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {categories.map((cat) => {
                const isSelected = cat.id === selectedId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isSelected ? cat.color + '22' : theme.colors.surfaceVariant,
                        borderColor: isSelected ? cat.color : 'transparent',
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => { onSelect(cat); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={28}
                      color={cat.color}
                    />
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurface, marginTop: 4, textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {cat.name}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderRadius: 14,
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
