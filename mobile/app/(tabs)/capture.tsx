import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function CaptureTab() {
  const router = useRouter();
  useEffect(() => { router.replace('/new-recap'); }, []);
  return <View />;
}
