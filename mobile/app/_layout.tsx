import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts as useHanken,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import { useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { OrbProvider } from '../src/context/OrbContext';
import { Colors } from '../src/constants/colors';

function RootNavigator() {
  const { user, isLoading, needsBiometricUnlock } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const seg0 = segments[0] as string | undefined;
    const inAuth = seg0 === 'sign-in' || seg0 === 'biometric-unlock' || seg0 === 'auth';

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
      <View style={{ flex: 1, backgroundColor: Colors.paper, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.sky} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.sky,
        headerTitleStyle: { fontFamily: 'HankenGrotesk_600SemiBold', color: Colors.ink },
        contentStyle: { backgroundColor: Colors.paper },
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
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useHanken({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    Newsreader_400Regular_Italic,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.paper, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.sky} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <OrbProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <RootNavigator />
        </GestureHandlerRootView>
      </OrbProvider>
    </AuthProvider>
  );
}
