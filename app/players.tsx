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


  const defaultPlayers = Array.from({ length: 11 }, () => ({ name: '', role: 'both' }));
  const defaultPlayers1 = Array.from({ length: 11 }, () => ({ name: '', role: 'both' }));

  const [activeTab, setActiveTab] = useState(0);
  const [team1Players, setTeam1Players] = useState(defaultPlayers);
  const [team2Players, setTeam2Players] = useState(defaultPlayers1);

  const inputRefs = useRef<{ [key: number]: RNTextInput[] }>({ 0: [], 1: [] });

  const focusInput = (teamIndex: number, playerIndex: number) => {
    const input = inputRefs.current[teamIndex]?.[playerIndex];
    if (input) input.focus();
  };

  const isDuplicate = (name: string, list: { name: string }[], index: number) => {
    const trimmed = name.trim().toLowerCase();
    return (
      trimmed &&
      list.some((n, i) => i !== index && n.name.trim().toLowerCase() === trimmed)
    );
  };

  const updatePlayerName = (teamIndex: number, playerIndex: number, name: string) => {
    const list = teamIndex === 0 ? team1Players : team2Players;
    if (isDuplicate(name, list, playerIndex)) {
      Alert.alert('Duplicate Name', `Player "${name}" already exists.`);
      return;
    }

    const updated = [...list];
    updated[playerIndex].name = name;
    teamIndex === 0 ? setTeam1Players(updated) : setTeam2Players(updated);
  };

  const updatePlayerRole = (teamIndex: number, index: number, role: string) => {
    const list = teamIndex === 0 ? team1Players : team2Players;
    const updated = [...list];
    updated[index].role = role;
    teamIndex === 0 ? setTeam1Players(updated) : setTeam2Players(updated);
  };

  const handleContinue = () => {
    const validTeam1 = team1Players.filter(p => p.name.trim());
    const validTeam2 = team2Players.filter(p => p.name.trim());

    if (validTeam1.length !== 11 || validTeam2.length !== 11) {
      Alert.alert('Invalid Players', 'Each team must have exactly 11 players.');
      return;
    }

    const updatedTeams = [
      {
        ...teams[0],
        players: validTeam1.map(p => ({
          name: p.name.trim(),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
          role: p.role,
          status: ''
        })),
      },
      {
        ...teams[1],
        players: validTeam2.map(p => ({
          name: p.name.trim(),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
          role: p.role,
          status: ''
        })),
      },
    ];

    setTeams(updatedTeams);
    router.push('/toss');
  };

  const handleDelete = (teamIndex: number, index: number) => {
    const list = teamIndex === 0 ? [...team1Players] : [...team2Players];
    list.splice(index, 1);
    teamIndex === 0 ? setTeam1Players(list) : setTeam2Players(list);
  };

  const handleAddPlayer = (teamIndex: number) => {
    const list = teamIndex === 0 ? team1Players : team2Players;
    if (list.length < 11) {
      const updated = [...list, { name: '', role: 'both' }];
      teamIndex === 0 ? setTeam1Players(updated) : setTeam2Players(updated);
      setTimeout(() => focusInput(teamIndex, list.length), 100);
    }
  };

  const renderProgressBar = (teamIndex: number) => {
    const players = teamIndex === 0 ? team1Players : team2Players;
    const filledCount = players.filter(p => p.name.trim()).length;
    const percent = (filledCount / 11) * 100;
    const barColor = teamIndex === 0 ? '#3B82F6' : '#10B981';

    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>{filledCount} / 11 Players Entered</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  };

  const renderTeamForm = (teamIndex: number, players: typeof team1Players) => {
    return (
      <View style={{ marginTop: 20 }}>
        {renderProgressBar(teamIndex)}

        {players.map((p, i) => (
          <View key={i} style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={(ref) => {
                  if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                  inputRefs.current[teamIndex][i] = ref!;
                }}
                placeholder={`Player ${i + 1}`}
                style={styles.input}
                value={p.name}
                onChangeText={(text) => updatePlayerName(teamIndex, i, text)}
                returnKeyType="next"
                onSubmitEditing={() => focusInput(teamIndex, i + 1)}
              />
              <TouchableOpacity onPress={() => handleDelete(teamIndex, i)} style={styles.clearBtn}>
                <Text style={{ fontSize: 14, color: '#EF4444' }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {players.length < 11 && (
          <TouchableOpacity onPress={() => handleAddPlayer(teamIndex)} style={styles.addBtn}>
            <Text style={styles.addText}>+ Add Player</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 0 && styles.activeTab]}
          onPress={() => setActiveTab(0)}
        >
          <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
            {teams[0]?.name || 'Team A'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 1 && styles.activeTab]}
          onPress={() => setActiveTab(1)}
        >
          <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
            {teams[1]?.name || 'Team B'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 0 ? renderTeamForm(0, team1Players) : renderTeamForm(1, team2Players)}

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
    paddingBottom: 40,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    backgroundColor: '#F3F4F6',
  },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  inputRow: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  clearBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  addBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueBtn: {
    marginTop: 30,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: 15,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
