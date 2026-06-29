import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';

import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  const router = useRouter();

  return (
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
          height: 60,
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
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/new-recap');
          },
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
  );
}
