// Placeholder data for the home feed. Each post has the same shape the backend
// returns from GET /posts/:id (author, reactions, my_reaction, comment_count),
// so swapping in real API calls later only means replacing this import.
// `song` is extra display info; the API currently only returns song_id.
// image_url / song.cover_url can be a local image (mock) or a URL string (real API).
import { covers } from './covers';

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();

// Usernames the signed-in (mock) user follows, used by the "Following" tab.
export const FOLLOWING = ['maya', 'jon'];

export const mockPosts = [
  {
    id: '1',
    author: { username: 'maya', display_name: 'Maya Chen', avatar_url: null },
    body: 'This bridge hits different at 2am. Anyone else replaying it on loop?',
    song: { title: 'Midnight City', artist: 'M83', cover_url: covers.midnight },
    image_url: null,
    audio_url: 'mock://clip1',
    created_at: minutesAgo(8),
    comment_count: 12,
    reactions: { like: 18, very_like: 9, dislike: 1 },
    my_reaction: null,
  },
  {
    id: '2',
    author: { username: 'jon', display_name: 'Jon', avatar_url: null },
    body: 'Caught this live last night. Still got goosebumps.',
    song: { title: 'Pink + White', artist: 'Frank Ocean', cover_url: covers.pinkwhite },
    image_url: covers.stage,
    audio_url: null,
    created_at: minutesAgo(55),
    comment_count: 4,
    reactions: { like: 7, very_like: 3 },
    my_reaction: 'like',
  },
  {
    id: '3',
    author: { username: 'cindy', display_name: 'Cindy Lin', avatar_url: null },
    body: 'Study playlist starter pack. Drop your favorites below.',
    song: { title: 'Weightless', artist: 'Marconi Union', cover_url: covers.weightless },
    image_url: null,
    audio_url: 'mock://clip3',
    created_at: minutesAgo(190),
    comment_count: 31,
    reactions: { like: 44, very_like: 27, dislike: 3 },
    my_reaction: 'very_like',
  },
  {
    id: '4',
    author: { username: 'dev_beats', display_name: 'Dev', avatar_url: null },
    body: 'New loop I made today. Feedback welcome!',
    song: null,
    image_url: null,
    audio_url: 'mock://clip4',
    created_at: minutesAgo(60 * 26),
    comment_count: 2,
    reactions: { like: 5 },
    my_reaction: null,
  },
];
