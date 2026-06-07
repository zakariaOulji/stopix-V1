import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores';

/** Entry gate: route to the app if authenticated, otherwise to onboarding. */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(tabs)/dashboard' : '/onboarding'} />;
}
