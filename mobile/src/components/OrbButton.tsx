import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '../constants/colors';
import { useOrb, OrbState } from '../context/OrbContext';

interface OrbButtonProps {
  onPress: () => void;
  onLongPress: () => void;
  queueCount?: number;
}

// Ring-only mark for the nav orb (centered circle, not the full bead trail)
function NavRingMark() {
  return (
    <Svg width={28} height={28} viewBox="0 0 120 120" fill="none">
      <Circle cx="60" cy="60" r="34" stroke="rgba(238,244,252,0.92)" strokeWidth="9" />
    </Svg>
  );
}

function useOrbAnimation(orbState: OrbState) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    scale.stopAnimation();
    opacity.stopAnimation();
    haloOpacity.stopAnimation();

    let loop: Animated.CompositeAnimation | null = null;

    switch (orbState) {
      case 'listening':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(haloOpacity, { toValue: 0.85, duration: 1700, useNativeDriver: true }),
            Animated.timing(haloOpacity, { toValue: 0.4, duration: 1700, useNativeDriver: true }),
          ])
        );
        loop.start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.08, duration: 700, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.0, duration: 700, useNativeDriver: true }),
          ])
        ).start();
        break;

      case 'thinking':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
          ])
        );
        loop.start();
        break;

      case 'needsReview':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(haloOpacity, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
            Animated.timing(haloOpacity, { toValue: 0.25, duration: 1200, useNativeDriver: true }),
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
          Animated.timing(scale, { toValue: 1.18, duration: 180, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 320, useNativeDriver: true }),
        ]).start();
        break;

      default: // idle
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.0, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0, duration: 250, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.55, duration: 300, useNativeDriver: true }),
        ]).start();
    }

    return () => { if (loop) loop.stop(); };
  }, [orbState]);

  return { scale, opacity, haloOpacity };
}

const ORB = 58;

export function OrbButton({ onPress, onLongPress, queueCount = 0 }: OrbButtonProps) {
  const { orbState } = useOrb();
  const { scale, opacity, haloOpacity } = useOrbAnimation(orbState);

  const haloColor = orbState === 'needsReview'
    ? 'rgba(200,166,122,0.45)'   // clay/amber
    : 'rgba(122,159,194,0.38)';  // sky

  return (
    <View style={s.container} pointerEvents="box-none">
      {/* Soft halo behind the orb */}
      <Animated.View
        style={[s.halo, { opacity: haloOpacity, backgroundColor: haloColor }]}
        pointerEvents="none"
      />

      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={380}
        style={s.pressableContainer}
      >
        <Animated.View style={{ transform: [{ scale }, { translateY: -14 }], opacity }}>
          <View style={s.orb}>
            <LinearGradient
              colors={['#6B5A50', '#3A2F28']}
              start={{ x: 0.38, y: 0.18 }}
              end={{ x: 0.62, y: 1.0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: ORB / 2 }]}
            />
            <NavRingMark />
          </View>
        </Animated.View>
      </Pressable>

      {/* Review queue badge */}
      {queueCount > 0 && (
        <View style={s.badge} pointerEvents="none" />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  pressableContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    bottom: 14,
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 12,
    // 5px page-bg ring punch (border approximation)
    borderWidth: 5,
    borderColor: Colors.paper,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.clay,
    borderWidth: 2,
    borderColor: Colors.paper,
  },
});
