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
  Dimensions,
  TextInput as RNTextInput,
} from 'react-native';

import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Users, Trash2, Plus, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react-native';

export default function PlayersEntry() {
  const teams = useGameStore((state) => state.teams);
  const setTeams = useGameStore((state) => state.setTeams);

  const defaultPlayers = Array.from({ length: 15 }, () => ({ name: '', role: 'both', isCaptain: false, isWicketKeeper: false }));
  const defaultPlayers1 = Array.from({ length: 15 }, () => ({ name: '', role: 'both', isCaptain: false, isWicketKeeper: false }));

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
        players: validTeam1.map((p: any, i) => ({
          id: `t1-p-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: p.name.trim(),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
          role: p.role,
          status: 'not_out' as const,
          isOut: false,
          isReserve: i >= 11,
          isCaptain: p.isCaptain || false,
          isWicketKeeper: p.isWicketKeeper || false,
        })),
      },
      {
        ...teams[1],
        players: validTeam2.map((p: any, i) => ({
          id: `t2-p-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: p.name.trim(),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          wickets: 0,
          runsGiven: 0,
          role: p.role,
          status: 'not_out' as const,
          isOut: false,
          isReserve: i >= 11,
          isCaptain: p.isCaptain || false,
          isWicketKeeper: p.isWicketKeeper || false,
        })),
      },
    ];

    setTeams(updatedTeams);
    router.push('/role-selection');
  };

  const handleDelete = (teamIndex: number, index: number) => {
    const list = teamIndex === 0 ? [...team1Players] : [...team2Players];
    list.splice(index, 1);
    teamIndex === 0 ? setTeam1Players(list) : setTeam2Players(list);
  };

  const handleAddPlayer = (teamIndex: number) => {
    const list = teamIndex === 0 ? team1Players : team2Players;
    if (list.length < 15) {
      const updated = [...list, { name: '', role: 'both', isCaptain: false, isWicketKeeper: false }];
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
          <Text style={styles.progressTitle}>Team Composition</Text>
          <View style={styles.progressBadge}>
            <Text style={[styles.progressCount, isReady && { color: colors.success }]}>
              {filledCount}<Text style={styles.progressTotal}>/11</Text>
            </Text>
          </View>
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

  const renderPlayerRow = (p: any, i: number, teamIndex: number, isSub: boolean) => (
    <View key={i} style={[styles.playerCard, isSub ? styles.subCard : styles.activeCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.rankText}>{isSub ? `SUB ${i + 1}` : `PRO ${i + 1}`}</Text>
        {p.name.trim().length > 0 && <CheckCircle2 size={12} color={colors.success} />}
      </View>
      <View style={styles.cardMain}>
        <TextInput
          ref={(ref) => {
            if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
            inputRefs.current[teamIndex][i + (isSub ? 11 : 0)] = ref!;
          }}
          placeholder="Enter Player Name"
          style={styles.playerInput}
          value={p.name}
          onChangeText={(text) => updatePlayerName(teamIndex, i + (isSub ? 11 : 0), text)}
          returnKeyType="next"
          placeholderTextColor="rgba(148, 163, 184, 0.4)"
        />
        <TouchableOpacity
          onPress={() => handleDelete(teamIndex, i + (isSub ? 11 : 0))}
          style={styles.deleteBtn}
        >
          <Trash2 size={16} color="rgba(239, 68, 68, 0.6)" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTeamForm = (teamIndex: number, players: typeof team1Players) => {
    const starters = players.slice(0, 11);
    const subs = players.slice(11);

    return (
      <View style={styles.formContent}>
        {renderProgressBar(teamIndex)}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Starting Eleven</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={styles.playersList}>
          {starters.map((p, i) => renderPlayerRow(p, i, teamIndex, false))}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Bench / Reserves</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={styles.playersList}>
          {subs.map((p, i) => renderPlayerRow(p, i, teamIndex, true))}
        </View>

        {players.length < 15 && (
          <TouchableOpacity
            onPress={() => handleAddPlayer(teamIndex)}
            style={styles.addPlayerBtn}
          >
            <Plus size={18} color={colors.accentSecondary} />
            <Text style={styles.addPlayerText}>Add Reserve</Text>
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
          <ChevronLeft color={colors.accent} size={24} />
          <Text style={styles.headerBackText}>Teams</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entry</Text>
        <View style={{ width: 60 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  headerBackText: {
    color: colors.accent,
    fontSize: 12,
    marginLeft: -4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  segmentedControlContainer: {
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  segmentedControl: {
    flexDirection: 'row',
    height: 38,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 2,
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
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeSegmentText: {
    color: colors.textPrimary,
  },
  formContent: {
    marginTop: 8,
  },
  progressContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(21, 42, 85, 0.3)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  progressBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  progressCount: {
    fontSize: 12,
    color: colors.accentSecondary,
  },
  progressTotal: {
    fontSize: 10,
    color: colors.textMuted,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  playersList: {
    gap: 8,
  },
  playerCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  subCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.surfaceLight,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankText: {
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  deleteBtn: {
    padding: 6,
  },
  addPlayerBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(249, 205, 5, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.2)',
    borderStyle: 'dashed',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPlayerText: {
    fontSize: 12,
    color: colors.accentSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  continueBtn: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.medium,
  },
  continueGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: colors.textPrimary,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

