import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import type { Account, CalendarEvent, DailyBrief, MeetingPrep, Signal, Task } from '../../src/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const doneTaskIds = new Set<number>();
const dismissedSignalIds = new Set<number>();

// ── Design tokens (oklch → hex) ─────────────────────────────────────────────
const C = {
  bg:         '#FAF9F7',
  ink:        '#383530',
  ink2:       '#6E6A63',
  ink3:       '#9E9A94',
  muted:      '#908D87',
  eyebrow:    '#A29E98',
  sectionDiv: '#E0DDD9',
  rowDiv:     '#E9E6E3',
  avatarBg:   '#EAE7E1',
  avatarInk:  '#5C5853',
  focusInk:   '#433F3A',
  blue:       '#3A72C8',
  green:      '#3D9E6A',
  greenText:  '#389868',
  orange:     '#C87A3D',
  red:        '#C94530',
  btnBg:      '#3D3A35',
  dotPast:    '#C8C4BE',
  dotDef:     '#C0BCB6',
  rail:       '#E5E2DE',
  prepText:   '#6B6559',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function dateline(): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const mon = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return `${day} · ${mon} ${d.getDate()}`;
}

function fmtTime(iso: string): { h: string; ap: string } {
  const d = new Date(iso);
  const hr = d.getHours(); const mn = d.getMinutes();
  const ap = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 || 12;
  return { h: mn === 0 ? `${h12}` : `${h12}:${String(mn).padStart(2, '0')}`, ap };
}

function nowStr(): { h: string; ap: string } {
  const d = new Date();
  const hr = d.getHours(); const mn = d.getMinutes();
  return { h: `${hr % 12 || 12}:${String(mn).padStart(2, '0')}`, ap: hr >= 12 ? 'PM' : 'AM' };
}

function prepLines(brief: string): string[] {
  const lines = brief.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) return lines.map(l => l.replace(/^[-–—•]\s*/, ''));
  return brief.split(/\.\s+/).filter(Boolean).map(s => s.replace(/\.$/, '').trim()).slice(0, 5);
}

function fmtLastUpdated(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'Updated just now';
  if (diff === 1) return 'Updated 1 minute ago';
  return `Updated ${diff} minutes ago`;
}

function signalAction(s: Signal): string {
  if (s.suggested_action) return s.suggested_action;
  if (s.signal_type === 'risk') return 'Schedule rounding';
  if (s.signal_type === 'opportunity') return 'Draft invite';
  return 'Add to watchlist';
}

