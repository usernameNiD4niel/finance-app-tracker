import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategoryStore } from '../../store/categoryStore';
import { neuButton, neuListItem, neuCardLg, neuChip } from '../../theme/neumorphism';
import type { Category } from '../../db/schema';
import type { AppTheme } from '../../theme';

const ICON_OPTIONS = [
  'food', 'car', 'shopping', 'heart-pulse', 'lightning-bolt', 'gamepad-variant',
  'school', 'dots-horizontal', 'home', 'airplane', 'coffee', 'music',
  'dumbbell', 'gift', 'phone', 'medical-bag', 'baby-carriage', 'dog',
  'book-open-variant', 'camera', 'palette', 'tools', 'beer', 'tshirt-crew',
];

const COLOR_OPTIONS = [
  '#f97316', '#3b82f6', '#ec4899', '#ef4444', '#eab308', '#8b5cf6',
  '#06b6d4', '#6b7280', '#10b981', '#f59e0b', '#6366f1', '#14b8a6',
];

export default function CategoriesScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { categories, loadCategories, addCategory, editCategory, removeCategory } = useCategoryStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => { loadCategories(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setSelectedIcon(ICON_OPTIONS[0]);
    setSelectedColor(COLOR_OPTIONS[0]);
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setModalVisible(true);
  };

  const handleDelete = (cat: Category) => {
    if (!cat.isCustom) return;
    Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
      { text: 'Delete', style: 'destructive', onPress: () => removeCategory(cat.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await editCategory(editingId, { name: name.trim(), icon: selectedIcon, color: selectedColor });
    } else {
      await addCategory({ name: name.trim(), icon: selectedIcon, color: selectedColor, isCustom: true, createdAt: new Date().toISOString() });
    }
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Categories</Text>
        <TouchableOpacity onPress={openAdd}>
          <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.catRow, { backgroundColor: theme.custom.cardBg, boxShadow: neuListItem(theme) as any }]}>
            <View style={[styles.catIcon, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>{item.name}</Text>
            {item.isCustom ? (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.custom.expense} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Built-in</Text>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]}>
          <View style={[styles.sheet, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}>
            <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
              {editingId ? 'Edit Category' : 'New Category'}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              mode="outlined"
              label="Category Name"
              style={{ marginBottom: 16 }}
            />
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ICON_OPTIONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconOption, {
                      backgroundColor: selectedIcon === icon ? theme.colors.primary + '22' : theme.custom.cardBg,
                      boxShadow: selectedIcon === icon ? (neuChip(theme) as any) : undefined,
                    }]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <MaterialCommunityIcons name={icon as any} size={22} color={selectedIcon === icon ? theme.colors.primary : theme.colors.onSurface} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: theme.custom.buttonText }]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]} onPress={() => setModalVisible(false)}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    boxShadow: neuButton(theme) as any,
                  },
                ]}
                onPress={handleSave}
              >
                <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14,
  },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  iconOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
