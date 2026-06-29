import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Colors, Shadow } from '../constants/colors';
import { useOrb, OrbState } from '../context/OrbContext';

interface OrbButtonProps {
  onPress: () => void;
  onLongPress: () => void;
}

// Bead trail mark at exactly 42×36 (preserving 140:120 viewBox ratio)
function OrbMark() {
  return (
    <Svg width={42} height={36} viewBox="0 0 140 120" fill="none">
      <Line
        x1="18" y1="60" x2="66" y2="60"
        stroke={Colors.sky}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity={0.32}
      />
      <Circle cx="18" cy="60" r="5" fill={Colors.sage} fillOpacity={0.62} />
      <Circle cx="40" cy="60" r="6.5" fill={Colors.teal} fillOpacity={0.80} />
      <Circle cx="63" cy="60" r="8" fill={Colors.sky} />
      <Circle cx="100" cy="60" r="30" stroke={Colors.ink} strokeWidth="11" />
    </Svg>
  );
}

function useOrbAnimation(orbState: OrbState) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.stopAnimation();
    opacity.stopAnimation();
    ringOpacity.stopAnimation();

    let loop: Animated.CompositeAnimation | null = null;

    switch (orbState) {
      case 'listening':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.1, duration: 700, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.0, duration: 700, useNativeDriver: true }),
          ])
        );
        loop.start();
        break;

      case 'thinking':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.55, duration: 1000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
          ])
        );
        loop.start();
        break;

      case 'needsReview':
        Animated.timing(ringOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
          ])
        );
        loop.start();
        break;

      case 'syncing':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1.0, duration: 800, useNativeDriver: true }),
          ])
        );
        loop.start();
        break;

      case 'complete':
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 180, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 320, useNativeDriver: true }),
        ]).start();
        break;

      default: // idle
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.0, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0, duration: 250, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();
    }

    return () => { if (loop) loop.stop(); };
  }, [orbState]);

  return { scale, opacity, ringOpacity };
}

const ORB = 62;
const RING = ORB + 10;

export function OrbButton({ onPress, onLongPress }: OrbButtonProps) {
  const { orbState } = useOrb();
  const { scale, opacity, ringOpacity } = useOrbAnimation(orbState);

  return (
    <View style={s.container}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={380}
        style={({ pressed }) => pressed ? s.pressed : undefined}
      >
        <Animated.View style={[s.orb, { transform: [{ scale }], opacity }]}>
          {/* Sky ring that appears for needsReview state */}
          <Animated.View style={[s.reviewRing, { opacity: ringOpacity }]} pointerEvents="none" />
          <OrbMark />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.float,
  },
  reviewRing: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2.5,
    borderColor: Colors.sky,
  },
  pressed: {
    opacity: 0.75,
  },
});
