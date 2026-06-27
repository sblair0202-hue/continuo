import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import { Colors, momentumBadgeColor } from '../../src/constants/colors';
import type { Account } from '../../src/types';

export default function AccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchAccounts(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    api.getAccounts()
      .then(setAccounts)
      .catch((e: Error) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useFocusEffect(useCallback(() => { fetchAccounts(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchAccounts(true)} tintColor={Colors.primary} />
      }
    >
      {error && <Text style={styles.errorText}>{error}</Text>}

      {accounts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No accounts yet.</Text>
          <Text style={styles.emptySubtitle}>Submit a recap to create your first account.</Text>
        </View>
      ) : (
        accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={styles.card}
            onPress={() => router.push(`/account/${account.id}`)}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                {account.city && (
                  <Text style={styles.accountLocation}>
                    {account.city}{account.state ? `, ${account.state}` : ''}
                  </Text>
                )}
                {account.next_action && (
                  <Text style={styles.nextAction}>{account.next_action}</Text>
                )}
              </View>
              <View style={[styles.momentumBadge, { backgroundColor: momentumBadgeColor(account.momentum) }]}>
                <Text style={styles.momentumText}>{account.momentum}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 10 },
  accountName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  accountLocation: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  nextAction: { fontSize: 13, color: Colors.primary, marginTop: 6, fontStyle: 'italic' },
  momentumBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  momentumText: { fontSize: 11, fontWeight: '600', color: Colors.surface },
  emptyState: { marginTop: 80, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorText: { fontSize: 14, color: Colors.high, marginBottom: 8 },
});
