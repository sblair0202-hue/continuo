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
  bg:      Colors.paper,
  ink:     Colors.ink,
  ink2:    Colors.graphite,
  ink3:    Colors.stone,
  rowDiv:  Colors.linen,
  mist:    Colors.mist,
  blue:    Colors.sky,
  green:   Colors.sage,
  orange:  Colors.clay,
  red:     Colors.rose,
  eyebrow: Colors.graphite,
};

function momentumColor(m: string): string {
  if (['rising', 'increased', 'strong'].includes(m)) return C.green;
  if (['declining', 'decreased', 'at_risk'].includes(m)) return C.red;
  if (m === 'stable') return C.blue;
  return C.orange; // unknown / new account → clay amber (visible, means "untouched")
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
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.blue} />}
    >
      {/* Masthead */}
      <View style={s.masthead}>
        <Text style={s.eyebrow}>Your Territory</Text>
        <View style={s.mastheadRow}>
          {filter ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/accounts')} activeOpacity={0.7}>
              <Text style={s.filterChip}>{FILTER_LABELS[filter] ?? filter}  ✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.headCount}>
              {loading ? '' : `${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
            </Text>
          )}
          <TouchableOpacity onPress={() => router.push('/referral-guide')} activeOpacity={0.7}>
            <Text style={s.referralLink}>Referral Guide</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.divider} />

      {error && <Text style={s.errorText}>{error}</Text>}

      {/* List */}
      <View style={s.section}>
        {!loading && filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>
              {filter ? 'No accounts match.' : 'No accounts yet.'}
            </Text>
            <Text style={s.emptySub}>
              {filter
                ? 'Tap above to clear the filter.'
                : 'Submit a recap to create your first account.'}
            </Text>
          </View>
        ) : (
          filtered.map((account, i) => (
            <TouchableOpacity
              key={account.id}
              style={[s.row, i < filtered.length - 1 && s.rowBorder]}
              onPress={() => router.push(`/account/${account.id}`)}
              activeOpacity={0.65}
            >
              <View style={[s.momentumDot, { backgroundColor: momentumColor(account.momentum) }]} />
              <View style={s.rowBody}>
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
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },

  masthead:    { paddingTop: 52, paddingBottom: 22, paddingHorizontal: 26 },
  eyebrow:     { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: C.eyebrow, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 14 },
  mastheadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  headCount:   { fontFamily: 'HankenGrotesk_400Regular', fontSize: 22, color: C.ink, letterSpacing: -0.2 },
  filterChip:  { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: C.blue },
  referralLink:{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, color: C.ink2 },

  divider: { height: 1, backgroundColor: C.mist, marginHorizontal: 26 },

  section: { paddingHorizontal: 26, paddingTop: 4 },

  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 17, gap: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.rowDiv },
  rowBody:   { flex: 1 },

  momentumDot: { width: 7, height: 7, borderRadius: 999, flexShrink: 0, marginTop: 2 },
  name:        { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15.5, color: C.ink, lineHeight: 21 },
  sub:         { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: C.ink2, marginTop: 3, lineHeight: 18 },
  nextAction:  { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: C.ink2, marginTop: 5, lineHeight: 19 },
  chevron:     { fontSize: 22, color: C.ink3, lineHeight: 24, flexShrink: 0 },

  empty:     { paddingTop: 60, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle:{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: C.ink, textAlign: 'center', marginBottom: 8 },
  emptySub:  { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: C.ink2, textAlign: 'center', lineHeight: 22 },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: C.red, marginHorizontal: 26, marginBottom: 12 },
});
