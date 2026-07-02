import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '../constants/colors';

/**
 * SignalRing — the canonical Continuo loading/thinking motif.
 * Three signals orbit an incomplete ring that completes. Replaces generic
 * spinners for AI thinking, sync, and understanding states. Motion is subtle
 * (ease-out, no bounce) per the brand spec.
 */
export function SignalRing({ size = 40, color = Colors.sky }: { size?: number; color?: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const r = size / 2;
  const stroke = Math.max(2, size * 0.08);
  const ringR = r - stroke;
  const bead = Math.max(2, size * 0.07);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Incomplete ring (3/4 arc via strokeDasharray) */}
      <Svg width={size} height={size}>
        <Circle
          cx={r} cy={r} r={ringR}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * ringR * 0.72} ${2 * Math.PI * ringR}`}
        />
      </Svg>
      {/* Three orbiting signals */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: r - bead / 2,
              top: stroke / 2 - bead / 2,
              width: bead, height: bead, borderRadius: bead / 2,
              backgroundColor: color,
              opacity: 1 - i * 0.28,
              transform: [
                { translateY: r - stroke / 2 },
                { rotate: `${i * 26}deg` },
                { translateY: -(r - stroke / 2) },
              ],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}
