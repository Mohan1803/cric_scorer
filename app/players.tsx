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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';

export default function PlayersEntry() {
  const teams = useGameStore((state) => state.teams);
  const setTeams = useGameStore((state) => state.setTeams);

  const defaultPlayers = Array.from({ length: 15 }, () => ({ name: '', role: 'both' }));
  const defaultPlayers1 = Array.from({ length: 15 }, () => ({ name: '', role: 'both' }));

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
      Alert.alert('Invalid Players', 'Each team must have minimum 11 players.');
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
    const barColor = teamIndex === 0 ? colors.accent : colors.success;

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
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => handleDelete(teamIndex, i)} style={styles.clearBtn}>
                <Text style={{ fontSize: 14, color: colors.error }}>✕</Text>
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
    <>
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

          {team1Players.filter(p => p.name.trim()).length >= 11 &&
            team2Players.filter(p => p.name.trim()).length >= 11 && (
              <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
                <Text style={styles.continueText}>Continue</Text>
              </TouchableOpacity>
            )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 28,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginHorizontal: 6,
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  tabText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: colors.textPrimary,
    
    
    
  },
  inputRow: {
    marginBottom: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: colors.card,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '900',
    letterSpacing: 0.15,
    
    
    
  },
  clearBtn: {
    position: 'absolute',
    right: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  addBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: colors.accentAlt,
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  addText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.12,
    
    
    
    textTransform: 'uppercase',
  },
  continueBtn: {
    marginTop: 40,
    backgroundColor: colors.accentAlt,
    paddingVertical: 21,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: colors.accentAlt,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 7,
    minWidth: 200,
  },
  continueText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.22,
    textTransform: 'uppercase',
    
    
    
  },
  progressBarContainer: {
    marginBottom: 18,
    marginTop: 2,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.12,
    
    
    
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.cardAlt,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
});
