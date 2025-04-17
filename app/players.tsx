import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  findNodeHandle,
} from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';

export default function PlayersEntry() {
  const teams = useGameStore((state) => state.teams);
  const setTeams = useGameStore((state) => state.setTeams);

  const [team1Players, setTeam1Players] = useState(['']);
  const [team2Players, setTeam2Players] = useState(['']);

  const scrollRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: number]: RNTextInput[] }>({ 0: [], 1: [] });

  const addPlayer = (teamIndex: number) => {
    if (teamIndex === 0 && team1Players.length < 11) {
      setTeam1Players([...team1Players, '']);
    } else if (teamIndex === 1 && team2Players.length < 11) {
      setTeam2Players([...team2Players, '']);
    }
  };

  const scrollToInput = (teamIndex: number, playerIndex: number) => {
    const node = findNodeHandle(inputRefs.current[teamIndex][playerIndex]);
    if (node && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: playerIndex * 60 + teamIndex * 500, // crude vertical offset estimate
        animated: true,
      });
    }
  };

  const updatePlayerName = (teamIndex: number, playerIndex: number, name: string) => {
    const trimmedName = name.trim();
    const playerList = teamIndex === 0 ? team1Players : team2Players;

    const isDuplicate = playerList.some((existingName, index) =>
      index !== playerIndex &&
      existingName.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (trimmedName && isDuplicate) {
      Alert.alert('Error', `Player name "${name}" already exists in this team.`);
      return;
    }

    if (teamIndex === 0) {
      const newPlayers = [...team1Players];
      newPlayers[playerIndex] = name;
      setTeam1Players(newPlayers);
    } else {
      const newPlayers = [...team2Players];
      newPlayers[playerIndex] = name;
      setTeam2Players(newPlayers);
    }
  };

  const handleContinue = () => {
    if (team1Players.length < 2 || team2Players.length < 2) {
      Alert.alert('Error', 'Each team must have at least 2 players');
      return;
    }

    const validTeam1Players = team1Players.filter(name => name.trim());
    const validTeam2Players = team2Players.filter(name => name.trim());

    if (validTeam1Players.length < 2 || validTeam2Players.length < 2) {
      Alert.alert('Error', 'Each team must have at least 2 players with valid names');
      return;
    }

    const updatedTeams = [
      {
        ...teams[0],
        players: validTeam1Players.map(name => ({
          name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
        })),
      },
      {
        ...teams[1],
        players: validTeam2Players.map(name => ({
          name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
        })),
      },
    ];

    setTeams(updatedTeams);
    router.push('/toss');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        {teams.map((team, teamIndex) => {
          const players = teamIndex === 0 ? team1Players : team2Players;
          return (
            <View key={teamIndex} style={styles.teamContainer}>
              <Text style={styles.teamTitle}>{team.name}</Text>

              {players.map((player, playerIndex) => (
                <View key={playerIndex} style={styles.playerInput}>
                  <TextInput
                    ref={(ref) => {
                      if (ref) {
                        if (!inputRefs.current[teamIndex]) {
                          inputRefs.current[teamIndex] = [];
                        }
                        inputRefs.current[teamIndex][playerIndex] = ref;
                      }
                    }}
                    style={styles.input}
                    value={player}
                    onChangeText={(text) =>
                      updatePlayerName(teamIndex, playerIndex, text)
                    }
                    placeholder={`Player ${playerIndex + 1}`}
                    maxLength={30}
                    returnKeyType={
                      playerIndex === players.length - 1 ? 'done' : 'next'
                    }
                    onFocus={() => scrollToInput(teamIndex, playerIndex)}
                    onSubmitEditing={() => {
                      const nextInput =
                        inputRefs.current[teamIndex][playerIndex + 1];
                      if (nextInput) {
                        nextInput.focus();
                      }
                    }}
                  />
                </View>
              ))}

              {players.length < 11 && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addPlayer(teamIndex)}
                >
                  <Text style={styles.addButtonText}>Add Player</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  teamContainer: {
    marginBottom: 30,
  },
  teamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  playerInput: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
