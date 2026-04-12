import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Text, useTheme, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { onSnapshot, doc } from 'firebase/firestore';
import { firestore } from '@/services/firebase';
import { syncPremiumFromFirestore } from '@/services/subscription';
import { neuButton, neuCard } from '@/theme/neumorphism';
import { useSettingsStore } from '@/store/settingsStore';
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
    icon: 'export' as const,
    title: 'Export Data',
    desc: 'Export your transactions as CSV or JSON',
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
  const { setPremium, setLsCustomerId, setSubscriptionStatus } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const successHandled = useRef(false);

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showWebView) {
        setShowWebView(false);
        return true;
      }
      if (!loading) onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, loading, showWebView, onDismiss]);

  // Firestore real-time listener — active while WebView is open.
  // Fires automatically when the webhook updates isPremium: true.
  useEffect(() => {
    if (!showWebView || !userId) return;

    successHandled.current = false;
    const ref = doc(firestore, 'users', userId, 'profile', 'subscription');
    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists() || successHandled.current) return;
      const data = snap.data();
      if (data?.isPremium === true) {
        successHandled.current = true;
        unsub();
        await setPremium(true);
        if (data.subscriptionStatus) await setSubscriptionStatus(data.subscriptionStatus);
        if (data.lsCustomerId) await setLsCustomerId(data.lsCustomerId);
        setShowWebView(false);
        setCheckoutUrl(null);
        onSubscribeSuccess();
      }
    });

    return () => unsub();
  }, [showWebView, userId]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? 'Server error');
      }

      const { checkoutUrl: url } = await res.json();
      setCheckoutUrl(url);
      setShowWebView(true);
    } catch (e: any) {
      Alert.alert('Could not open checkout', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const isPremium = await syncPremiumFromFirestore(userId);
      if (isPremium) {
        setShowWebView(false);
        onSubscribeSuccess();
      } else {
        Alert.alert('No subscription found', 'No active subscription was found. If you just paid, wait a moment and try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach the server. Check your connection and try again.');
    } finally {
      setRestoring(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Checkout WebView modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <SafeAreaView style={[styles.webViewContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.webViewHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
            <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.webViewCloseBtn}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Complete Purchase
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <WebView
            source={{ uri: checkoutUrl! }}
            style={{ flex: 1 }}
            onNavigationStateChange={(navState) => {
              // Secondary success signal: LS redirects to the app scheme after payment
              if (navState.url.startsWith('ledgerist://payment-success') && !successHandled.current) {
                setShowWebView(false);
                // The Firestore onSnapshot listener handles the actual state update
              }
            }}
          />

          <TouchableOpacity
            style={[styles.restoreBtn, { borderTopColor: theme.colors.outlineVariant }]}
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
          >
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {restoring ? 'Checking…' : "I've already paid · Restore Purchase"}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Main premium card */}
      <Portal>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: theme.custom.cardBg }]}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: theme.colors.primary + '18',
                  boxShadow: neuCard(theme) as any,
                },
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
                      backgroundColor: theme.colors.background,
                      boxShadow: neuCard(theme) as any,
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
                  boxShadow: neuButton(theme) as any,
                },
              ]}
              onPress={handleSubscribe}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text variant="labelLarge" style={{ color: theme.custom.buttonText, fontWeight: '700' }}>
                {loading ? 'Opening checkout…' : 'Subscribe Now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={onDismiss} activeOpacity={0.7} disabled={loading}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Portal>
    </>
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
  webViewContainer: {
    flex: 1,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webViewCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
