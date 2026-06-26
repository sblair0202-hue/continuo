import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../src/api/client';
import { Colors } from '../src/constants/colors';

export default function NewRecapScreen() {
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError('Please enter a transcript before analyzing.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.submitRecap('sarah', transcript.trim());
      // Serialize preview as a route param since expo-router params are strings
      router.push({
        pathname: '/review/[id]',
        params: { id: result.id, preview: JSON.stringify(result.extraction_preview) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.input}
          multiline
          placeholder="Describe your site visit, meeting, or patient discussion..."
          placeholderTextColor={Colors.textSecondary}
          value={transcript}
          onChangeText={setTranscript}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.micButton}
          onPress={() => Alert.alert('Coming soon', 'Voice recording will be available in a future update.')}
        >
          <Text style={styles.micIcon}>🎤</Text>
          <Text style={styles.micLabel}>Voice recording coming soon</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.analyzeText}>Analyze</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, flexGrow: 1 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: 24,
  },
  micButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  micIcon: { fontSize: 20 },
  micLabel: { fontSize: 14, color: Colors.textSecondary },
  errorText: {
    color: Colors.high,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  analyzeButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  analyzeButtonDisabled: { opacity: 0.6 },
  analyzeText: { color: Colors.surface, fontSize: 16, fontWeight: '700' },
});
