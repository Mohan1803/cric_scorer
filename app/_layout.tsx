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
SplashScreen.preventAutoHideAsync().catch(() => {});


import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Hide splash screen and set system UI once we are ready
    SplashScreen.hideAsync().catch(() => {});
    SystemUI.setBackgroundColorAsync('#0B0E14').catch(() => {});
  }, []);

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
        <Stack.Screen name="teamEntry"
          options={{
            title: 'Team Entry',
            headerTitleAlign: 'center',
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
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
