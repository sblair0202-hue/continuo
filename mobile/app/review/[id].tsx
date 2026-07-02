import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { useOrb } from '../../src/context/OrbContext';
import { Colors } from '../../src/constants/colors';
import type { ExtractionResult, ExtractedSignal } from '../../src/types';

// ─── Helper: derive display sections from ExtractionResult ────────────────────

function deriveAccounts(e: ExtractionResult): string[] {
  const set = new Set<string>();
  e.accounts.forEach(a => a.name && set.add(a.name));
  e.contacts.forEach(c => c.account_name && set.add(c.account_name));
  (e.signals ?? []).forEach(s => s.account_name && set.add(s.account_name));
  (e.activities ?? []).forEach((a: any) => a.account_name && set.add(a.account_name));
  (e.tasks ?? []).forEach(t => t.account_name && set.add(t.account_name));
  return Array.from(set).filter(Boolean);
}

function noteSignals(signals: ExtractedSignal[]) {
  return signals.filter(s => !['opportunity', 'win', 'milestone'].includes(s.signal_type));
}
function opportunitySignals(signals: ExtractedSignal[]) {
  return signals.filter(s => s.signal_type === 'opportunity' || s.signal_type === 'win');
}
function milestoneSignals(signals: ExtractedSignal[]) {
  return signals.filter(s => s.signal_type === 'milestone');
}

// ─── Inline-editable field ────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  style,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  style?: object;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        s.editableField,
        style,
        focused && s.editableFieldFocused,
        multiline && s.editableFieldMulti,
      ]}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={Colors.stone}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
}

// ─── Row with × remove ────────────────────────────────────────────────────────

function RemovableRow({
  kept,
  onRemove,
  children,
}: {
  kept: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  if (!kept) return null;
  return (
    <View style={s.removableRow}>
      <View style={s.removableContent}>{children}</View>
      <TouchableOpacity onPress={onRemove} style={s.removeBtn} activeOpacity={0.6} hitSlop={8}>
        <Text style={s.removeBtnText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  eyebrow,
  eyebrowColor,
  eyebrowTrailing,
  borderColor,
  children,
}: {
  eyebrow: string;
  eyebrowColor?: string;
  eyebrowTrailing?: React.ReactNode;
  borderColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.card, borderColor ? { borderColor } : null]}>
      <View style={s.cardEyebrowRow}>
        <Text style={[s.cardEyebrow, eyebrowColor ? { color: eyebrowColor } : null]}>
          {eyebrow}
        </Text>
        {eyebrowTrailing}
      </View>
      {children}
    </View>
  );
}

// ─── Capture Orb (save overlay) ───────────────────────────────────────────────

