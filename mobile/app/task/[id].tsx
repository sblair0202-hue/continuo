import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { Colors } from '../../src/constants/colors';
import type { Account, Task } from '../../src/types';

type TaskDetail = Task & { account_name?: string | null };

const PRIORITIES = ['low', 'medium', 'high'];

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
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);

  // Account picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [acctSearch, setAcctSearch] = useState('');

  useEffect(() => {
    api.getTask(Number(id))
      .then(t => {
        setTask(t);
        setTitle(t.title ?? '');
        setDescription(t.description ?? '');
        setPriority(t.priority ?? 'medium');
        setAccountId(t.account_id ?? null);
        setAccountName(t.account_name ?? null);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load task.'))
      .finally(() => setLoading(false));
  }, [id]);

  const isDone = task?.status === 'done';

  async function toggleDone() {
    if (!task) return;
    const next = isDone ? 'open' : 'done';
    setTask({ ...task, status: next });
    try { await api.updateTask(task.id, { status: next }); }
    catch { setTask({ ...task, status: task.status }); }
  }

  async function saveEdits() {
    if (!task) return;
    const patch = { title: title.trim() || task.title, description: description.trim() || null, priority, account_id: accountId };
    setTask({ ...task, ...patch, account_name: accountName });
    setEditing(false);
    try { await api.updateTask(task.id, patch as any); } catch {}
  }

  function openAccountPicker() {
    setPickerOpen(true);
    if (accounts.length === 0) api.getAccounts().then(setAccounts).catch(() => {});
  }

  function chooseAccount(a: Account | null) {
    setAccountId(a?.id ?? null);
    setAccountName(a?.name ?? null);
    setPickerOpen(false);
    if (!editing) {
      // assigning from read mode saves immediately
      if (task) {
        setTask({ ...task, account_id: a?.id ?? null, account_name: a?.name ?? null });
        api.updateTask(task.id, { account_id: a?.id ?? null } as any).catch(() => {});
      }
    }
  }

  function confirmDelete() {
    if (!task) return;
    Alert.alert('Delete task?', 'This removes the task permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteTask(task.id); router.back(); } catch {} } },
    ]);
  }

  const due = formatDate(task?.due_date ?? null);
  const isOverdue = !isDone && !!task?.due_date && new Date(task.due_date) < new Date();
  const filteredAccounts = accounts.filter(a => a.name.toLowerCase().includes(acctSearch.toLowerCase()));

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerLabel}>Task</Text>
        {task && !loading ? (
          <TouchableOpacity onPress={() => (editing ? saveEdits() : setEditing(true))} activeOpacity={0.7}>
            <Text style={s.editAction}>{editing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        ) : <View style={s.backBtn} />}
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={Colors.sky} /></View>
      ) : error || !task ? (
        <View style={s.centered}><Text style={s.errorText}>{error ?? 'Task not found.'}</Text></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title */}
          {editing ? (
            <TextInput style={s.titleInput} value={title} onChangeText={setTitle} placeholder="Task title" multiline />
          ) : (
            <Text style={[s.title, isDone && s.titleDone]}>{task.title}</Text>
          )}

          {/* Priority */}
          <Text style={s.fieldLabel}>PRIORITY</Text>
          {editing ? (
            <View style={s.prioRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} style={[s.prioChip, priority === p && { backgroundColor: priorityColor(p), borderColor: priorityColor(p) }]} onPress={() => setPriority(p)} activeOpacity={0.7}>
                  <Text style={[s.prioChipText, priority === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[s.badge, { backgroundColor: priorityColor(task.priority) + '22', alignSelf: 'flex-start' }]}>
              <View style={[s.dot, { backgroundColor: priorityColor(task.priority) }]} />
              <Text style={s.badgeText}>{task.priority}</Text>
            </View>
          )}

          {/* Account assignment — always tappable */}
          <Text style={s.fieldLabel}>ACCOUNT</Text>
          <TouchableOpacity style={s.assignRow} onPress={openAccountPicker} activeOpacity={0.7}>
            <Text style={[s.assignVal, !accountName && s.assignEmpty]}>{accountName ?? 'Unassigned — tap to assign'}</Text>
            <Text style={s.assignChev}>›</Text>
          </TouchableOpacity>

          {/* Notes / details */}
          <Text style={s.fieldLabel}>NOTES</Text>
          {editing ? (
            <TextInput style={s.notesInput} value={description} onChangeText={setDescription} placeholder="Add context…" multiline textAlignVertical="top" />
          ) : (
            <Text style={s.notesText}>{task.description || '—'}</Text>
          )}

          {/* Read-only meta */}
          <Text style={s.fieldLabel}>DETAILS</Text>
          <View style={s.metaRow}><Text style={s.metaKey}>Due</Text><Text style={[s.metaVal, isOverdue && { color: Colors.rose }]}>{due ?? 'None'}</Text></View>
          <View style={s.metaRow}><Text style={s.metaKey}>Source</Text><Text style={s.metaVal}>{task.source_type === 'email' ? 'From email' : task.source_type === 'voice' ? 'From capture' : (task.source_type ?? '—')}</Text></View>
          <View style={s.metaRow}><Text style={s.metaKey}>Status</Text><Text style={s.metaVal}>{isDone ? 'Done' : 'Open'}</Text></View>
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {task && !loading && !editing && (
        <View style={[s.actions, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} activeOpacity={0.75}>
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.doneBtn, isDone && s.reopenBtn]} onPress={toggleDone} activeOpacity={0.85}>
            <Text style={[s.doneText, isDone && s.reopenText]}>{isDone ? 'Reopen' : 'Mark Done'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account picker modal */}
      <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}>
        <View style={s.pickerScreen}>
          <View style={s.pickerHeader}>
            <Text style={s.pickerTitle}>Assign account</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}><Text style={s.pickerCancel}>Cancel</Text></TouchableOpacity>
          </View>
          <TextInput style={s.searchInput} value={acctSearch} onChangeText={setAcctSearch} placeholder="Search accounts…" placeholderTextColor={Colors.graphite} autoCorrect={false} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <TouchableOpacity style={s.pickerRow} onPress={() => chooseAccount(null)}>
              <Text style={[s.pickerRowName, { color: Colors.graphite }]}>Unassigned</Text>
            </TouchableOpacity>
            {filteredAccounts.map(a => (
              <TouchableOpacity key={a.id} style={s.pickerRow} onPress={() => chooseAccount(a)}>
                <Text style={s.pickerRowName}>{a.name}</Text>
                {a.city ? <Text style={s.pickerRowSub}>{a.city}{a.state ? `, ${a.state}` : ''}</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
  backBtn: { width: 44, height: 36, borderRadius: 18, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText: { fontSize: 30, color: Colors.ink, lineHeight: 32 },
  headerLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.inkDark },
  editAction: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.sky, width: 44, textAlign: 'right' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.rose },
  body: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },
  title: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 24, lineHeight: 31, letterSpacing: -0.4, color: Colors.inkDark },
  titleDone: { textDecorationLine: 'line-through', color: Colors.graphite },
  titleInput: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 22, color: Colors.inkDark, borderWidth: 1, borderColor: Colors.mist, borderRadius: 12, padding: 12, backgroundColor: Colors.surface },
  fieldLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: Colors.graphite, letterSpacing: 1.4, marginTop: 22, marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: Colors.ink, textTransform: 'capitalize' },
  prioRow: { flexDirection: 'row', gap: 8 },
  prioChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: Colors.mist },
  prioChipText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, color: Colors.ink, textTransform: 'capitalize' },
  assignRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.mist },
  assignVal: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: Colors.sky, flex: 1 },
  assignEmpty: { color: Colors.graphite, fontFamily: 'HankenGrotesk_400Regular' },
  assignChev: { fontSize: 20, color: Colors.stone },
  notesInput: { fontFamily: 'Newsreader_400Regular', fontSize: 16, lineHeight: 24, color: Colors.ink, borderWidth: 1, borderColor: Colors.mist, borderRadius: 12, padding: 12, minHeight: 90, backgroundColor: Colors.surface },
  notesText: { fontFamily: 'Newsreader_400Regular', fontSize: 16, lineHeight: 25, color: Colors.ink },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.linen },
  metaKey: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.graphite },
  metaVal: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: Colors.ink },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.mist, backgroundColor: 'rgba(249,248,244,0.94)' },
  deleteBtn: { flex: 1, paddingVertical: 15, borderRadius: 9999, borderWidth: 1, borderColor: Colors.stone, alignItems: 'center' },
  deleteText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: Colors.critical },
  doneBtn: { flex: 2, paddingVertical: 15, borderRadius: 9999, backgroundColor: Colors.sky, alignItems: 'center' },
  doneText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.surface },
  reopenBtn: { backgroundColor: Colors.linen },
  reopenText: { color: Colors.inkDark },
  // picker
  pickerScreen: { flex: 1, backgroundColor: Colors.paper, paddingHorizontal: 22, paddingTop: 24 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pickerTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 18, color: Colors.inkDark },
  pickerCancel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.sky },
  searchInput: { borderWidth: 1, borderColor: Colors.mist, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, marginBottom: 10, backgroundColor: Colors.surface },
  pickerRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.linen },
  pickerRowName: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15.5, color: Colors.ink },
  pickerRowSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: Colors.graphite, marginTop: 2 },
});
