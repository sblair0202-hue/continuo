import { useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '../src/context/AuthContext';

function RootNavigator() {
  const { user, isLoading, needsBiometricUnlock } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const seg0 = segments[0] as string | undefined;
    const inAuth = seg0 === 'sign-in' || seg0 === 'biometric-unlock';

    if (!user && !inAuth) {
      router.replace('/sign-in');
    } else if (user && needsBiometricUnlock && seg0 !== 'biometric-unlock') {
      router.replace('/biometric-unlock');
    } else if (user && !needsBiometricUnlock && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, needsBiometricUnlock, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF9F7', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#9E9A94" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1B4F8A',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#F8F9FA' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="biometric-unlock" options={{ headerShown: false }} />
      <Stack.Screen name="new-recap" options={{ title: 'New Recap', presentation: 'modal' }} />
      <Stack.Screen name="review/[id]" options={{ title: 'Review Memory' }} />
      <Stack.Screen name="account/[id]" options={{ title: 'Account', headerBackTitle: 'Back' }} />
      <Stack.Screen name="meeting/[id]" options={{ title: 'Meeting Prep' }} />
      <Stack.Screen name="referral-guide" options={{ title: 'Referral Guide', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <RootNavigator />
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