function SaveOrb({ state }: { state: 'saving' | 'saved' | 'later' }) {
  const spin = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'saving') {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1700, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else if (state === 'saved') {
      spin.stopAnimation();
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringColor = state === 'saved' ? Colors.sage : Colors.sky;

  return (
    <View style={so.orb}>
      <LinearGradient
        colors={['#ffffff', '#F4F2EE', '#E5E0DA']}
        start={{ x: 0.36, y: 0.22 }}
        end={{ x: 0.64, y: 1.0 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 65 }]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: ringOpacity }]}>
        <Svg width={130} height={130} viewBox="0 0 130 130" fill="none">
          <Circle cx="65" cy="65" r="38" stroke={ringColor} strokeWidth="9" />
        </Svg>
      </Animated.View>
      {/* Spinning orbit dot (saving) */}
      {state === 'saving' && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]} pointerEvents="none">
          <View style={so.orbitDot} />
        </Animated.View>
      )}
      {/* Checkmark (saved) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: checkOpacity, alignItems: 'center', justifyContent: 'center' }]}>
        <Svg width={40} height={32} viewBox="0 0 40 32" fill="none">
          <Polyline points="4,16 16,28 36,4" stroke={Colors.sage} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type SavePhase = null | 'saving' | 'saved' | 'savingLater' | 'later';

export default function ReviewScreen() {
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id: string; preview: string }>();
  const insets = useSafeAreaInsets();
  const { flashComplete } = useOrb();

  const parsed: ExtractionResult = preview ? JSON.parse(preview) : {} as ExtractionResult;

  // Editable state
  const [summary, setSummary] = useState(parsed.summary ?? '');
  const [accounts, setAccounts] = useState<{ name: string; kept: boolean }[]>(() =>
    deriveAccounts(parsed).map(name => ({ name, kept: true }))
  );
  // Per-account-name match candidates for "did you mean?" disambiguation
  const [matches, setMatches] = useState<Record<string, { id: number; name: string }[]>>({});
  const [dismissedMatch, setDismissedMatch] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // For each extracted account, ask the backend if it looks like an existing one
    accounts.forEach(a => {
      const key = a.name.trim();
      if (!key || matches[key] !== undefined) return;
      api.matchAccount(key)
        .then(r => {
          const cands: { id: number; name: string }[] = [];
          if (r.exact_match) return; // exact match — no prompt needed, save will link it
          r.candidates.forEach(c => cands.push({ id: c.id, name: c.name }));
          if (cands.length) setMatches(prev => ({ ...prev, [key]: cands }));
          else setMatches(prev => ({ ...prev, [key]: [] }));
        })
        .catch(() => setMatches(prev => ({ ...prev, [key]: [] })));
    });
  }, [accounts]);
  const [people, setPeople] = useState<{ name: string; role: string; account_name: string; kept: boolean }[]>(() =>
    (parsed.contacts ?? []).map(c => ({ name: c.name, role: c.role ?? '', account_name: c.account_name ?? '', kept: true }))
  );
  const [tasks, setTasks] = useState<{ title: string; account_name: string; kept: boolean }[]>(() =>
    (parsed.tasks ?? []).map(t => ({ title: t.title, account_name: t.account_name ?? '', kept: true }))
  );
  const [activities, setActivities] = useState<{ type: string; account_name: string; kept: boolean }[]>(() =>
    (parsed.activities ?? []).map((a: any) => ({ type: a.type ?? a.activity_type ?? '', account_name: a.account_name ?? '', kept: true }))
  );
  const [notes, setNotes] = useState(() => {
    const sigs = noteSignals(parsed.signals ?? []);
    return sigs.map(s => s.title).join('\n');
  });
  const [opportunities, setOpportunities] = useState<{ title: string; account_name: string; kept: boolean }[]>(() => [
    ...opportunitySignals(parsed.signals ?? []).map(s => ({ title: s.title, account_name: s.account_name ?? '', kept: true })),
    ...(parsed.opportunities ?? []).map(o => ({ title: o, account_name: '', kept: true })),
  ]);
  const [milestones, setMilestones] = useState<{ title: string; kept: boolean }[]>(() =>
    milestoneSignals(parsed.signals ?? []).map(s => ({ title: s.title, kept: true }))
  );

  const [savePhase, setSavePhase] = useState<SavePhase>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [sfNote, setSfNote]             = useState<string | null>(null);
  const [sfLoading, setSfLoading]       = useState(false);
  const [sfModalVisible, setSfModal]    = useState(false);
  const [sfCopied, setSfCopied]         = useState(false);

  async function handleSfPrep() {
    setSfLoading(true);
    try {
      const result = await api.getSalesforcePrep(Number(id));
      setSfNote(result.salesforce_note);
      setSfModal(true);
    } catch {
      setSfNote('Could not generate Salesforce update. Try again.');
      setSfModal(true);
    } finally {
      setSfLoading(false);
    }
  }

  function handleCopySf() {
    if (sfNote) {
      Clipboard.setString(sfNote);
      setSfCopied(true);
      setTimeout(() => setSfCopied(false), 2000);
    }
  }

  async function handleEmailSf() {
    if (!sfNote) return;
    try {
      await Share.share({ message: sfNote, title: 'Salesforce Activity Update' });
    } catch { /* user cancelled */ }
  }

  function showOverlay() {
    Animated.timing(overlayOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }

  async function handleSave() {
    setSavePhase('saving');
    showOverlay();
    setSaveError(null);

    // Build the approval payload from kept items
    const filteredSignals = [
      ...opportunities.filter(o => o.kept).map(o => ({
        signal_type: 'opportunity' as const,
        title: o.title,
        account_name: o.account_name || null,
        contact_names: [],
        confidence_score: 0.8,
        impact_level: 'medium' as const,
        urgency: 'low' as const,
        summary: null,
        evidence_text: null,
        suggested_action: null,
        status: 'accepted',
      })),
      ...milestones.filter(m => m.kept).map(m => ({
        signal_type: 'milestone' as const,
        title: m.title,
        account_name: null,
        contact_names: [],
        confidence_score: 0.8,
        impact_level: 'medium' as const,
        urgency: 'low' as const,
        summary: null,
        evidence_text: null,
        suggested_action: null,
        status: 'accepted',
      })),
    ];

    const payload: ExtractionResult = {
      ...parsed,
      summary,
      accounts: accounts.filter(a => a.kept).map(a => ({ ...({} as any), name: a.name })),
      contacts: people.filter(p => p.kept).map(p => ({ ...({} as any), name: p.name, role: p.role, account_name: p.account_name })),
      tasks: tasks.filter(t => t.kept).map(t => ({ ...({} as any), title: t.title, account_name: t.account_name })),
      activities: activities.filter(a => a.kept).map(a => ({
        activity_type: a.type || 'visit',
        summary: a.type || 'Field activity',
        account_name: a.account_name || null,
      })),
      signals: filteredSignals,
    };

    try {
      await api.approveJournal(Number(id), payload);
      setSavePhase('saved');
      flashComplete();
      setTimeout(() => router.replace('/'), 1800);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.');
      setSavePhase(null);
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  }

  async function handleSaveLater() {
    setSavePhase('savingLater');
    showOverlay();
    setSaveError(null);
    try {
      await api.saveForLater(Number(id));
      setSavePhase('later');
      setTimeout(() => router.replace('/'), 1700);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save for later.');
      setSavePhase(null);
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  }

  function handleDiscard() {
    Alert.alert(
      'Discard this note?',
      'This deletes the capture. Nothing will be saved to your accounts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard', style: 'destructive',
          onPress: async () => {
            try { await api.discardJournal(Number(id)); } catch {}
            router.replace('/');
          },
        },
      ]
    );
  }

  const isSaving = savePhase === 'saving' || savePhase === 'savingLater';
  const keptOpps = opportunities.filter(o => o.kept);
  const keptMiles = milestones.filter(m => m.kept);

  return (
    <View style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[s.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={s.discardBtn} onPress={handleDiscard} activeOpacity={0.7} disabled={isSaving}>
              <Text style={s.discardBtnText}>Discard</Text>
            </TouchableOpacity>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.titleText}>Review</Text>
            <Text style={s.titleSub}>Review and edit before saving.</Text>
          </View>

          {/* Summary */}
          <SectionCard eyebrow="SUMMARY">
            <EditableText
              value={summary}
              onChange={setSummary}
              multiline
              placeholder="AI summary will appear here…"
              style={s.summaryText}
            />
          </SectionCard>

          {/* Accounts */}
          {accounts.some(a => a.kept) && (
            <SectionCard eyebrow="ACCOUNTS">
              {accounts.map((a, i) => {
                const cands = matches[a.name.trim()];
                const showPrompt = cands && cands.length > 0 && !dismissedMatch[a.name.trim()];
                return (
                <RemovableRow key={i} kept={a.kept} onRemove={() => setAccounts(prev => prev.map((x, j) => j === i ? { ...x, kept: false } : x))}>
                  <View style={s.accountRow}>
                    <View style={s.accountTile}>
                      <View style={s.accountDot} />
                    </View>
                    <EditableText
                      value={a.name}
                      onChange={v => setAccounts(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x))}
                      style={s.accountName}
                    />
                  </View>
                  {showPrompt && (
                    <View style={s.matchPrompt}>
                      <Text style={s.matchPromptText}>We heard "{a.name.trim()}" — did you mean:</Text>
                      {cands.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={s.matchOption}
                          activeOpacity={0.7}
                          onPress={() => {
                            // Use existing account: set name to the exact existing name so save links it
                            setAccounts(prev => prev.map((x, j) => j === i ? { ...x, name: c.name } : x));
                            setDismissedMatch(prev => ({ ...prev, [a.name.trim()]: true, [c.name.trim()]: true }));
                          }}
                        >
                          <Text style={s.matchOptionText}>Use {c.name}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={s.matchDismiss}
                        activeOpacity={0.7}
                        onPress={() => setDismissedMatch(prev => ({ ...prev, [a.name.trim()]: true }))}
                      >
                        <Text style={s.matchDismissText}>No, this is a new account</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </RemovableRow>
                );
              })}
            </SectionCard>
          )}

          {/* People */}
          {people.some(p => p.kept) && (
            <SectionCard eyebrow="PEOPLE">
              {people.map((p, i) => (
                <RemovableRow key={i} kept={p.kept} onRemove={() => setPeople(prev => prev.map((x, j) => j === i ? { ...x, kept: false } : x))}>
                  <View style={s.personRow}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{p.name ? p.name[0].toUpperCase() : '?'}</Text>
                    </View>
                    <View style={s.personInfo}>
                      <View style={s.personNameRow}>
                        <EditableText
                          value={p.name}
                          onChange={v => setPeople(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x))}
                          style={s.personName}
                        />
                        <View style={s.newPill}><Text style={s.newPillText}>NEW</Text></View>
                      </View>
                      <EditableText
                        value={p.role}
                        onChange={v => setPeople(prev => prev.map((x, j) => j === i ? { ...x, role: v } : x))}
                        placeholder="Role / Title"
                        style={s.personRole}
                      />
                    </View>
                  </View>
                </RemovableRow>
              ))}
            </SectionCard>
          )}

          {/* Tasks */}
          {tasks.some(t => t.kept) && (
            <SectionCard eyebrow="TASKS">
              {tasks.map((t, i) => (
                <RemovableRow key={i} kept={t.kept} onRemove={() => setTasks(prev => prev.map((x, j) => j === i ? { ...x, kept: false } : x))}>
                  <View style={s.taskRow}>
                    <View style={s.taskDot} />
                    <View style={s.taskInfo}>
                      <EditableText
                        value={t.title}
                        onChange={v => setTasks(prev => prev.map((x, j) => j === i ? { ...x, title: v } : x))}
                        style={s.taskTitle}
                      />
                      {t.account_name ? (
                        <Text style={s.taskMeta}>{t.account_name}</Text>
                      ) : null}
                    </View>
                  </View>
                </RemovableRow>
              ))}
            </SectionCard>
          )}

          {/* Activities */}
          {activities.some(a => a.kept) && (
            <SectionCard eyebrow="ACTIVITIES">
              {activities.map((a, i) => (
                <RemovableRow key={i} kept={a.kept} onRemove={() => setActivities(prev => prev.map((x, j) => j === i ? { ...x, kept: false } : x))}>
                  <View style={s.activityRow}>
                    <View style={s.activityTile}>
                      <Text style={s.activityTileIcon}>📅</Text>
                    </View>
                    <View style={s.activityInfo}>
                      <EditableText
                        value={a.type}
                        onChange={v => setActivities(prev => prev.map((x, j) => j === i ? { ...x, type: v } : x))}
                        style={s.activityType}
                      />
                      {a.account_name ? <Text style={s.activityMeta}>{a.account_name}</Text> : null}
                    </View>
                  </View>
                </RemovableRow>
              ))}
            </SectionCard>
          )}

          {/* Notes */}
          <SectionCard eyebrow="NOTES">
            <EditableText
              value={notes}
              onChange={setNotes}
              multiline
              placeholder="Additional notes from this capture…"
              style={s.notesText}
            />
          </SectionCard>

          {/* Opportunities (conditional) */}
          {keptOpps.length > 0 && (
            <SectionCard
              eyebrow="OPPORTUNITIES"
              eyebrowColor={Colors.sky}
              borderColor={Colors.skyTint}
              eyebrowTrailing={
                <View style={s.detectedPill}>
                  <Text style={s.detectedPillText}>DETECTED</Text>
                </View>
              }
            >
              {opportunities.map((o, i) => (
                <RemovableRow key={i} kept={o.kept} onRemove={() => setOpportunities(prev => prev.map((x, j) => j === i ? { ...x, kept: false } : x))}>
                  <View style={s.oppRow}>
                    <View style={s.oppDot} />
                    <View style={s.oppInfo}>
                      <EditableText
                        value={o.title}
                        onChange={v => setOpportunities(prev => prev.map((x, j) => j === i ? { ...x, title: v } : x))}
                        style={s.oppTitle}
                      />
                      {o.account_name ? <Text style={s.oppMeta}>{o.account_name}</Text> : null}
                    </View>
                  </View>
                </RemovableRow>
              ))}
            </SectionCard>
          )}

          {/* Milestones (conditional) */}
          {keptMiles.length > 0 && (
            <SectionCard eyebrow="MILESTONES">
              {milestones.map((m, i) => (
                <RemovableRow key={i} kept={m.kept} onRemove={() => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, kept: false } : x))}>
                  <View style={s.taskRow}>
                    <View style={[s.taskDot, { backgroundColor: Colors.clay }]} />
                    <EditableText
                      value={m.title}
                      onChange={v => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, title: v } : x))}
                      style={s.taskTitle}
                    />
                  </View>
                </RemovableRow>
              ))}
            </SectionCard>
          )}
        </ScrollView>

        {/* Pinned action bar */}
        <View style={[s.actionBar, { paddingBottom: insets.bottom + 14 }]}>
          {saveError ? <Text style={s.saveError}>{saveError}</Text> : null}

          {/* Salesforce prep row */}
          <TouchableOpacity
            style={s.sfRow}
            onPress={handleSfPrep}
            disabled={sfLoading}
            activeOpacity={0.72}
          >
            <Text style={s.sfRowText}>
              {sfLoading ? 'Generating…' : 'Prepare Salesforce Update'}
            </Text>
          </TouchableOpacity>

          <View style={s.actionBtns}>
            <TouchableOpacity
              style={[s.saveLaterBtn, isSaving && s.btnDisabled]}
              onPress={handleSaveLater}
              disabled={isSaving}
              activeOpacity={0.75}
            >
              <Text style={s.saveLaterText}>Save for Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, isSaving && s.btnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <Text style={s.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Salesforce prep modal */}
      <Modal
        visible={sfModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSfModal(false)}
      >
        <View style={sf.screen}>
          <View style={sf.header}>
            <Text style={sf.title}>Salesforce Update</Text>
            <TouchableOpacity onPress={() => setSfModal(false)} activeOpacity={0.7}>
              <Text style={sf.closeBtn}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={sf.body} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={sf.note} selectable>{sfNote ?? ''}</Text>
          </ScrollView>
          <View style={sf.actions}>
            <TouchableOpacity style={sf.btn} onPress={handleCopySf} activeOpacity={0.8}>
              <Text style={sf.btnText}>{sfCopied ? 'Copied!' : 'Copy to Clipboard'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[sf.btn, sf.emailBtn]} onPress={handleEmailSf} activeOpacity={0.8}>
              <Text style={[sf.btnText, sf.emailBtnText]}>Send to Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Save confirmation overlay */}
      {savePhase !== null && (
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
          <SaveOrb state={savePhase === 'saving' ? 'saving' : savePhase === 'saved' ? 'saved' : 'saving'} />
          <Text style={so.overlayTitle}>
            {savePhase === 'saving'     ? 'Saving…'
           : savePhase === 'saved'      ? 'Saved to Continuo'
           : savePhase === 'savingLater'? 'Saving draft…'
           :                              'Saved for later'}
          </Text>
          <Text style={so.overlaySub}>
            {savePhase === 'saving'     ? 'Committing what you approved.'
           : savePhase === 'saved'      ? 'Your field intel is organized.'
           : savePhase === 'savingLater'? 'Saving to your Review Queue.'
           :                              'Waiting in your Review Queue. Nothing committed yet.'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 22 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    paddingHorizontal: 0,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: Colors.ink, lineHeight: 28, marginTop: -2 },
  sourceChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.linen,
  },
  sourceChipText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, color: Colors.graphite },
  discardBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: Colors.roseTint },
  discardBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: Colors.critical },

  titleBlock: { paddingTop: 12, paddingBottom: 20 },
  titleText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: Colors.inkDark },
  titleSub: { fontFamily: 'Newsreader_400Regular_Italic', fontSize: 16, color: Colors.graphite, marginTop: 4 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.mist,
    padding: 16,
    paddingTop: 12,
    marginBottom: 14,
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardEyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardEyebrow: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 10,
    color: Colors.graphite,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  editableField: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: Colors.ink,
    paddingHorizontal: 0,
    paddingVertical: 2,
    minHeight: 24,
    borderRadius: 6,
  },
  editableFieldFocused: {
    backgroundColor: Colors.skyTint,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  editableFieldMulti: { minHeight: 88 },

  summaryText: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 16.5,
    lineHeight: 26,
    color: Colors.inkDark,
    minHeight: 88,
  },
  notesText: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 15.5,
    lineHeight: 26,
    color: Colors.ink,
    minHeight: 70,
  },

  removableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.linen,
  },
  removableContent: { flex: 1 },
  removeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 2,
    opacity: 0.5,
  },
  removeBtnText: { fontSize: 20, color: Colors.graphite, lineHeight: 22 },

  // Accounts
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTileIcon: { fontSize: 14 },
  accountDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.sky },
  accountName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, flex: 1 },
  matchPrompt: { marginTop: 8, marginLeft: 40, backgroundColor: Colors.clayTint, borderRadius: 10, padding: 10 },
  matchPromptText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: Colors.inkDark, marginBottom: 6 },
  matchOption: { paddingVertical: 7, paddingHorizontal: 10, backgroundColor: Colors.surface, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: Colors.clay },
  matchOptionText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: Colors.ink },
  matchDismiss: { paddingVertical: 5 },
  matchDismissText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: Colors.graphite },

  // People
  personRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: Colors.sky },
  personInfo: { flex: 1, gap: 2 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, flex: 1 },
  personRole: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: Colors.graphite },
  newPill: {
    backgroundColor: Colors.skyTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newPillText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: Colors.sky },

  // Tasks
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  taskDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: Colors.sage, marginTop: 6 },
  taskInfo: { flex: 1 },
  taskTitle: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15 },
  taskMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: Colors.graphite, marginTop: 2 },

  // Activities
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  activityTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.clayTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTileIcon: { fontSize: 14 },
  activityInfo: { flex: 1 },
  activityType: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15 },
  activityMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: Colors.graphite, marginTop: 2 },

  // Opportunities
  detectedPill: {
    backgroundColor: Colors.skyTint,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  detectedPillText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 9, color: Colors.sky, letterSpacing: 0.8 },
  oppRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  oppDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: Colors.sky, marginTop: 6 },
  oppInfo: { flex: 1 },
  oppTitle: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15 },
  oppMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: Colors.graphite, marginTop: 2 },

  // Action bar
  actionBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    backgroundColor: 'rgba(249,248,244,0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.mist,
  },
  actionBtns: { flexDirection: 'row', gap: 12 },
  saveError: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: Colors.rose,
    textAlign: 'center',
    marginBottom: 8,
  },
  saveLaterBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.stone,
    alignItems: 'center',
  },
  saveLaterText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: Colors.inkDark },
  saveBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 9999,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    shadowColor: Colors.sky,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  saveBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.surface },
  btnDisabled: { opacity: 0.6 },

  // Salesforce row
  sfRow: {
    alignItems: 'center',
    paddingVertical: 9,
    marginBottom: 6,
  },
  sfRowText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 13.5,
    color: Colors.graphite,
    textDecorationLine: 'underline',
  },

  // Save overlay
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    zIndex: 99,
  },
});

const sf = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mist,
  },
  title: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 18, color: Colors.inkDark },
  closeBtn: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.sky },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 20 },
  note: { fontFamily: 'SpaceMono_400Regular', fontSize: 13, lineHeight: 22, color: Colors.ink },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.mist,
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 9999, borderWidth: 1, borderColor: Colors.stone, alignItems: 'center' },
  btnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: Colors.inkDark },
  emailBtn: { backgroundColor: Colors.sky, borderColor: Colors.sky },
  emailBtnText: { color: Colors.surface },
});

const so = StyleSheet.create({
  orb: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 10,
  },
  orbitDot: {
    position: 'absolute',
    top: 6,
    left: '50%',
    marginLeft: -4.5,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.sky,
  },
  overlayTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 26,
    color: Colors.inkDark,
    textAlign: 'center',
  },
  overlaySub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.graphite,
    textAlign: 'center',
    maxWidth: 240,
  },
});
