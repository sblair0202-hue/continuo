import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Logo } from '../src/components/Logo';
import { useAuth } from '../src/context/AuthContext';
import { Colors, sp } from '../src/constants/colors';

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
        <Logo variant="full" scheme="default" size={48} />
        <Text style={s.welcome}>
          Welcome back{user?.display_name ? `, ${user.display_name}` : ''}
        </Text>

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

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: Colors.paper, justifyContent: 'center', alignItems: 'center' },
  inner:    { alignItems: 'center', paddingHorizontal: 40 },
  welcome:  { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: Colors.graphite, marginTop: sp.md, marginBottom: sp.xxl },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  icon:     { fontSize: 38 },
  hint:     { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.stone, marginBottom: sp.lg },
  error:    { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: Colors.rose, textAlign: 'center', marginBottom: sp.md, lineHeight: 18 },
  altBtn:   { marginTop: sp.xl, paddingVertical: 10, paddingHorizontal: 20 },
  altText:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: Colors.sky },
});
