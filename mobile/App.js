import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './screens/HomeScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { AuthScreen } from './screens/AuthScreen';
import { PostScreen } from './screens/PostScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { getSession, saveSession } from './lib/session';
import { colors, spacing } from './theme';

// Bottom navigation. Home and Profile are built; Explore and Post are placeholders.
const TABS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'explore', label: 'Explore', icon: '⌕' },
  { key: 'post', label: 'Post', icon: '＋' },
  { key: 'profile', label: 'Profile', icon: '☻' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [session, setSession] = useState(getSession());
  const [showAuth, setShowAuth] = useState(false);

  const signedIn = Boolean(session);

  function handleLogin(next) {
    saveSession(next);
    setSession(next);
    setShowAuth(false);
  }

  // Signing in is optional: the feed is public, so auth covers the app only while
  // the user is actually authenticating.
  if (showAuth) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthScreen onLogin={handleLogin} onCancel={() => setShowAuth(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.content}>
          {tab === 'home' ? (
            <HomeScreen signedIn={signedIn} onSignIn={() => setShowAuth(true)} />
          ) : tab === 'profile' ? (
            <ProfileScreen signedIn={signedIn} onSignIn={() => setShowAuth(true)} />
          ) : tab === 'explore' ? (
            <ExploreScreen />
          ) : tab === 'post' ? (
            <PostScreen signedIn={signedIn} onSignIn={() => setShowAuth(true)} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Coming soon</Text>
            </View>
          )}
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bar}>
          <View style={styles.barRow}>
            {TABS.map((t) => (
              <Pressable key={t.key} style={styles.barItem} onPress={() => setTab(t.key)}>
                <Text style={[styles.barIcon, tab === t.key && styles.barActive]}>{t.icon}</Text>
                <Text style={[styles.barLabel, tab === t.key && styles.barActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.muted, fontSize: 16 },
  bar: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  barRow: { flexDirection: 'row', paddingVertical: spacing.sm },
  barItem: { flex: 1, alignItems: 'center' },
  barIcon: { color: colors.muted, fontSize: 20 },
  barLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  barActive: { color: colors.accent },
});
