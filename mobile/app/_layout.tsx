import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function NavigationGuard() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.replace('/login');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, isLoading]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationGuard />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="ticket/[id]"
            options={{
              title: 'Detalhes do Chamado',
              headerStyle: { backgroundColor: '#2563eb' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
