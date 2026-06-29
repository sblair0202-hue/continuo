import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoImport() {
    Alert.alert('Import from Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: () => pickImage('camera'),
      },
      {
        text: 'Photo Library',
        onPress: () => pickImage('library'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickImage(source: 'camera' | 'library') {
    let permissionResult;
    if (source === 'camera') {
      permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission required',
        source === 'camera'
          ? 'Camera access is needed to take a photo.'
          : 'Photo library access is needed to import a photo.'
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      setError('Could not read photo. Please try again.');
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoLoading(true);
    setError(null);

    try {
      const mediaType = asset.mimeType ?? 'image/jpeg';
      const { extracted_text } = await api.extractFromImage(asset.base64, mediaType);
      setTranscript(prev => {
        const joined = prev.trim() ? `${prev.trim()}\n\n${extracted_text}` : extracted_text;
        return joined;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read photo.');
      setPhotoUri(null);
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError('Please enter a transcript or import a photo before analyzing.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.submitRecap('sarah', transcript.trim());
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TextInput
          style={styles.input}
          multiline
          placeholder="Describe your site visit, meeting, or patient discussion..."
          placeholderTextColor={Colors.textSecondary}
          value={transcript}
          onChangeText={setTranscript}
          textAlignVertical="top"
        />

        {photoUri && (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photoUri }} style={styles.photoThumb} />
            <Text style={styles.photoLabel}>Photo imported</Text>
            <TouchableOpacity onPress={() => { setPhotoUri(null); }}>
              <Text style={styles.photoRemove}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, photoLoading && styles.actionButtonDisabled]}
            onPress={handlePhotoImport}
            disabled={photoLoading}
          >
            {photoLoading ? (
              <>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.actionLabel}>Reading photo...</Text>
              </>
            ) : (
              <>
                <Text style={styles.actionIcon}>📷</Text>
                <Text style={styles.actionLabel}>Import from photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/voice-capture')}
          >
            <Text style={styles.actionIcon}>🎙</Text>
            <Text style={styles.actionLabel}>Voice note</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color={Colors.surface} />
              <Text style={[styles.analyzeText, { marginTop: 6, fontSize: 13 }]}>Analyzing with AI...</Text>
            </>
          ) : (
            <Text style={styles.analyzeText}>Analyze</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 16 }} />
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
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  photoLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  photoRemove: {
    fontSize: 13,
    color: Colors.high,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 13, color: Colors.textSecondary },
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
