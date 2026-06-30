import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';

import { OrbButton } from '../../src/components/OrbButton';
import { QuickActionsSheet } from '../../src/components/QuickActionsSheet';
import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: Colors.paper },
          headerTintColor: Colors.sky,
          headerTitleStyle: { fontFamily: 'HankenGrotesk_600SemiBold', color: Colors.ink },
          tabBarActiveTintColor: Colors.sky,
          tabBarInactiveTintColor: Colors.graphite,
          tabBarStyle: {
            backgroundColor: Colors.paper,
            borderTopColor: Colors.mist,
            borderTopWidth: 1,
            height: 72,
          },
          tabBarLabelStyle: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 10, marginBottom: 4 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="today-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="accounts"
          options={{
            title: 'Accounts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={22} color={color} />
            ),
          }}
        />

        {/* The Orb — center tab */}
        <Tabs.Screen
          name="capture"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarButton: () => (
              <OrbButton
                onPress={() => router.push({ pathname: '/voice-capture', params: { autoStart: 'false' } })}
                onLongPress={() => setShowQuickActions(true)}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={22} color={color} />
            ),
          }}
        />
      </Tabs>

      <QuickActionsSheet
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onSelectVoiceNote={() => {
          setShowQuickActions(false);
          router.push({ pathname: '/voice-capture', params: { autoStart: 'true' } });
        }}
        onSelectTypeNote={() => {
          setShowQuickActions(false);
          router.push({ pathname: '/voice-capture', params: { mode: 'type' } });
        }}
        onSelectPhoto={() => {
          setShowQuickActions(false);
          router.push({ pathname: '/voice-capture', params: { mode: 'photo' } });
        }}
      />
    </>
  );
}
