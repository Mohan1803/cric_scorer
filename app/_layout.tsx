import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Stack, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';

// Instantly force the HTML body background to dark on Web to prevent flashes
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.body.style.backgroundColor = '#0B0E14';
  document.documentElement.style.backgroundColor = '#0B0E14';
}

// Keep the native splash screen visible while we initialize
SplashScreen.preventAutoHideAsync().catch(() => { });


import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestNotificationPermissions } from '../services/notificationService';
import { startBroadcastListener } from '../services/broadcastListenerService';
import { useAuthStore } from '../store/authStore';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Hide splash screen and set system UI once we are ready
    SplashScreen.hideAsync().catch(() => { });
    SystemUI.setBackgroundColorAsync('#0B0E14').catch(() => { });

    // Notification Setup
    async function setupNotifications() {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        startBroadcastListener();
      }
    }
    setupNotifications();
  }, []);

  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Real-time Cloud Sync Check
  useEffect(() => {
    if (hasHydrated && isAuthenticated && user) {
      const verifyCloudProfile = async () => {
        try {
          const { getUserProfile } = await import('../services/userService');
          const cloudProfile = await getUserProfile(user.id);
          
          if (!cloudProfile) {
            // Profile was deleted in Firebase console, clear local state
            useAuthStore.getState().logout();
          } else if (JSON.stringify(cloudProfile) !== JSON.stringify(user)) {
            // Update local state if cloud data has changed
            useAuthStore.getState().updateProfile(cloudProfile as any);
          }
        } catch (e) {
          console.error('Cloud sync failed:', e);
        }
      };
      verifyCloudProfile();
    }
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (!hasHydrated) return; // Wait for storage to load

    const inAuthGroup = segments[0] === 'login';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated) {
      const isProfileSetup = segments[0] === 'profile-setup';

      if (!user?.hasProfile && !isProfileSetup) {
        // Force profile setup if missing
        router.replace('/profile-setup');
      } else if (user?.hasProfile && inAuthGroup) {
        // Go to dashboard if profile exists but user is on login
        router.replace('/entryPage');
      }
    }
  }, [isAuthenticated, segments, hasHydrated, user?.hasProfile]);

  return (
    <SafeAreaProvider>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0E14' }
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />


        <Stack.Screen name="full-map"
          options={{
            title: 'Select Pitch Location',
            headerShown: false,
            presentation: 'modal'
          }} />

        <Stack.Screen name="players"
          options={{
            title: 'Players',
            headerTitleAlign: 'center',
            // headerLeft: () => {
            //   const navigation = useNavigation();
            //   return (
            //     <TouchableOpacity
            //       onPress={() => navigation.goBack()}
            //       style={{ paddingHorizontal: 10 }}
            //     >
            //       <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
            //     </TouchableOpacity>
            //   );
            // },
          }} />
        <Stack.Screen name="toss"
          options={{
            title: 'Toss',
            headerTitleAlign: 'center',
            // headerLeft: () => {
            //   const navigation = useNavigation();
            //   return (
            //     <TouchableOpacity
            //       onPress={() => navigation.goBack()}
            //       style={{ paddingHorizontal: 10 }}
            //     >
            //       <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
            //     </TouchableOpacity>
            //   );
            // },
          }} />
        <Stack.Screen name="select-players"
          options={{
            title: 'Select Players',
            headerTitleAlign: 'center',
            // headerLeft: () => {
            //   const navigation = useNavigation();
            //   return (
            //     <TouchableOpacity
            //       onPress={() => navigation.goBack()}
            //       style={{ paddingHorizontal: 10 }}
            //     >
            //       <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
            //     </TouchableOpacity>
            //   );
            // },
          }} />
        <Stack.Screen name="scorecard"
          options={{
            title: 'Live Scorecard',
            headerTitleAlign: 'center',
            // headerLeft: () => {
            //   const navigation = useNavigation();
            //   return (
            //     <TouchableOpacity
            //       onPress={() => navigation.goBack()}
            //       style={{ paddingHorizontal: 10 }}
            //     >
            //       <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
            //     </TouchableOpacity>
            //   );
            // },
          }} />
        <Stack.Screen name="full-scorecard"
          options={{
            title: 'Full Scorecard',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen name="lbw-recorder"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="lbw-tracking"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="coming-soon"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="live-matches"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="match-viewer/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="grounds-network"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="add-ground"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="entryPage"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="lbw-demo"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="match-setup"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="role-selection"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="select-choice"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="commentary"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
