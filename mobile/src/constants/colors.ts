import type { SignalType } from '../types';

export const Colors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  primary: '#1B4F8A',
  primaryLight: '#E8EFF7',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
  risk: '#FEE2E2',
  riskText: '#991B1B',
  opportunity: '#DCFCE7',
  opportunityText: '#166534',
  win: '#D1FAE5',
  winText: '#065F46',
  task: '#DBEAFE',
  taskText: '#1E40AF',
  relationship: '#FEF9C3',
  relationshipText: '#854D0E',
  implementation: '#E0E7FF',
  implementationText: '#3730A3',
  milestone: '#F3E8FF',
  milestoneText: '#6B21A8',
  continuity: '#FFE4E6',
  continuityText: '#9F1239',
  crm: '#F0F9FF',
  crmText: '#0369A1',
  referral_pathway: '#FFF7ED',
  referral_pathwayText: '#9A3412',
  momentum: '#F0FDF4',
  momentumText: '#166534',
  question: '#F5F3FF',
  questionText: '#5B21B6',
};

type SignalColorEntry = { bg: string; text: string };

export function signalTypeColors(type: SignalType): SignalColorEntry {
  const map: Record<SignalType, SignalColorEntry> = {
    risk:             { bg: Colors.risk,             text: Colors.riskText },
    opportunity:      { bg: Colors.opportunity,      text: Colors.opportunityText },
    win:              { bg: Colors.win,              text: Colors.winText },
    task:             { bg: Colors.task,             text: Colors.taskText },
    relationship:     { bg: Colors.relationship,     text: Colors.relationshipText },
    implementation:   { bg: Colors.implementation,   text: Colors.implementationText },
    milestone:        { bg: Colors.milestone,        text: Colors.milestoneText },
    continuity:       { bg: Colors.continuity,       text: Colors.continuityText },
    crm:              { bg: Colors.crm,              text: Colors.crmText },
    referral_pathway: { bg: Colors.referral_pathway, text: Colors.referral_pathwayText },
    momentum:         { bg: Colors.momentum,         text: Colors.momentumText },
    question:         { bg: Colors.question,         text: Colors.questionText },
  };
  return map[type] ?? { bg: Colors.border, text: Colors.textSecondary };
}

export function impactColor(level: string): string {
  if (level === 'high') return Colors.high;
  if (level === 'medium') return Colors.medium;
  return Colors.low;
}

export function momentumBadgeColor(momentum: string): string {
  if (momentum === 'rising' || momentum === 'increased') return Colors.low;
  if (momentum === 'declining' || momentum === 'decreased') return Colors.high;
  if (momentum === 'stable') return Colors.primary;
  return Colors.textSecondary;
}
