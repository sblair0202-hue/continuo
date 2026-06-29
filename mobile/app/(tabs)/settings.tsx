import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../src/context/AuthContext';
import { API_BASE_URL } from '../../src/api/client';

export default function SettingsScreen() {
  const { user, logout, biometricAvailable } = useAuth();
  const router = useRouter();
  const [calConnected, setCalConnected] = useState<boolean | null>(null);
  const [emailConnected, setEmailConnected] = useState<boolean | null>(null);

  // Lazily check integration status
  useState(() => {
    fetch(`${API_BASE_URL}/calendar/status`)
      .then(r => r.json())
      .then(d => setCalConnected(d.connected))
      .catch(() => setCalConnected(false));
    fetch(`${API_BASE_URL}/email/status`)
      .then(r => r.json())
      .then(d => setEmailConnected(d.connected))
      .catch(() => setEmailConnected(false));
  });

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/sign-in');
        },
      },
    ]);
  }

  function integrationStatus(connected: boolean | null) {
    if (connected === null) return { label: '…', color: C.muted };
    return connected
      ? { label: 'Connected', color: C.green }
      : { label: 'Not connected', color: C.muted };
  }

  const calStatus = integrationStatus(calConnected);
  const emailStatus = integrationStatus(emailConnected);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Account */}
      <View style={s.section}>
        <Text style={s.eyebrow}>Account</Text>
        <View style={s.card}>
          <Row label="Name" value={user?.display_name ?? '—'} />
          <RowDiv />
          <Row label="Role" value={user?.role === 'admin' ? 'Admin' : 'Standard'} />
        </View>
      </View>

      {/* Integrations */}
      <View style={s.section}>
        <Text style={s.eyebrow}>Integrations</Text>
        <View style={s.card}>
          <IntegrationRow
            label="Google Calendar"
            statusLabel={calStatus.label}
            statusColor={calStatus.color}
            onConnect={() => Alert.alert('Connect Calendar', 'Open http://localhost:8000/calendar/connect in your browser to connect Google Calendar.')}
          />
          <RowDiv />
          <IntegrationRow
            label="Gmail"
            statusLabel={emailStatus.label}
            statusColor={emailStatus.color}
            onConnect={() => Alert.alert('Connect Gmail', 'Open http://localhost:8000/email/connect in your browser to connect Gmail.')}
          />
          <RowDiv />
          <IntegrationRow
            label="Salesforce"
            statusLabel="Coming soon"
            statusColor={C.muted}
          />
          <RowDiv />
          <IntegrationRow
            label="Notion"
            statusLabel="Coming soon"
            statusColor={C.muted}
          />
        </View>
      </View>

      {/* Security */}
      <View style={s.section}>
        <Text style={s.eyebrow}>Security</Text>
        <View style={s.card}>
          {biometricAvailable ? (
            <>
              <View style={s.switchRow}>
                <Text style={s.rowLabel}>Biometric unlock</Text>
                <Switch
                  value={true}
                  onValueChange={() =>
                    Alert.alert('Biometric unlock', 'Manage biometric settings in your device security settings.')
                  }
                  trackColor={{ true: C.blue }}
                />
              </View>
              <RowDiv />
            </>
          ) : null}
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Change password', 'Password changes are coming in a future update.')}
          >
            <Text style={s.rowLabel}>Change password</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
          <RowDiv />
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            onPress={() => Alert.alert('MFA', 'Two-factor authentication is coming in a future update.')}
          >
            <Text style={s.rowLabel}>Two-factor authentication</Text>
            <View style={s.comingSoonBadge}><Text style={s.comingSoonText}>Soon</Text></View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal */}
      <View style={s.section}>
        <Text style={s.eyebrow}>Legal</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://example.com/privacy').catch(() => {})}
          >
            <Text style={s.rowLabel}>Privacy Policy</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
          <RowDiv />
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://example.com/terms').catch(() => {})}
          >
            <Text style={s.rowLabel}>Terms of Use</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger zone */}
      <View style={s.section}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.deleteBtn}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert('Delete account', 'Account deletion is coming in a future update. Contact support for urgent requests.')
          }
        >
          <Text style={s.deleteText}>Delete my account</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>Continuo · Dev build · {new Date().getFullYear()}</Text>
      <Text style={s.phiWarning}>
        ⚠️ Dev mode: Do not enter PHI until HIPAA controls and BAA are finalized.
      </Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function RowDiv() {
  return <View style={s.rowDiv} />;
}

function IntegrationRow({
  label,
  statusLabel,
  statusColor,
  onConnect,
}: {
  label: string;
  statusLabel: string;
  statusColor: string;
  onConnect?: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onConnect}
      activeOpacity={onConnect ? 0.7 : 1}
      disabled={!onConnect}
    >
      <Text style={s.rowLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[s.rowValue, { color: statusColor }]}>{statusLabel}</Text>
        {onConnect && statusLabel !== 'Connected' && statusLabel !== 'Coming soon' && (
          <Text style={s.chev}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const C = {
  bg: '#FAF9F7',
  ink: '#383530',
  ink2: '#6E6A63',
  ink3: '#9E9A94',
  muted: '#9E9A94',
  eyebrow: '#A29E98',
  border: '#E0DDD9',
  rowDiv: '#EFECE9',
  card: '#FFFFFF',
  blue: '#3A72C8',
  green: '#3D9E6A',
  red: '#C94530',
  orange: '#C87A3D',
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 16, paddingHorizontal: 20 },

  section:  { marginBottom: 28 },
  eyebrow:  { fontSize: 11, fontWeight: '600', color: C.eyebrow, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 },

  card:     { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  switchRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  rowDiv:   { height: 1, backgroundColor: C.rowDiv, marginLeft: 16 },
  rowLabel: { fontSize: 15, color: C.ink, fontWeight: '400' },
  rowValue: { fontSize: 14, color: C.ink3 },
  chev:     { fontSize: 20, color: C.muted, lineHeight: 22 },

  comingSoonBadge: { backgroundColor: '#F0EDE9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  comingSoonText:  { fontSize: 11, color: C.muted, fontWeight: '500' },

  logoutBtn: {
    backgroundColor: '#F0EDE9',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  logoutText:  { fontSize: 15, fontWeight: '600', color: C.ink },
  deleteBtn:   { paddingVertical: 10, alignItems: 'center' },
  deleteText:  { fontSize: 14, color: C.red, fontWeight: '400' },

  version:    { textAlign: 'center', fontSize: 12, color: C.muted, marginBottom: 6 },
  phiWarning: { textAlign: 'center', fontSize: 11, color: C.orange, lineHeight: 16, paddingHorizontal: 20 },
});
