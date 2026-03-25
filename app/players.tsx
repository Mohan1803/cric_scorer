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
import { LinearGradient } from 'expo-linear-gradient';
import { User, Users, Trash2, Plus, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react-native';

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

    if (validTeam1.length < 11 || validTeam2.length < 11) {
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
    const percent = Math.min((filledCount / 11) * 100, 100);
    const isReady = filledCount >= 11;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <View style={styles.progressInfo}>
            <Users size={16} color={isReady ? colors.success : colors.accent} />
            <Text style={[styles.progressCount, isReady && { color: colors.success }]}>
              {filledCount} <Text style={styles.progressTotal}>/ 11 Players</Text>
            </Text>
          </View>
          {isReady && (
            <View style={styles.readyBadge}>
              <CheckCircle2 size={12} color={colors.textPrimary} />
              <Text style={styles.readyText}>READY</Text>
            </View>
          )}
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={isReady ? [colors.success, '#16A34A'] : [colors.accent, colors.accentAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${percent}%` }]}
          />
        </View>
      </View>
    );
  };

  const renderTeamForm = (teamIndex: number, players: typeof team1Players) => {
    return (
      <View style={styles.formContent}>
        {renderProgressBar(teamIndex)}

        <View style={styles.playersList}>
          {players.map((p, i) => (
            <View key={i} style={styles.playerCard}>
              <View style={styles.cardMain}>
                <View style={styles.inputSection}>
                  <TextInput
                    ref={(ref) => {
                      if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                      inputRefs.current[teamIndex][i] = ref!;
                    }}
                    placeholder="Player Name"
                    style={styles.playerInput}
                    value={p.name}
                    onChangeText={(text) => updatePlayerName(teamIndex, i, text)}
                    returnKeyType="next"
                    onSubmitEditing={() => focusInput(teamIndex, i + 1)}
                    placeholderTextColor="rgba(148, 163, 184, 0.4)"
                  />
                </View>

                {p.name.trim().length > 0 && (
                  <View style={styles.checkIcon}>
                    <CheckCircle2 size={16} color={colors.success} />
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => handleDelete(teamIndex, i)}
                  style={styles.deleteIconButton}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={colors.accentWarn} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {players.length < 15 && (
          <TouchableOpacity
            onPress={() => handleAddPlayer(teamIndex)}
            style={styles.addPlayerCard}
            activeOpacity={0.8}
          >
            <View style={styles.addPlayerInner}>
              <Plus size={20} color={colors.accent} />
              <Text style={styles.addPlayerText}>Add Player</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.headerBackButton} 
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.accent} size={28} />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.segmentedControlContainer}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.segment, activeTab === 0 && styles.activeSegment]}
              onPress={() => setActiveTab(0)}
            >
              {activeTab === 0 && (
                <LinearGradient
                  colors={[colors.accent, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.segmentText, activeTab === 0 && styles.activeSegmentText]}>
                {teams[0]?.name || 'Team 1'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.segment, activeTab === 1 && styles.activeSegment]}
              onPress={() => setActiveTab(1)}
            >
              {activeTab === 1 && (
                <LinearGradient
                  colors={[colors.accent, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.segmentText, activeTab === 1 && styles.activeSegmentText]}>
                {teams[1]?.name || 'Team 2'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {activeTab === 0 ? renderTeamForm(0, team1Players) : renderTeamForm(1, team2Players)}

          {team1Players.filter(p => p.name.trim()).length >= 11 &&
            team2Players.filter(p => p.name.trim()).length >= 11 && (
              <TouchableOpacity activeOpacity={0.8} style={styles.continueBtn} onPress={handleContinue}>
                <LinearGradient
                  colors={[colors.accent, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueGradient}
                >
                  <Text style={styles.continueText}>Continue to Toss</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  segmentedControlContainer: {
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  segmentedControl: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeSegment: {
    elevation: 3,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeSegmentText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  formContent: {
    marginTop: 16,
  },
  progressContainer: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent,
  },
  progressTotal: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 3,
  },
  readyText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  playersList: {
    gap: 10,
  },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 1,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputSection: {
    flex: 1,
  },
  playerInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  checkIcon: {
    marginRight: 2,
  },
  deleteIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.1)',
  },
  addPlayerCard: {
    marginTop: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderStyle: 'dashed',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.02)',
  },
  addPlayerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addPlayerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  continueBtn: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
