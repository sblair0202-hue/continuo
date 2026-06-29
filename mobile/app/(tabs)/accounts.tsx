import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../src/api/client';
import { Colors } from '../../src/constants/colors';
import type { Account, Signal } from '../../src/types';

const C = {
  bg:     Colors.paper,
  ink:    Colors.ink,
  ink2:   Colors.graphite,
  ink3:   Colors.stone,
  muted:  Colors.graphite,
  rowDiv: Colors.linen,
  blue:   Colors.sky,
  green:  Colors.sage,
  orange: Colors.clay,
  red:    Colors.rose,
};

function momentumColor(m: string): string {
  if (['rising', 'increased', 'strong'].includes(m)) return C.green;
  if (['declining', 'decreased', 'at_risk'].includes(m)) return C.red;
  if (m === 'stable') return C.blue;
  return C.muted;
}

const FILTER_LABELS: Record<string, string> = {
  healthy:   'On Track',
  attention: 'Needs Attention',
  risks:     'Active Risks',
  opps:      'Active Leads',
};

export default function AccountsScreen() {
  const router  = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string }>();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signals, setSignals]   = useState<Signal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    Promise.all([api.getAccounts(), api.getSignals()])
      .then(([a, s]) => { setAccounts(a); setSignals(s); })
      .catch((e: Error) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const filtered = useMemo(() => {
    if (!filter) return accounts;
    if (filter === 'healthy')
      return accounts.filter(a => ['rising', 'stable', 'increased', 'strong'].includes(a.momentum));
    if (filter === 'attention')
      return accounts.filter(a => ['declining', 'decreased', 'at_risk', 'unknown'].includes(a.momentum));
    if (filter === 'risks') {
      const ids = new Set(signals.filter(s => s.signal_type === 'risk' && s.status === 'new').map(s => s.account_id));
      return accounts.filter(a => ids.has(a.id));
    }
    if (filter === 'opps') {
      const ids = new Set(signals.filter(s => s.signal_type === 'opportunity' && s.status === 'new').map(s => s.account_id));
      return accounts.filter(a => ids.has(a.id));
    }
    return accounts;
  }, [accounts, signals, filter]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.blue} />}
    >
      {/* Header row */}
      <View style={s.headerRow}>
        {filter ? (
          <TouchableOpacity onPress={() => router.push('/(tabs)/accounts')} activeOpacity={0.7}>
            <Text style={s.filterActive}>{FILTER_LABELS[filter] ?? filter}  ✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.headerCount}>{loading ? '' : `${accounts.length} accounts`}</Text>
        )}
        <TouchableOpacity onPress={() => router.push('/referral-guide')} activeOpacity={0.7}>
          <Text style={s.referralLink}>Referral Guide</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={s.errorText}>{error}</Text>}

      {loading ? null : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{filter ? 'No accounts match.' : 'No accounts yet.'}</Text>
          <Text style={s.emptySub}>
            {filter ? 'Tap above to clear the filter.' : 'Submit a recap to create your first account.'}
          </Text>
        </View>
      ) : (
        <View style={s.list}>
          {filtered.map((account, i) => (
            <TouchableOpacity
              key={account.id}
              style={[s.row, i < filtered.length - 1 && s.rowBorder]}
              onPress={() => router.push(`/account/${account.id}`)}
              activeOpacity={0.6}
            >
              <View style={s.rowLeft}>
                <Text style={s.name}>{account.name}</Text>
                {(account.organization && account.organization !== account.name) || account.city ? (
                  <Text style={s.sub}>
                    {[account.organization !== account.name ? account.organization : null, account.city]
                      .filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {account.next_action ? (
                  <Text style={s.nextAction} numberOfLines={1}>{account.next_action}</Text>
                ) : null}
              </View>
              <View style={[s.dot, { backgroundColor: momentumColor(account.momentum) }]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 26, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, paddingBottom: 16,
  },
  headerCount:  { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, color: C.muted },
  filterActive: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: C.blue },
  referralLink: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 12, color: C.muted },

  list:      { borderTopWidth: 1, borderTopColor: C.rowDiv },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.rowDiv },
  rowLeft:   { flex: 1 },

  name:       { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15.5, color: C.ink, lineHeight: 22 },
  sub:        { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: C.ink3, marginTop: 2, lineHeight: 18 },
  nextAction: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: C.ink2, marginTop: 5, lineHeight: 19 },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  empty:     { marginTop: 80, alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle:{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: C.ink, textAlign: 'center', marginBottom: 8 },
  emptySub:  { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: C.ink3, textAlign: 'center', lineHeight: 22 },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: C.red, marginBottom: 12 },
});
