import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as ImagePicker from 'expo-image-picker';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
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

  // Keep the screen awake for the whole capture session so sleep never kills transcription
  useKeepAwake();

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
  const transcriptScrollRef = useRef<ScrollView>(null);
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

  // Auto-start listening or photo capture if requested
  useEffect(() => {
    if (autoStart === 'true') {
      startListening();
    } else if (initialMode === 'photo') {
      setTimeout(() => choosePhotoSource(), 200);
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
    if (stage === 'photo') {
      choosePhotoSource();
    } else if (stage === 'idle' || stage === 'type') {
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
    if (newMode === 'photo') {
      // Give the UI a beat to switch, then offer camera vs library
      setTimeout(() => choosePhotoSource(), 120);
    }
  }

  function choosePhotoSource() {
    const opts = ['Take Photo', 'Choose from Library', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex: 2, title: 'Add a photo' },
        (i) => { if (i === 0) launchPhotoCapture('camera'); else if (i === 1) launchPhotoCapture('library'); }
      );
    } else {
      Alert.alert('Add a photo', undefined, [
        { text: 'Take Photo', onPress: () => launchPhotoCapture('camera') },
        { text: 'Choose from Library', onPress: () => launchPhotoCapture('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function launchPhotoCapture(source: 'camera' | 'library') {
    setError(null);
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setError('Camera access needed. Allow in Settings.'); return; }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, allowsEditing: false });
      } else {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!lib.granted) { setError('Photo access needed. Allow in Settings.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      }
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const mediaType = asset.mimeType ?? 'image/jpeg';
      setStage('understanding');
      const { extracted_text } = await api.extractFromImage(asset.base64!, mediaType);
      if (!extracted_text || !extracted_text.trim()) {
        setError('Could not read any text from that photo. Try another.');
        setStage('photo');
        return;
      }
      await analyzeAndNavigate(extracted_text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo capture failed. Try again.');
      setStage('photo');
    }
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

        {/* Live transcript (listening / understanding) — scrolls, auto-sticks to bottom */}
        {(stage === 'listening' || stage === 'understanding') && displayText ? (
          <ScrollView
            style={s.transcriptScroll}
            contentContainerStyle={s.transcriptBlock}
            ref={transcriptScrollRef}
            onContentSizeChange={() => transcriptScrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.transcriptText}>{displayText}
              {stage === 'listening' ? <Text style={s.caret}> |</Text> : null}
            </Text>
          </ScrollView>
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

      {/* PHI guidance — subtle, always present */}
      {stage !== 'understanding' && (
        <Text style={s.phiNote}>
          Avoid patient-identifying details unless approved for your organization.
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

function MicGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M5 11a7 7 0 0014 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="9" y1="22" x2="15" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function KeyboardGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="12" rx="2.5" stroke={color} strokeWidth="1.8" />
      <Line x1="6" y1="10" x2="6" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="10" y1="10" x2="10" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="14" y1="10" x2="14" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="18" y1="10" x2="18" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="14" x2="16" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function CameraGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function ModeButton({ icon, active, onPress }: { icon: string; active: boolean; onPress: () => void }) {
  const color = active ? Colors.paper : Colors.graphite;
  return (
    <TouchableOpacity
      style={[s.modeBtn, active && s.modeBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon === 'mic' ? <MicGlyph color={color} />
        : icon === 'keyboard' ? <KeyboardGlyph color={color} />
        : <CameraGlyph color={color} />}
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
  transcriptScroll: {
    maxHeight: 180,
    alignSelf: 'stretch',
  },
  transcriptBlock: {
    maxWidth: 320,
    alignSelf: 'center',
    paddingHorizontal: 12,
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
  phiNote: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11.5,
    color: Colors.graphite,
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 12,
    lineHeight: 16,
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
