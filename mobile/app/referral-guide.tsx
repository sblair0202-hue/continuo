import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../src/api/client';
import { Colors } from '../src/constants/colors';
import type { Account } from '../src/types';

// ── Text generation ───────────────────────────────────────────────────────────

function buildEmailBody(accounts: Account[]): string {
  const sites = accounts
    .map(a => {
      const lines: string[] = [a.name];
      if (a.organization) lines.push(a.organization);
      if (a.address) lines.push(a.address);
      if (a.phone) lines.push(`Phone: ${a.phone}`);
      if (a.fax) lines.push(`Fax: ${a.fax}`);
      if (a.referral_contact) lines.push(`Referral Contact: ${a.referral_contact}`);
      if (a.referral_email) lines.push(a.referral_email);
      if (a.referral_instructions) lines.push(`\nReferral Instructions: ${a.referral_instructions}`);
      if (a.scheduling_instructions) lines.push(`Scheduling: ${a.scheduling_instructions}`);
      return lines.join('\n');
    })
    .join('\n\n---\n\n');

  return `Hi,\n\nBelow are the current Vivistim referral locations.\n\nPlease let me know if you have any questions or would like to discuss a patient.\n\n---\n\n${sites}\n\n---\n\nThanks,\nSarah Blair`;
}

function buildTextBody(accounts: Account[]): string {
  const lines: string[] = ['Current Vivistim referral options:\n'];
  for (const a of accounts) {
    lines.push(`• ${a.name}`);
    if (a.phone) lines.push(`  ${a.phone}`);
    lines.push('');
  }
  lines.push('Happy to help identify the best fit if needed.');
  return lines.join('\n');
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'implant' | 'therapy' | 'eval';
type FormatType = 'email' | 'text' | 'share';

const TYPE_FILTERS: { value: TypeFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: Colors.primary },
  { value: 'implant', label: 'Implant Centers', color: '#6C5CE7' },
  { value: 'therapy', label: 'Therapy Sites', color: '#00B894' },
  { value: 'eval', label: 'Eval Sites', color: '#0984E3' },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ReferralGuideScreen() {
  const router = useRouter();
  const { account_id } = useLocalSearchParams<{ account_id?: string }>();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewFormat, setPreviewFormat] = useState<FormatType>('share');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    api.getAccounts()
      .then(all => {
        setAccounts(all);
        // Pre-select account if opened from account detail screen
        if (account_id) {
          setSelectedIds(new Set([Number(account_id)]));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = accounts.filter(a => {
    if (typeFilter === 'implant') return a.is_implant_center;
    if (typeFilter === 'therapy') return a.is_therapy_site;
    if (typeFilter === 'eval') return a.is_evaluation_site;
    return true;
  });

  const selectedCount = selectedIds.size;

  function toggleAccount(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every(a => selectedIds.has(a.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(a => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(a => next.add(a.id));
        return next;
      });
    }
  }

  function handleGenerate() {
    if (selectedCount === 0) return;
    setShowFormatPicker(true);
  }

  async function handleFormat(format: FormatType) {
    setShowFormatPicker(false);
    const selected = accounts.filter(a => selectedIds.has(a.id));

    if (format === 'email') {
      const body = buildEmailBody(selected);
      const subject = 'Indiana Vivistim Referral Locations';
      const encoded = encodeURIComponent(body);
      const subjectEncoded = encodeURIComponent(subject);
      await Linking.openURL(`mailto:?subject=${subjectEncoded}&body=${encoded}`).catch(() => {
        setPreviewText(body);
        setPreviewFormat(format);
        setShowPreview(true);
      });
    } else if (format === 'text') {
      const body = buildTextBody(selected);
      await Linking.openURL(`sms:?body=${encodeURIComponent(body)}`).catch(() => {
        setPreviewText(body);
        setPreviewFormat(format);
        setShowPreview(true);
      });
    } else {
      const body = buildEmailBody(selected);
      setPreviewText(body);
      setPreviewFormat(format);
      setShowPreview(true);
    }
  }

  async function handleShare(text: string) {
    await Share.share({ message: text });
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, typeFilter === f.value && { backgroundColor: f.color, borderColor: f.color }]}
            onPress={() => setTypeFilter(f.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, typeFilter === f.value && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Select all row */}
      <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll} activeOpacity={0.7}>
        <View style={[styles.checkbox, allFilteredSelected && styles.checkboxActive]}>
          {allFilteredSelected && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.selectAllText}>
          {allFilteredSelected ? 'Deselect All' : `Select All (${filtered.length})`}
        </Text>
      </TouchableOpacity>

      {/* Account list */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No accounts match this filter.</Text>
        ) : (
          filtered.map(a => {
            const isSelected = selectedIds.has(a.id);
            const hasReferralInfo = !!(a.address || a.phone || a.referral_instructions);
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.accountRow, isSelected && styles.accountRowSelected]}
                onPress={() => toggleAccount(a.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, isSelected && { color: Colors.primary }]}>{a.name}</Text>
                  <View style={styles.badgeRow}>
                    {a.is_implant_center && <View style={[styles.typeBadge, { backgroundColor: '#6C5CE720' }]}><Text style={[styles.typeBadgeText, { color: '#6C5CE7' }]}>Implant</Text></View>}
                    {a.is_therapy_site && <View style={[styles.typeBadge, { backgroundColor: '#00B89420' }]}><Text style={[styles.typeBadgeText, { color: '#00B894' }]}>Therapy</Text></View>}
                    {a.is_evaluation_site && <View style={[styles.typeBadge, { backgroundColor: '#0984E320' }]}><Text style={[styles.typeBadgeText, { color: '#0984E3' }]}>Eval</Text></View>}
                    {!hasReferralInfo && <Text style={styles.missingInfo}>No referral info</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Generate button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.generateBtn, selectedCount === 0 && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={selectedCount === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.generateBtnText}>
            {selectedCount === 0 ? 'Select accounts to generate' : `Generate Guide (${selectedCount} site${selectedCount !== 1 ? 's' : ''})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Format picker */}
      {showFormatPicker && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setShowFormatPicker(false)}>
          <TouchableOpacity style={styles.overlay} onPress={() => setShowFormatPicker(false)} activeOpacity={1}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Output Format</Text>
              <FormatOption icon="📧" label="Email" sub="Opens Mail with pre-filled content" onPress={() => handleFormat('email')} />
              <FormatOption icon="💬" label="Text Message" sub="Opens Messages with condensed list" onPress={() => handleFormat('text')} />
              <FormatOption icon="⬆️" label="Share / Copy" sub="Share sheet — copy, AirDrop, Messages" onPress={() => handleFormat('share')} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Preview + Share modal */}
      {showPreview && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPreview(false)}>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Text style={styles.previewClose}>Done</Text>
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Referral Guide</Text>
              <TouchableOpacity onPress={() => handleShare(previewText)}>
                <Text style={styles.previewShare}>Share</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewBody} contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.previewText}>{previewText}</Text>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

function FormatOption({ icon, label, sub, onPress }: { icon: string; label: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.formatOption} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.formatIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.formatLabel}>{label}</Text>
        <Text style={styles.formatSub}>{sub}</Text>
      </View>
      <Text style={styles.formatChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterRow: { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectAllText: { fontSize: 14, fontWeight: '600', color: Colors.text },

  list: { flex: 1 },
  listContent: { padding: 12 },

  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  accountRowSelected: { borderWidth: 1.5, borderColor: Colors.primary },
  accountName: { fontSize: 15, fontWeight: '600', color: Colors.text },

  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  missingInfo: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },

  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },

  footer: { padding: 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  generateBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  generateBtnDisabled: { backgroundColor: Colors.textSecondary },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 36, paddingTop: 4,
  },
  sheetTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.8, textTransform: 'uppercase',
    textAlign: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  formatOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  formatIcon: { fontSize: 22 },
  formatLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  formatSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  formatChevron: { fontSize: 20, color: Colors.textSecondary },

  previewContainer: { flex: 1, backgroundColor: Colors.surface },
  previewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  previewClose: { fontSize: 15, color: Colors.textSecondary },
  previewShare: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  previewBody: { flex: 1, backgroundColor: Colors.background },
  previewText: { fontSize: 14, color: Colors.text, lineHeight: 22, fontFamily: 'monospace' },
});
