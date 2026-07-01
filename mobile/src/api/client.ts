import { Platform } from 'react-native';

import type {
  Account,
  AccountSnapshot,
  Activity,
  ActivityHistoryItem,
  AskResponse,
  CalendarEvent,
  Contact,
  DailyBrief,
  EmailExtractionResult,
  EmailStatus,
  EmailThread,
  ExtractionResult,
  MeetingPrep,
  Milestone,
  NotionStatus,
  NotionSyncResult,
  Opportunity,
  SearchResults,
  Signal,
  Task,
  VisitBrief,
  VoiceJournalResponse,
  WeeklyBrief,
} from '../types';

// EXPO_PUBLIC_API_URL is set per build profile in eas.json
// Falls back to LAN address for local Expo Go development
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? 'http://localhost:8001' : 'http://192.168.1.204:8001');

// Auth token injected by AuthContext — avoids async in every request
let _authToken: string | null = null;
export function setAuthToken(token: string | null): void {
  _authToken = token;
}

// Friendly messages for common HTTP errors
function friendlyError(status: number, body: string): string {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You don\'t have permission to do that.';
  if (status === 404) return 'That resource was not found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server ran into a problem. Try again in a moment.';
  try {
    const parsed = JSON.parse(body);
    const detail = parsed.detail;
    if (typeof detail === 'string') return detail;
    // FastAPI validation errors: detail is an array of {loc, msg, type}
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d: any) => (typeof d === 'string' ? d : d?.msg))
        .filter(Boolean);
      if (status === 422) return "Some fields couldn't be saved. Please try again.";
      return msgs.join('; ') || `Error ${status}`;
    }
    return typeof body === 'string' ? body : `Error ${status}`;
  } catch {
    return body || `Error ${status}`;
  }
}

