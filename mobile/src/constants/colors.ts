import type { SignalType } from '../types';

// ─── Brand palette ────────────────────────────────────────────────────────────
// Source: Continuo Brand System. All values are hex approximations of the
// canonical OKLCH tokens. Update hex when OKLCH support lands in RN.

export const Colors = {
  // Warm neutrals
  paper:    '#F9F8F4',   // oklch(0.975 0.006 75) — page background
  surface:  '#FFFFFF',   // cards / elevated surfaces
  linen:    '#EFEAE3',   // oklch(0.94 0.008 75)  — tab bars, subtle fills
  stone:    '#C7C2BB',   // oklch(0.78 0.01 70)   — disabled / hairlines
  mist:     '#E5E1DA',   // oklch(0.91 0.006 75)  — borders / dividers
  graphite: '#8D8580',   // oklch(0.56 0.014 60)  — secondary text
  ink:      '#5A5048',   // oklch(0.37 0.014 55)  — primary text, ring
  inkDark:  '#4F4540',   // oklch(0.33 0.012 55)  — dark surfaces
  reversed: '#F7F4EF',   // oklch(0.97 0.006 80)  — text on dark

  // Soft accents
  sky:  '#7A9FC2',   // oklch(0.73 0.055 235) — primary / active / "now"
  sage: '#84B296',   // oklch(0.76 0.05 155)  — positive / done
  clay: '#C8A67A',   // oklch(0.81 0.06 70)   — pending / attention
  rose: '#C07E78',   // oklch(0.74 0.065 18)  — critical / error
  teal: '#79A8B9',   // oklch(0.74 0.055 200) — trail mid-bead only

  // Tinted backgrounds for accents (surface + 8% tint)
  skyTint:  '#EEF3F9',
  sageTint: '#EDF5F0',
  clayTint: '#F7F1E8',
  roseTint: '#F7EEEE',

  // Semantic aliases (use these in UI code — meaning over value)
  background:    '#F9F8F4',  // = paper
  textPrimary:   '#5A5048',  // = ink
  textSecondary: '#8D8580',  // = graphite
  textTertiary:  '#C7C2BB',  // = stone
  border:        '#E5E1DA',  // = mist
  borderSubtle:  '#EFEAE3',  // = linen
  positive:      '#84B296',  // = sage
  warning:       '#C8A67A',  // = clay
  critical:      '#C07E78',  // = rose
  primary:       '#7A9FC2',  // = sky
  primaryLight:  '#EEF3F9',  // = skyTint

  // Legacy aliases — keep so existing screens don't break
  text:       '#5A5048',
  surface2:   '#EFEAE3',
  surface3:   '#E5E1DA',
  neutral:    '#8D8580',
  high:       '#C07E78',
  medium:     '#C8A67A',
  low:        '#84B296',

  // Signal type flat colors (kept for review/[id].tsx backward compat)
  risk:                '#F7EEEE',
  riskText:            '#C07E78',
  opportunity:         '#EDF5F0',
  opportunityText:     '#84B296',
  win:                 '#EDF5F0',
  winText:             '#84B296',
  task:                '#E5E1DA',
  taskText:            '#5A5048',
  relationship:        '#E5E1DA',
  relationshipText:    '#5A5048',
  implementation:      '#E5E1DA',
  implementationText:  '#5A5048',
  milestone:           '#E5E1DA',
  milestoneText:       '#5A5048',
  continuity:          '#E5E1DA',
  continuityText:      '#5A5048',
  crm:                 '#E5E1DA',
  crmText:             '#5A5048',
  referral_pathway:    '#E5E1DA',
  referral_pathwayText:'#5A5048',
  momentum:            '#E5E1DA',
  momentumText:        '#5A5048',
  question:            '#E5E1DA',
  questionText:        '#5A5048',
};

// ─── Radius & shadow tokens ───────────────────────────────────────────────────
export const Radius = {
  card: 14,
  icon: 28,
  sm:   8,
  xs:   4,
};

export const Shadow = {
  card: {
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  float: {
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
};

// ─── 8-point spacing system ───────────────────────────────────────────────────
export const sp = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─── Signal helpers ───────────────────────────────────────────────────────────
export function signalTypeColors(type: SignalType): { bg: string; text: string } {
  if (type === 'risk') return { bg: Colors.roseTint, text: Colors.rose };
  if (type === 'opportunity' || type === 'win') return { bg: Colors.sageTint, text: Colors.sage };
  return { bg: Colors.surface3, text: Colors.textSecondary };
}

export function impactColor(level: string): string {
  if (level === 'high') return Colors.critical;
  if (level === 'medium') return Colors.warning;
  return Colors.positive;
}

export function momentumBadgeColor(momentum: string): string {
  if (['rising', 'increased', 'strong', 'accelerating'].includes(momentum)) return Colors.positive;
  if (['declining', 'decreased', 'at_risk'].includes(momentum)) return Colors.critical;
  if (momentum === 'stable') return Colors.primary;
  return Colors.warning; // unknown → visible amber
}
