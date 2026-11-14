import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

// Reaction levels match the backend: dislike / like / very_like.
const REACTIONS = [
  { type: 'dislike', label: '👎', name: 'Dislike' },
  { type: 'like', label: '👍', name: 'Like' },
  { type: 'very_like', label: '🔥', name: 'Very like' },
];

const IMAGE_COLORS = ['#4C1D95', '#0E7490', '#9D174D', '#166534'];

function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / (60 * 24))}d`;
}

export default function PostCard({ post }) {
  // Local state only for now; this will become PUT/DELETE /posts/:id/reaction.
  const [myReaction, setMyReaction] = useState(post.my_reaction);
  const [playing, setPlaying] = useState(false);   // UI only, no real audio yet

  const countFor = (type) => {
    const base = (post.reactions[type] || 0) - (post.my_reaction === type ? 1 : 0);
    return base + (myReaction === type ? 1 : 0);
  };

  const onReact = (type) => setMyReaction((cur) => (cur === type ? null : type));

  const { author } = post;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{author.display_name[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{author.display_name}</Text>
          <Text style={styles.muted}>@{author.username} · {timeAgo(post.created_at)}</Text>
        </View>
      </View>

      {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

      {post.image_url ? (
        <View style={[styles.image, { backgroundColor: IMAGE_COLORS[Number(post.id) % IMAGE_COLORS.length] }]}>
          <Text style={styles.imageNote}>image</Text>
        </View>
      ) : null}

      {post.audio_url || post.song ? (
        <Pressable
          style={styles.audio}
          onPress={() => post.audio_url && setPlaying((p) => !p)}
          accessibilityLabel={playing ? 'Pause clip' : 'Play clip'}
        >
          {post.audio_url ? <Text style={styles.play}>{playing ? '❚❚' : '▶'}</Text> : <Text style={styles.play}>♪</Text>}
          <View style={{ flex: 1 }}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {post.song ? post.song.title : 'Audio clip'}
            </Text>
            <Text style={styles.muted} numberOfLines={1}>
              {post.song ? post.song.artist : `by ${author.display_name}`}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        {REACTIONS.map((r) => {
          const active = myReaction === r.type;
          return (
            <Pressable
              key={r.type}
              onPress={() => onReact(r.type)}
              style={[styles.pill, active && styles.pillActive]}
              accessibilityLabel={r.name}
            >
              <Text style={styles.pillText}>{r.label} {countFor(r.type)}</Text>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Text style={styles.muted}>💬 {post.comment_count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  name: { color: colors.text, fontWeight: '600', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 13 },
  body: { color: colors.text, fontSize: 15, lineHeight: 21, marginBottom: spacing.md },
  image: {
    height: 180, borderRadius: 12, marginBottom: spacing.md,
    alignItems: 'center', justifyContent: 'center',
  },
  imageNote: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  audio: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentSoft,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
  },
  play: { color: colors.text, fontSize: 18, width: 32 },
  songTitle: { color: colors.text, fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm,
  },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pillText: { color: colors.text, fontSize: 13 },
});
