import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Stack, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text } from 'react-native';


export default function RootLayout() {
  useFrameworkReady();


  return (
    <>
      <Stack
        initialRouteName="index"
        screenOptions={({ route }) => ({
          headerShown: !['index', 'teamEntry'].includes(route.name),
          headerTitleAlign: 'center',
          headerBackVisible: false,
        })}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="teamEntry" />
        <Stack.Screen name="players"
          options={{
            title: 'Players',
            headerTitleAlign: 'center',
            headerLeft: () => {
              const navigation = useNavigation();
              return (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
                </TouchableOpacity>
              );
            },
          }} />
        <Stack.Screen name="toss"
          options={{
            title: 'Toss',
            headerTitleAlign: 'center',
            headerLeft: () => {
              const navigation = useNavigation();
              return (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
                </TouchableOpacity>
              );
            },
          }} />
        <Stack.Screen name="select-players"
          options={{
            title: 'Select Players',
            headerTitleAlign: 'center',
            headerLeft: () => {
              const navigation = useNavigation();
              return (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
                </TouchableOpacity>
              );
            },
          }} />
        <Stack.Screen name="scorecard"
          options={{
            title: 'Live Scorecard',
            headerTitleAlign: 'center',
            headerLeft: () => {
              const navigation = useNavigation();
              return (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
                </TouchableOpacity>
              );
            },
          }} />
        <Stack.Screen name="full-scorecard"
          options={{
            title: 'Full Scorecard',
            headerTitleAlign: 'center',
            headerLeft: () => {
              const navigation = useNavigation();
              return (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 16, color: '#007AFF' }}>{'< Back'}</Text>
                </TouchableOpacity>
              );
            },
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
