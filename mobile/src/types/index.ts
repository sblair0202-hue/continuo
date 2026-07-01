export interface EmailThread {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  date: string;
  snippet: string;
  body_excerpt: string;
}

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
  organization: string | null;
  city: string | null;
  state: string | null;
  status: string;
  momentum: string;
  priority: string | null;
  last_activity_at: string | null;
  next_action: string | null;
  // Basic contact info
  address: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  account_type: string | null;
  // Referral info
  referral_instructions: string | null;
  scheduling_instructions: string | null;
  referral_contact: string | null;
  referral_email: string | null;
  preferred_referral_method: string | null;
  insurance_notes: string | null;
  // Clinical flags
  is_implant_center: boolean;
  is_therapy_site: boolean;
  is_evaluation_site: boolean;
  vivistim_status: string | null;
  pm_r_available: boolean;
  neurosurgery_available: boolean;
}

export interface Contact {
  id: number;
  account_id: number | null;
  name: string;
  role: string | null;
  discipline: string | null;
  phone: string | null;
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

export type TaskStatus = 'open' | 'todo' | 'in_progress' | 'waiting' | 'done';
export type TaskCategory = 'crm' | 'follow_up' | 'education' | 'patient' | 'travel' | 'administrative' | 'personal' | 'other';

export interface Task {
  id: number;
  account_id: number | null;
  opportunity_id: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: TaskStatus;
  task_type: string | null;
  category: TaskCategory | null;
  source_type?: string | null;
}

export type OpportunityStatus = 'new' | 'active' | 'waiting' | 'won' | 'lost';

export interface Opportunity {
  id: number;
  account_id: number | null;
  title: string;
  status: OpportunityStatus;
  probability: number | null;
  next_action: string | null;
  owner: string | null;
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
}

export type MilestoneType = 'delivery' | 'training' | 'evaluation' | 'implant' | 'screening' | 'meeting' | 'other';

export interface Milestone {
  id: number;
  account_id: number | null;
  opportunity_id: number | null;
  title: string;
  milestone_type: MilestoneType;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface ActivityHistoryItem {
  id: number;
  account_id: number | null;
  title: string;
  category: string | null;
  source: string;
  completed_at: string;
  notes: string | null;
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

export interface DailyBrief {
  brief: string;
  generated_at: string;
  signal_count: number;
  task_count: number;
  meeting_count: number;
  has_meetings: boolean;
}

export interface EmailStatus {
  connected: boolean;
}

export interface EmailExtractionResult {
  extracted: number;
  signals: Array<{
    title: string;
    signal_type: string;
    account_name: string | null;
    impact_level: string;
  }>;
}

export interface NotionStatus {
  connected: boolean;
  has_token: boolean;
  has_database: boolean;
}

export interface NotionSyncResult {
  synced: number;
  errors: Array<{ account: string; error: string }>;
  message?: string;
}

// ── Sprint 8: Territory Intelligence ─────────────────────────────────────────

export interface AccountSnapshot {
  account_id: number;
  snapshot: string;
}

export interface VisitBrief {
  account_id: number;
  account_name: string;
  items: string[];
}

export interface AskResponse {
  question: string;
  answer: string;
}

export interface SearchAccount {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  momentum: string;
  next_action: string | null;
}

export interface SearchContact {
  id: number;
  name: string;
  role: string | null;
  discipline: string | null;
  account_id: number | null;
  account_name: string | null;
  phone: string | null;
}

export interface SearchSignal {
  id: number;
  title: string;
  signal_type: string;
  impact_level: string;
  account_id: number | null;
  summary: string | null;
  suggested_action: string | null;
}

export interface SearchTask {
  id: number;
  title: string;
  priority: string;
  account_id: number | null;
  account_name: string | null;
  due_date: string | null;
}

export interface SearchResults {
  accounts: SearchAccount[];
  contacts: SearchContact[];
  signals: SearchSignal[];
  tasks: SearchTask[];
}

export interface WeeklyBrief {
  brief: string;
  generated_at: string;
  account_count: number;
  signal_count: number;
  task_count: number;
  opportunity_count: number;
}
