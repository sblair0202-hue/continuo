import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';

import { OrbButton } from '../../src/components/OrbButton';
import { QuickActionsSheet } from '../../src/components/QuickActionsSheet';
import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);

  function openCapture() {
    router.push('/new-recap');
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.sky,
          headerTitleStyle: { fontFamily: 'HankenGrotesk_600SemiBold', color: Colors.ink },
          tabBarActiveTintColor: Colors.sky,
          tabBarInactiveTintColor: Colors.graphite,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.mist,
            paddingBottom: 4,
            height: 64,
          },
          tabBarLabelStyle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, marginBottom: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="today-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="accounts"
          options={{
            title: 'Accounts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
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
                onPress={openCapture}
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
              <Ionicons name="search-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <QuickActionsSheet
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onSelectVoiceNote={() => { setShowQuickActions(false); openCapture(); }}
        onSelectQuickNote={() => { setShowQuickActions(false); openCapture(); }}
        onSelectPhoto={() => { setShowQuickActions(false); openCapture(); }}
      />
    </>
  );
}
