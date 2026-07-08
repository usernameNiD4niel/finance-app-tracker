import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Pressable, Keyboard, Switch,
} from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { SourceCard } from '../../components/SourceCard';
import { CreditCardListItem } from '../../components/CreditCardListItem';
import { useSourceStore } from '../../store/sourceStore';
import { useCreditCardStore } from '../../store/creditCardStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/currency';
import { buildInitialNextRunDate } from '../../services/recurring';
import { neuButton, neuCardLg, neuChip } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';
import type { MoneySource, RecurringTransaction, CreditCard } from '../../db/schema';

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

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'start_of_month', label: 'Start of Month' },
  { value: 'end_of_month', label: 'End of Month' },
  { value: 'specific_day', label: 'Specific Day' },
] as const;

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  start_of_month: 'Start of Month',
  end_of_month: 'End of Month',
  specific_day: 'Specific Day',
};

// ─── Sheet pages ─────────────────────────────────────────────────────────────
type SheetPage = 'detail' | 'dw' | 'add-recurring' | 'transfer';

export default function WalletsScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { currency } = useSettingsStore();
  const {
    sources, totalBalance, loadSources,
    addSource, editSource, removeSource, deposit, withdraw,
    recurringMap, loadRecurring, addRecurring, removeRecurring,
    transfer,
  } = useSourceStore();
  const { cards, loadCards, addCard, editCard, removeCard } = useCreditCardStore();

  // ── Detail bottom sheet ───────────────────────────────────────────────────
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetSourceId, setSheetSourceId] = useState<number | null>(null);
  const [sheetPage, setSheetPage] = useState<SheetPage>('detail');

  // ── DW (Deposit/Withdraw) state ───────────────────────────────────────────
  const [dwMode, setDwMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [dwAmount, setDwAmount] = useState('');
  const [dwRecurring, setDwRecurring] = useState(false);
  const [dwFrequency, setDwFrequency] = useState<string>('monthly');
  const [dwDayOfMonth, setDwDayOfMonth] = useState('1');

  // ── Transfer state ────────────────────────────────────────────────────────
  const [trToSource, setTrToSource] = useState<MoneySource | null>(null);
  const [trAmount, setTrAmount] = useState('');
  const [trFee, setTrFee] = useState('');
  const [trNote, setTrNote] = useState('');

  // ── Add Recurring form state ──────────────────────────────────────────────
  const [arType, setArType] = useState<'deposit' | 'withdraw'>('deposit');
  const [arAmount, setArAmount] = useState('');
  const [arFrequency, setArFrequency] = useState<string>('start_of_month');
  const [arDayOfMonth, setArDayOfMonth] = useState('1');
  const [arNote, setArNote] = useState('');

  // ── Add/Edit wallet modal ─────────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('bank');
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [initialBalance, setInitialBalance] = useState('');

  // ── Add/Edit credit card modal ────────────────────────────────────────────
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardIcon, setCardIcon] = useState(ICON_OPTIONS[4]); // 'credit-card-outline'
  const [cardColor, setCardColor] = useState(COLOR_OPTIONS[0]);
  const [cardSoaDay, setCardSoaDay] = useState('');

  useFocusEffect(useCallback(() => { loadSources(); loadCards(); }, []));

  const activeSources = sources.filter(s => s.isActive);
  const activeCards = cards.filter(c => c.isActive);
  const sheetSource = sources.find(s => s.id === sheetSourceId);
  const sheetRecurring: RecurringTransaction[] = sheetSourceId ? (recurringMap[sheetSourceId] ?? []) : [];

  // ── Open detail sheet ─────────────────────────────────────────────────────
  const openDetail = (id: number) => {
    setSheetSourceId(id);
    setSheetPage('detail');
    setSheetVisible(true);
    loadRecurring(id);
  };

  const openDw = (mode: 'deposit' | 'withdraw') => {
    setDwMode(mode);
    setDwAmount('');
    setDwRecurring(false);
    setDwFrequency('start_of_month');
    setDwDayOfMonth('1');
    setSheetPage('dw');
  };

  const handleDwConfirm = async () => {
    const amount = Number(dwAmount);
    if (!amount || amount <= 0 || !sheetSourceId) return;

    if (dwMode === 'withdraw' && sheetSource && amount > sheetSource.balance) {
      Alert.alert(
        'Insufficient Balance',
        `${sheetSource.name} only has ${formatCurrency(sheetSource.balance, currency)}. The wallet can't go negative.`
      );
      return;
    }
    Keyboard.dismiss();

    if (dwMode === 'deposit') {
      await deposit(sheetSourceId, amount);
    } else {
      await withdraw(sheetSourceId, amount);
    }

    if (dwRecurring) {
      const nextRun = buildInitialNextRunDate(dwFrequency, Number(dwDayOfMonth) || 1);
      await addRecurring({
        sourceId: sheetSourceId,
        type: dwMode,
        amount,
        frequency: dwFrequency as any,
        dayOfMonth: dwFrequency === 'specific_day' ? (Number(dwDayOfMonth) || 1) : null,
        nextRunDate: nextRun,
        lastRunDate: null,
        isActive: true,
        note: null,
        createdAt: new Date().toISOString(),
      });
    }

    setSheetPage('detail');
  };

  const handleAddRecurringConfirm = async () => {
    const amount = Number(arAmount);
    if (!amount || amount <= 0 || !sheetSourceId) return;
    Keyboard.dismiss();
    const nextRun = buildInitialNextRunDate(arFrequency, Number(arDayOfMonth) || 1);
    await addRecurring({
      sourceId: sheetSourceId,
      type: arType,
      amount,
      frequency: arFrequency as any,
      dayOfMonth: arFrequency === 'specific_day' ? (Number(arDayOfMonth) || 1) : null,
      nextRunDate: nextRun,
      lastRunDate: null,
      isActive: true,
      note: arNote.trim() || null,
      createdAt: new Date().toISOString(),
    });
    setArAmount('');
    setArNote('');
    setSheetPage('detail');
  };

  const openTransfer = () => {
    setTrToSource(null);
    setTrAmount('');
    setTrFee('');
    setTrNote('');
    setSheetPage('transfer');
  };

  const handleTransferConfirm = async () => {
    const amount = Number(trAmount);
    if (!amount || amount <= 0 || !sheetSourceId || !trToSource) return;
    const fee = Number(trFee) || 0;
    const totalOut = amount + fee;
    if (sheetSource && totalOut > sheetSource.balance) {
      Alert.alert(
        'Insufficient Balance',
        `${sheetSource.name} only has ${formatCurrency(sheetSource.balance, currency)}. This transfer needs ${formatCurrency(totalOut, currency)} (incl. fee). The wallet can't go negative.`
      );
      return;
    }
    Keyboard.dismiss();
    const today = new Date().toISOString().split('T')[0];
    await transfer(sheetSourceId, trToSource.id, amount, fee, trNote.trim() || null, today);
    setSheetPage('detail');
  };

  const handleDeleteRecurring = (rt: RecurringTransaction) => {
    Alert.alert('Delete Schedule', `Remove this recurring ${rt.type}?`, [
      { text: 'Delete', style: 'destructive', onPress: () => removeRecurring(rt.id, rt.sourceId) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Add/Edit wallet ───────────────────────────────────────────────────────
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

  // ── Add/Edit credit card ──────────────────────────────────────────────────
  const openAddCard = () => {
    setEditingCardId(null);
    setCardName('');
    setCardIcon('credit-card-outline');
    setCardColor(COLOR_OPTIONS[0]);
    setCardSoaDay('');
    setCardModalVisible(true);
  };

  const openEditCard = (id: number) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    setEditingCardId(id);
    setCardName(card.name);
    setCardIcon(card.icon);
    setCardColor(card.color);
    setCardSoaDay(card.soaDay != null ? String(card.soaDay) : '');
    setCardModalVisible(true);
  };

  const handleSaveCard = async () => {
    if (!cardName.trim()) return;
    const day = cardSoaDay.trim() ? Math.min(31, Math.max(1, Number(cardSoaDay) || 1)) : null;
    if (editingCardId) {
      await editCard(editingCardId, { name: cardName.trim(), icon: cardIcon, color: cardColor, soaDay: day });
    } else {
      await addCard({
        name: cardName.trim(),
        icon: cardIcon,
        color: cardColor,
        soaDay: day,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    setCardModalVisible(false);
  };

  const handleDeleteCard = (id: number) => {
    const card = cards.find(c => c.id === id);
    Alert.alert('Delete Credit Card', `Delete "${card?.name}"?`, [
      { text: 'Delete', style: 'destructive', onPress: () => removeCard(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Render sheet content ──────────────────────────────────────────────────
  const renderDetailPage = () => (
    <View>
      {sheetSource && (
        <View style={styles.detailHeader}>
          <View style={[styles.detailIcon, { backgroundColor: sheetSource.color + '22' }]}>
            <MaterialCommunityIcons name={sheetSource.icon as any} size={28} color={sheetSource.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {sheetSource.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {sheetSource.type.replace('_', '-').toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Balance</Text>
            <Text variant="titleMedium" style={{
              color: sheetSource.balance >= 0 ? theme.custom.income : theme.custom.expense,
              fontWeight: '800',
            }}>
              {formatCurrency(sheetSource.balance, currency)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.dwButtons}>
        <TouchableOpacity
          style={[styles.dwBtn, { backgroundColor: theme.custom.income + '1a' }]}
          onPress={() => openDw('deposit')}
        >
          <MaterialCommunityIcons name="arrow-down-circle-outline" size={20} color={theme.custom.income} />
          <Text variant="labelLarge" style={{ color: theme.custom.income, marginLeft: 6 }}>Deposit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dwBtn, { backgroundColor: theme.custom.expense + '1a' }]}
          onPress={() => openDw('withdraw')}
        >
          <MaterialCommunityIcons name="arrow-up-circle-outline" size={20} color={theme.custom.expense} />
          <Text variant="labelLarge" style={{ color: theme.custom.expense, marginLeft: 6 }}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dwBtn, { backgroundColor: theme.colors.primary + '1a' }]}
          onPress={openTransfer}
        >
          <MaterialCommunityIcons name="bank-transfer" size={20} color={theme.colors.primary} />
          <Text variant="labelLarge" style={{ color: theme.colors.primary, marginLeft: 6 }}>Transfer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recurringSection}>
        <View style={styles.recurringSectionHeader}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Recurring Schedules
          </Text>
          <TouchableOpacity
            style={[styles.addRecurringBtn, { backgroundColor: theme.colors.primary + '22' }]}
            onPress={() => {
              setArType('deposit');
              setArAmount('');
              setArFrequency('start_of_month');
              setArDayOfMonth('1');
              setArNote('');
              setSheetPage('add-recurring');
            }}
          >
            <MaterialCommunityIcons name="plus" size={16} color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>Add</Text>
          </TouchableOpacity>
        </View>

        {sheetRecurring.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No recurring schedules yet
          </Text>
        ) : (
          sheetRecurring.map(rt => (
            <View key={rt.id} style={[styles.recurringItem, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.recurringDot, {
                backgroundColor: rt.type === 'deposit' ? theme.custom.income + '22' : theme.custom.expense + '22',
              }]}>
                <MaterialCommunityIcons
                  name={rt.type === 'deposit' ? 'arrow-down' : 'arrow-up'}
                  size={14}
                  color={rt.type === 'deposit' ? theme.custom.income : theme.custom.expense}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  {rt.type === 'deposit' ? '+' : '-'}{formatCurrency(rt.amount, currency)} · {FREQ_LABELS[rt.frequency] ?? rt.frequency}
                  {rt.frequency === 'specific_day' && rt.dayOfMonth ? ` (day ${rt.dayOfMonth})` : ''}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Next: {rt.nextRunDate}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteRecurring(rt)}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.custom.expense} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.editDeleteRow}>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={() => { setSheetVisible(false); openEdit(sheetSourceId!); }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.onSurface} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: theme.custom.expense + '1a' }]}
          onPress={() => { setSheetVisible(false); handleDelete(sheetSourceId!); }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.custom.expense} />
          <Text variant="labelMedium" style={{ color: theme.custom.expense, marginLeft: 6 }}>
            {sheetSource?.isCustom ? 'Delete' : 'Deactivate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDwPage = () => (
    <View>
      <TouchableOpacity onPress={() => setSheetPage('detail')} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.onSurface} />
        <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>Back</Text>
      </TouchableOpacity>

      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}>
        {dwMode === 'deposit' ? 'Deposit' : 'Withdraw'}
      </Text>
      {sheetSource && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          {sheetSource.name} · Current: {formatCurrency(sheetSource.balance, currency)}
        </Text>
      )}

      <TextInput
        value={dwAmount}
        onChangeText={setDwAmount}
        keyboardType="decimal-pad"
        mode="outlined"
        placeholder="0.00"
        left={<TextInput.Affix text={currency} />}
        style={{ marginBottom: 20 }}
      />

      <View style={styles.recurringToggleRow}>
        <View style={{ flex: 1 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Make Recurring</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Repeat this {dwMode} automatically
          </Text>
        </View>
        <Switch
          value={dwRecurring}
          onValueChange={(val) => {
            setDwRecurring(val);
          }}
          trackColor={{ false: theme.custom.trackBg, true: theme.colors.primary + '66' }}
          thumbColor={dwRecurring ? theme.colors.primary : theme.colors.surfaceVariant}
        />
      </View>

      {dwRecurring && (
        <View style={{ marginTop: 12 }}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FREQUENCY_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.freqChip,
                    {
                      backgroundColor: dwFrequency === f.value ? theme.colors.primary + '22' : theme.custom.cardBg,
                      boxShadow: dwFrequency === f.value ? (neuChip(theme) as any) : undefined,
                    },
                  ]}
                  onPress={() => setDwFrequency(f.value)}
                >
                  <Text variant="labelSmall" style={{ color: dwFrequency === f.value ? theme.colors.primary : theme.colors.onSurface }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {dwFrequency === 'specific_day' && (
            <TextInput
              value={dwDayOfMonth}
              onChangeText={setDwDayOfMonth}
              keyboardType="number-pad"
              mode="outlined"
              label="Day of month (1–31)"
              style={{ marginTop: 12 }}
            />
          )}
        </View>
      )}

      <View style={[styles.modalActions, { marginTop: 24 }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={() => setSheetPage('detail')}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, {
            backgroundColor: dwMode === 'deposit' ? theme.custom.income : theme.custom.expense,
            boxShadow: neuButton(theme) as any,
          }]}
          onPress={handleDwConfirm}
        >
          <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>
            {dwMode === 'deposit' ? 'Deposit' : 'Withdraw'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddRecurringPage = () => (
    <View>
      <TouchableOpacity onPress={() => setSheetPage('detail')} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.onSurface} />
        <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>Back</Text>
      </TouchableOpacity>

      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
        Add Recurring Schedule
      </Text>

      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Type</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {(['deposit', 'withdraw'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[
              styles.freqChip,
              {
                flex: 1,
                justifyContent: 'center',
                backgroundColor: arType === t
                  ? (t === 'deposit' ? theme.custom.income + '22' : theme.custom.expense + '22')
                  : theme.custom.cardBg,
              },
            ]}
            onPress={() => setArType(t)}
          >
            <Text variant="labelMedium" style={{
              color: arType === t
                ? (t === 'deposit' ? theme.custom.income : theme.custom.expense)
                : theme.colors.onSurface,
            }}>
              {t === 'deposit' ? 'Deposit' : 'Withdraw'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={arAmount}
        onChangeText={setArAmount}
        keyboardType="decimal-pad"
        mode="outlined"
        placeholder="0.00"
        label="Amount"
        left={<TextInput.Affix text={currency} />}
        style={{ marginBottom: 16 }}
      />

      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Frequency</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FREQUENCY_OPTIONS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.freqChip,
                {
                  backgroundColor: arFrequency === f.value ? theme.colors.primary + '22' : theme.custom.cardBg,
                  boxShadow: arFrequency === f.value ? (neuChip(theme) as any) : undefined,
                },
              ]}
              onPress={() => setArFrequency(f.value)}
            >
              <Text variant="labelSmall" style={{ color: arFrequency === f.value ? theme.colors.primary : theme.colors.onSurface }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {arFrequency === 'specific_day' && (
        <TextInput
          value={arDayOfMonth}
          onChangeText={setArDayOfMonth}
          keyboardType="number-pad"
          mode="outlined"
          label="Day of month (1–31)"
          style={{ marginBottom: 16 }}
        />
      )}

      <TextInput
        value={arNote}
        onChangeText={setArNote}
        mode="outlined"
        label="Note (optional)"
        style={{ marginBottom: 24 }}
      />

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={() => setSheetPage('detail')}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
          onPress={handleAddRecurringConfirm}
        >
          <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTransferPage = () => {
    const otherSources = activeSources.filter(s => s.id !== sheetSourceId);
    const totalDeducted = (Number(trAmount) || 0) + (Number(trFee) || 0);

    return (
      <View>
        <TouchableOpacity onPress={() => setSheetPage('detail')} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.onSurface} />
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>Back</Text>
        </TouchableOpacity>

        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}>
          Transfer Money
        </Text>
        {sheetSource && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            From: {sheetSource.name} · {formatCurrency(sheetSource.balance, currency)}
          </Text>
        )}

        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          To Wallet
        </Text>
        {otherSources.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            No other wallets available
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {otherSources.map(src => {
                const isSelected = trToSource?.id === src.id;
                return (
                  <TouchableOpacity
                    key={src.id}
                    style={[
                      styles.walletChip,
                      {
                        backgroundColor: isSelected ? src.color + '22' : theme.custom.cardBg,
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: isSelected ? src.color : 'transparent',
                      },
                    ]}
                    onPress={() => setTrToSource(src)}
                  >
                    <View style={[styles.walletChipIcon, { backgroundColor: src.color + '22' }]}>
                      <MaterialCommunityIcons name={src.icon as any} size={16} color={src.color} />
                    </View>
                    <View>
                      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                        {src.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatCurrency(src.balance, currency)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        <TextInput
          value={trAmount}
          onChangeText={setTrAmount}
          keyboardType="decimal-pad"
          mode="outlined"
          label="Amount"
          placeholder="0.00"
          left={<TextInput.Affix text={currency} />}
          style={{ marginBottom: 12 }}
        />

        <TextInput
          value={trFee}
          onChangeText={setTrFee}
          keyboardType="decimal-pad"
          mode="outlined"
          label="Transfer Fee (optional)"
          placeholder="0.00"
          left={<TextInput.Affix text={currency} />}
          style={{ marginBottom: 12 }}
        />

        <TextInput
          value={trNote}
          onChangeText={setTrNote}
          mode="outlined"
          label="Note (optional)"
          style={{ marginBottom: 12 }}
        />

        {totalDeducted > 0 && trToSource && (
          <View style={[styles.transferSummary, { backgroundColor: theme.colors.primary + '10' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Amount received</Text>
              <Text variant="bodySmall" style={{ color: theme.custom.income, fontWeight: '700' }}>
                +{formatCurrency(Number(trAmount) || 0, currency)}
              </Text>
            </View>
            {Number(trFee) > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Transfer fee</Text>
                <Text variant="bodySmall" style={{ color: theme.custom.expense, fontWeight: '700' }}>
                  -{formatCurrency(Number(trFee), currency)}
                </Text>
              </View>
            )}
            <View style={[styles.transferSummaryDivider, { backgroundColor: theme.colors.outline }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Total deducted</Text>
              <Text variant="bodySmall" style={{ color: theme.custom.expense, fontWeight: '700' }}>
                -{formatCurrency(totalDeducted, currency)}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.modalActions, { marginTop: 16 }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setSheetPage('detail')}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, {
              backgroundColor: !trToSource || !Number(trAmount) ? theme.colors.surfaceVariant : theme.colors.primary,
              boxShadow: trToSource && Number(trAmount) ? (neuButton(theme) as any) : undefined,
              opacity: !trToSource || !Number(trAmount) ? 0.5 : 1,
            }]}
            onPress={handleTransferConfirm}
            disabled={!trToSource || !Number(trAmount)}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Transfer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          <TouchableOpacity onPress={() => openDetail(item.id)} activeOpacity={0.8}>
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
              onDeposit={(id) => { openDetail(id); setTimeout(() => openDw('deposit'), 50); }}
              onWithdraw={(id) => { openDetail(id); setTimeout(() => openDw('withdraw'), 50); }}
              onTransfer={(id) => { openDetail(id); setTimeout(() => openTransfer(), 50); }}
              onEdit={openEdit}
              onDelete={handleDelete}
              index={index}
            />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <>
            <TouchableOpacity
              style={[styles.addWalletCard, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}
              onPress={openAdd}
              activeOpacity={0.7}
            >
              <View style={[styles.addWalletIcon, { backgroundColor: theme.colors.primary + '1a' }]}>
                <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Add Wallet
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Bank, e-wallet, cash or custom
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>

            <Text variant="labelLarge" style={[styles.cardsSectionHeader, { color: theme.colors.onSurfaceVariant }]}>
              Credit Cards
            </Text>
            {activeCards.map((card, index) => (
              <CreditCardListItem
                key={card.id}
                id={card.id}
                name={card.name}
                icon={card.icon}
                color={card.color}
                soaDay={card.soaDay}
                onEdit={openEditCard}
                onDelete={handleDeleteCard}
                index={index}
              />
            ))}
            <TouchableOpacity
              style={[styles.addWalletCard, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}
              onPress={openAddCard}
              activeOpacity={0.7}
            >
              <View style={[styles.addWalletIcon, { backgroundColor: theme.colors.primary + '1a' }]}>
                <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Add Credit Card
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Optional statement (SOA) date
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="wallet-outline" size={60} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No wallets yet
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Bottom Sheet */}
      <Modal visible={sheetVisible} animationType="slide" transparent onRequestClose={() => setSheetVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]} onPress={() => { Keyboard.dismiss(); setSheetVisible(false); }}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.custom.cardBg }]} onPress={Keyboard.dismiss}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {sheetPage === 'detail' && renderDetailPage()}
                {sheetPage === 'dw' && renderDwPage()}
                {sheetPage === 'add-recurring' && renderAddRecurringPage()}
                {sheetPage === 'transfer' && renderTransferPage()}
                <View style={{ height: 20 }} />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Wallet Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]} onPress={() => { Keyboard.dismiss(); setEditModalVisible(false); }}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.custom.cardBg }]} onPress={Keyboard.dismiss}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
                {editingId ? 'Edit Wallet' : 'New Wallet'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  label="Wallet Name"
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
                      <Text variant="labelSmall" style={{ color: selectedType === t.value ? theme.colors.primary : theme.colors.onSurface }}>
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

      {/* Add/Edit Credit Card Modal */}
      <Modal visible={cardModalVisible} animationType="slide" transparent onRequestClose={() => setCardModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.custom.overlayBg }]} onPress={() => { Keyboard.dismiss(); setCardModalVisible(false); }}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.custom.cardBg }]} onPress={Keyboard.dismiss}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 16 }}>
                {editingCardId ? 'Edit Credit Card' : 'New Credit Card'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput
                  value={cardName}
                  onChangeText={setCardName}
                  mode="outlined"
                  label="Card Name"
                  style={{ marginBottom: 16 }}
                />

                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {ICON_OPTIONS.map(icon => (
                      <TouchableOpacity
                        key={icon}
                        style={[styles.iconOption, {
                          backgroundColor: cardIcon === icon ? theme.colors.primary + '22' : theme.custom.cardBg,
                          boxShadow: cardIcon === icon ? (neuChip(theme) as any) : undefined,
                        }]}
                        onPress={() => setCardIcon(icon)}
                      >
                        <MaterialCommunityIcons name={icon as any} size={22} color={cardIcon === icon ? theme.colors.primary : theme.colors.onSurface} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Color</Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorDot, { backgroundColor: color, borderWidth: cardColor === color ? 3 : 0, borderColor: theme.custom.buttonText }]}
                      onPress={() => setCardColor(color)}
                    />
                  ))}
                </View>

                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  SOA Date (optional)
                </Text>
                <TextInput
                  value={cardSoaDay}
                  onChangeText={setCardSoaDay}
                  keyboardType="number-pad"
                  mode="outlined"
                  placeholder="Day of month, e.g. 15"
                  style={{ marginBottom: 16 }}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.colors.surfaceVariant }]} onPress={() => setCardModalVisible(false)}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
                    onPress={handleSaveCard}
                  >
                    <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRight: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 60 },
  addWalletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    gap: 12,
  },
  addWalletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsSectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
    fontWeight: '700',
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  detailIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dwButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dwBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  recurringSection: {
    marginBottom: 16,
  },
  recurringSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addRecurringBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    gap: 10,
  },
  recurringDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDeleteRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recurringToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  iconOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  walletChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferSummary: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  transferSummaryDivider: {
    height: 1,
    marginVertical: 6,
  },
  saveBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
});
