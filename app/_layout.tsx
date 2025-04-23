import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
      <Stack screenOptions={{
        headerShown: true,
        // headerTitle: () => (
        //   <Image
        //     source={{ uri: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=64&h=64&fit=crop' }}
        //     style={{
        //       width: 50,
        //       height: 50,
        //       borderRadius: 25,
        //     }}
        //     resizeMode="contain"
        //   />
        // ),
      }}>
        <Stack.Screen
          name="index"
          options={{
            title: 'Cricket Scorecard',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen
          name="players"
          options={{
            title: 'Add Players',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen
          name="toss"
          options={{
            title: 'Toss',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen
          name="select-players"
          options={{
            title: 'Select Players',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen
          name="scorecard"
          options={{
            title: 'Live Scorecard',
            headerTitleAlign: 'center'
          }}
        />
        <Stack.Screen
          name="full-scorecard"
          options={{
            title: 'Full Scorecard',
            headerTitleAlign: 'center'
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}