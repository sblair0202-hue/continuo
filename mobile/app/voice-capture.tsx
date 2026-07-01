import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';
import { useOrb } from '../src/context/OrbContext';
import { Colors } from '../src/constants/colors';

type CaptureStage = 'idle' | 'listening' | 'understanding' | 'type' | 'photo';

const PROMPTS: Record<CaptureStage, { title: string; sub: string }> = {
  idle:          { title: 'What happened?',   sub: 'Tap the Orb to start — or type below.' },
  listening:     { title: "I'm listening…", sub: 'Tap the Orb when you’re done.' },
  understanding: { title: 'Understanding…', sub: 'Organizing what you shared.' },
  type:          { title: 'What happened?',   sub: 'Type a quick note in your own words.' },
  photo:         { title: 'Add a photo',      sub: 'A whiteboard, a business card, a label.' },
};

const ORB_RING_COLOR: Record<CaptureStage, string> = {
  idle:          Colors.inkDark,
  listening:     Colors.sky,
  understanding: Colors.sky,
  type:          Colors.inkDark,
  photo:         Colors.inkDark,
};

// Large pearl Orb (capture screen)
function CaptureOrb({ stage, onPress, breatheAnim }: {
  stage: CaptureStage;
  onPress: () => void;
  breatheAnim: Animated.Value;
}) {
  const ringColor = ORB_RING_COLOR[stage];
  return (
    <Pressable onPress={onPress} style={s.orbPressable}>
      <Animated.View style={[s.orbWrap, { transform: [{ scale: breatheAnim }] }]}>
        {/* Pearl gradient sphere */}
        <LinearGradient
          colors={['#ffffff', '#F4F2EE', '#E5E0DA']}
          start={{ x: 0.36, y: 0.22 }}
          end={{ x: 0.64, y: 1.0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 69 }]}
        />
        {/* Ring mark */}
        <Svg width={62} height={62} viewBox="0 0 120 120" fill="none">
          <Circle cx="60" cy="60" r="34" stroke={ringColor} strokeWidth="9" />
        </Svg>
        {/* Thinking orbit dot — only when understanding */}
        {stage === 'understanding' && <OrbitDot />}
      </Animated.View>
    </Pressable>
  );
}

// Spinning dot for "thinking" state
function OrbitDot() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1700, easing: Easing.linear, useNativeDriver: true })
    ).start();
    return () => spin.stopAnimation();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]} pointerEvents="none">
      <View style={s.orbitDot} />
    </Animated.View>
  );
}

// Single animated waveform bar
function WaveBar({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.32)).current;
  useEffect(() => {
    const duration = 700 + (delay % 5) * 100; // deterministic, no Math.random
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.32, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(timer); loop.stop(); };
  }, []);
  return <Animated.View style={[s.waveBar, { transform: [{ scaleY: anim }] }]} />;
}

function Waveform() {
  return (
    <View style={s.waveform}>
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <WaveBar key={i} delay={i * 70} />
      ))}
    </View>
  );
}

