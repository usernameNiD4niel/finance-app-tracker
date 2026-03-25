import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, Keyboard } from 'react-native';
import { Text, TextInput, FAB, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { SourceCard } from '../../components/SourceCard';
import { useSourceStore } from '../../store/sourceStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/currency';
import { neuButton, neuCardLg, neuChip } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

const SOURCE_TYPES = [
  { value: 'bank', label: 'Bank' },
  { value: 'e_wallet', label: 'E-Wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'custom', label: 'Other' },
] as const;

const ICON_OPTIONS = [
  'bank', 'wallet-outline', 'cash', 'account-group', 'credit-card-outline',
  'piggy-bank', 'safe', 'cash-register', 'hand-coin', 'cellphone',
  'store', 'home', 'briefcase', 'card-account-details', 'currency-usd',
  'bitcoin', 'google-play', 'apple', 'gift', 'chart-line',
];

const COLOR_OPTIONS = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#ec4899',
  '#06b6d4', '#eab308', '#6366f1', '#14b8a6', '#f59e0b', '#6b7280',
];

export default function WalletsScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { currency } = useSettingsStore();
  const { sources, totalBalance, loadSources, addSource, editSource, removeSource, deposit, withdraw } = useSourceStore();

  // Add/Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('bank');
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [initialBalance, setInitialBalance] = useState('');

  // Deposit/Withdraw modal state
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [amountModalMode, setAmountModalMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountModalSourceId, setAmountModalSourceId] = useState<number | null>(null);
  const [amountValue, setAmountValue] = useState('');

  useFocusEffect(useCallback(() => { loadSources(); }, []));

  const activeSources = sources.filter(s => s.isActive);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setSelectedType('bank');
    setSelectedIcon(ICON_OPTIONS[0]);
    setSelectedColor(COLOR_OPTIONS[0]);
    setInitialBalance('');
    setEditModalVisible(true);
  };

  const openEdit = (id: number) => {
    const src = sources.find(s => s.id === id);
    if (!src) return;
    setEditingId(id);
    setName(src.name);
    setSelectedType(src.type);
    setSelectedIcon(src.icon);
    setSelectedColor(src.color);
    setInitialBalance('');
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await editSource(editingId, { name: name.trim(), type: selectedType as any, icon: selectedIcon, color: selectedColor });
    } else {
      await addSource({
        name: name.trim(),
        type: selectedType as any,
        icon: selectedIcon,
        color: selectedColor,
        balance: initialBalance ? Number(initialBalance) : 0,
        isCustom: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    setEditModalVisible(false);
  };

  const handleDelete = (id: number) => {
    const src = sources.find(s => s.id === id);
    const label = src?.isCustom ? 'Delete' : 'Deactivate';
    Alert.alert(`${label} Source`, `${label} "${src?.name}"?`, [
      { text: label, style: 'destructive', onPress: () => removeSource(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openDeposit = (id: number) => {
    setAmountModalSourceId(id);
    setAmountModalMode('deposit');
    setAmountValue('');
    setAmountModalVisible(true);
  };

  const openWithdraw = (id: number) => {
    setAmountModalSourceId(id);
    setAmountModalMode('withdraw');
    setAmountValue('');
    setAmountModalVisible(true);
  };

  const handleAmountConfirm = async () => {
    const amount = Number(amountValue);
    if (!amount || amount <= 0 || !amountModalSourceId) return;
    if (amountModalMode === 'deposit') {
      await deposit(amountModalSourceId, amount);
    } else {
      await withdraw(amountModalSourceId, amount);
    }
    setAmountModalVisible(false);
  };

  const amountModalSource = sources.find(s => s.id === amountModalSourceId);

  return (
    <ScreenContainer>
      <TopHeader
        title="Wallets"
        rightElement={
          <View style={styles.headerRight}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Total Balance</Text>
            <Text style={{ color: totalBalance >= 0 ? theme.custom.income : theme.custom.expense, fontWeight: '700', fontSize: 16 }}>
              {formatCurrency(totalBalance, currency)}
            </Text>
          </View>
        }
      />

      <FlatList
        data={activeSources}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <SourceCard
            id={item.id}
            name={item.name}
            type={item.type}
            icon={item.icon}
            color={item.color}
            balance={item.balance}
            isCustom={item.isCustom}
            isActive={item.isActive}
            currency={currency}
            onDeposit={openDeposit}
            onWithdraw={openWithdraw}
            onEdit={openEdit}
            onDelete={handleDelete}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="wallet-outline" size={60} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No wallets yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Tap + to add a money source
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 150 }}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            bottom: insets.bottom + 90,
            backgroundColor: theme.colors.primary,
            boxShadow: neuButton(theme) as any,
          },
        ]}
        color={theme.custom.buttonText}
        onPress={openAdd}
      />

      {/* Add/Edit Source Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]} onPress={() => { Keyboard.dismiss(); setEditModalVisible(false); }}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]} onPress={Keyboard.dismiss}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
                {editingId ? 'Edit Source' : 'New Source'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  label="Source Name"
                  style={{ marginBottom: 16 }}
                />

                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Type</Text>
                <View style={styles.typeRow}>
                  {SOURCE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: selectedType === t.value ? theme.colors.primary + '22' : theme.custom.cardBg,
                          boxShadow: selectedType === t.value ? (neuChip(theme) as any) : undefined,
                        },
                      ]}
                      onPress={() => setSelectedType(t.value)}
                    >
                      <Text variant="labelSmall" style={{
                        color: selectedType === t.value ? theme.colors.primary : theme.colors.onSurface,
                      }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 16 }}>Icon</Text>
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

                {!editingId && (
                  <>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Initial Balance</Text>
                    <TextInput
                      value={initialBalance}
                      onChangeText={setInitialBalance}
                      keyboardType="decimal-pad"
                      mode="outlined"
                      placeholder="0.00"
                      left={<TextInput.Affix text={currency} />}
                      style={{ marginBottom: 16 }}
                    />
                  </>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]} onPress={() => setEditModalVisible(false)}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
                    onPress={handleSave}
                  >
                    <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Deposit/Withdraw Modal */}
      <Modal visible={amountModalVisible} animationType="slide" transparent onRequestClose={() => { Keyboard.dismiss(); setAmountModalVisible(false); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]} onPress={() => { Keyboard.dismiss(); setAmountModalVisible(false); }}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]} onPress={Keyboard.dismiss}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
                {amountModalMode === 'deposit' ? 'Deposit' : 'Withdraw'}
              </Text>
              {amountModalSource && (
                <View style={{ marginBottom: 16 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {amountModalSource.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    Current Balance: {formatCurrency(amountModalSource.balance, currency)}
                  </Text>
                  {amountValue && Number(amountValue) > 0 && (
                    <Text variant="bodySmall" style={{
                      color: amountModalMode === 'deposit' ? theme.custom.income : theme.custom.expense,
                      marginTop: 2,
                      fontWeight: '600',
                    }}>
                      New Balance: {formatCurrency(
                        amountModalMode === 'deposit'
                          ? amountModalSource.balance + Number(amountValue)
                          : amountModalSource.balance - Number(amountValue),
                        currency
                      )} (Total: {formatCurrency(
                        amountModalMode === 'deposit'
                          ? totalBalance + Number(amountValue)
                          : totalBalance - Number(amountValue),
                        currency
                      )})
                    </Text>
                  )}
                </View>
              )}
              <TextInput
                value={amountValue}
                onChangeText={setAmountValue}
                keyboardType="decimal-pad"
                mode="outlined"
                placeholder="0.00"
                left={<TextInput.Affix text={currency} />}
                style={{ marginBottom: 24 }}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]} onPress={() => { Keyboard.dismiss(); setAmountModalVisible(false); }}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, {
                    backgroundColor: amountModalMode === 'deposit' ? theme.custom.income : theme.custom.expense,
                    boxShadow: neuButton(theme) as any,
                  }]}
                  onPress={handleAmountConfirm}
                >
                  <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>
                    {amountModalMode === 'deposit' ? 'Deposit' : 'Withdraw'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRight: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 80 },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 20,
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  iconOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
});
