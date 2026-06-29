import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Radius, Shadow, sp } from '../src/constants/colors';

type Phase = 'idle' | 'recording' | 'transcribing' | 'editing' | 'analyzing';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceCaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }

  async function startRecording() {
    setError(null);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone access needed', 'Please allow microphone access in Settings to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;

      setDuration(0);
      setPhase('recording');
      startPulse();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start recording.');
    }
  }

  async function stopRecording() {
    stopPulse();
    timerRef.current && clearInterval(timerRef.current);

    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;

    setPhase('transcribing');
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error('No audio file found.');

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { transcript: text } = await api.transcribeAudio(base64, 'm4a');
      setTranscript(text);
      setPhase('editing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcription failed. Please try again.');
      setPhase('idle');
    }
  }

  async function handleAnalyze() {
    if (!transcript.trim()) return;
    setError(null);
    setPhase('analyzing');
    try {
      const userId = user?.user_id ?? 'sarah';
      const result = await api.submitRecap(userId, transcript.trim());
      router.replace({
        pathname: '/review/[id]',
        params: { id: result.id, preview: JSON.stringify(result.extraction_preview) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Your transcript is saved — tap Analyze to retry.');
      setPhase('editing');
    }
  }

  function handleRecordButton() {
    if (phase === 'idle' || phase === 'editing') {
      setTranscript('');
      startRecording();
    } else if (phase === 'recording') {
      stopRecording();
    }
  }

  const isRecording = phase === 'recording';
  const isTranscribing = phase === 'transcribing';
  const isAnalyzing = phase === 'analyzing';
  const isEditing = phase === 'editing';

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <Text style={s.heading}>Voice Note</Text>
        <Text style={s.sub}>
          {phase === 'idle' && 'Tap the mic to start recording'}
          {phase === 'recording' && `Recording  ${formatDuration(duration)}`}
          {phase === 'transcribing' && 'Transcribing your recording...'}
          {phase === 'editing' && 'Review and edit before analyzing'}
          {phase === 'analyzing' && 'Analyzing with AI...'}
        </Text>

        {/* Record button */}
        {(phase === 'idle' || phase === 'recording') && (
          <View style={s.orbWrap}>
            <Animated.View style={[s.orbRing, isRecording && s.orbRingActive, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={[s.orb, isRecording && s.orbActive]}
                onPress={handleRecordButton}
                activeOpacity={0.8}
              >
                <Text style={s.orbIcon}>{isRecording ? '⏹' : '🎙'}</Text>
              </TouchableOpacity>
            </Animated.View>
            {isRecording && (
              <View style={s.recIndicator}>
                <View style={s.recDot} />
                <Text style={s.recLabel}>REC</Text>
              </View>
            )}
          </View>
        )}

        {/* Transcribing spinner */}
        {isTranscribing && (
          <View style={s.spinnerWrap}>
            <ActivityIndicator size="large" color={Colors.sky} />
            <Text style={s.spinnerLabel}>Transcribing...</Text>
          </View>
        )}

        {/* Editable transcript */}
        {(isEditing || isAnalyzing) && (
          <View style={s.transcriptWrap}>
            <Text style={s.transcriptLabel}>Transcript</Text>
            <TextInput
              style={s.transcriptInput}
              multiline
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Transcript will appear here..."
              placeholderTextColor={Colors.graphite}
              textAlignVertical="top"
              editable={!isAnalyzing}
            />
            <TouchableOpacity
              style={[s.rerecordBtn]}
              onPress={() => { setPhase('idle'); setTranscript(''); setDuration(0); }}
              disabled={isAnalyzing}
            >
              <Text style={s.rerecordText}>🎙  Re-record</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && <Text style={s.error}>{error}</Text>}

        {/* Analyze button */}
        {(isEditing || isAnalyzing) && (
          <TouchableOpacity
            style={[s.analyzeBtn, isAnalyzing && s.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={isAnalyzing || !transcript.trim()}
            activeOpacity={0.8}
          >
            {isAnalyzing ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={s.analyzeBtnText}>Analyze</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    padding: sp.md,
    flexGrow: 1,
    alignItems: 'center',
  },
  heading: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 22,
    color: Colors.ink,
    marginTop: sp.lg,
    marginBottom: sp.xs,
  },
  sub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: Colors.graphite,
    marginBottom: sp.xl,
    textAlign: 'center',
  },
  orbWrap: {
    alignItems: 'center',
    marginVertical: sp.xl,
    gap: sp.md,
  },
  orbRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRingActive: {
    borderColor: Colors.rose,
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.inkDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.float,
  },
  orbActive: {
    backgroundColor: Colors.rose,
  },
  orbIcon: {
    fontSize: 36,
  },
  recIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.rose,
  },
  recLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: Colors.rose,
    letterSpacing: 2,
  },
  spinnerWrap: {
    alignItems: 'center',
    gap: sp.md,
    marginVertical: sp.xxl,
  },
  spinnerLabel: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    color: Colors.graphite,
  },
  transcriptWrap: {
    width: '100%',
    gap: sp.sm,
    marginBottom: sp.md,
  },
  transcriptLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 13,
    color: Colors.graphite,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transcriptInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.mist,
    padding: sp.md,
    fontSize: 15,
    color: Colors.ink,
    fontFamily: 'HankenGrotesk_400Regular',
    minHeight: 160,
    lineHeight: 22,
  },
  rerecordBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  rerecordText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13,
    color: Colors.graphite,
  },
  error: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: Colors.rose,
    textAlign: 'center',
    marginBottom: sp.md,
    paddingHorizontal: sp.md,
  },
  analyzeBtn: {
    width: '100%',
    backgroundColor: Colors.inkDark,
    borderRadius: Radius.card,
    paddingVertical: sp.md,
    alignItems: 'center',
    marginTop: sp.sm,
    ...Shadow.card,
  },
  analyzeBtnDisabled: {
    opacity: 0.55,
  },
  analyzeBtnText: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 16,
    color: Colors.reversed,
  },
});
