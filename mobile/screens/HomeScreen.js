import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../components/PostCard';
import { SignInButton } from '../components/SignInButton';
import { mockPosts, FOLLOWING } from '../data/mockPosts';
import { colors, spacing } from '../theme';

const FEED_TABS = ['Newest', 'Trending', 'Following'];

// Home feed. Uses mock data for now; later, load posts from the backend here.
export function HomeScreen({ signedIn = false, onSignIn }) {
  const [feedTab, setFeedTab] = useState('Newest');

  const total = (p) => Object.values(p.reactions).reduce((a, b) => a + b, 0);

  let posts = [...mockPosts];
  if (feedTab === 'Newest') posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (feedTab === 'Trending') posts.sort((a, b) => total(b) - total(a));
  if (feedTab === 'Following') posts = posts.filter((p) => FOLLOWING.includes(p.author.username));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>♪ MelodyNet</Text>
        {signedIn ? null : <SignInButton onPress={onSignIn} />}
      </View>

      <View style={styles.tabs}>
        {FEED_TABS.map((t) => (
          <Pressable key={t} onPress={() => setFeedTab(t)} style={[styles.tab, feedTab === t && styles.tabActive]}>
            <Text style={[styles.tabText, feedTab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing here yet. Follow some people to fill this up.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
    marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48 },
});
