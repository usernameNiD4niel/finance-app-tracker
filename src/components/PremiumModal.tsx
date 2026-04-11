import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { Text, useTheme, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { BlurView } from 'expo-blur';
import { glassShadow } from '@/theme/glass';
import { useSettingsStore } from '@/store/settingsStore';
import { activatePremiumInFirestore } from '@/services/subscription';
import type { AppTheme } from '@/theme';

const SERVER_URL = 'https://snowy-truth-4248.addressnidaniel2.workers.dev';


const FEATURES = [
  {
    icon: 'hand-coin' as const,
    title: 'Lend Tracking',
    desc: 'Track money lent to others and get paid back',
  },
  {
    icon: 'chart-line' as const,
    title: 'Graph Reports',
    desc: 'Visual expense analysis on your stats page',
  },
  {
    icon: 'palette-outline' as const,
    title: 'Custom Theme Colors',
    desc: 'Unlock accent colors to personalize the app',
  },
  {
    icon: 'bullseye-arrow' as const,
    title: 'Budget Targets',
    desc: 'Set monthly spending limits per category',
  },
  {
    icon: 'repeat' as const,
    title: 'Recurring Transactions',
    desc: 'Automate deposits and withdrawals in your wallets',
  },
];

interface Props {
  visible: boolean;
  userId: string;
  userEmail: string;
  onSubscribeSuccess: () => void;
  onDismiss: () => void;
}

export function PremiumModal({ visible, userId, userEmail, onSubscribeSuccess, onDismiss }: Props) {
  const theme = useTheme<AppTheme>();
  const { initPaymentSheet, presentPaymentSheet, resetPaymentSheetCustomer } = useStripe();
  const { setPremium, setStripeCustomerId, setSubscriptionStatus } = useSettingsStore();
  const [loading, setLoading] = useState(false);

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!loading) onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, loading, onDismiss]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. Request subscription from backend
      const res = await fetch(`${SERVER_URL}/api/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Server error');
      }

      const { clientSecret, customerId, subscriptionId } = await res.json();

      // 2. Clear any cached customer session from a previous account
      await resetPaymentSheetCustomer();

      // 3. Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Ledgerist',
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

      // 4. Present payment sheet to user
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') {
          Alert.alert('Payment failed', payError.message);
        }
        return;
      }

      // 5. Activate premium locally and in Firestore
      await setPremium(true);
      await setStripeCustomerId(customerId);
      await setSubscriptionStatus('active');
      await activatePremiumInFirestore(userId, customerId, subscriptionId);

      onSubscribeSuccess();
    } catch (e: any) {
      Alert.alert('Payment failed', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.overlay}>
        <View style={[styles.cardOuter, { boxShadow: glassShadow(theme, 'lg') as any }]}>
          <BlurView intensity={65} tint={theme.custom.glassTint} style={styles.cardBlur}>
        <View style={[styles.card, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder }]}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.colors.primary + '22', borderWidth: 1, borderColor: theme.colors.primary + '40' },
            ]}
          >
            <MaterialCommunityIcons name="crown" size={44} color={theme.colors.primary} />
          </View>

          <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onSurface }]}>
            Go Premium
          </Text>

          <View style={styles.priceRow}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>
              $0.90
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              /month
            </Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View
                key={f.icon}
                style={[
                  styles.featureRow,
                  {
                    backgroundColor: theme.custom.glassBg,
                    borderWidth: 1,
                    borderColor: theme.custom.glassBorder,
                  },
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                  <MaterialCommunityIcons name={f.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                    {f.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.subscribeBtn,
              {
                backgroundColor: loading ? theme.colors.primary + '88' : theme.colors.primary,
                boxShadow: glassShadow(theme, 'sm') as any,
              },
            ]}
            onPress={handleSubscribe}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText, fontWeight: '700' }}>
              {loading ? 'Processing…' : 'Subscribe Now'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onDismiss} activeOpacity={0.7} disabled={loading}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
          </BlurView>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardOuter: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardBlur: {
    flex: 1,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontWeight: '800',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  features: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
});
