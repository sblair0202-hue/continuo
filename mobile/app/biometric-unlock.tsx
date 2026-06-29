import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../src/context/AuthContext';

export default function BiometricUnlockScreen() {
  const { user, unlockWithBiometric, skipBiometric } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'biometric'>('biometric');

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then(types => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      }
    });
    // Prompt immediately on mount
    handleUnlock();
  }, []);

  async function handleUnlock() {
    setError('');
    const success = await unlockWithBiometric();
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError('Biometric unlock failed. Try again or use your password.');
    }
  }

  const icon = biometricType === 'face' ? '🔒' : biometricType === 'fingerprint' ? '👆' : '🔒';
  const label = biometricType === 'face' ? 'Face ID' : biometricType === 'fingerprint' ? 'Touch ID' : 'Biometric unlock';

  return (
    <View style={s.screen}>
      <View style={s.inner}>
        <Text style={s.wordmark}>Continuo</Text>
        <Text style={s.welcome}>Welcome back{user?.display_name ? `, ${user.display_name}` : ''}</Text>

        <TouchableOpacity style={s.iconWrap} onPress={handleUnlock} activeOpacity={0.7}>
          <Text style={s.icon}>{icon}</Text>
        </TouchableOpacity>

        <Text style={s.hint}>Tap to unlock with {label}</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.altBtn} onPress={skipBiometric} activeOpacity={0.7}>
          <Text style={s.altText}>Use password instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const C = {
  bg: '#FAF9F7',
  ink: '#383530',
  ink2: '#6E6A63',
  ink3: '#9E9A94',
  muted: '#B0ABA4',
  blue: '#3A72C8',
  red: '#C94530',
};

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  inner:    { alignItems: 'center', paddingHorizontal: 40 },
  wordmark: { fontSize: 30, fontFamily: 'Georgia', color: C.ink, letterSpacing: -0.3, marginBottom: 8 },
  welcome:  { fontSize: 16, color: C.ink2, marginBottom: 52 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0EDE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0DDD9',
  },
  icon:     { fontSize: 38 },
  hint:     { fontSize: 14, color: C.ink3, marginBottom: 20 },
  error:    { fontSize: 13, color: C.red, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  altBtn:   { marginTop: 32, paddingVertical: 10, paddingHorizontal: 20 },
  altText:  { fontSize: 15, color: C.blue, fontWeight: '500' },
});
