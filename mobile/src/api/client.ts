import type {
  Account,
  Activity,
  Contact,
  ExtractionResult,
  Signal,
  Task,
  VoiceJournalResponse,
} from '../types';

// For device testing via Expo Go, replace with your machine's LAN IP (e.g. http://192.168.1.x:8000)
export const API_BASE_URL = 'http://192.168.1.204:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Cannot reach server at ${API_BASE_URL}. Is the backend running?`);
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
  getActivities: (accountId?: number) =>
    request<Activity[]>(`/activities${accountId != null ? `?account_id=${accountId}` : ''}`),
  getAccounts: () => request<Account[]>('/accounts'),
  getAccount: (id: number) => request<Account>(`/accounts/${id}`),
  getContacts: () => request<Contact[]>('/contacts'),
  submitRecap: (userId: string, transcript: string) =>
    request<VoiceJournalResponse>('/voice-journal', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, transcript }),
    }),
  approveJournal: (id: number, extraction: ExtractionResult) =>
    request<{ status: string; voice_journal_entry_id: number }>(
      `/voice-journal/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ extraction }) }
    ),
};
