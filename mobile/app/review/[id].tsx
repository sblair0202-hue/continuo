import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import { Colors, impactColor, signalTypeColors } from '../../src/constants/colors';
import type { ExtractionResult } from '../../src/types';

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

  function toggle(section: keyof ReviewState, index: number) {
    setReview((prev) => {
      const updated = [...prev[section]];
      updated[index] = !updated[index];
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
          <ReviewRow
            key={i}
            accepted={review.accounts[i]}
            onToggle={() => toggle('accounts', i)}
          >
            <Text style={[styles.itemTitle, !review.accounts[i] && styles.rejected]}>
              {account.name}
            </Text>
            {account.city && (
              <Text style={styles.itemSub}>
                {account.city}{account.state ? `, ${account.state}` : ''}
              </Text>
            )}
          </ReviewRow>
        ))}

        <SectionHeader title="Contacts" />
        {extraction.contacts.map((contact, i) => (
          <ReviewRow
            key={i}
            accepted={review.contacts[i]}
            onToggle={() => toggle('contacts', i)}
          >
            <Text style={[styles.itemTitle, !review.contacts[i] && styles.rejected]}>
              {contact.name}
            </Text>
            {contact.role && <Text style={styles.itemSub}>{contact.role}</Text>}
            {contact.account_name && (
              <Text style={styles.itemSub}>{contact.account_name}</Text>
            )}
          </ReviewRow>
        ))}

        <SectionHeader title="Signals" prominent />
        {extraction.signals.map((signal, i) => {
          const tc = signalTypeColors(signal.signal_type);
          return (
            <ReviewRow
              key={i}
              accepted={review.signals[i]}
              onToggle={() => toggle('signals', i)}
              prominent
            >
              <View style={styles.signalHeader}>
                <View style={[styles.badge, { backgroundColor: tc.bg }]}>
                  <Text style={[styles.badgeText, { color: tc.text }]}>
                    {signal.signal_type.replace('_', ' ')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.impactDot,
                    { backgroundColor: impactColor(signal.impact_level) },
                  ]}
                />
              </View>
              <Text style={[styles.itemTitle, !review.signals[i] && styles.rejected]}>
                {signal.title}
              </Text>
              {signal.suggested_action && (
                <Text style={styles.itemSub}>{signal.suggested_action}</Text>
              )}
            </ReviewRow>
          );
        })}

        <SectionHeader title="Tasks" />
        {extraction.tasks.map((task, i) => (
          <ReviewRow
            key={i}
            accepted={review.tasks[i]}
            onToggle={() => toggle('tasks', i)}
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
          </ReviewRow>
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
            <Text style={styles.saveText}>{saved ? 'Saved!' : 'Save Approved'}</Text>
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

function ReviewRow({
  children,
  accepted,
  onToggle,
  prominent,
}: {
  children: React.ReactNode;
  accepted: boolean;
  onToggle: () => void;
  prominent?: boolean;
}) {
  return (
    <View style={[styles.row, prominent && styles.rowProminent, !accepted && styles.rowRejected]}>
      <View style={styles.rowContent}>{children}</View>
      <TouchableOpacity style={styles.toggleButton} onPress={onToggle}>
        <Text style={[styles.toggleText, accepted ? styles.toggleAccept : styles.toggleReject]}>
          {accepted ? '✓' : '✗'}
        </Text>
      </TouchableOpacity>
    </View>
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
  rowRejected: { opacity: 0.45 },
  rowContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  rejected: { textDecorationLine: 'line-through' },
  signalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  impactDot: { width: 8, height: 8, borderRadius: 4 },
  taskRow: { flexDirection: 'row', marginBottom: 4 },
  priorityBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginLeft: 10,
  },
  toggleText: { fontSize: 16, fontWeight: '700' },
  toggleAccept: { color: Colors.low },
  toggleReject: { color: Colors.high },
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
