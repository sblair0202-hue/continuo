import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { Colors, Radius, impactColor, signalTypeColors, sp } from '../../src/constants/colors';
import type { Account, ExtractionResult } from '../../src/types';

const IMPACT_LABEL: Record<string, string> = {
  high: 'HIGH IMPACT',
  medium: 'MEDIUM IMPACT',
  low: 'LOW IMPACT',
};

const SIGNAL_TYPES = ['opportunity', 'risk', 'win', 'milestone', 'relationship', 'momentum', 'task', 'continuity'];
const IMPACT_LEVELS = ['high', 'medium', 'low'];
const PRIORITIES = ['high', 'medium', 'low'];

type Section = 'accounts' | 'contacts' | 'signals' | 'tasks';

type ReviewState = {
  accounts: boolean[];
  contacts: boolean[];
  signals: boolean[];
  tasks: boolean[];
};

type EditTarget = { section: Section; index: number } | null;

export default function ReviewScreen() {
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id: string; preview: string }>();

  const [draft, setDraft] = useState<ExtractionResult>(() => JSON.parse(preview ?? '{}'));
  const [review, setReview] = useState<ReviewState>(() => {
    const e: ExtractionResult = JSON.parse(preview ?? '{}');
    return {
      accounts: e.accounts.map(() => true),
      contacts: e.contacts.map(() => true),
      signals: e.signals.map(() => true),
      tasks: e.tasks.map(() => true),
    };
  });
  const [deferred, setDeferred] = useState<boolean[]>(() => {
    const e: ExtractionResult = JSON.parse(preview ?? '{}');
    return e.signals.map(() => false);
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [existingAccounts, setExistingAccounts] = useState<Account[]>([]);

  useEffect(() => {
    api.getAccounts().then(setExistingAccounts).catch(() => {});
  }, []);

  function findSimilarAccount(name: string): Account | null {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = norm(name);
    if (!target) return null;
    for (const a of existingAccounts) {
      const existing = norm(a.name);
      if (existing === target) return null; // exact match — get_or_create handles it fine
      if (existing.includes(target) || target.includes(existing)) return a;
    }
    return null;
  }

  function updateField(section: Section, index: number, fields: object) {
    setDraft(prev => ({
      ...prev,
      [section]: (prev[section] as object[]).map((item, i) =>
        i === index ? { ...item, ...fields } : item
      ),
    }));
  }

  function reject(section: Section, index: number) {
    setReview(prev => {
      const updated = [...prev[section]];
      updated[index] = false;
      return { ...prev, [section]: updated };
    });
  }

  function restore(section: Section, index: number) {
    setReview(prev => {
      const updated = [...prev[section]];
      updated[index] = true;
      return { ...prev, [section]: updated };
    });
  }

  function toggleDefer(i: number) {
    setDeferred(prev => { const next = [...prev]; next[i] = !next[i]; return next; });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const filtered: ExtractionResult = {
      ...draft,
      accounts: draft.accounts.filter((_, i) => review.accounts[i]),
      contacts: draft.contacts.filter((_, i) => review.contacts[i]),
      signals: draft.signals.flatMap((sig, i) =>
        review.signals[i]
          ? [{ ...sig, status: deferred[i] ? 'new' : 'accepted' }]
          : []
      ),
      tasks: draft.tasks.filter((_, i) => review.tasks[i]),
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
        {draft.accounts.map((account, i) => {
          const similar = findSimilarAccount(account.name);
          return (
            <SwipeableRow
              key={i}
              accepted={review.accounts[i]}
              onReject={() => reject('accounts', i)}
              onRestore={() => restore('accounts', i)}
              onEdit={() => setEditTarget({ section: 'accounts', index: i })}
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
              {similar && review.accounts[i] && (
                <View style={styles.mergeRow}>
                  <Text style={styles.mergeText}>⚠️ Similar account: "{similar.name}"</Text>
                  <TouchableOpacity
                    onPress={() => updateField('accounts', i, { name: similar.name })}
                    style={styles.mergeBtn}
                  >
                    <Text style={styles.mergeBtnText}>Merge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {/* keep as-is */}}
                    style={[styles.mergeBtn, styles.mergeBtnAlt]}
                  >
                    <Text style={[styles.mergeBtnText, { color: Colors.graphite }]}>Keep new</Text>
                  </TouchableOpacity>
                </View>
              )}
            </SwipeableRow>
          );
        })}

        <SectionHeader title="Signals" prominent />
        <Text style={styles.signalHint}>Swipe to remove · Tap to edit · Tap "Defer" to review later</Text>
        {draft.signals.map((signal, i) => {
          const tc = signalTypeColors(signal.signal_type);
          const isDeferred = deferred[i];
          return (
            <SwipeableRow
              key={i}
              accepted={review.signals[i]}
              onReject={() => reject('signals', i)}
              onRestore={() => restore('signals', i)}
              onEdit={() => setEditTarget({ section: 'signals', index: i })}
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
                <TouchableOpacity
                  style={[styles.deferBtn, isDeferred && styles.deferBtnActive]}
                  onPress={() => toggleDefer(i)}
                >
                  <Text style={[styles.deferBtnText, isDeferred && styles.deferBtnTextActive]}>
                    {isDeferred ? '⏰ Deferred' : 'Defer'}
                  </Text>
                </TouchableOpacity>
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
        {draft.contacts.map((contact, i) => (
          <SwipeableRow
            key={i}
            accepted={review.contacts[i]}
            onReject={() => reject('contacts', i)}
            onRestore={() => restore('contacts', i)}
            onEdit={() => setEditTarget({ section: 'contacts', index: i })}
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
            Generated Tasks ({draft.tasks.length}) {tasksExpanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        {tasksExpanded && draft.tasks.map((task, i) => (
          <SwipeableRow
            key={i}
            accepted={review.tasks[i]}
            onReject={() => reject('tasks', i)}
            onRestore={() => restore('tasks', i)}
            onEdit={() => setEditTarget({ section: 'tasks', index: i })}
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

      {editTarget && (
        <EditSheet
          section={editTarget.section}
          item={(draft[editTarget.section] as object[])[editTarget.index]}
          onSave={(fields) => {
            updateField(editTarget.section, editTarget.index, fields);
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </View>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function EditSheet({
  section,
  item,
  onSave,
  onClose,
}: {
  section: Section;
  item: Record<string, unknown>;
  onSave: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [local, setLocal] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  function set(key: string, val: string) {
    setLocal(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    onSave(local);
  }

  const sectionLabel: Record<Section, string> = {
    accounts: 'Account',
    contacts: 'Contact',
    signals: 'Signal',
    tasks: 'Task',
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, es.backdrop, { opacity: backdropOpacity }]} />
      </Pressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={es.kav}
        pointerEvents="box-none"
      >
        <Animated.View style={[es.sheet, { paddingBottom: insets.bottom + sp.md, transform: [{ translateY: slideY }] }]}>
          <View style={es.handle} />
          <Text style={es.heading}>Edit {sectionLabel[section]}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {section === 'accounts' && (
              <>
                <Field label="Name" value={local.name ?? ''} onChangeText={v => set('name', v)} />
                <Field label="City" value={local.city ?? ''} onChangeText={v => set('city', v)} />
                <Field label="State" value={local.state ?? ''} onChangeText={v => set('state', v)} maxLength={2} autoCapitalize="characters" />
                <Field label="Status" value={local.status ?? ''} onChangeText={v => set('status', v)} placeholder="Active, Warm, At Risk…" />
                <Field label="Next Action" value={local.next_action ?? ''} onChangeText={v => set('next_action', v)} multiline />
              </>
            )}

            {section === 'contacts' && (
              <>
                <Field label="Name" value={local.name ?? ''} onChangeText={v => set('name', v)} />
                <Field label="Role / Title" value={local.role ?? ''} onChangeText={v => set('role', v)} />
                <Field label="Account" value={local.account_name ?? ''} onChangeText={v => set('account_name', v)} />
                <Field label="Relationship Note" value={local.relationship_note ?? ''} onChangeText={v => set('relationship_note', v)} multiline />
              </>
            )}

            {section === 'signals' && (
              <>
                <Field label="Title" value={local.title ?? ''} onChangeText={v => set('title', v)} />
                <Field label="Suggested Action" value={local.suggested_action ?? ''} onChangeText={v => set('suggested_action', v)} multiline />
                <Field label="Summary" value={local.summary ?? ''} onChangeText={v => set('summary', v)} multiline />
                <ChipField
                  label="Type"
                  options={SIGNAL_TYPES}
                  value={local.signal_type ?? ''}
                  onSelect={v => set('signal_type', v)}
                />
                <ChipField
                  label="Impact"
                  options={IMPACT_LEVELS}
                  value={local.impact_level ?? ''}
                  onSelect={v => set('impact_level', v)}
                />
              </>
            )}

            {section === 'tasks' && (
              <>
                <Field label="Title" value={local.title ?? ''} onChangeText={v => set('title', v)} />
                <Field label="Description" value={local.description ?? ''} onChangeText={v => set('description', v)} multiline />
                <Field label="Account" value={local.account_name ?? ''} onChangeText={v => set('account_name', v)} />
                <ChipField
                  label="Priority"
                  options={PRIORITIES}
                  value={local.priority ?? ''}
                  onSelect={v => set('priority', v)}
                />
              </>
            )}

            <View style={{ height: sp.md }} />
          </ScrollView>

          <View style={es.btnRow}>
            <TouchableOpacity style={es.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={es.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={es.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={es.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={es.field}>
      <Text style={es.fieldLabel}>{label}</Text>
      <TextInput
        style={[es.fieldInput, multiline && es.fieldInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={Colors.stone}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function ChipField({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={es.field}>
      <Text style={es.fieldLabel}>{label}</Text>
      <View style={es.chips}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[es.chip, value === opt && es.chipActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <Text style={[es.chipText, value === opt && es.chipTextActive]}>
              {opt.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Swipeable Row ────────────────────────────────────────────────────────────

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
  onEdit,
  prominent,
}: {
  children: React.ReactNode;
  accepted: boolean;
  onReject: () => void;
  onRestore: () => void;
  onEdit: () => void;
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
      <TouchableOpacity
        style={[styles.row, prominent && styles.rowProminent]}
        onPress={onEdit}
        activeOpacity={0.85}
      >
        <View style={styles.rowContent}>{children}</View>
        <Text style={styles.editIcon}>✏️</Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  editIcon: { fontSize: 14, opacity: 0.4, marginLeft: sp.sm },
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
  deleteAction: { marginBottom: 8, justifyContent: 'center' },
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
  signalHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, marginTop: -4 },
  mergeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  mergeText: { fontSize: 11, color: Colors.clay, flex: 1, flexShrink: 1 },
  mergeBtn: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, backgroundColor: Colors.sage, minWidth: 48, alignItems: 'center' },
  mergeBtnAlt: { backgroundColor: Colors.linen },
  mergeBtnText: { fontSize: 11, fontWeight: '700', color: Colors.paper },
  deferBtn: {
    marginLeft: 'auto',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deferBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#E67E22' },
  deferBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  deferBtnTextActive: { color: '#E67E22' },
});

const es = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(42,35,28,0.45)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: sp.sm,
    paddingHorizontal: sp.md,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.mist,
    alignSelf: 'center',
    marginBottom: sp.md,
  },
  heading: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 17,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: sp.md,
  },
  field: { marginBottom: sp.md },
  fieldLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 11,
    color: Colors.graphite,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: sp.sm,
  },
  fieldInput: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.sm,
    paddingHorizontal: sp.md,
    paddingVertical: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  fieldInputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  chip: {
    paddingHorizontal: sp.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mist,
    backgroundColor: Colors.paper,
  },
  chipActive: {
    backgroundColor: Colors.skyTint,
    borderColor: Colors.sky,
  },
  chipText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13,
    color: Colors.graphite,
  },
  chipTextActive: {
    color: Colors.sky,
  },
  btnRow: {
    flexDirection: 'row',
    gap: sp.sm,
    paddingTop: sp.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.mist,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: Colors.graphite,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    backgroundColor: Colors.inkDark,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.reversed,
  },
});
