import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { Colors } from '../../src/constants/colors';
import type { Task } from '../../src/types';

type TaskDetail = Task & { account_name?: string | null };

function priorityColor(p: string): string {
  if (p === 'high') return Colors.critical;
  if (p === 'low') return Colors.positive;
  return Colors.warning;
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTask(Number(id))
      .then(setTask)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load task.'))
      .finally(() => setLoading(false));
  }, [id]);

  const isDone = task?.status === 'done';

  async function toggleDone() {
    if (!task) return;
    const next = isDone ? 'open' : 'done';
    setTask({ ...task, status: next });
    try {
      await api.updateTask(task.id, { status: next });
    } catch {
      setTask({ ...task, status: task.status });
    }
  }

  function confirmDelete() {
    if (!task) return;
    Alert.alert('Delete task?', 'This removes the task permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.deleteTask(task.id); router.back(); } catch {}
        },
      },
    ]);
  }

  const due = formatDate(task?.due_date ?? null);
  const isOverdue = !isDone && !!task?.due_date && new Date(task.due_date) < new Date();

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerLabel}>TASK</Text>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={Colors.sky} /></View>
      ) : error || !task ? (
        <View style={s.centered}><Text style={s.errorText}>{error ?? 'Task not found.'}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <Text style={[s.title, isDone && s.titleDone]}>{task.title}</Text>

          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: priorityColor(task.priority) + '22' }]}>
              <View style={[s.dot, { backgroundColor: priorityColor(task.priority) }]} />
              <Text style={s.badgeText}>{task.priority} priority</Text>
            </View>
            {isDone && (
              <View style={[s.badge, { backgroundColor: Colors.sageTint }]}>
                <Text style={[s.badgeText, { color: Colors.sage }]}>Done</Text>
              </View>
            )}
            {isOverdue && (
              <View style={[s.badge, { backgroundColor: Colors.roseTint }]}>
                <Text style={[s.badgeText, { color: Colors.rose }]}>Overdue</Text>
              </View>
            )}
          </View>

          {task.description ? (
            <View style={s.card}>
              <Text style={s.cardEyebrow}>CONTEXT</Text>
              <Text style={s.cardBody}>{task.description}</Text>
            </View>
          ) : null}

          <View style={s.card}>
            <Text style={s.cardEyebrow}>DETAILS</Text>
            {task.account_name ? (
              <TouchableOpacity
                style={s.metaRow}
                onPress={() => task.account_id && router.push(`/account/${task.account_id}`)}
                activeOpacity={0.7}
              >
                <Text style={s.metaKey}>Account</Text>
                <Text style={[s.metaVal, { color: Colors.sky }]}>{task.account_name} ›</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.metaRow}>
                <Text style={s.metaKey}>Account</Text>
                <Text style={s.metaVal}>Unassigned</Text>
              </View>
            )}
            {due ? (
              <View style={s.metaRow}>
                <Text style={s.metaKey}>Due</Text>
                <Text style={[s.metaVal, isOverdue && { color: Colors.rose }]}>{due}</Text>
              </View>
            ) : null}
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Source</Text>
              <Text style={s.metaVal}>{task.source_type === 'email' ? 'From email' : task.source_type === 'voice' ? 'From capture' : (task.source_type ?? '—')}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {task && !loading && (
        <View style={[s.actions, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} activeOpacity={0.75}>
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.doneBtn, isDone && s.reopenBtn]} onPress={toggleDone} activeOpacity={0.85}>
            <Text style={[s.doneText, isDone && s.reopenText]}>{isDone ? 'Reopen' : 'Mark Done'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.linen, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: Colors.ink, lineHeight: 28, marginTop: -2 },
  headerLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: Colors.graphite, letterSpacing: 2.4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.rose },
  body: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  title: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 24, lineHeight: 31, letterSpacing: -0.4, color: Colors.inkDark },
  titleDone: { textDecorationLine: 'line-through', color: Colors.graphite },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: Colors.ink, textTransform: 'capitalize' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.mist,
    padding: 16, marginTop: 16,
  },
  cardEyebrow: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: Colors.graphite, letterSpacing: 1.4, marginBottom: 10 },
  cardBody: { fontFamily: 'Newsreader_400Regular', fontSize: 16, lineHeight: 25, color: Colors.ink },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.linen },
  metaKey: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.graphite },
  metaVal: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: Colors.ink, flexShrink: 1, textAlign: 'right' },
  actions: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 22, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: Colors.mist, backgroundColor: 'rgba(249,248,244,0.94)',
  },
  deleteBtn: { flex: 1, paddingVertical: 15, borderRadius: 9999, borderWidth: 1, borderColor: Colors.stone, alignItems: 'center' },
  deleteText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: Colors.critical },
  doneBtn: { flex: 2, paddingVertical: 15, borderRadius: 9999, backgroundColor: Colors.sky, alignItems: 'center' },
  doneText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.surface },
  reopenBtn: { backgroundColor: Colors.linen },
  reopenText: { color: Colors.inkDark },
});
