// Placeholder for the "add" tab - FAB navigates to create-habit screen directly
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AddTab() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/create-habit');
  }, []);
  return null;
}
