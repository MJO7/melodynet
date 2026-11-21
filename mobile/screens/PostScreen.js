import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignInButton } from '../components/SignInButton';
import { colors, spacing } from '../theme';

// Placeholder for the composer. It already reflects the real prerequisite —
// POST /posts requires a token — so the tab is useful before the form exists.
export function PostScreen({ signedIn = false, onSignIn }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>New post</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.heading}>
          {signedIn ? 'The composer is coming soon' : 'Sign in to share a post'}
        </Text>
        <Text style={styles.muted}>
          {signedIn
            ? 'Posting text, images and song clips from here is the next step.'
            : 'Creating a post requires an account.'}
        </Text>
        {signedIn ? null : (
          <View style={styles.action}>
            <SignInButton onPress={onSignIn} />
          </View>
        )}
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
  action: { marginTop: spacing.lg },
});
