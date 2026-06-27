import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import { Colors } from '../../src/constants/colors';
import type { Account, Contact, Signal } from '../../src/types';

type Results = {
  accounts: Account[];
  contacts: Contact[];
  signals: Signal[];
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.trim().length < 2) { setResults(null); return; }
    setSearching(true);
    try {
      const [accounts, contacts, signals] = await Promise.all([
        api.getAccounts(),
        api.getContacts(),
        api.getSignals(),
      ]);
      const q = text.toLowerCase();
      setResults({
        accounts: accounts.filter((a) => a.name.toLowerCase().includes(q)),
        contacts: contacts.filter((c) => c.name.toLowerCase().includes(q)),
        signals: signals.filter(
          (s) => s.title.toLowerCase().includes(q) || (s.summary ?? '').toLowerCase().includes(q)
        ),
      });
    } finally {
      setSearching(false);
    }
  }

  const total = results ? results.accounts.length + results.contacts.length + results.signals.length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search accounts, contacts, signals..."
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {query.length >= 2 && !searching && total === 0 && (
          <Text style={styles.empty}>No results for "{query}"</Text>
        )}

        {results && results.accounts.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Accounts</Text>
            {results.accounts.map((a) => (
              <TouchableOpacity key={a.id} style={styles.row} onPress={() => router.push(`/account/${a.id}`)}>
                <Text style={styles.rowTitle}>{a.name}</Text>
                {a.city && <Text style={styles.rowSub}>{a.city}{a.state ? `, ${a.state}` : ''}</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {results && results.contacts.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Contacts</Text>
            {results.contacts.map((c) => (
              <View key={c.id} style={styles.row}>
                <Text style={styles.rowTitle}>{c.name}</Text>
                {c.role && <Text style={styles.rowSub}>{c.role}</Text>}
              </View>
            ))}
          </>
        )}

        {results && results.signals.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Signals</Text>
            {results.signals.map((s) => (
              <View key={s.id} style={styles.row}>
                <Text style={styles.rowTitle}>{s.title}</Text>
                {s.summary && <Text style={styles.rowSub}>{s.summary}</Text>}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  scroll: { padding: 16 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  empty: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
});
