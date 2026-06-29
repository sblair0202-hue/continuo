import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function AuthCallbackScreen() {
  const { token, user_id, display_name, role, error } =
    useLocalSearchParams<{ token?: string; user_id?: string; display_name?: string; role?: string; error?: string }>();
  const { loginWithToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function handle() {
      if (error || !token) {
        router.replace('/sign-in');
        return;
      }
      try {
        await loginWithToken(token, user_id ?? '', display_name ?? '', role ?? 'standard');
        router.replace('/(tabs)');
      } catch {
        router.replace('/sign-in');
      }
    }
    handle();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.paper, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.sky} />
    </View>
  );
}
