import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

type Variant = 'full' | 'mark' | 'wordmark';
type ColorScheme = 'default' | 'light' | 'dark';

interface LogoProps {
  variant?: Variant;
  scheme?: ColorScheme;
  size?: number;
}

// Canonical brand colors — mirror colors.ts tokens
const ink     = '#5A5048';
const inkDark = '#4F4540';
const sky     = '#7A9FC2';
const teal    = '#79A8B9';
const sage    = '#84B296';

const SCHEMES = {
  default: { ring: ink,     beads: [sage, teal, sky], line: sky,     word: ink     },
  light:   { ring: '#FFFFFF', beads: ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.80)', '#FFFFFF'], line: 'rgba(255,255,255,0.32)', word: '#FFFFFF' },
  dark:    { ring: inkDark,   beads: [sage, teal, sky], line: sky,   word: inkDark },
};

// "Bead trail" mark — viewBox 0 0 140 120, all elements on y=60
function BeadTrailMark({ size = 48, scheme = 'default' }: { size?: number; scheme?: ColorScheme }) {
  const s = SCHEMES[scheme];
  const scale = size / 48;
  const w = 140 * scale;
  const h = 120 * scale;

  return (
    <Svg width={w} height={h} viewBox="0 0 140 120" fill="none">
      {/* Connector line */}
      <Line
        x1="18" y1="60" x2="66" y2="60"
        stroke={s.line}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity={0.32}
      />
      {/* Bead 1 (back) — Sage @ 62% */}
      <Circle cx="18" cy="60" r="5" fill={s.beads[0]} fillOpacity={0.62} />
      {/* Bead 2 — Teal @ 80% */}
      <Circle cx="40" cy="60" r="6.5" fill={s.beads[1]} fillOpacity={0.80} />
      {/* Bead 3 (front) — Sky solid */}
      <Circle cx="63" cy="60" r="8" fill={s.beads[2]} />
      {/* Lead ring — always a complete circle, never a C shape */}
      <Circle cx="100" cy="60" r="30" stroke={s.ring} strokeWidth="11" />
    </Svg>
  );
}

// Ring-only glyph for small sizes (below 24px)
function RingGlyph({ size = 16, scheme = 'default' }: { size?: number; scheme?: ColorScheme }) {
  const s = SCHEMES[scheme];
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx="60" cy="60" r="32" stroke={s.ring} strokeWidth="16" />
    </Svg>
  );
}

export function Logo({ variant = 'full', scheme = 'default', size = 48 }: LogoProps) {
  const wordColor = SCHEMES[scheme].word;
  const fontSize = Math.round(size * 0.42);

  if (variant === 'wordmark') {
    return (
      <Text style={{
        fontFamily: 'HankenGrotesk_600SemiBold',
        fontSize,
        letterSpacing: fontSize * -0.028,
        color: wordColor,
      }}>
        Continuo
      </Text>
    );
  }

  if (variant === 'mark') {
    return size < 24
      ? <RingGlyph size={size} scheme={scheme} />
      : <BeadTrailMark size={size} scheme={scheme} />;
  }

  // Full lockup: mark + wordmark
  const gap = Math.round(fontSize * 0.45);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {size < 24
        ? <RingGlyph size={size} scheme={scheme} />
        : <BeadTrailMark size={size} scheme={scheme} />
      }
      <Text style={{
        fontFamily: 'HankenGrotesk_600SemiBold',
        fontSize,
        letterSpacing: fontSize * -0.028,
        color: wordColor,
      }}>
        Continuo
      </Text>
    </View>
  );
}
