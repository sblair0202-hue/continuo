import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import {
  Colors,
  impactColor,
  momentumBadgeColor,
  signalTypeColors,
} from '../../src/constants/colors';
import type { Account, Activity, Contact, Signal, Task } from '../../src/types';

type AccountData = {
  account: Account;
  signals: Signal[];
  tasks: Task[];
  activities: Activity[];
  contacts: Contact[];
};

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);

  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getAccount(accountId),
      api.getSignals(accountId),
      api.getTasks(accountId),
      api.getActivities(accountId),
      api.getContacts(),
    ])
      .then(([account, signals, tasks, activities, allContacts]) => {
        setData({
          account,
          signals,
          tasks,
          activities,
          contacts: allContacts.filter((c) => c.account_id === accountId),
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Account not found.'}</Text>
      </View>
    );
  }

  const { account, signals, tasks, activities, contacts } = data;

  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const activeSignals = signals
    .filter((s) => s.status === 'new')
    .sort((a, b) => (impactOrder[a.impact_level] ?? 3) - (impactOrder[b.impact_level] ?? 3));

  const openTasks = tasks.filter((t) => t.status === 'open');
  const recentActivities = activities.slice(0, 5);

  const momentumColor = momentumBadgeColor(account.momentum);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.headerCard}>
        <Text style={styles.accountName}>{account.name}</Text>
        {account.city && (
          <Text style={styles.accountLocation}>
            {account.city}{account.state ? `, ${account.state}` : ''}
          </Text>
        )}
        <View style={[styles.momentumBadge, { backgroundColor: momentumColor }]}>
          <Text style={styles.momentumText}>{account.momentum}</Text>
        </View>
      </View>

      {account.next_action && (
        <View style={styles.nextActionBox}>
          <Text style={styles.nextActionLabel}>NEXT ACTION</Text>
          <Text style={styles.nextActionText}>{account.next_action}</Text>
        </View>
      )}

      <SectionHeader title={`Active Signals (${activeSignals.length})`} />
      {activeSignals.length === 0 ? (
        <EmptyState text="No active signals." />
      ) : (
        activeSignals.map((signal) => {
          const tc = signalTypeColors(signal.signal_type);
          return (
            <View key={signal.id} style={styles.card}>
              <View style={styles.signalMeta}>
                <View style={[styles.badge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.badgeText, { color: tc.text }]}>
                    {signal.signal_type.replace('_', ' ')}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: impactColor(signal.impact_level) }]} />
              </View>
              <Text style={styles.cardTitle}>{signal.title}</Text>
              {signal.suggested_action && (
                <Text style={styles.cardSub}>{signal.suggested_action}</Text>
              )}
            </View>
          );
        })
      )}

      <SectionHeader title={`Open Tasks (${openTasks.length})`} />
      {openTasks.length === 0 ? (
        <EmptyState text="No open tasks." />
      ) : (
        openTasks.map((task) => (
          <View key={task.id} style={[styles.card, styles.taskCard]}>
            <View style={[styles.priorityDot, { backgroundColor: impactColor(task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') }]} />
            <Text style={styles.cardTitle}>{task.title}</Text>
            {task.description && <Text style={styles.cardSub}>{task.description}</Text>}
          </View>
        ))
      )}

      <SectionHeader title={`Contacts (${contacts.length})`} />
      {contacts.length === 0 ? (
        <EmptyState text="No contacts linked to this account." />
      ) : (
        contacts.map((contact) => (
          <View key={contact.id} style={[styles.card, styles.contactCard]}>
            <View style={styles.contactRow}>
              <View>
                <Text style={styles.cardTitle}>{contact.name}</Text>
                {contact.role && <Text style={styles.cardSub}>{contact.role}</Text>}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: Colors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: Colors.primary }]}>
                  {contact.relationship_status}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      <SectionHeader title="Recent Activities" />
      {recentActivities.length === 0 ? (
        <EmptyState text="No activities yet." />
      ) : (
        recentActivities.map((activity) => (
          <View key={activity.id} style={styles.activityRow}>
            <Text style={styles.activityType}>{activity.activity_type.replace(/_/g, ' ')}</Text>
            <Text style={styles.activitySummary}>{activity.summary}</Text>
            <Text style={styles.activityDate}>
              {new Date(activity.activity_date).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function EmptyState({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accountName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  accountLocation: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  momentumBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  momentumText: { fontSize: 12, fontWeight: '600', color: Colors.surface },
  nextActionBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  nextActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nextActionText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  taskCard: { flexDirection: 'column', gap: 6 },
  contactCard: {},
  signalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  activityRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  activityType: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activitySummary: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  activityDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 8 },
  errorText: { fontSize: 14, color: Colors.high },
  bottomSpacer: { height: 40 },
});
