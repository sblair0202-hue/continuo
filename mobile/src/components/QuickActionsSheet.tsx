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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, sp } from '../constants/colors';

interface Action {
  label: string;
  sublabel: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectVoiceNote: () => void;
  onSelectQuickNote: () => void;
  onSelectPhoto: () => void;
}

export function QuickActionsSheet({
  visible,
  onClose,
  onSelectVoiceNote,
  onSelectQuickNote,
  onSelectPhoto,
}: QuickActionsSheetProps) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const actions: Action[] = [
    {
      label: 'Voice Note',
      sublabel: 'Record and analyze a field recap',
      icon: '🎙',
      onPress: onSelectVoiceNote,
    },
    {
      label: 'Quick Note',
      sublabel: 'Type a note or paste text',
      icon: '✏️',
      onPress: onSelectQuickNote,
    },
    {
      label: 'Photo',
      sublabel: 'Capture whiteboard, card, or doc',
      icon: '📷',
      onPress: onSelectPhoto,
    },
    {
      label: 'Business Card',
      sublabel: 'Coming soon',
      icon: '💳',
      onPress: () => {},
      disabled: true,
    },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdropOpacity }]} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: insets.bottom + sp.md, transform: [{ translateY: slideY }] },
        ]}
      >
        {/* Handle */}
        <View style={s.handle} />

        {/* Orb tagline */}
        <Text style={s.heading}>Tap the Orb</Text>
        <Text style={s.subheading}>What would you like to capture?</Text>

        {/* Actions */}
        <View style={s.actions}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.action, a.disabled && s.actionDisabled]}
              onPress={a.disabled ? undefined : a.onPress}
              activeOpacity={a.disabled ? 1 : 0.72}
            >
              <Text style={s.actionIcon}>{a.icon}</Text>
              <View style={s.actionText}>
                <Text style={[s.actionLabel, a.disabled && s.actionLabelDisabled]}>{a.label}</Text>
                <Text style={s.actionSub}>{a.sublabel}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(42, 35, 28, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: sp.sm,
    paddingHorizontal: sp.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.mist,
    alignSelf: 'center',
    marginBottom: sp.md,
  },
  heading: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 18,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 13,
    color: Colors.graphite,
    textAlign: 'center',
    marginBottom: sp.md,
  },
  actions: {
    gap: sp.sm,
    marginBottom: sp.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    backgroundColor: Colors.paper,
    borderRadius: Radius.card,
    paddingVertical: sp.md,
    paddingHorizontal: sp.md,
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.ink,
  },
  actionLabelDisabled: {
    color: Colors.graphite,
  },
  actionSub: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
    color: Colors.graphite,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: sp.md,
  },
  cancelText: {
    fontFamily: 'HankenGrotesk_500Medium',
    fontSize: 15,
    color: Colors.graphite,
  },
});
