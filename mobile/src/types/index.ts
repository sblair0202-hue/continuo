export type SignalType =
  | 'relationship'
  | 'implementation'
  | 'momentum'
  | 'opportunity'
  | 'risk'
  | 'milestone'
  | 'continuity'
  | 'referral_pathway'
  | 'crm'
  | 'task'
  | 'win'
  | 'question';

export type ImpactLevel = 'low' | 'medium' | 'high';
export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high';

export interface Signal {
  id: number;
  activity_id: number | null;
  account_id: number | null;
  signal_type: SignalType;
  title: string;
  summary: string | null;
  evidence_text: string | null;
  confidence_score: number;
  impact_level: ImpactLevel;
  urgency: UrgencyLevel;
  suggested_action: string | null;
  status: string;
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  status: string;
  momentum: string;
  last_activity_at: string | null;
  next_action: string | null;
}

export interface Contact {
  id: number;
  account_id: number | null;
  name: string;
  role: string | null;
  discipline: string | null;
  champion_level: string;
  relationship_status: string;
  relationship_notes: string | null;
}

export interface Activity {
  id: number;
  account_id: number | null;
  activity_type: string;
  summary: string;
  activity_date: string;
  outcome: string | null;
  momentum: string | null;
}

export interface Task {
  id: number;
  account_id: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  task_type: string | null;
}

export interface ExtractedAccount {
  name: string;
  city: string | null;
  state: string | null;
  status: string | null;
  momentum: string | null;
  next_action: string | null;
}

export interface ExtractedContact {
  name: string;
  account_name: string | null;
  role: string | null;
  discipline: string | null;
  relationship_note: string | null;
  relationship_status: string | null;
  champion_level: string | null;
}

export interface ExtractedSignal {
  account_name: string | null;
  contact_names: string[];
  signal_type: SignalType;
  title: string;
  summary: string | null;
  evidence_text: string | null;
  confidence_score: number;
  impact_level: ImpactLevel;
  urgency: UrgencyLevel;
  suggested_action: string | null;
  status: string;
}

export interface ExtractedTask {
  account_name: string | null;
  title: string;
  description: string | null;
  priority: string;
  task_type: string | null;
}

export interface ExtractionResult {
  summary: string;
  accounts: ExtractedAccount[];
  contacts: ExtractedContact[];
  activities: Record<string, unknown>[];
  signals: ExtractedSignal[];
  tasks: ExtractedTask[];
  referral_pathway_updates: Record<string, unknown>[];
  risks: string[];
  opportunities: string[];
  wins: string[];
  open_questions: string[];
  possible_phi_warning: boolean;
}

export interface VoiceJournalResponse {
  id: number;
  transcript: string;
  extraction_preview: ExtractionResult;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string | null;
  attendees: string[];
  description: string | null;
  html_link: string | null;
  account_id: number | null;
  account_name: string | null;
  signal_count: number;
  contact_count: number;
}

export interface MeetingPrep {
  event_id: string;
  event_title: string;
  brief: string;
  signal_count: number;
  contact_count: number;
}
