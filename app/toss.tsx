import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';

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
    <View style={styles.container}>
      <Text style={styles.title}>Who won the toss?</Text>
      
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  teamButton: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  teamButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});