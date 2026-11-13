import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export function ProfileScreen() {
  const user = {
    username: 'johndoe',
    name: 'John Doe',
    bio: 'Developer | Traveler | Photography enthusiast',
    avatar: 'https://i.pravatar.cc/300',
    followers: 1284,
    following: 356,
  };

  const posts = Array.from({ length: 9 }, (_, i) => `https://picsum.photos/400?random=${i}`);

  return (
    <ScrollView style={s.container}>
      <Text style={s.header}>Profile</Text>

      <View style={s.profile}>
        <Image source={{ uri: user.avatar }} style={s.avatar} />
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.muted}>@{user.username}</Text>
        <Text style={s.bio}>{user.bio}</Text>

        <View style={s.stats}>
          {[[posts.length, 'Posts'], [user.followers.toLocaleString(), 'Followers'], [user.following, 'Following']].map(([n, label]) => (
            <View key={label}>
              <Text style={s.number}>{n}</Text>
              <Text style={s.muted}>{label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.button}>
          <Text style={s.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.posts}>Posts</Text>
      <View style={s.grid}>
        {posts.map((uri, i) => (
          <Image key={i} source={{ uri }} style={s.post} />
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', padding: 18, borderBottomWidth: 1, borderColor: '#eee' },
  profile: { alignItems: 'center', padding: 22 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  name: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  muted: { color: '#888', marginTop: 4 },
  bio: { textAlign: 'center', marginTop: 12, color: '#444' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 25, alignItems: 'center' },
  number: { fontSize: 19, fontWeight: 'bold', textAlign: 'center' },
  button: { backgroundColor: '#171717', padding: 12, borderRadius: 9, width: '100%', alignItems: 'center', marginTop: 22 },
  buttonText: { color: '#fff', fontWeight: '600' },
  posts: { fontSize: 16, fontWeight: 'bold', padding: 16, borderTopWidth: 1, borderColor: '#eee' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  post: { width: '33.33%', aspectRatio: 1, borderWidth: 1, borderColor: '#fff' },
});
