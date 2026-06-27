import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import { Colors } from '../../src/constants/colors';
import type { MeetingPrep } from '../../src/types';

export default function MeetingPrepScreen() {
  const router = useRouter();
  const { id, account_id, title } = useLocalSearchParams<{
    id: string;
    account_id?: string;
    title?: string;
  }>();

  const [prep, setPrep] = useState<MeetingPrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const accountId = account_id ? parseInt(account_id, 10) : undefined;
    api.getMeetingPrep(id, accountId)
      .then(setPrep)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, account_id]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eventTitle}>{title ?? 'Meeting Prep'}</Text>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Generating brief…</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Go back</Text>
            </TouchableOpacity>
          </View>
        )}

        {prep && !loading && (
          <>
            <View style={styles.briefCard}>
              <Text style={styles.briefLabel}>AI Meeting Brief</Text>
              <Text style={styles.briefText}>{prep.brief}</Text>
            </View>

            <View style={styles.metaRow}>
              <MetaStat value={prep.signal_count} label="Active Signals" color={Colors.high} />
              <MetaStat value={prep.contact_count} label="Known Contacts" color={Colors.primary} />
            </View>

            <Text style={styles.hint}>
              This brief is generated from your captured signals and contacts for this account.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetaStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.metaStat}>
      <Text style={[styles.metaValue, { color }]}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
    lineHeight: 26,
  },

  center: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary },

  errorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  errorText: { fontSize: 14, color: Colors.high, textAlign: 'center', lineHeight: 20 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  backBtnText: { color: Colors.surface, fontWeight: '600', fontSize: 14 },

  briefCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  briefLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  briefText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },

  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaStat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metaValue: { fontSize: 28, fontWeight: '800' },
  metaLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginTop: 4 },

  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
