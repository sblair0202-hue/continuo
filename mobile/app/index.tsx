import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../src/api/client';
import { Colors, impactColor, momentumBadgeColor, signalTypeColors } from '../src/constants/colors';
import type { Account, Signal, Task } from '../src/types';

export default function TodayScreen() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getSignals(), api.getTasks(), api.getAccounts()])
      .then(([s, t, a]) => {
        setSignals(s);
        setTasks(t);
        setAccounts(a);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const activeSignals = signals
    .filter((s) => s.status === 'new' && s.impact_level === 'high')
    .slice(0, 10);

  const openTasks = tasks.filter((t) => t.status === 'open');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.date}>{today}</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.sectionHeader}>Active Signals</Text>
        {activeSignals.length === 0 ? (
          <Text style={styles.emptyText}>No high-impact signals. Submit a recap to get started.</Text>
        ) : (
          activeSignals.map((signal) => {
            const tc = signalTypeColors(signal.signal_type);
            const borderColor = impactColor(signal.impact_level);
            return (
              <View key={signal.id} style={[styles.card, { borderLeftColor: borderColor }]}>
                <View style={[styles.badge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.badgeText, { color: tc.text }]}>
                    {signal.signal_type.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{signal.title}</Text>
                {signal.suggested_action && (
                  <Text style={styles.cardSubtext}>{signal.suggested_action}</Text>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.sectionHeader}>Open Tasks</Text>
        {openTasks.length === 0 ? (
          <Text style={styles.emptyText}>No open tasks.</Text>
        ) : (
          openTasks.map((task) => (
            <View key={task.id} style={[styles.card, styles.cardFlat]}>
              <View style={styles.taskRow}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: impactColor(task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') },
                  ]}
                />
                <Text style={styles.cardTitle}>{task.title}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionHeader}>Accounts</Text>
        {accounts.length === 0 ? (
          <Text style={styles.emptyText}>No accounts yet.</Text>
        ) : (
          accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[styles.card, styles.cardFlat]}
              onPress={() => router.push(`/account/${account.id}`)}
            >
              <View style={styles.accountRow}>
                <View style={styles.accountInfo}>
                  <Text style={styles.cardTitle}>{account.name}</Text>
                  {account.city && (
                    <Text style={styles.cardSubtext}>
                      {account.city}{account.state ? `, ${account.state}` : ''}
                    </Text>
                  )}
                </View>
                <View style={[styles.momentumBadge, { backgroundColor: momentumBadgeColor(account.momentum) }]}>
                  <Text style={styles.momentumText}>{account.momentum}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabButton} onPress={() => router.push('/new-recap')}>
          <Text style={styles.fabText}>+ New Recap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  date: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, fontWeight: '500' },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFlat: { borderLeftWidth: 0 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSubtext: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountInfo: { flex: 1 },
  momentumBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  momentumText: { fontSize: 11, fontWeight: '600', color: Colors.surface },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 8 },
  errorText: { fontSize: 14, color: Colors.high, marginBottom: 8 },
  bottomSpacer: { height: 80 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  fabButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: Colors.surface, fontSize: 16, fontWeight: '700' },
});
