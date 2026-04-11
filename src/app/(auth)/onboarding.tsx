import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { PINPad } from '../../components/PINPad';
import { SegmentedChips } from '../../components/ui/SegmentedChips';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useSourceStore } from '../../store/sourceStore';
import { hashPin } from '../../services/auth';
import { CURRENCIES } from '../../utils/currency';
import { PremiumModal } from '../../components/PremiumModal';
import { GlassBackground } from '../../components/ui/GlassBackground';
import { glassShadow } from '../../theme/glass';
import type { AppTheme } from '../../theme';

type Step = 'welcome' | 'currency' | 'wallets' | 'transactions' | 'pin' | 'confirm-pin';

export default function OnboardingScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { setCurrency, setPin, setOnboardingDone } = useSettingsStore();
  const { user } = useAuthStore();
  const { addExpense } = useExpenseStore();
  const { loadCategories, categories } = useCategoryStore();
  const { sources, loadSources, addSource, editSource } = useSourceStore();

  const [step, setStep] = useState<Step>('welcome');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [pinEntry, setPinEntry] = useState('');

  // Wallets
  const [walletSelections, setWalletSelections] = useState<Record<number, { selected: boolean; balance: string }>>({});
  const [pendingCustomSources, setPendingCustomSources] = useState<Array<{ name: string; balance: string }>>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBalance, setCustomBalance] = useState('');

  // Transactions
  const [txAmount, setTxAmount] = useState('');
  const [txCategoryId, setTxCategoryId] = useState<number | null>(null);
  const [addedExpenses, setAddedExpenses] = useState<
    Array<{ amount: number; categoryName: string; categoryIcon: string; categoryColor: string }>
  >([]);
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const currencySymbol = CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol ?? '$';

  useEffect(() => {
    loadCategories();
    loadSources();
  }, []);

  const handlePinFirst = async (pin: string) => {
    setPinEntry(pin);
    setStep('confirm-pin');
  };

  const handlePinConfirm = async (pin: string) => {
    if (pin !== pinEntry) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      setStep('pin');
      return;
    }
    const hash = await hashPin(pin);
    await setPin(hash);
    await setCurrency(selectedCurrency);
    await setOnboardingDone();
    setShowPremium(true);
  };

  const handlePremiumDismiss = () => {
    setShowPremium(false);
    router.replace('/(tabs)');
  };

  const handleAddCustomWallet = () => {
    if (!customName.trim()) return;
    setPendingCustomSources(prev => [...prev, { name: customName.trim(), balance: customBalance }]);
    setCustomName('');
    setCustomBalance('');
    setShowAddCustom(false);
  };

  const handleWalletsContinue = async () => {
    for (const source of sources) {
      const sel = walletSelections[source.id];
      if (sel?.selected) {
        await editSource(source.id, { isActive: true, balance: parseFloat(sel.balance) || 0 });
      } else {
        await editSource(source.id, { isActive: false });
      }
    }
    for (const cs of pendingCustomSources) {
      await addSource({
        name: cs.name,
        type: 'custom',
        icon: 'wallet-outline',
        color: '#6b7280',
        balance: parseFloat(cs.balance) || 0,
        isCustom: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    await loadSources();
    setStep('transactions');
  };

  const handleAddExpense = async () => {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0 || !txCategoryId) return;
    const cat = categories.find((c) => c.id === txCategoryId);
    if (!cat) return;

    await addExpense({
      amount: amt,
      categoryId: txCategoryId,
      sourceId: null,
      note: null,
      date: format(new Date(), 'yyyy-MM-dd'),
    });

    setAddedExpenses((prev) => [
      ...prev,
      { amount: amt, categoryName: cat.name, categoryIcon: cat.icon, categoryColor: cat.color },
    ]);
    setTxAmount('');
    setTxCategoryId(null);
    setIsAddingTx(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.custom.bgGradientEnd, overflow: 'hidden' }]}>
      <GlassBackground />
      {step === 'welcome' && (
        <View style={styles.center}>
          <View style={[styles.logoWrap, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'md') as any }]}>
            <MaterialCommunityIcons name="wallet" size={64} color={theme.colors.primary} />
          </View>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Ledgerist
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12 }}>
            Track your expenses, manage bills, and stay on budget — all offline, all private.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: glassShadow(theme, 'sm') as any }]}
            onPress={() => setStep('currency')}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'currency' && (
        <View style={styles.content}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Pick Your Currency
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            This will be used throughout the app.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {CURRENCIES.map((c) => {
              const isSelected = c.code === selectedCurrency;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.currencyItem,
                    {
                      backgroundColor: isSelected ? theme.colors.primary + '20' : theme.custom.glassBg,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.primary + '50' : theme.custom.glassBorder,
                      boxShadow: glassShadow(theme, 'sm') as any,
                    },
                  ]}
                  onPress={() => setSelectedCurrency(c.code)}
                >
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {c.symbol} {c.code}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {c.name}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: glassShadow(theme, 'sm') as any }]}
            onPress={() => setStep('wallets')}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'wallets' && (
        <View style={styles.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface, textAlign: 'left' }]}>
              Your Wallets
            </Text>
            <TouchableOpacity onPress={() => setStep('transactions')}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Skip</Text>
            </TouchableOpacity>
          </View>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            Select your money sources and set their current balance.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {sources.map((source) => {
              const sel = walletSelections[source.id] ?? { selected: false, balance: '' };
              return (
                <View
                  key={source.id}
                  style={[styles.walletCard, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}
                >
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    onPress={() => setWalletSelections(prev => ({
                      ...prev,
                      [source.id]: { selected: !sel.selected, balance: sel.balance },
                    }))}
                  >
                    <View style={[styles.walletIconWrap, { backgroundColor: source.color + '22' }]}>
                      <MaterialCommunityIcons name={source.icon as any} size={22} color={source.color} />
                    </View>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>{source.name}</Text>
                    <MaterialCommunityIcons
                      name={sel.selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={22}
                      color={sel.selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                  {sel.selected && (
                    <TextInput
                      mode="outlined"
                      label="Current balance"
                      value={sel.balance}
                      onChangeText={(text) => setWalletSelections(prev => ({
                        ...prev,
                        [source.id]: { selected: true, balance: text },
                      }))}
                      keyboardType="decimal-pad"
                      left={<TextInput.Affix text={currencySymbol} />}
                      style={{ marginTop: 10, backgroundColor: theme.custom.cardBg }}
                      outlineStyle={{ borderRadius: 14 }}
                    />
                  )}
                </View>
              );
            })}

            {pendingCustomSources.map((cs, i) => (
              <View
                key={`custom-${i}`}
                style={[styles.walletCard, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.walletIconWrap, { backgroundColor: '#6b728022' }]}>
                    <MaterialCommunityIcons name="wallet-outline" size={22} color="#6b7280" />
                  </View>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>{cs.name}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {currencySymbol}{parseFloat(cs.balance || '0').toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            {!showAddCustom ? (
              <TouchableOpacity
                style={[styles.addTxBtn, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}
                onPress={() => setShowAddCustom(true)}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={theme.colors.primary} />
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Add Custom Wallet</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addForm, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>Custom Wallet</Text>
                <TextInput
                  mode="outlined"
                  label="Wallet name"
                  value={customName}
                  onChangeText={setCustomName}
                  style={{ marginBottom: 10, backgroundColor: theme.custom.cardBg }}
                  outlineStyle={{ borderRadius: 14 }}
                />
                <TextInput
                  mode="outlined"
                  label="Current balance"
                  value={customBalance}
                  onChangeText={setCustomBalance}
                  keyboardType="decimal-pad"
                  left={<TextInput.Affix text={currencySymbol} />}
                  style={{ backgroundColor: theme.custom.cardBg }}
                  outlineStyle={{ borderRadius: 14 }}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.addFormBtn, { backgroundColor: theme.colors.surfaceVariant, flex: 1 }]}
                    onPress={() => { setShowAddCustom(false); setCustomName(''); setCustomBalance(''); }}
                  >
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addFormBtn, { backgroundColor: theme.colors.primary, flex: 1, boxShadow: glassShadow(theme, 'sm') as any }]}
                    onPress={handleAddCustomWallet}
                  >
                    <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: glassShadow(theme, 'sm') as any }]}
            onPress={handleWalletsContinue}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'transactions' && (
        <View style={styles.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              Add Recent Expenses
            </Text>
            <TouchableOpacity onPress={() => setStep('pin')}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Skip</Text>
            </TouchableOpacity>
          </View>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            Add any recent spending, or skip for now.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {addedExpenses.map((exp, i) => (
              <View
                key={i}
                style={[styles.txItem, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}
              >
                <View style={[styles.txIconWrap, { backgroundColor: exp.categoryColor + '22' }]}>
                  <MaterialCommunityIcons name={exp.categoryIcon as any} size={18} color={exp.categoryColor} />
                </View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                  {exp.categoryName}
                </Text>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  {currencySymbol}{exp.amount.toFixed(2)}
                </Text>
              </View>
            ))}

            {!isAddingTx ? (
              <TouchableOpacity
                style={[styles.addTxBtn, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}
                onPress={() => setIsAddingTx(true)}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={theme.colors.primary} />
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Add Expense</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addForm, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}>
                <TextInput
                  mode="outlined"
                  label="Amount"
                  value={txAmount}
                  onChangeText={setTxAmount}
                  keyboardType="numeric"
                  left={<TextInput.Affix text={currencySymbol} />}
                  style={{ marginBottom: 12, backgroundColor: theme.custom.cardBg }}
                  outlineStyle={{ borderRadius: 14 }}
                />

                <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                  Category
                </Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => {
                    const isSelected = cat.id === txCategoryId;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryGridItem,
                          {
                            backgroundColor: isSelected ? cat.color + '22' : theme.custom.glassBg,
                            borderWidth: 1,
                            borderColor: isSelected ? cat.color + '55' : theme.custom.glassBorder,
                            boxShadow: isSelected ? (glassShadow(theme, 'sm') as any) : undefined,
                          },
                        ]}
                        onPress={() => setTxCategoryId(cat.id)}
                      >
                        <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                        <Text
                          variant="labelSmall"
                          numberOfLines={1}
                          style={{ color: theme.colors.onSurface, marginTop: 4, textAlign: 'center' }}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.addFormBtn, { backgroundColor: theme.colors.surfaceVariant, flex: 1 }]}
                    onPress={() => {
                      setIsAddingTx(false);
                      setTxAmount('');
                      setTxCategoryId(null);
                    }}
                  >
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addFormBtn, { backgroundColor: theme.colors.primary, flex: 1, boxShadow: glassShadow(theme, 'sm') as any }]}
                    onPress={handleAddExpense}
                  >
                    <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: glassShadow(theme, 'sm') as any }]}
            onPress={() => setStep('pin')}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'pin' && (
        <PINPad
          title="Create Your PIN"
          subtitle="Set a 6-digit PIN to secure your data"
          onComplete={handlePinFirst}
          maxLength={6}
        />
      )}

      {step === 'confirm-pin' && (
        <PINPad
          title="Confirm Your PIN"
          subtitle="Enter the same PIN again to confirm"
          onComplete={handlePinConfirm}
          maxLength={6}
        />
      )}

      <PremiumModal
        visible={showPremium}
        userId={user?.uid ?? ''}
        userEmail={user?.email ?? ''}
        onSubscribeSuccess={() => { setShowPremium(false); router.replace('/(tabs)'); }}
        onDismiss={handlePremiumDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  btn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  addForm: {
    borderRadius: 18,
    padding: 16,
  },
  addFormBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryGridItem: {
    width: '22%' as any,
    aspectRatio: 0.9,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  walletCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  walletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
