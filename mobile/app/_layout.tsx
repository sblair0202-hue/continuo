import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1B4F8A',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#F8F9FA' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Today' }} />
        <Stack.Screen name="new-recap" options={{ title: 'New Recap', presentation: 'modal' }} />
        <Stack.Screen name="review/[id]" options={{ title: 'Review Intelligence' }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Account' }} />
      </Stack>
    </>
  );
}
