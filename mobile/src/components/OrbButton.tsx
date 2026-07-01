import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '../constants/colors';
import { useOrb, OrbState } from '../context/OrbContext';

const ORB = 58;
const ORBIT_R = 42; // pixels from orb center to dot

interface OrbButtonProps {
  onPress: () => void;
  onLongPress: () => void;
  queueCount?: number;
}

function NavRingMark() {
  return (
    <Svg width={28} height={28} viewBox="0 0 120 120" fill="none">
      <Circle cx="60" cy="60" r="34" stroke="rgba(238,244,252,0.92)" strokeWidth="9" />
    </Svg>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function stateAuraColor(state: OrbState): string {
  switch (state) {
    case 'listening':   return Colors.sky;
    case 'thinking':    return Colors.sky;
    case 'needsReview': return Colors.clay;
    case 'syncing':     return Colors.sage;
    case 'complete':    return Colors.sage;
    default:            return Colors.ink;
  }
}

function stateGradient(state: OrbState): [string, string] {
  switch (state) {
    case 'listening':   return ['#5A7A96', '#2E4D66'];
    case 'thinking':    return ['#4A6A86', '#28405A'];
    case 'needsReview': return ['#8B6A42', '#5A4025'];
    case 'syncing':     return ['#4A7A60', '#2A5040'];
    case 'complete':    return ['#3A7050', '#1E4030'];
    default:            return ['#6B5A50', '#3A2F28'];
  }
}

// Three concentric rings creating a soft radial aura (no solid center fill)
function AuraRings({ color, opacity }: { color: string; opacity: Animated.Value }) {
  return (
    <>
      <Animated.View style={[s.auraRing, {
        width: 78, height: 78, borderRadius: 39,
        backgroundColor: hexToRgba(color, 0.18),
        opacity,
      }]} />
      <Animated.View style={[s.auraRing, {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: hexToRgba(color, 0.09),
        opacity,
      }]} />
      <Animated.View style={[s.auraRing, {
        width: 124, height: 124, borderRadius: 62,
        backgroundColor: hexToRgba(color, 0.045),
        opacity,
      }]} />
    </>
  );
}

// A dot that orbits at ORBIT_R from the orb center, offset by offsetDeg degrees
function OrbitDot({ angle, offsetDeg, color, dotOpacity }: {
  angle: Animated.Value;
  offsetDeg: number;
  color: string;
  dotOpacity: number;
}) {
  const containerSize = ORBIT_R * 2 + 12;
  const half = containerSize / 2;
  const rotate = angle.interpolate({
    inputRange: [0, 1],
    outputRange: [`${offsetDeg}deg`, `${offsetDeg + 360}deg`],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: containerSize,
        height: containerSize,
        top: -(half - ORB / 2),
        left: -(half - ORB / 2),
        alignItems: 'center',
        transform: [{ rotate }],
      }}
    >
      {/* Dot sits at the top edge (= ORBIT_R above center) */}
      <View style={{
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color,
        opacity: dotOpacity,
        marginTop: half - ORBIT_R - 2.5,
      }} />
    </Animated.View>
  );
}

function useOrbAnimation(orbState: OrbState) {
  const scale      = useRef(new Animated.Value(1)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const auraOp     = useRef(new Animated.Value(0.18)).current;
  const orbitAngle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.stopAnimation();
    opacity.stopAnimation();
    auraOp.stopAnimation();
    orbitAngle.stopAnimation();

    let loops: Animated.CompositeAnimation[] = [];

    switch (orbState) {
      case 'listening': {
        const aL = Animated.loop(Animated.sequence([
          Animated.timing(auraOp, { toValue: 0.92, duration: 1600, useNativeDriver: true }),
          Animated.timing(auraOp, { toValue: 0.38, duration: 1600, useNativeDriver: true }),
        ]));
        const sL = Animated.loop(Animated.sequence([
          Animated.timing(scale, { toValue: 1.07, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
        ]));
        const oL = Animated.loop(
          Animated.timing(orbitAngle, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })
        );
        aL.start(); sL.start(); oL.start();
        loops = [aL, sL, oL];
        break;
      }
      case 'thinking': {
        const aL = Animated.loop(Animated.sequence([
          Animated.timing(auraOp, { toValue: 0.85, duration: 800, useNativeDriver: true }),
          Animated.timing(auraOp, { toValue: 0.28, duration: 800, useNativeDriver: true }),
        ]));
        const oL = Animated.loop(
          Animated.timing(orbitAngle, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
        );
        aL.start(); oL.start();
        loops = [aL, oL];
        break;
      }
      case 'needsReview': {
        const aL = Animated.loop(Animated.sequence([
          Animated.timing(auraOp, { toValue: 0.8,  duration: 1100, useNativeDriver: true }),
          Animated.timing(auraOp, { toValue: 0.22, duration: 1100, useNativeDriver: true }),
        ]));
        aL.start();
        loops = [aL];
        break;
      }
      case 'syncing': {
        const oL = Animated.loop(Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 720, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0, duration: 720, useNativeDriver: true }),
        ]));
        auraOp.setValue(0.55);
        oL.start();
        loops = [oL];
        break;
      }
      case 'complete':
        Animated.sequence([
          Animated.timing(scale,  { toValue: 1.2, duration: 160, useNativeDriver: true }),
          Animated.timing(scale,  { toValue: 1.0, duration: 300, useNativeDriver: true }),
        ]).start();
        auraOp.setValue(0.8);
        Animated.timing(auraOp, { toValue: 0, duration: 1100, useNativeDriver: true }).start();
        break;

      default: // idle
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.0, duration: 240, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0, duration: 240, useNativeDriver: true }),
          Animated.timing(auraOp,  { toValue: 0.18, duration: 280, useNativeDriver: true }),
        ]).start();
        orbitAngle.setValue(0);
    }

    return () => loops.forEach(l => l.stop());
  }, [orbState]);

  return { scale, opacity, auraOp, orbitAngle };
}

