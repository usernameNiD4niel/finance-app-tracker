import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { PINPad } from '../../components/PINPad';
import { SegmentedChips } from '../../components/ui/SegmentedChips';
import { useSettingsStore } from '../../store/settingsStore';
import { useSalaryStore } from '../../store/salaryStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/categoryStore';
import { hashPin } from '../../services/auth';
import { CURRENCIES } from '../../utils/currency';
import { PremiumModal } from '../../components/PremiumModal';
import { neuCardLg, neuButton, neuListItem, neuCard, neuChip } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';
import type { Category } from '../../db/schema';

type Step = 'welcome' | 'currency' | 'salary' | 'transactions' | 'pin' | 'confirm-pin';

export default function OnboardingScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { setCurrency, setPin, setOnboardingDone } = useSettingsStore();
  const { setSalary } = useSalaryStore();
  const { addExpense } = useExpenseStore();
  const { loadCategories, categories } = useCategoryStore();

  const [step, setStep] = useState<Step>('welcome');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [pinEntry, setPinEntry] = useState('');

  // Salary
  const [salaryMode, setSalaryMode] = useState<'once' | 'twice'>('once');
  const [salaryPeriod, setSalaryPeriod] = useState<'first' | 'fifteenth'>('first');
  const [salaryAmountFirst, setSalaryAmountFirst] = useState('');
  const [salaryAmountFifteenth, setSalaryAmountFifteenth] = useState('');

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

  const handlePremiumDone = () => {
    setShowPremium(false);
    router.replace('/(tabs)');
  };

  const handleSalaryContinue = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (salaryMode === 'once') {
      const amt = parseFloat(salaryAmountFirst);
      if (amt > 0) {
        await setSalary({ amount: amt, period: salaryPeriod, effectiveDate: today });
      }
    } else {
      const amtFirst = parseFloat(salaryAmountFirst);
      const amtFifteenth = parseFloat(salaryAmountFifteenth);
      if (amtFirst > 0) {
        await setSalary({ amount: amtFirst, period: 'first', effectiveDate: today });
      }
      if (amtFifteenth > 0) {
        await setSalary({ amount: amtFifteenth, period: 'fifteenth', effectiveDate: today });
      }
    }
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {step === 'welcome' && (
        <View style={styles.center}>
          <View style={[styles.logoWrap, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}>
            <MaterialCommunityIcons name="wallet" size={64} color={theme.colors.primary} />
          </View>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Finance Tracker
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12 }}>
            Track your expenses, manage bills, and stay on budget — all offline, all private.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
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
                      backgroundColor: isSelected ? theme.colors.primaryContainer : theme.custom.cardBg,
                      boxShadow: neuListItem(theme) as any,
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
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
            onPress={() => setStep('salary')}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'salary' && (
        <View style={styles.content}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Set Up Your Salary
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            How often do you get paid?
          </Text>

          <SegmentedChips
            chips={[
              { key: 'once', label: 'Once a month' },
              { key: 'twice', label: 'Twice a month' },
            ]}
            selectedKey={salaryMode}
            onSelect={(key) => setSalaryMode(key as 'once' | 'twice')}
          />

          <View style={{ marginTop: 20 }} />

          {salaryMode === 'once' && (
            <>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
                Pay period
              </Text>
              <SegmentedChips
                chips={[
                  { key: 'first', label: '1st – 14th' },
                  { key: 'fifteenth', label: '15th – End' },
                ]}
                selectedKey={salaryPeriod}
                onSelect={(key) => setSalaryPeriod(key as 'first' | 'fifteenth')}
              />
              <TextInput
                mode="outlined"
                label="Salary amount"
                value={salaryAmountFirst}
                onChangeText={setSalaryAmountFirst}
                keyboardType="numeric"
                left={<TextInput.Affix text={currencySymbol} />}
                style={{ marginTop: 16, backgroundColor: theme.custom.cardBg }}
                outlineStyle={{ borderRadius: 14 }}
              />
            </>
          )}

          {salaryMode === 'twice' && (
            <>
              <View style={[styles.salaryCard, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                  1st Period (1st – 14th)
                </Text>
                <TextInput
                  mode="outlined"
                  label="Amount"
                  value={salaryAmountFirst}
                  onChangeText={setSalaryAmountFirst}
                  keyboardType="numeric"
                  left={<TextInput.Affix text={currencySymbol} />}
                  style={{ backgroundColor: theme.custom.cardBg }}
                  outlineStyle={{ borderRadius: 14 }}
                />
              </View>
              <View style={[styles.salaryCard, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                  2nd Period (15th – End)
                </Text>
                <TextInput
                  mode="outlined"
                  label="Amount"
                  value={salaryAmountFifteenth}
                  onChangeText={setSalaryAmountFifteenth}
                  keyboardType="numeric"
                  left={<TextInput.Affix text={currencySymbol} />}
                  style={{ backgroundColor: theme.custom.cardBg }}
                  outlineStyle={{ borderRadius: 14 }}
                />
              </View>
            </>
          )}

          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
            onPress={handleSalaryContinue}
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
                style={[styles.txItem, { backgroundColor: theme.custom.cardBg, boxShadow: neuListItem(theme) as any }]}
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
                style={[styles.addTxBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}
                onPress={() => setIsAddingTx(true)}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={theme.colors.primary} />
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Add Expense</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addForm, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
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
                            backgroundColor: isSelected ? cat.color + '22' : theme.custom.cardBg,
                            boxShadow: isSelected ? (neuChip(theme) as any) : undefined,
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
                    style={[styles.addFormBtn, { backgroundColor: theme.colors.primary, flex: 1, boxShadow: neuButton(theme) as any }]}
                    onPress={handleAddExpense}
                  >
                    <Text variant="labelLarge" style={{ color: theme.custom.buttonText }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
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
        onSubscribe={handlePremiumDone}
        onDismiss={handlePremiumDone}
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
  salaryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
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
});
