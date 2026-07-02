import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import { Colors, sp } from '../../src/constants/colors';
import type { SearchResults } from '../../src/types';

type Mode = 'search' | 'ask';

export default function SearchScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('search');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [askQuery, setAskQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);

  function handleSearch(text: string) {
    setQuery(text);
    setResults(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) return;
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      api.search(text.trim()).then(r => setResults(r)).catch(() => {}).finally(() => setSearching(false));
    }, 350);
  }

  function handleAsk() {
    const q = askQuery.trim();
    if (!q || asking) return;
    setChat(prev => [...prev, { role: 'user', text: q }]);
    setAskQuery('');            // clear the input immediately
    setAsking(true);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    api.ask(q)
      .then(r => setChat(prev => [...prev, { role: 'assistant', text: r.answer }]))
      .catch(() => setChat(prev => [...prev, { role: 'assistant', text: 'Unable to reach server — check your connection.' }]))
      .finally(() => {
        setAsking(false);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
      });
  }

  const totalResults = results
    ? results.accounts.length + results.contacts.length + results.signals.length + results.tasks.length
    : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
      {/* Mode toggle */}
      <View style={s.modeRow}>
        <TouchableOpacity
          style={[s.modeTab, mode === 'search' && s.modeTabActive]}
          onPress={() => setMode('search')}
          activeOpacity={0.7}
        >
          <Text style={[s.modeTabText, mode === 'search' && s.modeTabTextActive]}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeTab, mode === 'ask' && s.modeTabActive]}
          onPress={() => setMode('ask')}
          activeOpacity={0.7}
        >
          <Text style={[s.modeTabText, mode === 'ask' && s.modeTabTextActive]}>Ask</Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH ── */}
      {mode === 'search' && (
        <>
          <View style={s.inputBar}>
            <TextInput
              style={s.input}
              placeholder="Accounts, contacts, signals, tasks…"
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={Colors.textTertiary} style={{ marginLeft: sp.sm }} />}
          </View>

          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {query.length >= 2 && !searching && totalResults === 0 && (
              <Text style={s.empty}>No results for "{query}"</Text>
            )}

            {results?.accounts && results.accounts.length > 0 && (
              <>
                <Text style={s.groupLabel}>Accounts</Text>
                {results.accounts.map(a => (
                  <TouchableOpacity key={a.id} style={s.row} onPress={() => router.push(`/account/${a.id}`)} activeOpacity={0.6}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{a.name}</Text>
                      {a.city && <Text style={s.rowSub}>{a.city}{a.state ? `, ${a.state}` : ''}</Text>}
                      {a.next_action && <Text style={s.rowHint}>{a.next_action}</Text>}
                    </View>
                    <Text style={[s.rowBadge, { color: Colors.textTertiary }]}>{a.momentum}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {results?.contacts && results.contacts.length > 0 && (
              <>
                <Text style={s.groupLabel}>Contacts</Text>
                {results.contacts.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={s.row}
                    onPress={() => c.account_id ? router.push(`/account/${c.account_id}`) : undefined}
                    activeOpacity={c.account_id ? 0.6 : 1}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{c.name}</Text>
                      <Text style={s.rowSub}>
                        {[c.discipline, c.role].filter(Boolean).join(' · ')}
                        {c.account_name ? ` · ${c.account_name}` : ''}
                      </Text>
                      {c.phone && <Text style={s.rowHint}>{c.phone}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {results?.signals && results.signals.length > 0 && (
              <>
                <Text style={s.groupLabel}>Signals</Text>
                {results.signals.map(sig => (
                  <View key={sig.id} style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{sig.title}</Text>
                      {sig.suggested_action && <Text style={s.rowSub}>{sig.suggested_action}</Text>}
                    </View>
                    <Text style={[s.rowBadge, {
                      color: sig.impact_level === 'high' ? Colors.critical : sig.impact_level === 'medium' ? Colors.warning : Colors.textTertiary
                    }]}>{sig.impact_level}</Text>
                  </View>
                ))}
              </>
            )}

            {results?.tasks && results.tasks.length > 0 && (
              <>
                <Text style={s.groupLabel}>Tasks</Text>
                {results.tasks.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={s.row}
                    onPress={() => t.account_id ? router.push(`/account/${t.account_id}`) : undefined}
                    activeOpacity={t.account_id ? 0.6 : 1}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{t.title}</Text>
                      {t.account_name && <Text style={s.rowSub}>{t.account_name}</Text>}
                      {t.due_date && <Text style={s.rowHint}>Due {t.due_date.split('T')[0]}</Text>}
                    </View>
                    <Text style={[s.rowBadge, { color: t.priority === 'high' ? Colors.critical : Colors.textTertiary }]}>{t.priority}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* ── ASK ── */}
      {mode === 'ask' && (
        <View style={{ flex: 1 }}>
          <View style={s.askHeader}>
            <Text style={s.askHeaderTitle}>Territory Intelligence</Text>
            <Text style={s.askHeaderSub}>Ask about accounts, contacts, tasks, signals, or opportunities.</Text>
          </View>

          <ScrollView
            ref={chatScrollRef}
            contentContainerStyle={s.askScroll}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chat.length === 0 && !asking && (
              <Text style={s.askPlaceholder}>Ask a question below to get started.</Text>
            )}

            {chat.map((m, i) => (
              m.role === 'user' ? (
                <View key={i} style={s.userBubble}>
                  <Text style={s.userBubbleText}>{m.text}</Text>
                </View>
              ) : (
                <View key={i} style={s.answerBlock}>
                  <Text style={s.answerMeta}>Continuo</Text>
                  <Text style={s.answerText}>{m.text}</Text>
                </View>
              )
            ))}

            {asking && (
              <View style={s.thinkingRow}>
                <ActivityIndicator size="small" color={Colors.textTertiary} />
                <Text style={s.thinkingText}>Thinking…</Text>
              </View>
            )}
          </ScrollView>

          <View style={s.askInputRow}>
            <TextInput
              style={s.askInput}
              placeholder="Ask anything…"
              placeholderTextColor={Colors.textTertiary}
              value={askQuery}
              onChangeText={setAskQuery}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleAsk}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[s.sendBtn, (!askQuery.trim() || asking) && s.sendBtnDisabled]}
              onPress={handleAsk}
              disabled={!askQuery.trim() || asking}
              activeOpacity={0.7}
            >
              <Text style={s.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  // Mode tabs
  modeRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  modeTab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  modeTabActive: { borderBottomColor: Colors.sky },
  modeTabText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: Colors.graphite },
  modeTabTextActive: { fontFamily: 'HankenGrotesk_600SemiBold', color: Colors.sky },

  // Search input
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingHorizontal: sp.md, paddingVertical: sp.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 10,
    paddingHorizontal: sp.md, paddingVertical: sp.sm + 2,
    fontSize: 15, color: Colors.text,
  },
  scroll: { padding: sp.md },

  // Section labels
  groupLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 11, color: Colors.graphite,
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginTop: sp.lg, marginBottom: 6,
  },

  // Result rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 10, padding: sp.md, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    gap: sp.sm,
  },
  rowTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.ink },
  rowSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: Colors.graphite, marginTop: 2 },
  rowHint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: Colors.sky, marginTop: 3 },
  rowBadge: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12 },
  empty: { fontFamily: 'Newsreader_400Regular_Italic', fontSize: 14, color: Colors.graphite, textAlign: 'center', marginTop: 40 },

  // Ask mode
  askHeader: {
    backgroundColor: Colors.surface, padding: sp.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  askHeaderTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.ink, marginBottom: 3 },
  askHeaderSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: Colors.graphite, lineHeight: 19 },
  askScroll: { padding: sp.md, flexGrow: 1 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: sp.md },
  thinkingText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.graphite },
  answerBlock: {
    backgroundColor: Colors.surface2, borderRadius: 10, padding: sp.md, marginBottom: sp.md,
  },
  answerMeta: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 11, color: Colors.graphite,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: sp.sm,
  },
  answerText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: Colors.ink, lineHeight: 24 },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: Colors.sky, borderRadius: 16, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: sp.md, maxWidth: '82%',
  },
  userBubbleText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: Colors.surface, lineHeight: 22 },
  askPlaceholder: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: Colors.stone, textAlign: 'center', marginTop: 60 },
  askInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: sp.sm,
    padding: sp.md, backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  askInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 10,
    paddingHorizontal: sp.md, paddingVertical: sp.sm + 2,
    fontSize: 15, color: Colors.text, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.sky, borderRadius: 10,
    paddingHorizontal: sp.md, paddingVertical: sp.sm + 2,
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.reversed },
});
