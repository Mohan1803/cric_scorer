import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';

export default function TossScreen() {
  const teams = useGameStore((state) => state.teams);
  const setTossWinner = useGameStore((state) => state.setTossWinner);
  const setBattingTeam = useGameStore((state) => state.setBattingTeam);
  const setBowlingTeam = useGameStore((state) => state.setBowlingTeam);

  const handleTossWinner = (teamName: string) => {
    setTossWinner(teamName);
    router.push('/select-choice');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Who won the toss?</Text>
        <View style={{ alignItems: 'center', width: '100%' }}>
          {teams.map((team, index) => (
            <TouchableOpacity
              key={index}
              style={styles.teamButton}
              onPress={() => handleTossWinner(team.name)}
            >
              <Text style={styles.teamButtonText}>{team.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center', // Center horizontally
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  teamButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 10,
    marginVertical: 10,
    width: 200,
    alignItems: 'center',
  },
  teamButtonText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: 'bold',
  },
});