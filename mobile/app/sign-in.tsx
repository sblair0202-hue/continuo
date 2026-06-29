import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../src/context/AuthContext';

export default function SignInScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        {/* Wordmark */}
        <View style={s.header}>
          <Text style={s.wordmark}>Continuo</Text>
          <Text style={s.tagline}>Your AI field intelligence platform</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#B0ABA4"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={[s.label, { marginTop: 18 }]}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#B0ABA4"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={s.divRow}>
          <View style={s.divLine} />
          <Text style={s.divLabel}>or</Text>
          <View style={s.divLine} />
        </View>

        {/* OAuth stubs — active in TestFlight build */}
        <TouchableOpacity
          style={s.oauthBtn}
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert('Coming in TestFlight', 'Sign in with Apple will be available in the native app build.')
          }
        >
          <Text style={s.oauthIcon}>  </Text>
          <Text style={s.oauthText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.oauthBtn, { marginTop: 10 }]}
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert('Coming in TestFlight', 'Sign in with Google will be available in the native app build.')
          }
        >
          <Text style={s.oauthIcon}>G</Text>
          <Text style={s.oauthText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Privacy footer */}
        <Text style={s.privacy}>
          By signing in you agree to our{' '}
          <Text style={s.privacyLink}>Privacy Policy</Text>
          {' '}and{' '}
          <Text style={s.privacyLink}>Terms of Use</Text>.
          {'\n'}Your data stays private and secure.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const C = {
  bg: '#FAF9F7',
  ink: '#383530',
  ink2: '#6E6A63',
  ink3: '#9E9A94',
  muted: '#B0ABA4',
  border: '#E0DDD9',
  btn: '#3D3A35',
  blue: '#3A72C8',
  surface: '#F0EDE9',
};

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  inner:    { flex: 1, paddingHorizontal: 32, justifyContent: 'center', paddingBottom: 32 },

  header:   { alignItems: 'center', marginBottom: 44 },
  wordmark: { fontSize: 34, fontFamily: 'Georgia', color: C.ink, letterSpacing: -0.5 },
  tagline:  { marginTop: 8, fontSize: 14, color: C.ink3, fontWeight: '400' },

  form:     { gap: 0 },
  label:    { fontSize: 12, fontWeight: '600', color: C.ink2, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  input:    {
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
  },
  btn:      {
    marginTop: 28,
    backgroundColor: C.btn,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText:  { color: '#fff', fontSize: 16, fontWeight: '600' },

  divRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  divLine:  { flex: 1, height: 1, backgroundColor: C.border },
  divLabel: { marginHorizontal: 14, fontSize: 13, color: C.muted },

  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  oauthIcon: { fontSize: 16, fontWeight: '700', color: C.ink, width: 22, textAlign: 'center' },
  oauthText: { fontSize: 15, fontWeight: '500', color: C.ink },

  errorText:   { marginTop: 14, fontSize: 14, color: '#C94530', textAlign: 'center', lineHeight: 20 },
  privacy:     { marginTop: 36, fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18 },
  privacyLink: { color: C.blue, fontWeight: '500' },
});
