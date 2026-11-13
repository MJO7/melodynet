import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { AuthScreen } from './src/mobile/screens/auth-screen';
import { ExploreScreen } from './src/mobile/screens/explore-screen';
import { ProfileScreen } from './src/mobile/screens/profile-screen';
import { NavigationBar } from './src/mobile/components/navigation-bar';

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('Explore');

  // Show login screen if not authenticated
  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  // Display selected screen
  return (
    <View style={s.container}>
      <View style={s.content}>
        {screen === 'Profile' ? (
          <ProfileScreen />
        ) : (
          <ExploreScreen />
        )}
      </View>

      <NavigationBar
        active={screen}
        onNavigate={setScreen}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});
