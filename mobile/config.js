// Where the backend lives.
//
// The default works for `npx expo start --web` and the iOS simulator, where the
// app and the API share the same machine. On a physical phone "localhost" means
// the phone itself, so start Expo with your machine's LAN address instead:
//
//   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start
//
// (Windows PowerShell: $env:EXPO_PUBLIC_API_URL="http://192.168.1.20:3000"; npx expo start)
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