export default function VoiceCaptureScreen() {
  const { autoStart, mode: initialMode } = useLocalSearchParams<{ autoStart?: string; mode?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setOrbState } = useOrb();

  const startingMode: CaptureStage = (initialMode === 'type' ? 'type' : initialMode === 'photo' ? 'photo' : 'idle');
  const [stage, setStage] = useState<CaptureStage>(startingMode);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [typeText, setTypeText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const breatheLoop = useRef<Animated.CompositeAnimation | null>(null);
  const understandingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs so stopListening always reads the latest values (avoids stale closure bug)
  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  // Start gentle breathing animation
  useEffect(() => {
    breatheLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.035, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1.0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    breatheLoop.current.start();
    return () => { breatheLoop.current?.stop(); };
  }, []);

  // Auto-start listening if requested
  useEffect(() => {
    if (autoStart === 'true') {
      startListening();
    }
  }, []);

  // Sync orb state with stage
  useEffect(() => {
    if (stage === 'listening')     setOrbState('listening');
    else if (stage === 'understanding') setOrbState('thinking');
    else                           setOrbState('idle');
    return () => { setOrbState('idle'); };
  }, [stage]);

  useSpeechRecognitionEvent('result', (event) => {
    const latest = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      const next = transcriptRef.current.trim() ? `${transcriptRef.current.trim()} ${latest}` : latest;
      transcriptRef.current = next;
      interimTranscriptRef.current = '';
      setTranscript(next);
      setInterimTranscript('');
    } else {
      interimTranscriptRef.current = latest;
      setInterimTranscript(latest);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (stage === 'listening') {
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'no-speech') return;
    setError(`Recognition error: ${event.message ?? event.error}`);
    setStage('idle');
  });

  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.abort();
      understandingTimer.current && clearTimeout(understandingTimer.current);
    };
  }, []);

  async function startListening() {
    setError(null);
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('Microphone access needed. Allow in Settings.');
      return;
    }
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setStage('listening');
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
  }

  async function stopListening() {
    // Combine committed transcript + any pending interim words before stop clears them
    const combined = [transcriptRef.current.trim(), interimTranscriptRef.current.trim()]
      .filter(Boolean).join(' ');
    ExpoSpeechRecognitionModule.stop();
    interimTranscriptRef.current = '';
    setInterimTranscript('');
    setStage('understanding');
    await analyzeAndNavigate(combined);
  }

  async function analyzeAndNavigate(text: string) {
    const finalText = text.trim();
    if (!finalText) {
      setStage('idle');
      return;
    }
    setError(null);
    try {
      const userId = user?.user_id ?? 'sarah';
      const result = await api.submitRecap(userId, finalText);
      router.replace({
        pathname: '/review/[id]',
        params: { id: result.id, preview: JSON.stringify(result.extraction_preview) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Try again.');
      setStage('idle');
    }
  }

  function handleOrbPress() {
    if (stage === 'idle' || stage === 'type' || stage === 'photo') {
      startListening();
    } else if (stage === 'listening') {
      stopListening();
    }
    // understanding = no-op
  }

  function handleModeSelect(newMode: CaptureStage) {
    if (stage === 'listening') {
      ExpoSpeechRecognitionModule.abort();
    }
    setStage(newMode);
  }

  const displayText = stage === 'listening'
    ? (transcript ? `${transcript} ${interimTranscript}` : interimTranscript).trim()
    : transcript;

  const prompt = PROMPTS[stage];
  const canProceed = stage === 'type' ? typeText.trim().length > 0 : false;

  return (
    <KeyboardAvoidingView
      style={[s.screen, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.topLabel}>
          {stage === 'type' ? 'TYPE NOTE' : stage === 'photo' ? 'PHOTO' : 'NEW CAPTURE'}
        </Text>
        <View style={s.closeBtn} />
      </View>

      {/* Center block */}
      <View style={s.center}>
        <CaptureOrb stage={stage} onPress={handleOrbPress} breatheAnim={breatheAnim} />

        {/* Prompt */}
        <View style={s.promptBlock}>
          <Text style={s.promptTitle}>{prompt.title}</Text>
          <Text style={s.promptSub}>{prompt.sub}</Text>
        </View>

        {/* Live transcript (listening / understanding) */}
        {(stage === 'listening' || stage === 'understanding') && displayText ? (
          <View style={s.transcriptBlock}>
            <Text style={s.transcriptText}>{displayText}
              {stage === 'listening' ? <Text style={s.caret}> |</Text> : null}
            </Text>
          </View>
        ) : null}

        {/* Type field */}
        {stage === 'type' && (
          <TextInput
            style={s.typeField}
            multiline
            value={typeText}
            onChangeText={setTypeText}
            placeholder="Start typing your recap…"
            placeholderTextColor={Colors.graphite}
            textAlignVertical="top"
            autoFocus
          />
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>

      {/* Waveform (listening only) */}
      {stage === 'listening' && <Waveform />}

      {/* Proceed pill (type / photo) */}
      {(stage === 'type') && (
        <TouchableOpacity
          style={[s.proceedPill, !canProceed && s.proceedPillDisabled]}
          onPress={() => analyzeAndNavigate(typeText)}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={s.proceedText}>Review capture</Text>
        </TouchableOpacity>
      )}

      {/* Mode dock */}
      {stage !== 'understanding' && (
        <View style={s.dock}>
          <ModeButton
            icon="mic"
            active={stage === 'idle' || stage === 'listening'}
            onPress={() => handleModeSelect('idle')}
          />
          <ModeButton
            icon="keyboard"
            active={stage === 'type'}
            onPress={() => handleModeSelect('type')}
          />
          <ModeButton
            icon="camera"
            active={stage === 'photo'}
            onPress={() => handleModeSelect('photo')}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ModeButton({ icon, active, onPress }: { icon: string; active: boolean; onPress: () => void }) {
  const icons: Record<string, string> = { mic: '🎙', keyboard: '⌨️', camera: '📷' };
  return (
    <TouchableOpacity
      style={[s.modeBtn, active && s.modeBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={s.modeBtnIcon}>{icons[icon]}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
    paddingHorizontal: 26,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 18,
  },
  topLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 11,
    color: Colors.graphite,
    letterSpacing: 1.4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  orbPressable: {
    alignSelf: 'center',
  },
  orbWrap: {
    width: 138,
    height: 138,
    borderRadius: 69,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 10,
  },
  orbitDot: {
    position: 'absolute',
    top: 4,
    left: '50%',
    marginLeft: -4.5,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.sky,
  },
  promptBlock: {
    alignItems: 'center',
    gap: 6,
    maxWidth: 280,
  },
  promptTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 27,
    lineHeight: 33,
    color: Colors.inkDark,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  promptSub: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13.5,
    color: Colors.graphite,
    textAlign: 'center',
  },
  transcriptBlock: {
    maxWidth: 300,
    maxHeight: 140,
    alignSelf: 'center',
  },
  transcriptText: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 17,
    lineHeight: 27,
    color: Colors.ink,
    textAlign: 'center',
  },
  caret: {
    color: Colors.sky,
  },
  typeField: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 18,
    lineHeight: 28,
    color: Colors.ink,
    textAlign: 'center',
    minHeight: 80,
    width: '100%',
    paddingHorizontal: 8,
  },
  error: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: Colors.rose,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    marginBottom: 16,
  },
  waveBar: {
    width: 3,
    height: 28,
    borderRadius: 1.5,
    backgroundColor: 'rgba(122,159,194,0.55)',
  },
  proceedPill: {
    backgroundColor: Colors.inkDark,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  proceedPillDisabled: {
    opacity: 0.45,
  },
  proceedText: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.reversed,
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  modeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: Colors.inkDark,
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  modeBtnIcon: {
    fontSize: 22,
  },
});
