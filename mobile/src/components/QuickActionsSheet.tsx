import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../constants/colors';

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectVoiceNote: () => void;
  onSelectTypeNote: () => void;
  onSelectPhoto: () => void;
}

// Inline SVG icons
function MicIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <Path d="M5 11a7 7 0 0014 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <Line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <Line x1="9" y1="22" x2="15" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </Svg>
  );
}

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20l4-1L19.5 7.5a2.12 2.12 0 00-3-3L5 16l-1 4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </Svg>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8"/>
    </Svg>
  );
}

function DocIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <Path d="M14 2v6h6M8 13h8M8 17h5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </Svg>
  );
}

interface Action {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  tileColor: string;
  onPress: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function QuickActionsSheet({
  visible,
  onClose,
  onSelectVoiceNote,
  onSelectTypeNote,
  onSelectPhoto,
}: QuickActionsSheetProps) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const actions: Action[] = [
    {
      label: 'Voice Note',
      sublabel: 'Speak your recap',
      icon: <MicIcon color={Colors.sky} />,
      tileColor: Colors.skyTint,
      onPress: onSelectVoiceNote,
    },
    {
      label: 'Type Note',
      sublabel: 'Write it out',
      icon: <PencilIcon color={Colors.sage} />,
      tileColor: Colors.sageTint,
      onPress: onSelectTypeNote,
    },
    {
      label: 'Photo',
      sublabel: 'Whiteboard or label',
      icon: <CameraIcon color={Colors.clay} />,
      tileColor: Colors.clayTint,
      onPress: onSelectPhoto,
    },
    {
      label: 'Document',
      sublabel: 'Import a file',
      icon: <DocIcon color={Colors.graphite} />,
      tileColor: Colors.linen,
      onPress: onSelectPhoto,
    },
    {
      label: 'Email Import',
      sublabel: 'Coming soon',
      icon: <MicIcon color={Colors.graphite} />,
      tileColor: Colors.linen,
      onPress: () => {},
      disabled: true,
      comingSoon: true,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdropOpacity }]} />
      </Pressable>

      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] }]}
      >
        <View style={s.handle} />

        <Text style={s.eyebrow}>CAPTURE SOMETHING</Text>

        <View style={s.actions}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.row, a.disabled && s.rowDisabled]}
              onPress={a.disabled ? undefined : a.onPress}
              activeOpacity={a.disabled ? 1 : 0.72}
            >
              <View style={[s.tile, { backgroundColor: a.tileColor }]}>
                {a.icon}
              </View>
              <View style={s.rowText}>
                <Text style={[s.rowLabel, a.disabled && s.rowLabelMuted]}>{a.label}</Text>
                <Text style={s.rowSub}>{a.sublabel}</Text>
              </View>
              {a.comingSoon && (
                <View style={s.soonPill}>
                  <Text style={s.soonText}>Soon</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(42,35,28,0.32)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 8,
    paddingHorizontal: 18,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.mist,
    alignSelf: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 10,
    color: Colors.graphite,
    letterSpacing: 1.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 15.5,
    color: Colors.ink,
  },
  rowLabelMuted: {
    color: Colors.graphite,
  },
  rowSub: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 12,
    color: Colors.graphite,
  },
  soonPill: {
    backgroundColor: Colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soonText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 11,
    color: Colors.graphite,
  },
});
