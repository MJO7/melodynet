import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

// Placeholder so the tab never renders an undefined component. The real Explore
// screen (Newest / Trending / Recommended, plus the search bar) goes here.
export function ExploreScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.heading}>Discovery is on its way</Text>
        <Text style={styles.muted}>
          Newest, Trending and Recommended feeds, plus search across posts, songs and artists.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  heading: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  muted: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
