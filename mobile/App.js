import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen, AuthScreen, ExploreScreen } from './screens/Screens';
import { ProfileScreen } from './screens/ProfileScreen';
import { colors, spacing } from './theme';

// Bottom navigation. Only Home is built so far; the rest show a placeholder
// until the Explore, Post and Profile screens exist.
const TABS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'explore', label: 'Explore', icon: '⌕' },
  { key: 'post', label: 'Post', icon: '＋' },
  { key: 'profile', label: 'Profile', icon: '☻' },
];

export default function App() {
  const [tab, setTab] = useState('home');

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.content}>
          {tab === 'home' ? (
            <HomeScreen />
          ) : tab === 'profile' ? (
            <ProfileScreen />
          ) : tab === 'explore' ? (
            <ExploreScreen />
          ) : tab === 'auth' ? (
            <AuthScreen onLogin={() => setTab('home')} />
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
