import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { api } from '../../src/api/client';
import { Colors, impactColor, signalTypeColors } from '../../src/constants/colors';
import type { ExtractionResult } from '../../src/types';

const IMPACT_LABEL: Record<string, string> = {
  high: 'HIGH IMPACT',
  medium: 'MEDIUM IMPACT',
  low: 'LOW IMPACT',
};

type ReviewState = {
  accounts: boolean[];
  contacts: boolean[];
  signals: boolean[];
  tasks: boolean[];
};

export default function ReviewScreen() {
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id: string; preview: string }>();
  const extraction: ExtractionResult = JSON.parse(preview ?? '{}');

  const [review, setReview] = useState<ReviewState>({
    accounts: extraction.accounts.map(() => true),
    contacts: extraction.contacts.map(() => true),
    signals: extraction.signals.map(() => true),
    tasks: extraction.tasks.map(() => true),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);

  function reject(section: keyof ReviewState, index: number) {
    setReview((prev) => {
      const updated = [...prev[section]];
      updated[index] = false;
      return { ...prev, [section]: updated };
    });
  }

  function restore(section: keyof ReviewState, index: number) {
    setReview((prev) => {
      const updated = [...prev[section]];
      updated[index] = true;
      return { ...prev, [section]: updated };
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const filtered: ExtractionResult = {
      ...extraction,
      accounts: extraction.accounts.filter((_, i) => review.accounts[i]),
      contacts: extraction.contacts.filter((_, i) => review.contacts[i]),
      signals: extraction.signals.filter((_, i) => review.signals[i]),
      tasks: extraction.tasks.filter((_, i) => review.tasks[i]),
    };
    try {
      await api.approveJournal(Number(id), filtered);
      setSaved(true);
      setTimeout(() => router.replace('/'), 800);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <SectionHeader title="Accounts" />
        {extraction.accounts.map((account, i) => (
          <SwipeableRow
            key={i}
            accepted={review.accounts[i]}
            onReject={() => reject('accounts', i)}
            onRestore={() => restore('accounts', i)}
            prominent={false}
          >
            <Text style={[styles.itemTitle, !review.accounts[i] && styles.rejected]}>
              {account.name}
            </Text>
            {account.city && (
              <Text style={styles.itemSub}>
                {account.city}{account.state ? `, ${account.state}` : ''}
              </Text>
            )}
          </SwipeableRow>
        ))}

        <SectionHeader title="Signals" prominent />
        {extraction.signals.map((signal, i) => {
          const tc = signalTypeColors(signal.signal_type);
          return (
            <SwipeableRow
              key={i}
              accepted={review.signals[i]}
              onReject={() => reject('signals', i)}
              onRestore={() => restore('signals', i)}
              prominent
            >
              <View style={styles.signalHeader}>
                <View style={[styles.badge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.badgeText, { color: tc.text }]}>
                    {signal.signal_type.replace('_', ' ')}
                  </Text>
                </View>
                <View style={[styles.impactBadge, { borderColor: impactColor(signal.impact_level) }]}>
                  <Text style={[styles.impactBadgeText, { color: impactColor(signal.impact_level) }]}>
                    {IMPACT_LABEL[signal.impact_level] ?? signal.impact_level.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemTitle, !review.signals[i] && styles.rejected]}>
                {signal.title}
              </Text>
              {signal.suggested_action && (
                <Text style={styles.itemSub}>{signal.suggested_action}</Text>
              )}
            </SwipeableRow>
          );
        })}

        <SectionHeader title="Contacts" />
        {extraction.contacts.map((contact, i) => (
          <SwipeableRow
            key={i}
            accepted={review.contacts[i]}
            onReject={() => reject('contacts', i)}
            onRestore={() => restore('contacts', i)}
            prominent={false}
          >
            <Text style={[styles.itemTitle, !review.contacts[i] && styles.rejected]}>
              {contact.name}
            </Text>
            {contact.role && <Text style={styles.itemSub}>{contact.role}</Text>}
            {contact.account_name && (
              <Text style={styles.itemSub}>{contact.account_name}</Text>
            )}
          </SwipeableRow>
        ))}

        <TouchableOpacity
          style={styles.tasksCollapse}
          onPress={() => setTasksExpanded((v) => !v)}
        >
          <Text style={styles.tasksCollapseText}>
            Generated Tasks ({extraction.tasks.length}) {tasksExpanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        {tasksExpanded && extraction.tasks.map((task, i) => (
          <SwipeableRow
            key={i}
            accepted={review.tasks[i]}
            onReject={() => reject('tasks', i)}
            onRestore={() => restore('tasks', i)}
            prominent={false}
          >
            <View style={styles.taskRow}>
              <View style={[styles.priorityBadge, { backgroundColor: Colors.task }]}>
                <Text style={[styles.badgeText, { color: Colors.taskText }]}>{task.priority}</Text>
              </View>
            </View>
            <Text style={[styles.itemTitle, !review.tasks[i] && styles.rejected]}>
              {task.title}
            </Text>
            {task.account_name && <Text style={styles.itemSub}>{task.account_name}</Text>}
          </SwipeableRow>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.saveText}>{saved ? 'Saved!' : 'Save Memory'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionHeader({ title, prominent }: { title: string; prominent?: boolean }) {
  return (
    <Text style={[styles.sectionHeader, prominent && styles.sectionHeaderProminent]}>
      {title}
    </Text>
  );
}

function SwipeableRow({
  children,
  accepted,
  onReject,
  onRestore,
  prominent,
}: {
  children: React.ReactNode;
  accepted: boolean;
  onReject: () => void;
  onRestore: () => void;
  prominent: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  function renderRightAction(progress: Animated.AnimatedInterpolation<number>) {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            swipeableRef.current?.close();
            onReject();
          }}
        >
          <Text style={styles.deleteText}>Remove</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (!accepted) {
    return (
      <TouchableOpacity
        style={[styles.row, prominent && styles.rowProminent, styles.rowRejected]}
        onPress={onRestore}
      >
        <View style={styles.rowContent}>{children}</View>
        <Text style={styles.restoreText}>Undo</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightAction}
      rightThreshold={40}
      overshootRight={false}
    >
      <View style={[styles.row, prominent && styles.rowProminent]}>
        <View style={styles.rowContent}>{children}</View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 6,
  },
  sectionHeaderProminent: { color: Colors.primary, fontSize: 12 },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rowProminent: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  rowRejected: { opacity: 0.4 },
  rowContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  rejected: { textDecorationLine: 'line-through' },
  signalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  impactBadge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  impactBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tasksCollapse: {
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tasksCollapseText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  taskRow: { flexDirection: 'row', marginBottom: 4 },
  priorityBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  deleteAction: {
    marginBottom: 8,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.high,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 10,
    height: '100%',
  },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  restoreText: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginLeft: 8 },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  errorText: { color: Colors.high, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: Colors.surface, fontSize: 16, fontWeight: '700' },
  bottomSpacer: { height: 20 },
});
