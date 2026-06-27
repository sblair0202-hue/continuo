import { useLocalSearchParams } from 'expo-router';
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
import {
  Colors,
  impactColor,
  momentumBadgeColor,
  signalTypeColors,
} from '../../src/constants/colors';
import type { Account, Activity, Contact, Signal, Task } from '../../src/types';

const SIGNAL_GROUPS = [
  { key: 'opportunities', label: 'Opportunities', types: ['opportunity', 'win'] },
  { key: 'risks',         label: 'Risks',          types: ['risk'] },
  { key: 'milestones',    label: 'Milestones',     types: ['milestone'] },
  { key: 'crm',          label: 'CRM & Relationships', types: ['crm', 'relationship', 'continuity', 'referral_pathway'] },
  { key: 'other',        label: 'Other',           types: ['implementation', 'momentum', 'task', 'question'] },
] as const;

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    contacts: true,
    opportunities: true,
    risks: true,
    milestones: true,
    crm: true,
    other: true,
    tasks: true,
  });

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

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
  const activeSignals = signals.filter((s) => s.status === 'new');
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

      {/* Contacts — collapsible toggle at top */}
      <SectionToggle
        title="Contacts"
        count={contacts.length}
        expanded={expanded.contacts}
        onToggle={() => toggle('contacts')}
      />
      {expanded.contacts && (
        contacts.length === 0 ? (
          <EmptyState text="No contacts linked." />
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.card}>
              <View style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text style={styles.cardTitle}>{contact.name}</Text>
                  {contact.role && <Text style={styles.cardSub}>{contact.role}</Text>}
                  {contact.discipline && <Text style={styles.cardSub}>{contact.discipline}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: Colors.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: Colors.primary }]}>
                    {contact.relationship_status}
                  </Text>
                </View>
              </View>
              {contact.relationship_notes && (
                <Text style={[styles.cardSub, { marginTop: 6 }]}>{contact.relationship_notes}</Text>
              )}
            </View>
          ))
        )
      )}

      {/* Signals grouped by type */}
      {SIGNAL_GROUPS.map(({ key, label, types }) => {
        const groupSignals = activeSignals.filter((s) =>
          (types as readonly string[]).includes(s.signal_type)
        );
        if (groupSignals.length === 0) return null;
        return (
          <View key={key}>
            <SectionToggle
              title={label}
              count={groupSignals.length}
              expanded={expanded[key]}
              onToggle={() => toggle(key)}
            />
            {expanded[key] && groupSignals.map((signal) => {
              const tc = signalTypeColors(signal.signal_type);
              return (
                <View key={signal.id} style={styles.card}>
                  <View style={styles.signalMeta}>
                    <View style={[styles.badge, { backgroundColor: tc.bg }]}>
                      <Text style={[styles.badgeText, { color: tc.text }]}>
                        {signal.signal_type.replace(/_/g, ' ')}
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
            })}
          </View>
        );
      })}

      {/* Tasks */}
      <SectionToggle
        title="Tasks"
        count={openTasks.length}
        expanded={expanded.tasks}
        onToggle={() => toggle('tasks')}
      />
      {expanded.tasks && (
        openTasks.length === 0 ? (
          <EmptyState text="No open tasks." />
        ) : (
          openTasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <View style={styles.taskRow}>
                <View style={[styles.priorityDot, { backgroundColor: impactColor(task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.cardTitle}>{task.title}</Text>
                  {task.description && <Text style={styles.cardSub}>{task.description}</Text>}
                </View>
              </View>
            </View>
          ))
        )
      )}

      {/* Recent Activities — always visible at bottom */}
      <Text style={styles.sectionHeaderPlain}>Recent Activities</Text>
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

function SectionToggle({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sectionToggleRow} onPress={onToggle} activeOpacity={0.7}>
      <Text style={styles.sectionHeader}>{title} ({count})</Text>
      <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
    </TouchableOpacity>
  );
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
  sectionToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeaderPlain: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  chevron: { fontSize: 14, color: Colors.textSecondary },
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
  signalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contactInfo: { flex: 1 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskContent: { flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
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
