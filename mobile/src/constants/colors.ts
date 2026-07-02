import type { SignalType } from '../types';

// ─── Brand palette ────────────────────────────────────────────────────────────
// Source: Continuo Brand System. All values are hex approximations of the
// canonical OKLCH tokens. Update hex when OKLCH support lands in RN.

export const Colors = {
  // ─── BRAND REFRESH (2026-07 concept board) ─────────────────────────────────
  // Softened blue-charcoal + warm ivory per Continuo Brand Spec. Warm neutrals
  // retained where they read well; ink shifted from warm-brown to blue-charcoal.
  paper:    '#FAF9F6',   // Ivory — warm off-white page background
  surface:  '#FFFFFF',   // cards / elevated surfaces (warm white)
  linen:    '#EEEDE8',   // tab bars, subtle fills
  stone:    '#C9C7C1',   // disabled / hairlines (cooler stone)
  mist:     '#E5E4DF',   // borders / dividers (warm light gray)
  graphite: '#7C7A76',   // secondary text — warm taupe-gray
  ink:      '#2F3C4A',   // Blue Charcoal — primary text, ring
  inkDark:  '#293643',   // darker blue-charcoal — dark surfaces
  reversed: '#F7F6F2',   // text on dark

  // Soft accents — muted, less saturated than before
  sky:  '#789BBB',   // Dusty Blue — primary / active / "now"
  sage: '#A6C0AE',   // muted sage — positive / done
  clay: '#D8B98A',   // muted gold/tan — pending / attention (status dots)
  rose: '#D08A84',   // soft error/critical
  teal: '#8FB0BE',   // Sky Mist-ish — trail mid-bead only

  // Tinted backgrounds for accents (surface + soft tint)
  skyTint:  '#EDF2F7',
  sageTint: '#EEF4EF',
  clayTint: '#F7F1E7',
  roseTint: '#F8EFEE',

  // Semantic aliases (use these in UI code — meaning over value)
  background:    '#FAF9F6',  // = paper
  textPrimary:   '#2F3C4A',  // = ink
  textSecondary: '#7C7A76',  // = graphite
  textTertiary:  '#C9C7C1',  // = stone
  border:        '#E5E4DF',  // = mist
  borderSubtle:  '#EEEDE8',  // = linen
  positive:      '#A6C0AE',  // = sage
  warning:       '#D8B98A',  // = clay
  critical:      '#D08A84',  // = rose
  primary:       '#789BBB',  // = sky
  primaryLight:  '#EDF2F7',  // = skyTint

  // Legacy aliases — keep so existing screens don't break
  text:       '#2F3C4A',
  surface2:   '#EEEDE8',
  surface3:   '#E5E4DF',
  neutral:    '#7C7A76',
  high:       '#D08A84',
  medium:     '#D8B98A',
  low:        '#A6C0AE',

  // Signal type flat colors (kept for review/[id].tsx backward compat)
  risk:                '#F8EFEE',
  riskText:            '#D08A84',
  opportunity:         '#EEF4EF',
  opportunityText:     '#A6C0AE',
  win:                 '#EEF4EF',
  winText:             '#A6C0AE',
  task:                '#E5E4DF',
  taskText:            '#2F3C4A',
  relationship:        '#E5E4DF',
  relationshipText:    '#2F3C4A',
  implementation:      '#E5E4DF',
  implementationText:  '#2F3C4A',
  milestone:           '#E5E4DF',
  milestoneText:       '#2F3C4A',
  continuity:          '#E5E4DF',
  continuityText:      '#2F3C4A',
  crm:                 '#E5E4DF',
  crmText:             '#2F3C4A',
  referral_pathway:    '#E5E4DF',
  referral_pathwayText:'#2F3C4A',
  momentum:            '#E5E4DF',
  momentumText:        '#2F3C4A',
  question:            '#E5E4DF',
  questionText:        '#2F3C4A',
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
