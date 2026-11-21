import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../components/PostCard';
import { SignInButton } from '../components/SignInButton';
import { mockPosts, FOLLOWING } from '../data/mockPosts';
import { colors, spacing } from '../theme';

export function ProfileScreen({ signedIn = false, onSignIn }) {
  const [tab, setTab] = useState('Posts');

  const user = {
    username: mockPosts[0]?.author?.username || 'melody_maker',
    name: mockPosts[0]?.author?.display_name || 'Alex Rivera',
    bio: 'Synth enthusiast & bedroom producer 🎹✨',
    joined: 'September 2026',
    followers: 128,
  };

  const userPosts = mockPosts.filter(
    p => p.author.username === user.username
  );

  const posts = tab === 'Posts' ? userPosts : mockPosts.slice(0, 2);

  const stats = [
    [userPosts.length, 'Posts'],
    [user.followers, 'Followers'],
    [FOLLOWING.length, 'Following'],
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={p => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Profile</Text>
              {signedIn ? (
                <Pressable style={styles.moreButton}>
                  <Text style={styles.more}>•••</Text>
                </Pressable>
              ) : (
                <SignInButton onPress={onSignIn} />
              )}
            </View>

            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0)}
                </Text>
              </View>

              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.username}>@{user.username}</Text>
              <Text style={styles.bio}>{user.bio}</Text>

              <Text style={styles.joined}>
                Joined {user.joined}
              </Text>

              <View style={styles.stats}>
                {stats.map(([value, label]) => (
                  <View key={label} style={styles.stat}>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.editButton}>
                <Text style={styles.editText}>Edit Profile</Text>
              </Pressable>
            </View>

            <View style={styles.tabs}>
              {['Posts', 'Liked'].map(t => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, tab === t && styles.activeTab]}
                >
                  <Text style={[
                    styles.tabText,
                    tab === t && styles.activeText,
                  ]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'Posts' ? 'No posts yet.' : 'No liked posts yet.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  moreButton: { padding: 8 },
  more: { color: colors.text, fontSize: 20, fontWeight: '800' },

  profile: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: '#fff', fontSize: 38, fontWeight: '800' },

  name: { color: colors.text, fontSize: 21, fontWeight: '800' },
  username: { color: colors.muted, marginTop: 4 },
  bio: {
    color: colors.text,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.md,
  },
  joined: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },

  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: spacing.lg,
  },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 19, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },

  editButton: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  editText: { color: '#fff', fontWeight: '800' },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  activeTab: { borderBottomWidth: 2, borderColor: colors.accent },
  tabText: { color: colors.muted, fontWeight: '600' },
  activeText: { color: colors.accent },

  empty: { color: colors.muted, textAlign: 'center', marginTop: 48 },
});
