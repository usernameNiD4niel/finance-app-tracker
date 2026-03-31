import React, { useState, useEffect } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { runSync } from '../../services/syncEngine';
import { refreshAllStores } from '../../store';
import { seedCategories, seedMoneySources } from '../../db/migrations';
import { sqlite } from '../../db/client';
import type { AppTheme } from '../../theme';

export default function CloudAuthModal() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { signInWithEmail, registerWithEmail, handleGoogleIdToken, user, isAuthenticated } = useAuthStore();
  const { setCloudSyncEnabled, setFirebaseUid, setLastSyncedAt } = useSettingsStore();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasNavigatedRef = React.useRef(false);

  // If user is already authenticated, close the modal (guards against double navigation)
  useEffect(() => {
    if (isAuthenticated && user && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated]);

  async function handleGoogleSignIn() {
    Alert.alert(
      'Google Sign-In Unavailable',
      'Google Sign-In requires a development build. Please use email/password to sign in.',
    );
  }

  async function handleEmailAuth() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password);
      }
      await onSignInSuccess();
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSignInSuccess() {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) return;
    await setCloudSyncEnabled(true);
    await setFirebaseUid(uid);

    // Claim any rows created before this user was authenticated (e.g., during onboarding)
    const USER_TABLES = [
      'categories', 'expenses', 'bills', 'money_sources',
      'recurring_transactions', 'transfers', 'lends', 'targets', 'category_targets',
    ];
    for (const table of USER_TABLES) {
      sqlite.runSync(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [uid]);
    }

    // Sync: pull user's cloud data, then push any local pending rows
    runSync(uid)
      .then(async (result) => {
        if (result.pulled > 0) await refreshAllStores();
        // Seed default categories/sources if this user has none yet (new device)
        seedCategories(uid);
        seedMoneySources(uid);
        await setLastSyncedAt(new Date().toISOString());
      })
      .catch(console.warn);
    // If there's a screen to go back to (opened from settings), go back.
    // Otherwise (opened as auth gate from lock screen), go to main app.
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  }

  function friendlyError(e: any): string {
    const code: string = e?.code ?? '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'Incorrect email or password.';
    if (code === 'auth/email-already-in-use') return 'An account with this email already exists.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/network-request-failed') return 'No internet connection. Please try again.';
    return e?.message ?? 'Something went wrong. Please try again.';
  }

  const bg = theme.colors.background;
  const card = theme.custom.cardBg;
  const primary = theme.colors.primary;
  const onSurface = theme.colors.onSurface;
  const muted = theme.colors.onSurfaceVariant;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header — only show close button when there's somewhere to go back */}
        {router.canGoBack() && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={24} color={onSurface} />
          </TouchableOpacity>
        )}

        <MaterialCommunityIcons name="cloud-sync" size={52} color={primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text variant="headlineSmall" style={[styles.title, { color: onSurface }]}>
          {mode === 'signin' ? 'Sign In to Sync' : 'Create Account'}
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: muted }]}>
          Back up your data and access it from any device
        </Text>

        {/* Google Sign-In */}
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: card, borderColor: theme.colors.outline }]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
          <Text variant="bodyLarge" style={{ color: onSurface, marginLeft: 10, fontWeight: '600' }}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
          <Text variant="bodySmall" style={{ color: muted, marginHorizontal: 12 }}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
        </View>

        {/* Email / Password */}
        <View style={[styles.inputWrapper, { backgroundColor: card, borderColor: theme.colors.outline }]}>
          <MaterialCommunityIcons name="email-outline" size={18} color={muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: onSurface }]}
            onChangeText={setEmail}
            value={email}
            placeholder="Email address"
            placeholderTextColor={muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={[styles.inputWrapper, { backgroundColor: card, borderColor: theme.colors.outline }]}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={muted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: onSurface }]}
            onChangeText={setPassword}
            value={password}
            placeholder="Password"
            placeholderTextColor={muted}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {mode === 'register' && (
          <View style={[styles.inputWrapper, { backgroundColor: card, borderColor: theme.colors.outline }]}>
            <MaterialCommunityIcons name="lock-check-outline" size={18} color={muted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: onSurface }]}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={muted}
              secureTextEntry
              editable={!loading}
            />
          </View>
        )}

        {error && (
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleEmailAuth}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text variant="bodyLarge" style={{ color: '#fff', fontWeight: '700' }}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(null); }} disabled={loading}>
          <Text variant="bodyMedium" style={[styles.toggleText, { color: primary }]}>
            {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 },
  closeBtn: { position: 'absolute', top: 16, right: 20, padding: 8 },
  title: { textAlign: 'center', fontWeight: '700', marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: 32 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  errorText: { textAlign: 'center', marginBottom: 12 },
  submitBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 15,
    borderRadius: 14, marginTop: 4, marginBottom: 16,
  },
  toggleText: { textAlign: 'center', paddingVertical: 8 },
});
