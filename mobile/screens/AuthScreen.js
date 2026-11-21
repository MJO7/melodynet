import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login, signup } from '../lib/api';
import { colors, spacing } from '../theme';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign in / sign up. Rendered full-screen by App.js when there is no session and
// the user asks to authenticate; `onCancel` returns them to the public feed.
export function AuthScreen({ onLogin, onCancel }) {
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  // Mirrors the backend's own rules so obvious mistakes never reach the network.
  function validate() {
    if (isSignup) {
      if (!USERNAME_RE.test(username.trim().toLowerCase())) {
        return 'Username must be 3-20 characters: a-z, 0-9, underscore.';
      }
      if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (displayName.trim().length > 50) return 'Display name must be 50 characters or fewer.';
    } else {
      if (!identifier.trim()) return 'Enter your username or email.';
      if (!password) return 'Enter your password.';
    }
    return null;
  }

  async function submit() {
    if (busy) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const data = isSignup
        ? await signup({
            username: username.trim().toLowerCase(),
            email: email.trim(),
            password,
            ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
          })
        : await login(identifier.trim(), password);
      onLogin({ token: data.token, user: data.user });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
    setPassword('');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {onCancel ? (
            <Pressable onPress={onCancel} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>← Back to feed</Text>
            </Pressable>
          ) : null}

          <Text style={styles.logo}>♪ MelodyNet</Text>
          <Text style={styles.tagline}>
            {isSignup ? 'Create an account to post and react.' : 'Welcome back.'}
          </Text>

          <View style={styles.toggle}>
            {[
              ['login', 'Log in'],
              ['signup', 'Sign up'],
            ].map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => switchMode(key)}
                style={[styles.toggleItem, mode === key && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, mode === key && styles.toggleTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {isSignup ? (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="lowercase, 3-20 characters"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Optional"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                maxLength={50}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Username or email</Text>
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="maya or maya@example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />
            </>
          )}

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={isSignup ? 'at least 8 characters' : 'your password'}
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submit,
              (busy || pressed) && styles.submitDim,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{isSignup ? 'Create account' : 'Log in'}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => switchMode(isSignup ? 'login' : 'signup')}>
            <Text style={styles.switchHint}>
              {isSignup ? 'Already have an account? Log in' : 'New here? Create an account'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cancel: { marginBottom: spacing.lg },
  cancelText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  logo: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  tagline: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    padding: 3,
  },
  toggleItem: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 999 },
  toggleActive: { backgroundColor: colors.accent },
  toggleText: { color: colors.muted, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: '#FF6B6B', marginTop: spacing.md, lineHeight: 19 },
  submit: {
    marginTop: spacing.xl,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  submitDim: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  switchHint: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 13,
  },
});
