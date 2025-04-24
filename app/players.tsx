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
} from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';

export default function PlayersEntry() {
  const teams = useGameStore((state) => state.teams);
  const setTeams = useGameStore((state) => state.setTeams);

  const [team1Players, setTeam1Players] = useState(Array(2).fill(''));
  const [team2Players, setTeam2Players] = useState(Array(2).fill(''));

  const inputRefs = useRef<{ [key: number]: RNTextInput[] }>({ 0: [], 1: [] });

  const focusInput = (teamIndex: number, playerIndex: number) => {
    const input = inputRefs.current[teamIndex]?.[playerIndex];
    if (input) input.focus();
  };

  const isDuplicate = (name: string, list: string[], index: number) => {
    const trimmed = name.trim().toLowerCase();
    return (
      trimmed &&
      list.some((n, i) => i !== index && n.trim().toLowerCase() === trimmed)
    );
  };

  const updatePlayerName = (teamIndex: number, playerIndex: number, name: string) => {
    const list = teamIndex === 0 ? team1Players : team2Players;
    if (isDuplicate(name, list, playerIndex)) {
      Alert.alert('Duplicate Name', `Player "${name}" already exists.`);
      return;
    }

    const updated = [...list];
    updated[playerIndex] = name;
    teamIndex === 0 ? setTeam1Players(updated) : setTeam2Players(updated);
  };

  const handleContinue = () => {
    const validTeam1 = team1Players.filter(name => name.trim());
    const validTeam2 = team2Players.filter(name => name.trim());

    if (validTeam1.length < 2 || validTeam2.length < 2) {
      Alert.alert('Need More Players', 'Each team must have at least 2 named players.');
      return;
    }

    const updatedTeams = [
      {
        ...teams[0],
        players: validTeam1.map(name => ({
          name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
          role: '',
          status: ''
        })),
      },
      {
        ...teams[1],
        players: validTeam2.map(name => ({
          name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
          role: '',
          status: ''
        })),
      },
    ];

    setTeams(updatedTeams);
    router.push('/toss');
  };

  const renderTeamSection = (teamIndex: number, players: string[]) => {
    const setPlayers = teamIndex === 0 ? setTeam1Players : setTeam2Players;

    const handleDelete = (index: number) => {
      const updated = [...players];
      updated.splice(index, 1);
      setPlayers(updated);
    };

    const handleReset = () => {
      setPlayers(Array(2).fill(''));
    };

    const handleAdd = () => {
      if (players.length < 11) {
        setPlayers([...players, '']);
        setTimeout(() => focusInput(teamIndex, players.length), 100);
      }
    };

    return (
      <View style={styles.teamWrapper}>
        <Text style={styles.teamHeader}>{teams[teamIndex]?.name}</Text>
        <View style={styles.teamCard}>
          {players.map((name, index) => (
            <View key={index} style={styles.inputRow}>
              <TextInput
                ref={(ref) => {
                  if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                  inputRefs.current[teamIndex][index] = ref!;
                }}
                style={[
                  styles.input,
                  isDuplicate(name, players, index) && { borderColor: 'red', borderWidth: 2 },
                ]}
                placeholder={`Player ${index + 1}`}
                value={name}
                onChangeText={(text) => updatePlayerName(teamIndex, index, text)}
                returnKeyType="next"
                onSubmitEditing={() => focusInput(teamIndex, index + 1)}
              />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(index)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {players.length < 11 && (
            <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
              <Text style={styles.addText}>+ Add Player</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset Team</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        {renderTeamSection(0, team1Players)}
        {renderTeamSection(1, team2Players)}


        {team1Players.length === 11 &&
          team2Players.length === 11 &&
          team1Players.every(p => p.name.trim()) &&
          team2Players.every(p => p.name.trim()) && (
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  teamWrapper: {
    marginBottom: 24,
  },
  teamHeader: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 10,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  deleteBtn: {
    marginLeft: 8,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  resetBtn: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  resetText: {
    color: '#fff',
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  continueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
