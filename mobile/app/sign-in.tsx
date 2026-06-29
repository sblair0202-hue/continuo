import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
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

import { Logo } from '../src/components/Logo';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Radius, sp } from '../src/constants/colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = '196906565572-u239l185vgso2hjlqc851pql4108h584.apps.googleusercontent.com';

export default function SignInScreen() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [googleRequest, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params.id_token;
      if (idToken) {
        setLoading(true);
        loginWithGoogle(idToken)
          .then(() => router.replace('/(tabs)'))
          .catch(e => setError(e instanceof Error ? e.message : 'Google sign-in failed.'))
          .finally(() => setLoading(false));
      }
    } else if (googleResponse?.type === 'error') {
      setError('Google sign-in was cancelled or failed.');
    }
  }, [googleResponse]);

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

        {/* Logo lockup */}
        <View style={s.header}>
          <Logo variant="full" scheme="default" size={56} />
          <Text style={s.tagline}>
            Never drop the thread.
          </Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.stone}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={[s.label, { marginTop: sp.md }]}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.stone}
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
            {loading
              ? <ActivityIndicator color={Colors.reversed} />
              : <Text style={s.btnText}>Sign in</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={s.divRow}>
          <View style={s.divLine} />
          <Text style={s.divLabel}>or</Text>
          <View style={s.divLine} />
        </View>

        {/* Apple Sign-In */}
        {Platform.OS === 'ios' ? (
          <TouchableOpacity
            style={s.oauthBtn}
            activeOpacity={0.8}
            disabled={loading}
            onPress={async () => {
              setError('');
              try {
                const credential = await AppleAuthentication.signInAsync({
                  requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                  ],
                });
                if (!credential.identityToken) throw new Error('No identity token from Apple.');
                setLoading(true);
                const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
                  .filter(Boolean).join(' ');
                await loginWithApple(credential.identityToken, credential.email ?? undefined, fullName || undefined);
                router.replace('/(tabs)');
              } catch (e: any) {
                if (e?.code !== 'ERR_REQUEST_CANCELED') {
                  setError(e instanceof Error ? e.message : 'Apple sign-in failed.');
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={s.oauthIcon}></Text>
            <Text style={s.oauthText}>Continue with Apple</Text>
          </TouchableOpacity>
        ) : null}

        {/* Google Sign-In */}
        <TouchableOpacity
          style={[s.oauthBtn, { marginTop: sp.sm }]}
          activeOpacity={0.8}
          disabled={loading || !googleRequest}
          onPress={() => {
            setError('');
            googlePrompt();
          }}
        >
          <Text style={s.oauthIcon}>G</Text>
          <Text style={s.oauthText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Footer */}
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

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  inner: {
    flex: 1,
    paddingHorizontal: sp.xl,
    justifyContent: 'center',
    paddingBottom: sp.xl,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: sp.xxl,
  },
  tagline: {
    marginTop: sp.md,
    fontFamily: 'Newsreader_400Regular_Italic',
    fontSize: 15,
    color: Colors.graphite,
    letterSpacing: 0.1,
  },

  // Form
  form: {
    gap: 0,
  },
  label: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 11,
    color: Colors.graphite,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: sp.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: sp.md,
    paddingVertical: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  errorText: {
    marginTop: sp.md,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: Colors.rose,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: sp.lg,
    backgroundColor: Colors.inkDark,
    borderRadius: Radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: Colors.reversed,
    fontSize: 16,
    letterSpacing: 0.2,
  },

  // Divider
  divRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: sp.lg,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.mist,
  },
  divLabel: {
    marginHorizontal: sp.md,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: Colors.stone,
  },

  // OAuth
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  oauthIcon: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 16,
    color: Colors.ink,
    width: 22,
    textAlign: 'center',
  },
  oauthText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: Colors.ink,
  },

  // Privacy footer
  privacy: {
    marginTop: sp.xxl - sp.md,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: Colors.stone,
    textAlign: 'center',
    lineHeight: 18,
  },
  privacyLink: {
    color: Colors.sky,
  },
});
