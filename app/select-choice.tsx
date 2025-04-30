import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';

export default function SelectChoiceScreen() {
  const teams = useGameStore((state) => state.teams);
  const tossWinner = useGameStore((state) => state.tossWinner);
  const setBattingTeam = useGameStore((state) => state.setBattingTeam);
  const setBowlingTeam = useGameStore((state) => state.setBowlingTeam);

  const handleChoice = (choice: 'bat' | 'bowl') => {
    const winningTeam = teams.find(team => team.name === tossWinner);
    const losingTeam = teams.find(team => team.name !== tossWinner);

    if (choice === 'bat') {
      setBattingTeam(winningTeam!.name);
      setBowlingTeam(losingTeam!.name);
    } else {
      setBattingTeam(losingTeam!.name);
      setBowlingTeam(winningTeam!.name);
    }

    router.push('/select-players');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Choose to Bat or Bowl</Text>
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={() => handleChoice('bat')}
        >
          <Text style={styles.choiceButtonText}>Bat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.choiceButton}
          onPress={() => handleChoice('bowl')}
        >
          <Text style={styles.choiceButtonText}>Bowl</Text>
        </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: colors.accent,
  },
  choiceButton: {
    backgroundColor: colors.accent,
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  choiceButtonText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: 'bold',
  },
});