function doneLabel(action: string): string {
  const a = action.toLowerCase();
  if (a.startsWith('schedule')) return 'Rounding scheduled';
  if (a.startsWith('draft')) return 'Draft started';
  return 'Added to watchlist';
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const router = useRouter();
  const [signals, setSignals]           = useState<Signal[]>([]);
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [accounts, setAccounts]         = useState<Account[]>([]);
  const [meetings, setMeetings]         = useState<CalendarEvent[]>([]);
  const [calConnected, setCalConnected] = useState(false);
  const [brief, setBrief]               = useState<DailyBrief | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  // UI state
  const [taskDone, setTaskDone]         = useState<Record<number, boolean>>({});
  const [sigOpen, setSigOpen]           = useState<Record<number, boolean>>({});
  const [sigDone, setSigDone]           = useState<Record<number, string>>({});
  const [sigGone, setSigGone]           = useState<Set<number>>(new Set());
  const [schedOpen, setSchedOpen]       = useState<Record<string, boolean>>({});
  const [prep, setPrep]                 = useState<Record<string, MeetingPrep>>({});
  const [prepLoading, setPrepLoading]   = useState<Record<string, boolean>>({});

  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    Promise.allSettled([
      api.getSignals(),
      api.getTasks(),
      api.getAccounts(),
      api.getCalendarStatus().catch(() => ({ connected: false })),
      api.getDailyBrief().catch(() => null),
    ]).then(([sigR, taskR, accR, calR, briefR]) => {
      if (sigR.status === 'fulfilled')   setSignals(sigR.value);
      if (taskR.status === 'fulfilled')  setTasks(taskR.value);
      if (accR.status === 'fulfilled')   setAccounts(accR.value);
      if (calR.status === 'fulfilled') {
        const connected = (calR.value as { connected: boolean }).connected;
        setCalConnected(connected);
        if (connected) api.getTodayEvents().then(setMeetings).catch(() => {});
      }
      if (briefR.status === 'fulfilled' && briefR.value) setBrief(briefR.value);
    }).finally(() => { setLoading(false); setRefreshing(false); setLastUpdated(new Date()); });
  }

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const lastFetch = useRef(0);
  useFocusEffect(useCallback(() => {
    const now = Date.now();
    if (now - lastFetch.current < CACHE_TTL) return;
    lastFetch.current = now;
    fetchAll();
  }, []));

  useEffect(() => {
    const t = timers.current;
    return () => { Object.values(t).forEach(clearTimeout); };
  }, []);

  // Seed done state from module-level set on first load
  useEffect(() => {
    if (doneTaskIds.size === 0) return;
    const init: Record<number, boolean> = {};
    doneTaskIds.forEach(id => { init[id] = true; });
    setTaskDone(init);
  }, []);

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  // ── Actions ────────────────────────────────────────────────────────────────
  function toggleTask(task: Task) {
    const nowDone = !taskDone[task.id];
    LayoutAnimation.configureNext({
      duration: 400,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setTaskDone(prev => ({ ...prev, [task.id]: nowDone }));
    if (nowDone) {
      doneTaskIds.add(task.id);
      api.updateTask(task.id, { status: 'done' }).catch(() => {});
    } else {
      doneTaskIds.delete(task.id);
      api.updateTask(task.id, { status: 'open' }).catch(() => {});
    }
  }

  function toggleSig(id: number) {
    setSigOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function acceptSig(signal: Signal) {
    const action = signalAction(signal);
    setSigOpen(prev => ({ ...prev, [signal.id]: false }));
    setSigDone(prev => ({ ...prev, [signal.id]: doneLabel(action) }));
    api.updateSignalStatus(signal.id, 'accepted').catch(() => {});
    const t = setTimeout(() => {
      LayoutAnimation.configureNext({
        duration: 450,
        delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });
      setSigGone(prev => new Set([...prev, signal.id]));
      dismissedSignalIds.add(signal.id);
    }, 1150);
    timers.current[signal.id] = t;
  }

  function dismissSig(signal: Signal) {
    LayoutAnimation.configureNext({
      duration: 350,
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setSigOpen(prev => ({ ...prev, [signal.id]: false }));
    setSigGone(prev => new Set([...prev, signal.id]));
    dismissedSignalIds.add(signal.id);
    api.updateSignalStatus(signal.id, 'rejected').catch(() => {});
  }

  function toggleSchedule(event: CalendarEvent) {
    const id = event.id;
    const opening = !schedOpen[id];
    if (opening && !prep[id] && !prepLoading[id]) {
      setPrepLoading(prev => ({ ...prev, [id]: true }));
      api.getMeetingPrep(id, event.account_id ?? undefined)
        .then(p => setPrep(prev => ({ ...prev, [id]: p })))
        .catch(() => {})
        .finally(() => setPrepLoading(prev => ({ ...prev, [id]: false })));
    }
    setSchedOpen(prev => ({ ...prev, [id]: opening }));
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const now = new Date();
  const pastEvents   = meetings.filter(e => new Date(e.start) < now);
  const futureEvents = meetings.filter(e => new Date(e.start) >= now);
  const nextEvent    = futureEvents[0] ?? null;
  const laterEvents  = futureEvents.slice(1);

  const focusStatement = brief?.brief
    ? (brief.brief.split(/(?<=[.!])\s+/)[0] ?? brief.brief)
    : nextEvent
      ? `${nextEvent.title}${nextEvent.account_name ? ` at ${nextEvent.account_name}` : ''} — and keeping your territory moving forward.`
      : 'A focused day to follow up with your accounts and keep momentum.';

  const visibleTasks   = tasks.filter(t => ['open', 'todo', 'in_progress'].includes(t.status) && !doneTaskIds.has(t.id)).slice(0, 6);
  const animatingDone  = tasks.filter(t => taskDone[t.id] && !doneTaskIds.has(t.id));
  const displayTasks   = [...visibleTasks, ...animatingDone];

  const visibleSignals = signals
    .filter(s => s.status === 'new' && !dismissedSignalIds.has(s.id) && !sigGone.has(s.id))
    .slice(0, 5);

  if (loading) {
    return (
      <View style={[s.screen, s.center]}>
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.blue} />}
      >
        {/* ── Masthead ── */}
        <View style={s.masthead}>
          <View style={s.mastheadRow}>
            <Text style={s.dateline}>{dateline()}</Text>
            <View style={s.avatar}><Text style={s.avatarLabel}>S</Text></View>
          </View>
          {lastUpdated && (
            <Text style={s.lastUpdated}>{fmtLastUpdated(lastUpdated)}</Text>
          )}
          <Text style={s.focusEyebrow}>Today's focus</Text>
          <Text style={s.focusDeck}>{focusStatement}</Text>
        </View>
        <View style={s.divSection} />

        {/* ── TODAY timeline ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Today</Text>
          {!calConnected ? (
            <TouchableOpacity
              onPress={() => router.push('/settings' as never)}
              activeOpacity={0.7}
              style={s.calPrompt}
            >
              <Text style={s.calPromptTitle}>No calendar connected</Text>
              <Text style={s.calPromptBody}>Connect Google Calendar in Settings to see your schedule and generate meeting prep.</Text>
              <Text style={s.calPromptLink}>Go to Settings →</Text>
            </TouchableOpacity>
          ) : meetings.length === 0 ? (
            <Text style={s.emptyText}>No meetings today.</Text>
          ) : (
            <View>
              {pastEvents.map((e, i) => (
                <TLRow key={e.id} event={e} state="past" showRail={i < pastEvents.length - 1 || !!nextEvent} />
              ))}
              {meetings.length > 0 && <NowMarker />}
              {nextEvent && (
                <TLRow
                  event={nextEvent}
                  state="next"
                  showRail={laterEvents.length > 0}
                  isOpen={!!schedOpen[nextEvent.id]}
                  prep={prep[nextEvent.id]}
                  prepLoading={!!prepLoading[nextEvent.id]}
                  onPress={() => toggleSchedule(nextEvent)}
                />
              )}
              {laterEvents.map((e, i) => (
                <TLRow key={e.id} event={e} state="later" showRail={i < laterEvents.length - 1} />
              ))}
            </View>
          )}
        </View>
        <View style={s.divSection} />

        {/* ── DON'T FORGET ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.eyebrow}>Don't forget</Text>
            {visibleTasks.length > 0 && <Text style={s.countBadge}>{visibleTasks.length}</Text>}
          </View>
          {displayTasks.length === 0 ? (
            <Text style={s.emptyText}>All caught up.</Text>
          ) : (
            displayTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                done={!!taskDone[task.id]}
                accountName={task.account_id != null ? accountMap[task.account_id] : undefined}
                onToggle={() => toggleTask(task)}
              />
            ))
          )}
        </View>
        <View style={s.divSection} />

        {/* ── NEEDS ATTENTION ── */}
        <View style={s.section}>
          <Text style={s.eyebrow}>Needs attention</Text>
          {visibleSignals.length === 0 ? (
            <Text style={s.emptyText}>No new signals.</Text>
          ) : (
            visibleSignals.map(sig => (
              <SigRow
                key={sig.id}
                signal={sig}
                accountName={sig.account_id != null ? accountMap[sig.account_id] : undefined}
                isOpen={!!sigOpen[sig.id]}
                doneLabel={sigDone[sig.id]}
                onTap={() => toggleSig(sig.id)}
                onAccept={() => acceptSig(sig)}
                onDismiss={() => dismissSig(sig)}
              />
            ))
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ── Timeline row ─────────────────────────────────────────────────────────────
type TLState = 'past' | 'next' | 'later';

function TLRow({ event, state, showRail, isOpen = false, prep, prepLoading = false, onPress }: {
  event: CalendarEvent; state: TLState; showRail: boolean;
  isOpen?: boolean; prep?: MeetingPrep; prepLoading?: boolean;
  onPress?: () => void;
}) {
  const { h, ap } = fmtTime(event.start);
  const chevron = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevron, { toValue: isOpen ? 1 : 0, duration: 280, useNativeDriver: true }).start();
  }, [isOpen, chevron]);

  const rotate = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const isPast = state === 'past';
  const isNext = state === 'next';

  const timeColor   = isPast ? C.ink3 : C.ink;
  const titleColor  = isPast ? C.ink2 : C.ink;
  const titleWeight = isNext ? ('600' as const) : ('500' as const);

  const dot = isNext
    ? <View style={s.dotNext} />
    : <View style={[s.dotHollow, { borderColor: isPast ? C.dotPast : C.dotDef }]} />;

  const lines = prep ? prepLines(prep.brief) : [];

  const inner = (
    <View style={s.tlRow}>
      <View style={s.timeCol}>
        <Text style={[s.timeH, { color: timeColor }]}>{h}</Text>
        <Text style={[s.timeAp, { color: C.muted }]}>{ap}</Text>
      </View>
      <View style={s.railCol}>
        {dot}
        {showRail && <View style={s.rail} />}
      </View>
      <View style={s.tlContent}>
        <View style={s.tlTitleRow}>
          <Text style={[s.tlTitle, { color: titleColor, fontWeight: titleWeight }]}>{event.title}</Text>
          {isNext && (
            <Animated.Text style={[s.chev, { transform: [{ rotate }] }]}>›</Animated.Text>
          )}
        </View>
        {(event.account_name || event.location) ? (
          <Text style={s.tlSub}>{event.account_name ?? event.location}</Text>
        ) : null}
        {isNext && isOpen && (
          <View style={s.prepPanel}>
            <Text style={s.prepEyebrow}>Suggested prep</Text>
            {prepLoading
              ? <Text style={s.prepLine}><Text style={s.prepDash}>— </Text>Loading…</Text>
              : lines.length > 0
                ? lines.map((l, i) => <Text key={i} style={s.prepLine}><Text style={s.prepDash}>— </Text>{l}</Text>)
                : <Text style={s.prepLine}><Text style={s.prepDash}>— </Text>Review your last recap before this meeting.</Text>
            }
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{inner}</TouchableOpacity>;
  return inner;
}

// ── Now marker ────────────────────────────────────────────────────────────────
function NowMarker() {
  const { h, ap } = nowStr();
  return (
    <View style={s.nowRow}>
      <View style={s.timeCol}>
        <Text style={s.nowH}>{h}</Text>
        <Text style={s.nowAp}>{ap}</Text>
      </View>
      <View style={s.railCol}>
        <View style={s.nowDot} />
      </View>
      <View style={s.nowRest}>
        <View style={s.nowLine} />
        <Text style={s.nowLabel}>Now</Text>
      </View>
    </View>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, done, accountName, onToggle }: {
  task: Task; done: boolean; accountName?: string; onToggle: () => void;
}) {
  const isOverdue = !done && !!task.due_date && new Date(task.due_date) < new Date();
  return (
    <TouchableOpacity style={s.taskRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={done ? s.cbDone : s.cb}>
        {done && <Text style={s.cbCheck}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.taskTitle, done && s.taskTitleDone]}>{task.title}</Text>
        {(accountName || isOverdue) ? (
          <Text style={s.taskMeta}>
            {isOverdue && <Text style={s.overdue}>Overdue · </Text>}
            {accountName ?? ''}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Signal row ────────────────────────────────────────────────────────────────
function SigRow({ signal, accountName, isOpen, doneLabel: dl, onTap, onAccept, onDismiss }: {
  signal: Signal; accountName?: string; isOpen: boolean; doneLabel?: string;
  onTap: () => void; onAccept: () => void; onDismiss: () => void;
}) {
  const chevron = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(chevron, { toValue: isOpen ? 1 : 0, duration: 240, useNativeDriver: true }).start();
  }, [isOpen, chevron]);
  const rotate = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const dotColor = (signal.signal_type === 'risk' || signal.impact_level === 'high') ? C.red : C.orange;
  const action = signalAction(signal);

  return (
    <View style={s.sigRow}>
      {dl ? (
        <Text style={s.sigDoneText}>✓ {dl}</Text>
      ) : (
        <>
          <TouchableOpacity style={s.sigMain} onPress={onTap} activeOpacity={0.7}>
            <View style={[s.sigDot, { backgroundColor: dotColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.sigTitle}>{signal.title}</Text>
              {accountName && <Text style={s.sigAcct}>{accountName}</Text>}
            </View>
            <Animated.Text style={[s.chev, { transform: [{ rotate }] }]}>›</Animated.Text>
          </TouchableOpacity>
          {isOpen && (
            <View style={s.sigActions}>
              <TouchableOpacity style={s.actionPill} onPress={onAccept} activeOpacity={0.8}>
                <Text style={s.actionPillText}>{action}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  center:      { justifyContent: 'center', alignItems: 'center' },
  scroll:      { paddingBottom: 40 },
  loadingText: { fontSize: 14, color: C.ink3, fontFamily: 'System' },

  // Masthead
  masthead:    { paddingTop: 52, paddingBottom: 22, paddingHorizontal: 26 },
  mastheadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateline:    { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 2.4, textTransform: 'uppercase' },
  avatar:      { width: 28, height: 28, borderRadius: 14, backgroundColor: C.avatarBg, justifyContent: 'center', alignItems: 'center' },
  avatarLabel: { fontSize: 12, fontWeight: '600', color: C.avatarInk },
  lastUpdated: { marginTop: 6, fontSize: 11, color: C.ink3, fontWeight: '400' },
  focusEyebrow:{ marginTop: 22, fontSize: 10, fontWeight: '600', color: C.eyebrow, letterSpacing: 2.8, textTransform: 'uppercase' },
  focusDeck:   { marginTop: 11, fontSize: 22, fontFamily: 'Georgia', color: C.focusInk, lineHeight: 31.5, letterSpacing: -0.1 },

  divSection:  { height: 1, backgroundColor: C.sectionDiv, marginHorizontal: 26 },
  section:     { paddingHorizontal: 26, paddingTop: 26, paddingBottom: 2 },
  eyebrow:     { fontSize: 11, fontWeight: '600', color: C.eyebrow, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginBottom: 4 },
  countBadge:  { fontSize: 11, fontWeight: '600', color: C.muted },
  emptyText:   { fontSize: 14, color: C.ink3, paddingBottom: 6 },
  linkText:    { fontSize: 14, color: C.blue, paddingBottom: 6 },
  calPrompt:   { backgroundColor: '#F5F3F0', borderRadius: 10, padding: 16, marginBottom: 6 },
  calPromptTitle:{ fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 4 },
  calPromptBody: { fontSize: 13, color: C.ink2, lineHeight: 18, marginBottom: 8 },
  calPromptLink: { fontSize: 13, color: C.blue, fontWeight: '500' },

  // Timeline
  tlRow:       { flexDirection: 'row', gap: 15, paddingBottom: 18 },
  timeCol:     { width: 46, alignItems: 'flex-end', flexShrink: 0 },
  timeH:       { fontSize: 13, fontWeight: '600' },
  timeAp:      { fontSize: 10, fontWeight: '600', marginTop: 3 },
  railCol:     { width: 13, alignItems: 'center', flexShrink: 0 },
  rail:        { flex: 1, width: 1.5, backgroundColor: C.rail, marginTop: 4 },
  dotNext:     { width: 11, height: 11, borderRadius: 999, backgroundColor: C.blue, marginTop: 3,
                  shadowColor: C.blue, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 4 },
  dotHollow:   { width: 9, height: 9, borderRadius: 999, borderWidth: 2, backgroundColor: C.bg, marginTop: 4 },
  tlContent:   { flex: 1 },
  tlTitleRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  tlTitle:     { fontSize: 15.5, lineHeight: 20, flex: 1 },
  tlSub:       { fontSize: 12.5, color: C.ink2, marginTop: 3, lineHeight: 18 },
  chev:        { fontSize: 22, color: C.ink3, lineHeight: 24, marginLeft: 6, marginTop: 1 },
  prepPanel:   { marginTop: 14, paddingBottom: 4 },
  prepEyebrow: { fontSize: 10, fontWeight: '600', color: C.ink2, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 },
  prepLine:    { fontSize: 15, fontFamily: 'Georgia', color: C.prepText, lineHeight: 22.5, paddingVertical: 2 },
  prepDash:    { color: C.muted },

  // Now marker
  nowRow:  { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 10, marginTop: -4 },
  nowH:    { fontSize: 11, fontWeight: '700', color: C.blue },
  nowAp:   { fontSize: 9, fontWeight: '700', color: C.blue, marginTop: 2 },
  nowDot:  { width: 7, height: 7, borderRadius: 999, backgroundColor: C.blue },
  nowRest: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nowLine: { flex: 1, height: 1.5, backgroundColor: C.blue, opacity: 0.42 },
  nowLabel:{ fontSize: 10, fontWeight: '600', color: C.blue, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Tasks
  taskRow:      { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.rowDiv, alignItems: 'flex-start' },
  cb:           { width: 20, height: 20, borderRadius: 10, borderWidth: 1.7, borderColor: '#CCC8C3', marginTop: 1, flexShrink: 0 },
  cbDone:       { width: 20, height: 20, borderRadius: 10, backgroundColor: C.green, marginTop: 1, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  cbCheck:      { color: '#fff', fontSize: 11, fontWeight: '800' },
  taskTitle:    { fontSize: 15.5, fontWeight: '500', color: C.ink, lineHeight: 22 },
  taskTitleDone:{ color: C.ink3, textDecorationLine: 'line-through' },
  taskMeta:     { marginTop: 3, fontSize: 12.5, fontWeight: '500', color: C.ink2, lineHeight: 18 },
  overdue:      { color: C.red },

  // Signals
  sigRow:       { borderBottomWidth: 1, borderBottomColor: C.rowDiv, paddingVertical: 15 },
  sigMain:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  sigDot:       { width: 7, height: 7, borderRadius: 999, marginTop: 7, flexShrink: 0 },
  sigTitle:     { fontSize: 15, fontWeight: '500', color: C.ink, lineHeight: 21 },
  sigAcct:      { fontSize: 12.5, fontWeight: '500', color: C.ink2, marginTop: 2 },
  sigActions:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 13, paddingLeft: 19 },
  actionPill:   { backgroundColor: C.btnBg, paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999 },
  actionPillText:{ fontSize: 13, fontWeight: '600', color: '#fff' },
  dismissText:  { fontSize: 13, fontWeight: '600', color: C.muted, paddingHorizontal: 6 },
  sigDoneText:  { fontSize: 15, color: C.greenText, paddingVertical: 4 },
});
