import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1B4F8A',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#F8F9FA' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, headerBackTitle: 'Accounts' }} />
        <Stack.Screen name="new-recap" options={{ title: 'New Recap', presentation: 'modal' }} />
        <Stack.Screen name="review/[id]" options={{ title: 'Review Memory' }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Account' }} />
        <Stack.Screen name="meeting/[id]" options={{ title: 'Meeting Prep' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