export function OrbButton({ onPress, onLongPress, queueCount = 0 }: OrbButtonProps) {
  const { orbState } = useOrb();
  const { scale, opacity, auraOp, orbitAngle } = useOrbAnimation(orbState);
  const auraCol   = stateAuraColor(orbState);
  const [g1, g2]  = stateGradient(orbState);
  const showOrbit = orbState === 'listening' || orbState === 'thinking';
  const dotColor  = hexToRgba(Colors.reversed, 0.75);

  return (
    <View style={s.container} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={380}
        style={s.pressableContainer}
      >
        <Animated.View style={[s.orbWrap, { transform: [{ scale }, { translateY: -14 }], opacity }]}>
          {/* Aura rings (position: absolute, centered on orb) */}
          <View style={s.auraLayer} pointerEvents="none">
            <AuraRings color={auraCol} opacity={auraOp} />
          </View>

          {/* Orbiting dots */}
          {showOrbit && (
            <View style={[StyleSheet.absoluteFill, { overflow: 'visible' }]} pointerEvents="none">
              <OrbitDot angle={orbitAngle} offsetDeg={0}   color={dotColor} dotOpacity={0.85} />
              <OrbitDot angle={orbitAngle} offsetDeg={120} color={dotColor} dotOpacity={0.50} />
              <OrbitDot angle={orbitAngle} offsetDeg={240} color={dotColor} dotOpacity={0.25} />
            </View>
          )}

          {/* The orb */}
          <View style={s.orb}>
            <LinearGradient
              colors={[g1, g2]}
              start={{ x: 0.38, y: 0.18 }}
              end={{ x: 0.62, y: 1.0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: ORB / 2 }]}
            />
            <NavRingMark />
          </View>
        </Animated.View>
      </Pressable>

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
  orbWrap: {
    width: ORB,
    height: ORB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  auraRing: {
    position: 'absolute',
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
