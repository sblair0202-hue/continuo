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
import { Colors, impactColor } from '../../src/constants/colors';
import type { Account, CalendarEvent, Signal, Task } from '../../src/types';

type Situation = {
  key: string;
  signal_type: Signal['signal_type'];
  title: string;
  suggested_action: string | null;
  impact_level: Signal['impact_level'];
  count: number;
};

function groupIntoSituations(signals: Signal[]): Situation[] {
  const map = new Map<string, Signal[]>();
  for (const s of signals) {
    const k = `${s.account_id ?? 'none'}-${s.signal_type}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return Array.from(map.entries())
    .map(([key, group]) => {
      group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = group[0];
      return {
        key,
        signal_type: latest.signal_type,
        title: latest.title,
        suggested_action: latest.suggested_action,
        impact_level: latest.impact_level,
        count: group.length,
      };
    })
    .sort((a, b) => (order[a.impact_level] ?? 3) - (order[b.impact_level] ?? 3));
}

const SIGNAL_ICON: Record<string, string> = {
  risk: '⚠',
  opportunity: '🟢',
  crm: '🟡',
  relationship: '🤝',
  milestone: '✅',
  continuity: '🔄',
  referral_pathway: '📍',
  implementation: '🛠',
  momentum: '📈',
  win: '🏆',
  question: '❓',
  task: '📋',
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function TodayScreen() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    Promise.all([
      api.getSignals(),
      api.getTasks(),
      api.getAccounts(),
      api.getCalendarStatus().catch(() => ({ connected: false })),
    ])
      .then(([s, t, a, cal]) => {
        setSignals(s);
        setTasks(t);
        setAccounts(a);
        setCalendarConnected(cal.connected);
        if (cal.connected) {
          api.getTodayEvents()
            .then(setMeetings)
            .catch(() => setMeetings([]));
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Territory Pulse
  const healthyAccounts = accounts.filter(
    (a) => ['rising', 'stable', 'increased', 'strong'].includes(a.momentum)
  );
  const attentionAccounts = accounts.filter(
    (a) => ['declining', 'decreased', 'at_risk', 'unknown'].includes(a.momentum)
  );
  const riskSignals = signals.filter((s) => s.signal_type === 'risk' && s.status === 'new');
  const opportunities = signals.filter((s) => s.signal_type === 'opportunity' && s.status === 'new');

  // Situations: group high+medium signals by (account, type) to collapse duplicates
  const situations = groupIntoSituations(
    signals.filter((s) => s.status === 'new' && (s.impact_level === 'high' || s.impact_level === 'medium'))
  ).slice(0, 8);

  // Don't Forget: high-priority open tasks + accounts with no recent activity
  const urgentTasks = tasks.filter((t) => t.status === 'open' && t.priority === 'high').slice(0, 4);
  const stalledAccounts = accounts
    .filter((a) => {
      const days = daysSince(a.last_activity_at);
      return days !== null && days > 14;
    })
    .slice(0, 3);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasData = accounts.length > 0 || signals.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={Colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{getGreeting()}, Sarah</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {!hasData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your territory is empty.</Text>
            <Text style={styles.emptySubtitle}>Tap Capture to submit your first recap and build your memory.</Text>
          </View>
        ) : (
          <>
            {/* Territory Pulse */}
            <Text style={styles.sectionLabel}>Territory Pulse</Text>
            <View style={styles.pulseRow}>
              <PulseTile value={healthyAccounts.length} label="Healthy" color={Colors.low} onPress={() => router.push('/(tabs)/accounts')} />
              <PulseTile value={attentionAccounts.length} label="Attention" color={Colors.medium} onPress={() => router.push('/(tabs)/accounts')} />
              <PulseTile value={riskSignals.length} label="Risks" color={Colors.high} onPress={() => router.push('/(tabs)/accounts')} />
              <PulseTile value={opportunities.length} label="Opps" color={Colors.primary} onPress={() => router.push('/(tabs)/accounts')} />
            </View>

            {/* Today's Meetings */}
            {calendarConnected && meetings.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Today's Meetings</Text>
                {meetings.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.meetingCard}
                    onPress={() => router.push(`/meeting/${encodeURIComponent(event.id)}?account_id=${event.account_id ?? ''}&title=${encodeURIComponent(event.title)}`)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.meetingTimeCol}>
                      <Text style={styles.meetingTime}>{formatTime(event.start)}</Text>
                    </View>
                    <View style={styles.meetingContent}>
                      <Text style={styles.meetingTitle} numberOfLines={1}>{event.title}</Text>
                      {event.account_name && (
                        <Text style={styles.meetingAccount}>{event.account_name}</Text>
                      )}
                      <View style={styles.meetingMeta}>
                        {event.signal_count > 0 && (
                          <View style={[styles.metaChip, { backgroundColor: Colors.primaryLight }]}>
                            <Text style={[styles.metaChipText, { color: Colors.primary }]}>
                              {event.signal_count} signal{event.signal_count !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        )}
                        {event.attendees.length > 0 && (
                          <Text style={styles.meetingAttendees} numberOfLines={1}>
                            {event.attendees.slice(0, 2).join(', ')}{event.attendees.length > 2 ? ` +${event.attendees.length - 2}` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.meetingChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Needs Attention — situations collapse duplicate signals */}
            {situations.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Needs Attention</Text>
                {situations.map((situation) => (
                  <View key={situation.key} style={[styles.attentionCard, { borderLeftColor: impactColor(situation.impact_level) }]}>
                    <View style={styles.attentionRow}>
                      <Text style={styles.attentionIcon}>
                        {SIGNAL_ICON[situation.signal_type] ?? '•'}
                      </Text>
                      <View style={styles.attentionContent}>
                        <Text style={styles.attentionTitle}>{situation.title}</Text>
                        {situation.suggested_action && (
                          <Text style={styles.attentionSub}>{situation.suggested_action}</Text>
                        )}
                      </View>
                      {situation.count > 1 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countText}>{situation.count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Don't Forget */}
            {(urgentTasks.length > 0 || stalledAccounts.length > 0) && (
              <>
                <Text style={styles.sectionLabel}>Don't Forget</Text>
                <View style={styles.dontForgetCard}>
                  {urgentTasks.map((task) => (
                    <View key={task.id} style={styles.forgetRow}>
                      <View style={[styles.forgetDot, { backgroundColor: Colors.high }]} />
                      <Text style={styles.forgetText}>{task.title}</Text>
                    </View>
                  ))}
                  {stalledAccounts.map((account) => {
                    const days = daysSince(account.last_activity_at);
                    return (
                      <TouchableOpacity
                        key={account.id}
                        style={styles.forgetRow}
                        onPress={() => router.push(`/account/${account.id}`)}
                      >
                        <View style={[styles.forgetDot, { backgroundColor: Colors.medium }]} />
                        <Text style={styles.forgetText}>
                          No update on {account.name} in {days} days
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabButton} onPress={() => router.push('/new-recap')}>
          <Text style={styles.fabText}>🎤  New Recap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PulseTile({ value, label, color, onPress }: { value: number; label: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.pulseTile} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.pulseValue, { color }]}>{value}</Text>
      <Text style={styles.pulseLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 100 },

  greeting: { marginBottom: 24 },
  greetingText: { fontSize: 22, fontWeight: '700', color: Colors.text },
  dateText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
  },

  // Territory Pulse
  pulseRow: { flexDirection: 'row', gap: 10 },
  pulseTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pulseValue: { fontSize: 26, fontWeight: '800' },
  pulseLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },

  countBadge: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8, alignSelf: 'center' },
  countText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // Needs Attention
  attentionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  attentionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  attentionIcon: { fontSize: 18, lineHeight: 24 },
  attentionContent: { flex: 1 },
  attentionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 20 },
  attentionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },

  // Don't Forget
  dontForgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  forgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  forgetDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  forgetText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },

  // Empty state
  emptyState: { marginTop: 60, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  errorText: { fontSize: 14, color: Colors.high, marginBottom: 8 },
  bottomSpacer: { height: 20 },

  // Meeting cards
  meetingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  meetingTimeCol: { width: 56, alignItems: 'center' },
  meetingTime: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  meetingContent: { flex: 1 },
  meetingTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  meetingAccount: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  meetingMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  metaChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  metaChipText: { fontSize: 11, fontWeight: '600' },
  meetingAttendees: { fontSize: 11, color: Colors.textSecondary, flex: 1 },
  meetingChevron: { fontSize: 20, color: Colors.textSecondary, paddingLeft: 4 },

  // FAB
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  fabButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
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
