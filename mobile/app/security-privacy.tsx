import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../src/api/client';
import { Colors } from '../src/constants/colors';

type ConnState = { calendar: boolean | null; email: boolean | null; salesforce: boolean | null };

export default function SecurityPrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conn, setConn] = useState<ConnState>({ calendar: null, email: null, salesforce: null });
  const [exporting, setExporting] = useState(false);

  function refresh() {
    api.getCalendarStatus().then(d => setConn(c => ({ ...c, calendar: d.connected }))).catch(() => {});
    api.getEmailStatus().then(d => setConn(c => ({ ...c, email: d.connected }))).catch(() => {});
    api.getSalesforceStatus().then(d => setConn(c => ({ ...c, salesforce: d.connected }))).catch(() => {});
  }
  useEffect(refresh, []);

  function disconnect(provider: 'calendar' | 'email' | 'salesforce', label: string) {
    Alert.alert(`Disconnect ${label}?`, 'Continuo will stop accessing this until you reconnect.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => { try { await api.disconnectIntegration(provider); refresh(); } catch {} } },
    ]);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await api.exportMyData();
      await Share.share({ message: JSON.stringify(data, null, 2), title: 'Continuo — My Data Export' });
    } catch {
      Alert.alert('Export failed', 'Could not export right now. Try again in a moment.');
    } finally {
      setExporting(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete account',
      'This permanently removes your Continuo data. This cannot be undone. To proceed, contact support so we can verify and complete the deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email support', onPress: () => Linking.openURL('mailto:sblair0202@gmail.com?subject=Delete%20my%20Continuo%20account').catch(() => {}) },
      ]
    );
  }

  const connLabel = (v: boolean | null) => v === null ? '…' : v ? 'Connected' : 'Not connected';
  const connColor = (v: boolean | null) => v ? Colors.positive : Colors.graphite;

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerLabel}>Security & Privacy</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* PHI readiness */}
        <View style={s.noteCard}>
          <Text style={s.noteText}>
            Continuo is built to keep your data private and under your control. Avoid entering patient-identifying
            details unless approved for your organization. HIPAA-ready features are in progress.
          </Text>
        </View>

        {/* Connected integrations */}
        <Text style={s.eyebrow}>Connected integrations</Text>
        <View style={s.card}>
          {([['calendar', 'Google Calendar'], ['email', 'Gmail'], ['salesforce', 'Salesforce']] as const).map(([key, label], i) => (
            <View key={key}>
              {i > 0 && <View style={s.div} />}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{label}</Text>
                  <Text style={[s.rowSub, { color: connColor(conn[key]) }]}>{connLabel(conn[key])}</Text>
                </View>
                {conn[key] && (
                  <TouchableOpacity onPress={() => disconnect(key, label)} activeOpacity={0.7}>
                    <Text style={s.disconnect}>Disconnect</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Access */}
        <Text style={s.eyebrow}>Access</Text>
        <View style={s.card}>
          <View style={s.switchRow}>
            <Text style={s.rowLabel}>Biometric unlock</Text>
            <Switch value={true} onValueChange={() => Alert.alert('Biometric unlock', 'Manage this in your device security settings.')} trackColor={{ true: Colors.sky }} />
          </View>
          <View style={s.div} />
          <View style={s.switchRow}>
            <Text style={s.rowLabel}>Two-factor authentication</Text>
            <View style={s.soon}><Text style={s.soonText}>Soon</Text></View>
          </View>
        </View>

        {/* Your data */}
        <Text style={s.eyebrow}>Your data</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={handleExport} disabled={exporting} activeOpacity={0.7}>
            <Text style={s.rowLabel}>{exporting ? 'Preparing…' : 'Export my data'}</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
          <View style={s.div} />
          <TouchableOpacity style={s.row} onPress={handleDelete} activeOpacity={0.7}>
            <Text style={[s.rowLabel, { color: Colors.critical }]}>Delete account</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={s.eyebrow}>Legal</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('https://example.com/privacy').catch(() => {})} activeOpacity={0.7}>
            <Text style={s.rowLabel}>Privacy Policy</Text><Text style={s.chev}>›</Text>
          </TouchableOpacity>
          <View style={s.div} />
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('https://example.com/terms').catch(() => {})} activeOpacity={0.7}>
            <Text style={s.rowLabel}>Terms of Service</Text><Text style={s.chev}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
  backBtn: { width: 44, height: 36, justifyContent: 'center' },
  backBtnText: { fontSize: 30, color: Colors.ink, lineHeight: 32 },
  headerLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: Colors.inkDark },
  noteCard: { marginHorizontal: 20, marginTop: 6, marginBottom: 8, backgroundColor: Colors.skyTint, borderRadius: 12, padding: 14 },
  noteText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: Colors.ink, lineHeight: 20 },
  eyebrow: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: Colors.graphite, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 22, marginBottom: 8, marginHorizontal: 24 },
  card: { marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.mist, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  rowLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: Colors.ink, flex: 1 },
  rowSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, marginTop: 2 },
  disconnect: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: Colors.critical },
  chev: { fontSize: 20, color: Colors.stone },
  div: { height: 1, backgroundColor: Colors.linen, marginLeft: 16 },
  soon: { backgroundColor: Colors.linen, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  soonText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 11, color: Colors.graphite },
});
