import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { api } from '../../src/api/client';
import {
  Colors,
  impactColor,
  momentumBadgeColor,
  signalTypeColors,
} from '../../src/constants/colors';
import type {
  Account,
  ActivityHistoryItem,
  Contact,
  EmailThread,
  ImpactLevel,
  Milestone,
  MilestoneType,
  Opportunity,
  OpportunityStatus,
  Signal,
  SignalType,
  Task,
  TaskCategory,
} from '../../src/types';

// Survives component unmount so dismissed signals don't reappear on back-nav
const dismissedSignalIds = new Set<number>();

// ── Constants ─────────────────────────────────────────────────────────────────

const OPP_STATUSES: { value: OpportunityStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: Colors.textSecondary },
  { value: 'active', label: 'Active', color: Colors.primary },
  { value: 'waiting', label: 'Waiting', color: '#E67E22' },
  { value: 'won', label: 'Won', color: '#27AE60' },
  { value: 'lost', label: 'Lost', color: '#E74C3C' },
];

const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'crm', label: 'CRM' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'education', label: 'Education' },
  { value: 'patient', label: 'Patient' },
  { value: 'travel', label: 'Travel' },
  { value: 'administrative', label: 'Admin' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

const SIGNAL_TYPES: SignalType[] = [
  'opportunity', 'win', 'risk', 'milestone', 'relationship', 'crm',
  'continuity', 'referral_pathway', 'implementation', 'momentum', 'task', 'question',
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ContextAction = { icon: string; label: string; onPress: () => void; destructive?: boolean };
type ConvertTarget = 'opportunity' | 'task' | 'milestone';

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const router = useRouter();

  // ── All hooks unconditionally ─────────────────────────────────────────────
  const [account, setAccount] = useState<Account | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signalStatuses, setSignalStatuses] = useState<Record<number, string>>({});
  const [localOpps, setLocalOpps] = useState<Opportunity[]>([]);
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localContacts, setLocalContacts] = useState<Contact[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityHistoryItem[]>([]);

  // Modal state
  const [convertingSignal, setConvertingSignal] = useState<Signal | null>(null);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);
  const [editingOpp, setEditingOpp] = useState<Opportunity | 'new' | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | 'new' | null>(null);
  const [editingTask, setEditingTask] = useState<Task | 'new' | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingReferral, setEditingReferral] = useState(false);
  const [contextActions, setContextActions] = useState<ContextAction[] | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    contacts: true, opportunities: true, milestones: true, tasks: true,
    history: false, legacy: false, referral: false, emails: false,
  });
  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  const [toastMsg, setToastMsg] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(16)).current;

  // Sprint 8: AI intelligence
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [visitBriefItems, setVisitBriefItems] = useState<string[] | null>(null);
  const [visitBriefLoading, setVisitBriefLoading] = useState(false);
  const [showVisitBrief, setShowVisitBrief] = useState(false);

  // Sprint 9: Recent emails
  const [emails, setEmails] = useState<EmailThread[] | null>(null);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [viewingEmail, setViewingEmail] = useState<EmailThread | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      api.getAccount(accountId),
      api.getSignals(accountId),
      api.getTasks(accountId),
      api.getContacts(),
      api.getOpportunities(accountId),
      api.getMilestones(accountId),
      api.getActivityHistory(accountId),
    ]).then(([acctR, sigsR, tasksR, contactsR, oppsR, milesR, histR]) => {
      if (acctR.status === 'rejected') { setError(acctR.reason?.message ?? 'Account not found'); return; }
      setAccount(acctR.value as Account);
      if (sigsR.status === 'fulfilled') setSignals(sigsR.value as Signal[]);
      if (tasksR.status === 'fulfilled') setLocalTasks(tasksR.value as Task[]);
      if (contactsR.status === 'fulfilled') setLocalContacts((contactsR.value as Contact[]).filter(c => c.account_id === accountId));
      if (oppsR.status === 'fulfilled') setLocalOpps(oppsR.value as Opportunity[]);
      if (milesR.status === 'fulfilled') setLocalMilestones((milesR.value as Milestone[]).sort((a, b) => a.date.localeCompare(b.date)));
      if (histR.status === 'fulfilled') setActivityHistory(histR.value as ActivityHistoryItem[]);
    }).finally(() => setLoading(false));
  }, [accountId]);

  function showToast(msg: string) {
    setToastMsg(msg);
    toastOpacity.setValue(0); toastY.setValue(16);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(toastY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(), 1800);
    });
  }

  // ── Early returns (after all hooks) ──────────────────────────────────────
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (error || !account) return <View style={s.center}><Text style={s.errorText}>{error ?? 'Account not found.'}</Text></View>;

  // ── Signal type → entity mapping ──────────────────────────────────────────
  function signalToEntityType(type: SignalType): ConvertTarget {
    if (type === 'milestone') return 'milestone';
    if (type === 'task' || type === 'implementation' || type === 'question') return 'task';
    return 'opportunity';
  }

  // One-tap accept: no modal, create entity immediately from AI values
  function handleOneTabAccept(sig: Signal) {
    const entityType = signalToEntityType(sig.signal_type);
    const tempId = Date.now();

    if (entityType === 'opportunity') {
      const opp: Opportunity = {
        id: tempId, account_id: accountId,
        title: sig.title, status: 'new',
        probability: null, next_action: sig.suggested_action, owner: null,
        notes: sig.summary || null, last_activity_at: null,
        created_at: new Date().toISOString(),
      };
      setLocalOpps(p => [opp, ...p]);
      api.createOpportunity({ title: sig.title, status: 'new', notes: sig.summary || null, account_id: accountId }).catch(() => {});
    } else if (entityType === 'task') {
      const task: Task = {
        id: tempId, account_id: accountId, opportunity_id: null,
        title: sig.suggested_action || sig.title,
        description: sig.summary,
        due_date: null,
        priority: sig.impact_level === 'high' ? 'high' : sig.impact_level === 'medium' ? 'medium' : 'low',
        status: 'open', task_type: null, category: null,
      };
      setLocalTasks(p => [...p, task]);
    } else {
      const m: Milestone = {
        id: tempId, account_id: accountId, opportunity_id: null,
        title: sig.title, milestone_type: 'other' as MilestoneType,
        date: new Date().toISOString().split('T')[0],
        notes: sig.suggested_action || null,
        created_at: new Date().toISOString(),
      };
      setLocalMilestones(p => [...p, m].sort((a, b) => a.date.localeCompare(b.date)));
      api.createMilestone({ title: sig.title, date: new Date().toISOString().split('T')[0], notes: sig.suggested_action || null, account_id: accountId, milestone_type: 'other' }).catch(() => {});
    }

    dismissedSignalIds.add(sig.id);
    setSignalStatuses(p => ({ ...p, [sig.id]: 'resolved' }));
    api.updateSignalStatus(sig.id, 'resolved').catch(() => {});

    const sectionKey = entityType === 'opportunity' ? 'opportunities' : entityType === 'milestone' ? 'milestones' : 'tasks';
    setExpanded(p => ({ ...p, [sectionKey]: true }));
    setHighlightedId(tempId);
    setTimeout(() => setHighlightedId(null), 2000);

    const label = entityType === 'opportunity' ? 'Opportunities' : entityType === 'milestone' ? 'Milestones' : 'Tasks';
    showToast(`✓ Added to ${label}`);
  }

  // ── Derived signal state ──────────────────────────────────────────────────
  function getStatus(sig: Signal) { return signalStatuses[sig.id] ?? sig.status; }
  const inboxSignals = signals.filter(sig => !dismissedSignalIds.has(sig.id) && getStatus(sig) === 'new');
  const legacySignals = signals.filter(sig => !dismissedSignalIds.has(sig.id) && ['accepted', 'active'].includes(getStatus(sig)));
  const openTasks = localTasks.filter(t => t.status !== 'done');

  // ── Signal handlers ───────────────────────────────────────────────────────
  function dismissSignal(sig: Signal) {
    dismissedSignalIds.add(sig.id);
    setSignalStatuses(p => ({ ...p, [sig.id]: 'resolved' }));
    api.updateSignalStatus(sig.id, 'resolved').catch(() => {});
  }
  function deleteSignal(sig: Signal) {
    dismissedSignalIds.add(sig.id);
    setSignalStatuses(p => ({ ...p, [sig.id]: 'deleted' }));
    api.deleteSignal(sig.id).catch(() => {});
  }
  function handleDeleteSignalConfirm(sig: Signal) {
    Alert.alert('Delete Signal', 'Delete this signal? Only use this for duplicates or hallucinations.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSignal(sig) },
    ]);
  }
  function handleSaveSignal(sig: Signal, fields: Partial<Signal>) {
    setSignals(p => p.map(x => x.id === sig.id ? { ...x, ...fields } : x));
    setEditingSignal(null);
    api.updateSignal(sig.id, fields).catch(() => {});
  }
  function handleSaveAndAccept(sig: Signal, fields: Partial<Signal>) {
    const updated = { ...sig, ...fields };
    setSignals(p => p.map(x => x.id === sig.id ? updated : x));
    api.updateSignal(sig.id, fields).catch(() => {});
    setEditingSignal(null);
    handleOneTabAccept(updated);
  }

  // Called when user finishes converting a signal
  function handleConvertDone(sig: Signal, entityType: ConvertTarget, newId: number) {
    setSignalStatuses(p => ({ ...p, [sig.id]: 'resolved' }));
    api.updateSignalStatus(sig.id, 'resolved').catch(() => {});
    setConvertingSignal(null);

    // Expand the destination section so the new card is visible
    const sectionKey = entityType === 'opportunity' ? 'opportunities' : entityType === 'milestone' ? 'milestones' : 'tasks';
    setExpanded(p => ({ ...p, [sectionKey]: true }));

    // Briefly highlight the new card
    setHighlightedId(newId);
    setTimeout(() => setHighlightedId(null), 2000);

    const label = entityType === 'opportunity' ? 'Opportunities' : entityType === 'milestone' ? 'Milestones' : 'Tasks';
    showToast(`✓ Added to ${label}`);
  }

  // ── Opportunity handlers ──────────────────────────────────────────────────
  function handleSaveOpp(fields: { title: string; status: OpportunityStatus; notes: string | null }) {
    if (editingOpp === 'new') {
      api.createOpportunity({ ...fields, account_id: accountId }).then(created => {
        setLocalOpps(p => [created as Opportunity, ...p]);
      }).catch(() => {});
    } else if (editingOpp) {
      const oppId = (editingOpp as Opportunity).id;
      setLocalOpps(p => p.map(o => o.id === oppId ? { ...o, ...fields } : o));
      api.updateOpportunity(oppId, fields).catch(() => {});
    }
    setEditingOpp(null);
  }
  function handleDeleteOpp(opp: Opportunity) {
    Alert.alert('Delete Opportunity', `Delete "${opp.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setLocalOpps(p => p.filter(o => o.id !== opp.id));
        api.deleteOpportunity(opp.id).catch(() => {});
      }},
    ]);
  }

  // ── Milestone handlers ────────────────────────────────────────────────────
  function handleSaveMilestone(fields: { title: string; date: string; notes: string | null }) {
    if (editingMilestone === 'new') {
      api.createMilestone({ ...fields, account_id: accountId, milestone_type: 'other' }).then(created => {
        setLocalMilestones(p => [...p, created as Milestone].sort((a, b) => a.date.localeCompare(b.date)));
      }).catch(() => {});
    } else if (editingMilestone) {
      const mId = (editingMilestone as Milestone).id;
      setLocalMilestones(p => p.map(m => m.id === mId ? { ...m, ...fields } : m));
      api.updateMilestone(mId, fields).catch(() => {});
    }
    setEditingMilestone(null);
  }
  function handleDeleteMilestone(m: Milestone) {
    Alert.alert('Delete Milestone', `Delete "${m.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setLocalMilestones(p => p.filter(x => x.id !== m.id));
        api.deleteMilestone(m.id).catch(() => {});
      }},
    ]);
  }

  // ── Task handlers ─────────────────────────────────────────────────────────
  function handleSaveTask(fields: { title: string; due_date: string | null; category: TaskCategory | null; notes: string | null }) {
    if (editingTask === 'new') {
      // Tasks don't have a createTask API yet — add locally only for now
      setEditingTask(null);
      return;
    }
    if (editingTask) {
      const task = editingTask as Task;
      setLocalTasks(p => p.map(t => t.id === task.id ? { ...t, ...fields, description: fields.notes } : t));
      api.updateTask(task.id, { ...fields, description: fields.notes }).catch(() => {});
    }
    setEditingTask(null);
  }
  function handleCompleteTask(task: Task) {
    setLocalTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'done' } : t));
    showToast('✓ Done — moved to history');
    api.updateTask(task.id, { status: 'done' }).catch(() => {});
  }
  function handleDeleteTask(task: Task) {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setLocalTasks(p => p.filter(t => t.id !== task.id));
        api.deleteTask(task.id).catch(() => {});
      }},
    ]);
  }

  // ── Contact handlers ──────────────────────────────────────────────────────
  function handleSaveContact(fields: { name: string; role: string | null; discipline: string | null; phone: string | null; relationship_notes: string | null; champion_level: string }) {
    if (!editingContact) return;
    setLocalContacts(p => p.map(c => c.id === editingContact.id ? { ...c, ...fields } : c));
    api.updateContact(editingContact.id, fields).catch(() => {});
    setEditingContact(null);
  }
  function handleDeleteContact(c: Contact) {
    Alert.alert('Remove Contact', `Remove ${c.name} from this account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setLocalContacts(p => p.filter(x => x.id !== c.id));
        api.deleteContact(c.id).catch(() => {});
      }},
    ]);
  }

  // ── Account / referral info handlers ─────────────────────────────────────
  function handleSaveReferralInfo(fields: Partial<Account>) {
    setAccount(p => p ? { ...p, ...fields } : p);
    api.updateAccount(accountId, fields).catch(() => {});
    setEditingReferral(false);
  }

  const momentumColor = momentumBadgeColor(account.momentum);

  function loadSnapshot() {
    if (snapshot || snapshotLoading) return;
    setSnapshotLoading(true);
    api.getAccountSnapshot(accountId)
      .then(r => setSnapshot(r.snapshot))
      .catch(() => setSnapshot('Unable to generate snapshot — check connection.'))
      .finally(() => setSnapshotLoading(false));
  }

  function loadEmails() {
    if (emails !== null || emailsLoading) return;
    setEmailsLoading(true);
    setEmailsError(null);
    api.getAccountEmails(accountId)
      .then(setEmails)
      .catch(e => setEmailsError(e instanceof Error ? e.message : 'Could not load emails.'))
      .finally(() => setEmailsLoading(false));
  }

  function loadVisitBrief() {
    if (visitBriefLoading) return;
    setVisitBriefLoading(true);
    api.getVisitBrief(accountId)
      .then(r => { setVisitBriefItems(r.items); setShowVisitBrief(true); })
      .catch(() => { setVisitBriefItems(['Unable to generate brief — check connection.']); setShowVisitBrief(true); })
      .finally(() => setVisitBriefLoading(false));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Account header */}
        <View style={s.headerCard}>
          <View style={s.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.accountName}>{account.name}</Text>
              {account.organization && <Text style={s.accountOrg}>{account.organization}</Text>}
              {account.city && <Text style={s.accountSub}>{account.city}{account.state ? `, ${account.state}` : ''}</Text>}
            </View>
            <View style={[s.momentumDot, { backgroundColor: momentumColor }]} />
          </View>
          {(account.is_implant_center || account.is_therapy_site || account.is_evaluation_site) && (
            <Text style={s.clinicalLine}>
              {[
                account.is_implant_center && 'Implant Center',
                account.is_therapy_site && 'Therapy Site',
                account.is_evaluation_site && 'Eval Site',
              ].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        {account.next_action && (
          <View style={s.nextActionBox}>
            <Text style={s.nextActionLabel}>Next</Text>
            <Text style={s.nextActionText}>{account.next_action}</Text>
          </View>
        )}

        {/* ── ACTIONS ROW ── */}
        <View style={s.aiActionRow}>
          <TouchableOpacity
            style={[s.aiBtn, snapshotLoading && s.aiBtnLoading]}
            onPress={loadSnapshot}
            activeOpacity={0.7}
            disabled={snapshotLoading}
          >
            <Text style={s.aiBtnText}>{snapshotLoading ? 'Loading…' : snapshot ? 'Snapshot ✓' : 'Account Snapshot'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.aiBtn, s.aiBtnPrimary, visitBriefLoading && s.aiBtnLoading]}
            onPress={loadVisitBrief}
            activeOpacity={0.7}
            disabled={visitBriefLoading}
          >
            <Text style={[s.aiBtnText, { color: '#fff' }]}>{visitBriefLoading ? 'Preparing…' : 'Prepare for Visit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Snapshot result */}
        {snapshot && (
          <View style={s.snapshotCard}>
            <Text style={s.snapshotText}>{snapshot}</Text>
          </View>
        )}

        {/* ── SIGNAL INBOX ── */}
        {inboxSignals.length > 0 && (
          <>
            <View style={s.inboxHeader}>
              <Text style={s.inboxLabel}>Needs Review</Text>
              <View style={s.inboxBadge}><Text style={s.inboxBadgeText}>{inboxSignals.length}</Text></View>
            </View>
            {inboxSignals.map(sig => (
              <InboxSignalCard
                key={sig.id}
                signal={sig}
                onConvert={() => handleOneTabAccept(sig)}
                onDelete={() => handleDeleteSignalConfirm(sig)}
                onEdit={() => setEditingSignal(sig)}
                onMenu={() => setContextActions([
                  { icon: '↪️', label: 'Convert to different type...', onPress: () => { setContextActions(null); setConvertingSignal(sig); } },
                  { icon: '✏️', label: 'Edit', onPress: () => { setContextActions(null); setEditingSignal(sig); } },
                  { icon: '✓', label: 'Resolve (dismiss)', onPress: () => { setContextActions(null); dismissSignal(sig); } },
                  { icon: '🗑', label: 'Delete', destructive: true, onPress: () => { setContextActions(null); handleDeleteSignalConfirm(sig); } },
                ])}
              />
            ))}
          </>
        )}

        {inboxSignals.length === 0 && (
          <View style={s.emptyInbox}>
            <Text style={s.emptyInboxText}>Inbox clear</Text>
          </View>
        )}

        {/* ── OPPORTUNITIES ── */}
        <View style={s.sectionHeaderRow}>
          <TouchableOpacity style={s.sectionRowLeft} onPress={() => toggle('opportunities')} activeOpacity={0.7}>
            <Text style={s.sectionLabel}>Opportunities ({localOpps.length})</Text>
            <Text style={s.chevron}>{expanded.opportunities ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditingOpp('new')} style={s.addIcon}>
            <Text style={s.addIconText}>＋</Text>
          </TouchableOpacity>
        </View>
        {expanded.opportunities && (
          localOpps.length === 0 ? <EmptyState text="No opportunities yet." /> :
          localOpps.map(opp => (
            <EntityCard
              key={opp.id}
              highlighted={highlightedId === opp.id}
              onMenu={() => setContextActions([
                { icon: '✏️', label: 'Edit', onPress: () => { setContextActions(null); setEditingOpp(opp); } },
                { icon: '🗑', label: 'Delete', destructive: true, onPress: () => { setContextActions(null); handleDeleteOpp(opp); } },
              ])}
            >
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{opp.title}</Text>
                  {opp.notes && <Text style={s.cardSub}>{opp.notes}</Text>}
                </View>
                <OppStatusChip status={opp.status} />
              </View>
            </EntityCard>
          ))
        )}

        {/* ── MILESTONES ── */}
        <View style={s.sectionHeaderRow}>
          <TouchableOpacity style={s.sectionRowLeft} onPress={() => toggle('milestones')} activeOpacity={0.7}>
            <Text style={s.sectionLabel}>Milestones ({localMilestones.length})</Text>
            <Text style={s.chevron}>{expanded.milestones ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditingMilestone('new')} style={s.addIcon}>
            <Text style={s.addIconText}>＋</Text>
          </TouchableOpacity>
        </View>
        {expanded.milestones && (
          localMilestones.length === 0 ? <EmptyState text="No milestones yet." /> :
          <View style={s.timeline}>
            {localMilestones.map((m, i) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                highlighted={highlightedId === m.id}
                isLast={i === localMilestones.length - 1}
                onMenu={() => setContextActions([
                  { icon: '✏️', label: 'Edit', onPress: () => { setContextActions(null); setEditingMilestone(m); } },
                  { icon: '🗑', label: 'Delete', destructive: true, onPress: () => { setContextActions(null); handleDeleteMilestone(m); } },
                ])}
              />
            ))}
          </View>
        )}

        {/* ── TASKS ── */}
        <View style={s.sectionHeaderRow}>
          <TouchableOpacity style={s.sectionRowLeft} onPress={() => toggle('tasks')} activeOpacity={0.7}>
            <Text style={s.sectionLabel}>Tasks ({openTasks.length})</Text>
            <Text style={s.chevron}>{expanded.tasks ? '▾' : '▸'}</Text>
          </TouchableOpacity>
        </View>
        {expanded.tasks && (
          openTasks.length === 0 ? <EmptyState text="No open tasks." /> :
          openTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              highlighted={highlightedId === task.id}
              onDone={() => handleCompleteTask(task)}
              onMenu={() => setContextActions([
                { icon: '✏️', label: 'Edit', onPress: () => { setContextActions(null); setEditingTask(task); } },
                { icon: '✅', label: 'Mark Done', onPress: () => { setContextActions(null); handleCompleteTask(task); } },
                { icon: '🗑', label: 'Delete', destructive: true, onPress: () => { setContextActions(null); handleDeleteTask(task); } },
              ])}
            />
          ))
        )}

        {/* ── ACTIVITY HISTORY ── */}
        <TouchableOpacity style={s.sectionHeaderRow} onPress={() => toggle('history')} activeOpacity={0.7}>
          <Text style={[s.sectionLabel, { color: Colors.textSecondary }]}>Activity History ({activityHistory.length})</Text>
          <Text style={s.chevron}>{expanded.history ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {expanded.history && (
          activityHistory.length === 0 ? <EmptyState text="No history yet." /> :
          activityHistory.map(item => (
            <View key={item.id} style={s.historyRow}>
              <Text style={s.historyCheck}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.historyTitle}>{item.title}</Text>
                {item.category && <Text style={s.historySub}>{item.category.replace(/_/g, ' ')}</Text>}
              </View>
              <Text style={s.historyDate}>
                {new Date(item.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ))
        )}

        {/* ── CONTACTS ── */}
        {localContacts.length > 0 && (
          <>
            <TouchableOpacity style={s.sectionHeaderRow} onPress={() => toggle('contacts')} activeOpacity={0.7}>
              <Text style={[s.sectionLabel, { color: Colors.textSecondary }]}>Contacts ({localContacts.length})</Text>
              <Text style={s.chevron}>{expanded.contacts ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {expanded.contacts && localContacts.map(c => (
              <EntityCard
                key={c.id}
                onMenu={() => setContextActions([
                  { icon: '✏️', label: 'Edit', onPress: () => { setContextActions(null); setEditingContact(c); } },
                  { icon: '🗑', label: 'Remove', destructive: true, onPress: () => { setContextActions(null); handleDeleteContact(c); } },
                ])}
              >
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{c.name}</Text>
                    <Text style={s.cardSub}>
                      {[c.discipline, c.role].filter(Boolean).join(' · ')}
                    </Text>
                    {c.phone && <Text style={[s.cardSub, { color: Colors.primary }]}>{c.phone}</Text>}
                  </View>
                  {c.champion_level === 'champion' && (
                    <View style={s.championBadge}><Text style={s.championBadgeText}>Champion</Text></View>
                  )}
                </View>
                {c.relationship_notes && <Text style={[s.cardSub, { marginTop: 4 }]}>{c.relationship_notes}</Text>}
              </EntityCard>
            ))}
          </>
        )}

        {/* ── REFERRAL INFO ── */}
        <View style={s.sectionHeaderRow}>
          <TouchableOpacity style={s.sectionRowLeft} onPress={() => toggle('referral')} activeOpacity={0.7}>
            <Text style={[s.sectionLabel, { color: Colors.textSecondary }]}>Referral Info</Text>
            <Text style={s.chevron}>{expanded.referral ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditingReferral(true)} style={s.addIcon}>
            <Text style={[s.addIconText, { fontSize: 16 }]}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/referral-guide?account_id=${accountId}`)} style={[s.addIcon, { marginLeft: 4 }]}>
            <Text style={[s.addIconText, { fontSize: 15 }]}>⬆️</Text>
          </TouchableOpacity>
        </View>
        {expanded.referral && (
          <View style={s.card}>
            {!account.address && !account.phone && !account.fax && !account.referral_instructions && !account.referral_contact ? (
              <Text style={s.emptyText}>No referral info yet — tap ✏️ to add.</Text>
            ) : (
              <>
                {account.address && <Text style={s.cardSub}>{account.address}</Text>}
                {account.phone && <Text style={[s.cardSub, { marginTop: 2 }]}>Phone: {account.phone}</Text>}
                {account.fax && <Text style={[s.cardSub, { marginTop: 2 }]}>Fax: {account.fax}</Text>}
                {account.referral_contact && <Text style={[s.cardSub, { marginTop: 4 }]}>Contact: {account.referral_contact}</Text>}
                {account.referral_email && <Text style={[s.cardSub, { color: Colors.primary, marginTop: 2 }]}>{account.referral_email}</Text>}
                {account.preferred_referral_method && <Text style={[s.cardSub, { marginTop: 2 }]}>Method: {account.preferred_referral_method}</Text>}
                {account.referral_instructions && (
                  <>
                    <Text style={[s.cardSub, { fontWeight: '600', marginTop: 8, color: Colors.text }]}>Referral Instructions</Text>
                    <Text style={[s.cardSub, { marginTop: 2 }]}>{account.referral_instructions}</Text>
                  </>
                )}
                {account.scheduling_instructions && (
                  <>
                    <Text style={[s.cardSub, { fontWeight: '600', marginTop: 8, color: Colors.text }]}>Scheduling</Text>
                    <Text style={[s.cardSub, { marginTop: 2 }]}>{account.scheduling_instructions}</Text>
                  </>
                )}
                {account.insurance_notes && (
                  <>
                    <Text style={[s.cardSub, { fontWeight: '600', marginTop: 8, color: Colors.text }]}>Insurance</Text>
                    <Text style={[s.cardSub, { marginTop: 2 }]}>{account.insurance_notes}</Text>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ── RECENT EMAILS ── */}
        <TouchableOpacity
          style={s.sectionHeaderRow}
          onPress={() => {
            toggle('emails');
            if (!expanded.emails) loadEmails();
          }}
          activeOpacity={0.7}
        >
          <Text style={[s.sectionLabel, { color: Colors.textSecondary }]}>Recent Emails</Text>
          <Text style={[s.chevron, { marginLeft: 6 }]}>{expanded.emails ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {expanded.emails && (
          emailsLoading ? (
            <View style={s.emailLoadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={s.emailLoadingText}>Checking Gmail...</Text>
            </View>
          ) : emailsError?.includes('not connected') ? (
            <View style={s.emailConnectBox}>
              <Text style={s.emailConnectText}>Connect Gmail to see recent emails for this account.</Text>
              <Text style={[s.emailConnectText, { color: Colors.primary, marginTop: 4 }]}>
                Open http://localhost:8000/email/connect in a browser.
              </Text>
            </View>
          ) : emailsError ? (
            <Text style={[s.emptyText, { color: Colors.critical }]}>{emailsError}</Text>
          ) : !emails || emails.length === 0 ? (
            <EmptyState text="No recent emails found for this account." />
          ) : (
            emails.map(thread => (
              <TouchableOpacity
                key={thread.id}
                style={s.emailRow}
                onPress={() => setViewingEmail(thread)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.emailRowTop}>
                    <Text style={s.emailFrom} numberOfLines={1}>{thread.from_name}</Text>
                    <Text style={s.emailDate}>{formatEmailDate(thread.date)}</Text>
                  </View>
                  <Text style={s.emailSubject} numberOfLines={1}>{thread.subject}</Text>
                  <Text style={s.emailSnippet} numberOfLines={2}>{thread.snippet}</Text>
                </View>
              </TouchableOpacity>
            ))
          )
        )}

        {/* ── LEGACY ACCEPTED SIGNALS (collapsed) ── */}
        {legacySignals.length > 0 && (
          <>
            <TouchableOpacity style={s.sectionHeaderRow} onPress={() => toggle('legacy')} activeOpacity={0.7}>
              <Text style={[s.sectionLabel, { color: Colors.textSecondary }]}>Unorganized Signals ({legacySignals.length})</Text>
              <Text style={s.chevron}>{expanded.legacy ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {expanded.legacy && legacySignals.map(sig => (
              <EntityCard
                key={sig.id}
                style={s.cardMuted}
                onMenu={() => setContextActions([
                  { icon: '↪️', label: 'Convert to...', onPress: () => { setContextActions(null); setConvertingSignal(sig); } },
                  { icon: '✏️', label: 'Edit', onPress: () => { setContextActions(null); setEditingSignal(sig); } },
                  { icon: '🗑', label: 'Delete', destructive: true, onPress: () => { setContextActions(null); handleDeleteSignalConfirm(sig); } },
                ])}
              >
                <Text style={[s.cardTitle, { color: Colors.textSecondary }]}>{sig.title}</Text>
                {sig.suggested_action && <Text style={s.cardSub}>{sig.suggested_action}</Text>}
              </EntityCard>
            ))}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Toast */}
      <Animated.View style={[s.toast, { opacity: toastOpacity, transform: [{ translateY: toastY }] }]} pointerEvents="none">
        <Text style={s.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* Context menu */}
      {contextActions && <ContextMenu actions={contextActions} onClose={() => setContextActions(null)} />}

      {/* Convert signal modal (Accept flow) */}
      {convertingSignal && (
        <ConvertSignalModal
          signal={convertingSignal}
          accountId={accountId}
          onDone={(type, newId) => handleConvertDone(convertingSignal, type, newId)}
          onAddOpp={opp => setLocalOpps(p => [opp, ...p])}
          onAddMilestone={m => setLocalMilestones(p => [...p, m].sort((a, b) => a.date.localeCompare(b.date)))}
          onAddTask={t => setLocalTasks(p => [...p, t])}
          onClose={() => setConvertingSignal(null)}
        />
      )}

      {/* Edit signal modal */}
      {editingSignal && (
        <EditSignalModal
          signal={editingSignal}
          onSave={f => handleSaveSignal(editingSignal, f)}
          onSaveAndAccept={f => handleSaveAndAccept(editingSignal, f)}
          onClose={() => setEditingSignal(null)}
        />
      )}

      {/* Edit opportunity modal */}
      {editingOpp !== null && (
        <EditOppModal
          opp={editingOpp === 'new' ? null : editingOpp as Opportunity}
          onSave={handleSaveOpp}
          onClose={() => setEditingOpp(null)}
        />
      )}

      {/* Edit milestone modal */}
      {editingMilestone !== null && (
        <EditMilestoneModal
          milestone={editingMilestone === 'new' ? null : editingMilestone as Milestone}
          onSave={handleSaveMilestone}
          onClose={() => setEditingMilestone(null)}
        />
      )}

      {/* Edit task modal */}
      {editingTask !== null && editingTask !== 'new' && (
        <EditTaskModal
          task={editingTask as Task}
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Edit contact modal */}
      {editingContact !== null && (
        <EditContactModal
          contact={editingContact}
          onSave={handleSaveContact}
          onClose={() => setEditingContact(null)}
        />
      )}

      {/* Edit referral info modal */}
      {editingReferral && (
        <EditReferralModal
          account={account}
          onSave={handleSaveReferralInfo}
          onClose={() => setEditingReferral(false)}
        />
      )}

      {/* Email thread modal */}
      <Modal visible={viewingEmail !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewingEmail(null)}>
        {viewingEmail && (
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setViewingEmail(null)}>
                <Text style={s.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle} numberOfLines={1}>{viewingEmail.subject}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(viewingEmail.subject)}`)}>
                <Text style={[s.modalSave, { fontSize: 13 }]}>Gmail</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={s.emailDetailFrom}>{viewingEmail.from_name}</Text>
              <Text style={s.emailDetailEmail}>{viewingEmail.from_email}</Text>
              <Text style={s.emailDetailDate}>{viewingEmail.date}</Text>
              <View style={s.emailDivider} />
              <Text style={s.emailDetailBody}>{viewingEmail.body_excerpt || viewingEmail.snippet}</Text>
              {viewingEmail.body_excerpt && viewingEmail.body_excerpt.length >= 600 && (
                <TouchableOpacity
                  style={s.emailOpenGmail}
                  onPress={() => Linking.openURL(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(viewingEmail.subject)}`)}
                >
                  <Text style={s.emailOpenGmailText}>View full email in Gmail</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Visit Brief modal */}
      <Modal visible={showVisitBrief} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVisitBrief(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Before You Go</Text>
            <TouchableOpacity onPress={() => setShowVisitBrief(false)} style={s.modalClose}>
              <Text style={s.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.visitBriefSubtitle}>{account.name}</Text>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {(visitBriefItems ?? []).map((item, i) => (
              <View key={i} style={s.briefItem}>
                <Text style={s.briefBullet}>•</Text>
                <Text style={s.briefItemText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ── Inbox signal card (swipeable) ─────────────────────────────────────────────

function InboxSignalCard({ signal, onConvert, onDelete, onEdit, onMenu }: {
  signal: Signal; onConvert: () => void; onDelete: () => void; onEdit: () => void; onMenu: () => void;
}) {
  const ref = useRef<Swipeable>(null);
  const tc = signalTypeColors(signal.signal_type);

  return (
    <Swipeable
      ref={ref}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={(progress) => {
        const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
        return (
          <TouchableOpacity
            style={s.swipeAccept}
            onPress={() => { ref.current?.close(); onConvert(); }}
            activeOpacity={0.85}
          >
            <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
              <Text style={s.swipeIcon}>↪️</Text>
              <Text style={s.swipeLabel}>Accept</Text>
            </Animated.View>
          </TouchableOpacity>
        );
      }}
      renderRightActions={(progress) => {
        const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
        return (
          <TouchableOpacity
            style={s.swipeDelete}
            onPress={() => { ref.current?.close(); onDelete(); }}
            activeOpacity={0.85}
          >
            <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
              <Text style={s.swipeIcon}>🗑</Text>
              <Text style={s.swipeLabel}>Delete</Text>
            </Animated.View>
          </TouchableOpacity>
        );
      }}
    >
      <TouchableOpacity onPress={onEdit} activeOpacity={0.85} style={s.inboxCard}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <View style={[s.row, { marginBottom: 6 }]}>
              <View style={[s.typeBadge, { backgroundColor: tc.bg }]}>
                <Text style={[s.typeBadgeText, { color: tc.text }]}>{signal.signal_type.replace(/_/g, ' ')}</Text>
              </View>
              <View style={[s.impactDot, { backgroundColor: impactColor(signal.impact_level) }]} />
            </View>
            <Text style={s.cardTitle}>{signal.title}</Text>
            {signal.suggested_action && <Text style={s.cardSub}>{signal.suggested_action}</Text>}
          </View>
          <TouchableOpacity onPress={onMenu} style={s.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.menuBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ── Entity card (opportunities, etc.) ────────────────────────────────────────

function EntityCard({ children, onMenu, style, highlighted = false }: {
  children: React.ReactNode; onMenu: () => void; style?: object; highlighted?: boolean;
}) {
  return (
    <View style={[s.card, highlighted && s.cardHighlight, style]}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>{children}</View>
        <TouchableOpacity onPress={onMenu} style={s.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.menuBtnText}>⋯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Milestone timeline row ────────────────────────────────────────────────────

function MilestoneRow({ milestone, isLast, onMenu, highlighted = false }: { milestone: Milestone; isLast: boolean; onMenu: () => void; highlighted?: boolean }) {
  const dateStr = new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <View style={s.milestoneRow}>
      <View style={s.timelineLeft}>
        <Text style={s.milestoneDate}>{dateStr}</Text>
        <View style={[s.timelineDot, highlighted && { backgroundColor: Colors.positive }]} />
        {!isLast && <View style={s.timelineLine} />}
      </View>
      <View style={[s.milestoneRight, highlighted && s.cardHighlight]}>
        <View style={s.row}>
          <Text style={[s.cardTitle, { flex: 1 }]}>{milestone.title}</Text>
          <TouchableOpacity onPress={onMenu} style={s.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.menuBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
        {milestone.notes && <Text style={s.cardSub}>{milestone.notes}</Text>}
      </View>
    </View>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onDone, onMenu, highlighted = false }: { task: Task; onDone: () => void; onMenu: () => void; highlighted?: boolean }) {
  return (
    <View style={[s.card, highlighted && s.cardHighlight]}>
      <View style={s.row}>
        <TouchableOpacity onPress={onDone} style={s.checkbox} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={s.checkboxInner} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{task.title}</Text>
          <View style={[s.row, { marginTop: 4, gap: 8, flexWrap: 'wrap' }]}>
            {task.category && (
              <Text style={s.taskChip}>{task.category.replace(/_/g, ' ')}</Text>
            )}
            {task.due_date && (
              <Text style={s.taskDue}>
                Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onMenu} style={s.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.menuBtnText}>⋯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function OppStatusChip({ status }: { status: OpportunityStatus }) {
  const meta = OPP_STATUSES.find(x => x.value === status) ?? OPP_STATUSES[0];
  return (
    <View style={[s.statusChip, { borderColor: meta.color }]}>
      <Text style={[s.statusChipText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Text style={s.emptyText}>{text}</Text>;
}

function formatEmailDate(raw: string): string {
  try {
    const d = new Date(raw);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return raw;
  }
}

function ContextMenu({ actions, onClose }: { actions: ContextAction[]; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <TouchableOpacity style={s.menuOverlay} onPress={onClose} activeOpacity={1}>
        <View style={s.menuSheet}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[s.menuItem, i < actions.length - 1 && s.menuItemBorder]}
              onPress={a.onPress}
              activeOpacity={0.7}
            >
              <Text style={s.menuItemIcon}>{a.icon}</Text>
              <Text style={[s.menuItemLabel, a.destructive && { color: '#E74C3C' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Convert signal modal ──────────────────────────────────────────────────────

function ConvertSignalModal({ signal, accountId, onDone, onAddOpp, onAddMilestone, onAddTask, onClose }: {
  signal: Signal;
  accountId: number;
  onDone: (type: ConvertTarget, newId: number) => void;
  onAddOpp: (o: Opportunity) => void;
  onAddMilestone: (m: Milestone) => void;
  onAddTask: (t: Task) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'choose' | ConvertTarget>('choose');

  // Opportunity fields
  const [oppTitle, setOppTitle] = useState(signal.title);
  const [oppStatus, setOppStatus] = useState<OpportunityStatus>('new');
  const [oppNotes, setOppNotes] = useState(signal.suggested_action ?? '');

  // Milestone fields
  const [msTitle, setMsTitle] = useState(signal.title);
  const [msDate, setMsDate] = useState(new Date().toISOString().split('T')[0]);
  const [msNotes, setMsNotes] = useState(signal.suggested_action ?? '');

  // Task fields
  const [taskTitle, setTaskTitle] = useState(signal.suggested_action || signal.title);
  const [taskDue, setTaskDue] = useState('');
  const [taskCat, setTaskCat] = useState<TaskCategory | null>(null);

  function saveOpportunity() {
    const local: Opportunity = {
      id: Date.now(),
      account_id: accountId,
      title: oppTitle,
      status: oppStatus,
      probability: null,
      next_action: null,
      owner: null,
      notes: oppNotes || null,
      last_activity_at: null,
      created_at: new Date().toISOString(),
    };
    onAddOpp(local);
    onDone('opportunity', local.id);
    api.createOpportunity({ title: oppTitle, status: oppStatus, notes: oppNotes || null, account_id: accountId }).catch(() => {});
  }
  function saveMilestone() {
    const local: Milestone = {
      id: Date.now(),
      account_id: accountId,
      opportunity_id: null,
      title: msTitle,
      milestone_type: 'other' as MilestoneType,
      date: msDate,
      notes: msNotes || null,
      created_at: new Date().toISOString(),
    };
    onAddMilestone(local);
    onDone('milestone', local.id);
    api.createMilestone({ title: msTitle, date: msDate, notes: msNotes || null, account_id: accountId, milestone_type: 'other' }).catch(() => {});
  }
  function saveTask() {
    const local: Task = {
      id: Date.now(),
      account_id: accountId,
      opportunity_id: null,
      title: taskTitle,
      description: null,
      due_date: taskDue || null,
      priority: 'medium',
      status: 'open',
      task_type: null,
      category: taskCat,
    };
    onAddTask(local);
    onDone('task', local.id);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={step === 'choose' ? onClose : () => setStep('choose')}>
            <Text style={s.modalCancel}>{step === 'choose' ? 'Cancel' : '← Back'}</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>{step === 'choose' ? 'What does this become?' : step === 'opportunity' ? 'New Opportunity' : step === 'milestone' ? 'New Milestone' : 'New Task'}</Text>
          <View style={{ width: 60 }} />
        </View>

        {step === 'choose' && (
          <View style={s.convertChoices}>
            <Text style={[s.cardSub, { textAlign: 'center', marginBottom: 20 }]}>{signal.title}</Text>
            <TouchableOpacity style={s.convertBtn} onPress={() => setStep('opportunity')} activeOpacity={0.8}>
              <Text style={s.convertBtnIcon}>💡</Text>
              <View>
                <Text style={s.convertBtnTitle}>Opportunity</Text>
                <Text style={s.convertBtnSub}>Something worth tracking long term</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.convertBtn} onPress={() => setStep('task')} activeOpacity={0.8}>
              <Text style={s.convertBtnIcon}>📋</Text>
              <View>
                <Text style={s.convertBtnTitle}>Task</Text>
                <Text style={s.convertBtnSub}>Something I need to do</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.convertBtn} onPress={() => setStep('milestone')} activeOpacity={0.8}>
              <Text style={s.convertBtnIcon}>📅</Text>
              <View>
                <Text style={s.convertBtnTitle}>Milestone</Text>
                <Text style={s.convertBtnSub}>Something that happened or is scheduled</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {step === 'opportunity' && (
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            <FieldLabel>TITLE</FieldLabel>
            <TextInput style={s.fieldInput} value={oppTitle} onChangeText={setOppTitle} />
            <FieldLabel>STATUS</FieldLabel>
            <ChipRow>
              {OPP_STATUSES.map(({ value, label, color }) => (
                <ChipToggle key={value} label={label} active={oppStatus === value} onPress={() => setOppStatus(value)} color={oppStatus === value ? color : undefined} />
              ))}
            </ChipRow>
            <FieldLabel>NOTES</FieldLabel>
            <TextInput style={s.fieldInput} value={oppNotes} onChangeText={setOppNotes} multiline placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
            <TouchableOpacity style={s.saveBtn} onPress={saveOpportunity}>
              <Text style={s.saveBtnText}>Save Opportunity</Text>
            </TouchableOpacity>
            <View style={{ height: 48 }} />
          </ScrollView>
        )}

        {step === 'milestone' && (
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            <FieldLabel>TITLE</FieldLabel>
            <TextInput style={s.fieldInput} value={msTitle} onChangeText={setMsTitle} />
            <FieldLabel>DATE (YYYY-MM-DD)</FieldLabel>
            <TextInput style={s.fieldInput} value={msDate} onChangeText={setMsDate} placeholder="2026-06-25" placeholderTextColor={Colors.textSecondary} />
            <FieldLabel>NOTES</FieldLabel>
            <TextInput style={s.fieldInput} value={msNotes} onChangeText={setMsNotes} multiline placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
            <TouchableOpacity style={s.saveBtn} onPress={saveMilestone}>
              <Text style={s.saveBtnText}>Save Milestone</Text>
            </TouchableOpacity>
            <View style={{ height: 48 }} />
          </ScrollView>
        )}

        {step === 'task' && (
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            <FieldLabel>TITLE</FieldLabel>
            <TextInput style={s.fieldInput} value={taskTitle} onChangeText={setTaskTitle} />
            <FieldLabel>DUE DATE (YYYY-MM-DD)</FieldLabel>
            <TextInput style={s.fieldInput} value={taskDue} onChangeText={setTaskDue} placeholder="Optional — e.g. 2026-07-01" placeholderTextColor={Colors.textSecondary} />
            <FieldLabel>CATEGORY</FieldLabel>
            <ChipRow>
              {TASK_CATEGORIES.map(({ value, label }) => (
                <ChipToggle key={value} label={label} active={taskCat === value} onPress={() => setTaskCat(v => v === value ? null : value)} />
              ))}
            </ChipRow>
            <TouchableOpacity style={s.saveBtn} onPress={saveTask}>
              <Text style={s.saveBtnText}>Save Task</Text>
            </TouchableOpacity>
            <View style={{ height: 48 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Edit modals ───────────────────────────────────────────────────────────────

function EditSignalModal({ signal, onSave, onSaveAndAccept, onClose }: {
  signal: Signal; onSave: (f: Partial<Signal>) => void; onSaveAndAccept: (f: Partial<Signal>) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(signal.title);
  const [type, setType] = useState<SignalType>(signal.signal_type);
  const [impact, setImpact] = useState<ImpactLevel>(signal.impact_level);
  const [action, setAction] = useState(signal.suggested_action ?? '');
  const fields = { title, signal_type: type, impact_level: impact, suggested_action: action || null };

  return (
    <SheetModal title="Edit Signal" onClose={onClose} onSave={() => onSave(fields)}>
      <FieldLabel>TITLE</FieldLabel>
      <TextInput style={s.fieldInput} value={title} onChangeText={setTitle} multiline />
      <FieldLabel>TYPE</FieldLabel>
      <ChipRow>{SIGNAL_TYPES.map(t => <ChipToggle key={t} label={t.replace(/_/g, ' ')} active={type === t} onPress={() => setType(t)} />)}</ChipRow>
      <FieldLabel>IMPACT</FieldLabel>
      <ChipRow>
        {(['low', 'medium', 'high'] as ImpactLevel[]).map(l => (
          <ChipToggle key={l} label={l} active={impact === l} onPress={() => setImpact(l)} color={impact === l ? impactColor(l) : undefined} />
        ))}
      </ChipRow>
      <FieldLabel>SUGGESTED ACTION</FieldLabel>
      <TextInput style={s.fieldInput} value={action} onChangeText={setAction} multiline placeholder="What should be done?" placeholderTextColor={Colors.textSecondary} />
      <TouchableOpacity style={s.saveAcceptBtn} onPress={() => onSaveAndAccept(fields)}>
        <Text style={s.saveAcceptBtnText}>Save & Accept →</Text>
      </TouchableOpacity>
    </SheetModal>
  );
}

function EditOppModal({ opp, onSave, onClose }: {
  opp: Opportunity | null;
  onSave: (f: { title: string; status: OpportunityStatus; notes: string | null }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(opp?.title ?? '');
  const [status, setStatus] = useState<OpportunityStatus>(opp?.status ?? 'new');
  const [notes, setNotes] = useState(opp?.notes ?? '');

  return (
    <SheetModal title={opp ? 'Edit Opportunity' : 'New Opportunity'} onClose={onClose} onSave={() => onSave({ title, status, notes: notes || null })}>
      <FieldLabel>TITLE</FieldLabel>
      <TextInput style={s.fieldInput} value={title} onChangeText={setTitle} placeholder="Opportunity title" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>STATUS</FieldLabel>
      <ChipRow>
        {OPP_STATUSES.map(({ value, label, color }) => (
          <ChipToggle key={value} label={label} active={status === value} onPress={() => setStatus(value)} color={status === value ? color : undefined} />
        ))}
      </ChipRow>
      <FieldLabel>NOTES</FieldLabel>
      <TextInput style={s.fieldInput} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
    </SheetModal>
  );
}

function EditMilestoneModal({ milestone, onSave, onClose }: {
  milestone: Milestone | null;
  onSave: (f: { title: string; date: string; notes: string | null }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(milestone?.title ?? '');
  const [date, setDate] = useState(milestone?.date ? milestone.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(milestone?.notes ?? '');

  return (
    <SheetModal title={milestone ? 'Edit Milestone' : 'New Milestone'} onClose={onClose} onSave={() => onSave({ title, date, notes: notes || null })}>
      <FieldLabel>TITLE</FieldLabel>
      <TextInput style={s.fieldInput} value={title} onChangeText={setTitle} placeholder="What happened or is scheduled?" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>DATE (YYYY-MM-DD)</FieldLabel>
      <TextInput style={s.fieldInput} value={date} onChangeText={setDate} placeholder="2026-06-25" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>NOTES</FieldLabel>
      <TextInput style={s.fieldInput} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
    </SheetModal>
  );
}

function EditTaskModal({ task, onSave, onClose }: {
  task: Task;
  onSave: (f: { title: string; due_date: string | null; category: TaskCategory | null; notes: string | null }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
  const [category, setCategory] = useState<TaskCategory | null>(task.category);
  const [notes, setNotes] = useState(task.description ?? '');

  return (
    <SheetModal title="Edit Task" onClose={onClose} onSave={() => onSave({ title, due_date: dueDate || null, category, notes: notes || null })}>
      <FieldLabel>TITLE</FieldLabel>
      <TextInput style={s.fieldInput} value={title} onChangeText={setTitle} />
      <FieldLabel>DUE DATE (YYYY-MM-DD)</FieldLabel>
      <TextInput style={s.fieldInput} value={dueDate} onChangeText={setDueDate} placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>CATEGORY</FieldLabel>
      <ChipRow>
        {TASK_CATEGORIES.map(({ value, label }) => (
          <ChipToggle key={value} label={label} active={category === value} onPress={() => setCategory(v => v === value ? null : value)} />
        ))}
      </ChipRow>
      <FieldLabel>NOTES</FieldLabel>
      <TextInput style={s.fieldInput} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
    </SheetModal>
  );
}

// ── Edit referral info modal ──────────────────────────────────────────────────

const VIVISTIM_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'not_applicable', label: 'N/A' },
];

function EditReferralModal({ account, onSave, onClose }: {
  account: Account;
  onSave: (f: Partial<Account>) => void;
  onClose: () => void;
}) {
  const [address, setAddress] = useState(account.address ?? '');
  const [phone, setPhone] = useState(account.phone ?? '');
  const [fax, setFax] = useState(account.fax ?? '');
  const [website, setWebsite] = useState(account.website ?? '');
  const [referralContact, setReferralContact] = useState(account.referral_contact ?? '');
  const [referralEmail, setReferralEmail] = useState(account.referral_email ?? '');
  const [referralInstructions, setReferralInstructions] = useState(account.referral_instructions ?? '');
  const [schedulingInstructions, setSchedulingInstructions] = useState(account.scheduling_instructions ?? '');
  const [preferredMethod, setPreferredMethod] = useState(account.preferred_referral_method ?? '');
  const [insuranceNotes, setInsuranceNotes] = useState(account.insurance_notes ?? '');
  const [isImplant, setIsImplant] = useState(account.is_implant_center);
  const [isTherapy, setIsTherapy] = useState(account.is_therapy_site);
  const [isEval, setIsEval] = useState(account.is_evaluation_site);
  const [vivistimStatus, setVivistimStatus] = useState(account.vivistim_status ?? '');
  const [pmR, setPmR] = useState(account.pm_r_available);
  const [neuro, setNeuro] = useState(account.neurosurgery_available);

  function save() {
    onSave({
      address: address || null,
      phone: phone || null,
      fax: fax || null,
      website: website || null,
      referral_contact: referralContact || null,
      referral_email: referralEmail || null,
      referral_instructions: referralInstructions || null,
      scheduling_instructions: schedulingInstructions || null,
      preferred_referral_method: preferredMethod || null,
      insurance_notes: insuranceNotes || null,
      is_implant_center: isImplant,
      is_therapy_site: isTherapy,
      is_evaluation_site: isEval,
      vivistim_status: vivistimStatus || null,
      pm_r_available: pmR,
      neurosurgery_available: neuro,
    });
  }

  return (
    <SheetModal title="Referral Info" onClose={onClose} onSave={save}>
      <FieldLabel>SITE TYPE</FieldLabel>
      <ChipRow>
        <ChipToggle label="Implant Center" active={isImplant} onPress={() => setIsImplant(p => !p)} color="#6C5CE7" />
        <ChipToggle label="Therapy Site" active={isTherapy} onPress={() => setIsTherapy(p => !p)} color="#00B894" />
        <ChipToggle label="Eval Site" active={isEval} onPress={() => setIsEval(p => !p)} color="#0984E3" />
      </ChipRow>
      <FieldLabel>VIVISTIM STATUS</FieldLabel>
      <ChipRow>
        {VIVISTIM_STATUSES.map(({ value, label }) => (
          <ChipToggle key={value} label={label} active={vivistimStatus === value} onPress={() => setVivistimStatus(p => p === value ? '' : value)} />
        ))}
      </ChipRow>
      <FieldLabel>ADDRESS</FieldLabel>
      <TextInput style={s.fieldInput} value={address} onChangeText={setAddress} multiline placeholder="Street, City, State ZIP" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>PHONE</FieldLabel>
      <TextInput style={s.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(317) 555-1234" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>FAX</FieldLabel>
      <TextInput style={s.fieldInput} value={fax} onChangeText={setFax} keyboardType="phone-pad" placeholder="(317) 555-5678" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>REFERRAL CONTACT</FieldLabel>
      <TextInput style={s.fieldInput} value={referralContact} onChangeText={setReferralContact} placeholder="Name or department" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>REFERRAL EMAIL</FieldLabel>
      <TextInput style={s.fieldInput} value={referralEmail} onChangeText={setReferralEmail} keyboardType="email-address" autoCapitalize="none" placeholder="referrals@hospital.org" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>PREFERRED REFERRAL METHOD</FieldLabel>
      <TextInput style={s.fieldInput} value={preferredMethod} onChangeText={setPreferredMethod} placeholder="e.g. Fax, Email, Phone" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>REFERRAL INSTRUCTIONS</FieldLabel>
      <TextInput style={s.fieldInput} value={referralInstructions} onChangeText={setReferralInstructions} multiline placeholder="Step-by-step referral process" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>SCHEDULING INSTRUCTIONS</FieldLabel>
      <TextInput style={s.fieldInput} value={schedulingInstructions} onChangeText={setSchedulingInstructions} multiline placeholder="How to schedule an evaluation" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>INSURANCE NOTES</FieldLabel>
      <TextInput style={s.fieldInput} value={insuranceNotes} onChangeText={setInsuranceNotes} multiline placeholder="Payer mix, prior auth requirements" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>CAPABILITIES</FieldLabel>
      <ChipRow>
        <ChipToggle label="PM&R" active={pmR} onPress={() => setPmR(p => !p)} />
        <ChipToggle label="Neurosurgery" active={neuro} onPress={() => setNeuro(p => !p)} />
      </ChipRow>
      <FieldLabel>WEBSITE</FieldLabel>
      <TextInput style={s.fieldInput} value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="https://..." placeholderTextColor={Colors.textSecondary} />
    </SheetModal>
  );
}

// ── Edit contact modal ────────────────────────────────────────────────────────

const DISCIPLINES = ['OT', 'PT', 'OT/PT'] as const;
const CHAMPION_LEVELS = [
  { value: 'champion', label: 'Champion' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'emerging', label: 'Emerging' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'unknown', label: 'Unknown' },
];

function EditContactModal({ contact, onSave, onClose }: {
  contact: Contact;
  onSave: (f: { name: string; role: string | null; discipline: string | null; phone: string | null; relationship_notes: string | null; champion_level: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact.name);
  const [role, setRole] = useState(contact.role ?? '');
  const [discipline, setDiscipline] = useState<string | null>(contact.discipline);
  const [phone, setPhone] = useState(contact.phone ?? '');
  const [notes, setNotes] = useState(contact.relationship_notes ?? '');
  const [championLevel, setChampionLevel] = useState(contact.champion_level ?? 'unknown');

  return (
    <SheetModal
      title="Edit Contact"
      onClose={onClose}
      onSave={() => onSave({
        name,
        role: role || null,
        discipline,
        phone: phone || null,
        relationship_notes: notes || null,
        champion_level: championLevel,
      })}
    >
      <FieldLabel>NAME</FieldLabel>
      <TextInput style={s.fieldInput} value={name} onChangeText={setName} />
      <FieldLabel>ROLE</FieldLabel>
      <TextInput style={s.fieldInput} value={role} onChangeText={setRole} placeholder="e.g. Team Lead, Therapist" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>DISCIPLINE</FieldLabel>
      <ChipRow>
        {DISCIPLINES.map(d => (
          <ChipToggle key={d} label={d} active={discipline === d} onPress={() => setDiscipline(p => p === d ? null : d)} />
        ))}
      </ChipRow>
      <FieldLabel>PHONE</FieldLabel>
      <TextInput style={s.fieldInput} value={phone} onChangeText={setPhone} placeholder="e.g. (317) 555-1234" placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" />
      <FieldLabel>RELATIONSHIP NOTES</FieldLabel>
      <TextInput style={s.fieldInput} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
      <FieldLabel>CHAMPION LEVEL</FieldLabel>
      <ChipRow>
        {CHAMPION_LEVELS.map(({ value, label }) => (
          <ChipToggle key={value} label={label} active={championLevel === value} onPress={() => setChampionLevel(value)} />
        ))}
      </ChipRow>
    </SheetModal>
  );
}

// ── Sheet modal wrapper ───────────────────────────────────────────────────────

function SheetModal({ title, onClose, onSave, children }: {
  title: string; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onSave}><Text style={s.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          {children}
          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}
function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={s.chipRow}>{children}</View>;
}
function ChipToggle({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={[s.chipToggle, active && { backgroundColor: color ?? Colors.primary }]} onPress={onPress}>
      <Text style={[s.chipToggleText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  errorText: { fontSize: 14, color: '#E74C3C' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Header
  headerCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 20, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  accountName: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  accountSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  momentumDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, flexShrink: 0 },
  clinicalLine: { fontSize: 12, color: Colors.textSecondary, marginTop: 10 },
  nextActionBox: {
    backgroundColor: Colors.surface2, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  nextActionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  nextActionText: { fontSize: 14, color: Colors.text, lineHeight: 20 },

  // Inbox
  inboxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10 },
  inboxLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  inboxBadge: { backgroundColor: Colors.surface3, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  inboxBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  inboxCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  emptyInbox: { marginTop: 16, marginBottom: 8, alignItems: 'center' },
  emptyInboxText: { fontSize: 13, color: Colors.textSecondary },

  // Section headers
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  sectionRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  chevron: { fontSize: 13, color: Colors.textSecondary },
  addIcon: { padding: 4 },
  addIconText: { fontSize: 20, color: Colors.primary, fontWeight: '400' },

  // Cards
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardMuted: { opacity: 0.45 },
  cardHighlight: { borderWidth: 1.5, borderColor: Colors.positive },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  menuBtn: { padding: 4 },
  menuBtnText: { fontSize: 20, color: Colors.textSecondary, fontWeight: '700' },

  // Signal type badge
  typeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  impactDot: { width: 8, height: 8, borderRadius: 4 },

  // Swipe actions
  swipeAccept: { backgroundColor: Colors.positive, justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 10, marginBottom: 8 },
  swipeDelete: { backgroundColor: Colors.critical, justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 10, marginBottom: 8 },
  swipeIcon: { fontSize: 18, color: '#fff' },
  swipeLabel: { fontSize: 11, color: '#fff', fontWeight: '600', marginTop: 2 },

  // Opportunity status chip
  statusChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontWeight: '600' },

  // Task card
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  checkboxInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  taskChip: { fontSize: 11, color: Colors.textSecondary, backgroundColor: Colors.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, textTransform: 'capitalize' },
  taskDue: { fontSize: 11, color: Colors.textSecondary },

  // Milestone timeline
  timeline: { paddingLeft: 4 },
  milestoneRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { width: 56, alignItems: 'center', paddingTop: 4 },
  milestoneDate: { fontSize: 10, fontWeight: '700', color: Colors.primary, marginBottom: 4, textAlign: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 2, minHeight: 20 },
  milestoneRight: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginLeft: 8, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },

  // History
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyCheck: { fontSize: 14, color: '#27AE60', fontWeight: '700', marginTop: 1 },
  historyTitle: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  historySub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, textTransform: 'capitalize' },
  historyDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  emptyText: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 8 },

  // Toast
  toast: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: 'rgba(27,79,138,0.92)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Context menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuItemIcon: { fontSize: 18 },
  menuItemLabel: { fontSize: 16, color: Colors.text },

  // Convert modal
  convertChoices: { flex: 1, padding: 24, justifyContent: 'center' },
  convertBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  convertBtnIcon: { fontSize: 28 },
  convertBtnTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  convertBtnSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Edit modals
  modalContainer: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalCancel: { fontSize: 15, color: Colors.textSecondary },
  modalSave: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },
  fieldInput: { backgroundColor: '#F0F2F5', borderRadius: 8, padding: 12, fontSize: 15, color: Colors.text, minHeight: 44 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipToggle: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0F2F5' },
  chipToggleText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  saveAcceptBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveAcceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Contact champion badge
  championBadge: { backgroundColor: '#FFF3CD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  championBadgeText: { fontSize: 11, fontWeight: '700', color: '#856404' },

  // Clinical badges in account header
  clinicalBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  clinicalBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  clinicalBadgeText: { fontSize: 11, fontWeight: '700' },
  accountOrg: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },

  // Recent emails
  emailRow: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  emailRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  emailFrom: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8 },
  emailDate: { fontSize: 11, color: Colors.textSecondary, flexShrink: 0 },
  emailSubject: { fontSize: 13, color: Colors.text, marginBottom: 3 },
  emailSnippet: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  emailLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  emailLoadingText: { fontSize: 13, color: Colors.textSecondary },
  emailConnectBox: { backgroundColor: Colors.surface2, borderRadius: 10, padding: 14, marginBottom: 8 },
  emailConnectText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  // Email thread modal
  emailDetailFrom: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emailDetailEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emailDetailDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  emailDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  emailDetailBody: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  emailOpenGmail: { marginTop: 24, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emailOpenGmailText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // AI action buttons
  aiActionRow: { flexDirection: 'row', gap: 10, marginBottom: 4, marginTop: 4 },
  aiBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  aiBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  aiBtnLoading: { opacity: 0.6 },
  aiBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Snapshot card — neutral, lets content speak
  snapshotCard: {
    backgroundColor: Colors.surface2, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  snapshotText: { fontSize: 14, color: Colors.text, lineHeight: 22, fontStyle: 'italic' },

  // Visit brief modal
  visitBriefSubtitle: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 20, paddingTop: 8 },
  modalClose: { paddingHorizontal: 4 },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  briefItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  briefBullet: { fontSize: 18, color: Colors.primary, lineHeight: 24, marginTop: -1 },
  briefItemText: { flex: 1, fontSize: 15, color: Colors.text, lineHeight: 23 },
});