async function request<T>(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = 10000, headers: extraHeaders, ...fetchOptions } = options ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
      ...fetchOptions,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(friendlyError(res.status, body));
    }
    return res.json() as Promise<T>;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out. The AI is taking longer than expected — please try again.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  getSignals: (accountId?: number) =>
    request<Signal[]>(`/signals${accountId != null ? `?account_id=${accountId}` : ''}`),
  getTasks: (accountId?: number) =>
    request<Task[]>(`/tasks${accountId != null ? `?account_id=${accountId}` : ''}`),
  getTask: (id: number) =>
    request<Task & { account_name: string | null }>(`/tasks/${id}`),
  deleteTask: (id: number) =>
    request<{ status: string }>(`/tasks/${id}`, { method: 'DELETE' }),
  getActivities: (accountId?: number) =>
    request<Activity[]>(`/activities${accountId != null ? `?account_id=${accountId}` : ''}`),
  getAccounts: () => request<Account[]>('/accounts'),
  getAccount: (id: number) => request<Account>(`/accounts/${id}`),
  getContacts: () => request<Contact[]>('/contacts'),
  submitRecap: (userId: string, transcript: string) =>
    request<VoiceJournalResponse>('/voice-journal', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, transcript }),
      timeoutMs: 45000,
    }),
  approveJournal: (id: number, extraction: ExtractionResult) =>
    request<{ status: string; voice_journal_entry_id: number }>(
      `/voice-journal/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ extraction }) }
    ),
  saveForLater: (id: number) =>
    request<{ status: string; voice_journal_entry_id: number }>(
      `/voice-journal/${id}/save-for-later`,
      { method: 'POST' }
    ),
  getSalesforcePrep: (id: number) =>
    request<{ entry_id: number; salesforce_note: string }>(
      `/voice-journal/${id}/salesforce-prep`,
      { timeoutMs: 30000 }
    ),
  discardJournal: (id: number) =>
    request<{ status: string }>(`/voice-journal/${id}`, { method: 'DELETE' }),
  getReviewQueue: () =>
    request<Array<{ id: number; ai_summary: string | null; preview: string | null; source: string; created_at: string }>>(
      '/voice-journal/queue'
    ),
  getCalendarStatus: () => request<{ connected: boolean }>('/calendar/status'),
  getTodayEvents: () => request<CalendarEvent[]>('/calendar/today'),
  getMeetingPrep: (eventId: string, accountId?: number) =>
    request<MeetingPrep>(
      `/calendar/meeting-prep/${encodeURIComponent(eventId)}${accountId != null ? `?account_id=${accountId}` : ''}`
    ),
  updateSignalStatus: (id: number, status: string) =>
    request<{ id: number; status: string }>(`/signals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateSignal: (id: number, fields: Partial<Pick<Signal, 'title' | 'signal_type' | 'impact_level' | 'urgency' | 'suggested_action' | 'summary'>>) =>
    request<{ id: number }>(`/signals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    }),
  deleteSignal: (id: number) =>
    request<{ status: string }>(`/signals/${id}`, { method: 'DELETE' }),
  getDailyBrief: () => request<DailyBrief>('/daily-brief'),
  getEmailStatus: () => request<EmailStatus>('/email/status'),
  extractEmailSignals: () => request<EmailExtractionResult>('/email/extract-signals', { method: 'POST' }),
  emailScanAccounts: () =>
    request<{ accounts_updated: number; contacts_added: number; accounts_found_in_email: number }>(
      '/email/scan-accounts',
      { method: 'POST', timeoutMs: 60000 }
    ),
  getNotionStatus: () => request<NotionStatus>('/notion/status'),
  notionSync: () => request<NotionSyncResult>('/notion/sync', { method: 'POST' }),
  notionImport: (databaseId?: string) =>
    request<{ imported: number; updated: number; skipped: number; total_in_notion: number }>(
      `/notion/import${databaseId ? `?database_id=${databaseId}` : ''}`,
      { method: 'POST', timeoutMs: 30000 }
    ),

  // Opportunities
  getOpportunities: (accountId?: number) =>
    request<Opportunity[]>(`/opportunities${accountId != null ? `?account_id=${accountId}` : ''}`),
  createOpportunity: (data: Partial<Opportunity> & { title: string }) =>
    request<Opportunity>('/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  updateOpportunity: (id: number, data: Partial<Opportunity>) =>
    request<Opportunity>(`/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteOpportunity: (id: number) =>
    request<{ status: string }>(`/opportunities/${id}`, { method: 'DELETE' }),

  // Milestones
  getMilestones: (accountId?: number) =>
    request<Milestone[]>(`/milestones${accountId != null ? `?account_id=${accountId}` : ''}`),
  createMilestone: (data: Partial<Milestone> & { title: string; date: string }) =>
    request<Milestone>('/milestones', { method: 'POST', body: JSON.stringify(data) }),
  updateMilestone: (id: number, data: Partial<Milestone>) =>
    request<Milestone>(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMilestone: (id: number) =>
    request<{ status: string }>(`/milestones/${id}`, { method: 'DELETE' }),

  // Tasks (enhanced)
  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: number) =>
    request<{ status: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  // Activity history
  getActivityHistory: (accountId?: number) =>
    request<ActivityHistoryItem[]>(`/activity-history${accountId != null ? `?account_id=${accountId}` : ''}`),

  // Contacts (enhanced)
  updateContact: (id: number, data: Partial<Contact>) =>
    request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteContact: (id: number) =>
    request<{ status: string }>(`/contacts/${id}`, { method: 'DELETE' }),

  // Accounts (enhanced)
  updateAccount: (id: number, data: Partial<Account>) =>
    request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccount: (id: number) =>
    request<{ deleted: string }>(`/accounts/${id}`, { method: 'DELETE' }),
  mergeAccounts: (keepId: number, removeId: number) =>
    request<{ merged_into: string; removed: string }>(
      `/admin/merge-accounts?keep_id=${keepId}&remove_id=${removeId}`
    ),

  // Sprint 8: Territory Intelligence
  getAccountSnapshot: (id: number) =>
    request<AccountSnapshot>(`/accounts/${id}/snapshot`, { timeoutMs: 30000 }),
  getVisitBrief: (id: number) =>
    request<VisitBrief>(`/accounts/${id}/visit-brief`, { timeoutMs: 30000 }),
  ask: (question: string) =>
    request<AskResponse>('/ask', { method: 'POST', body: JSON.stringify({ question }), timeoutMs: 30000 }),
  search: (q: string) =>
    request<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  getWeeklyBrief: () =>
    request<WeeklyBrief>('/weekly-brief', { timeoutMs: 30000 }),

  extractFromImage: (imageBase64: string, mediaType: string) =>
    request<{ extracted_text: string }>('/extract-from-image', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
      timeoutMs: 30000,
    }),

  getAccountEmails: (accountId: number) =>
    request<EmailThread[]>(`/email/threads?account_id=${accountId}`, { timeoutMs: 20000 }),
};
