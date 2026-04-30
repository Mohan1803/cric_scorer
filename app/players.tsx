import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TextInput as RNTextInput,
  ActivityIndicator
} from 'react-native';

import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Users, Trash2, Plus, CheckCircle2, ChevronRight, ChevronLeft, Save, Mail, Search, RefreshCw } from 'lucide-react-native';
import { useTeamLibraryStore } from '../store/teamLibraryStore';
import { findUserProfileByEmail } from '../services/userService';

export default function PlayersEntry() {
  const teams = useGameStore((state) => state.teams);
  const setTeams = useGameStore((state) => state.setTeams);

  const defaultPlayers = Array.from({ length: 15 }, () => ({
    name: '', email: '', role: 'both', isCaptain: false, isWicketKeeper: false,
    battingHand: 'right' as const, bowlingHand: 'right' as const
  }));

  const [activeTab, setActiveTab] = useState(0);
  const [searching, setSearching] = useState<{ [key: string]: boolean }>({});

  const [t1Roster, setT1Roster] = useState<any[]>(() => {
    const existing = teams[0]?.players || [];
    return existing.map(p => ({
      ...p,
      email: (p as any).email || '',
      battingHand: (p as any).battingHand || 'right',
      bowlingHand: (p as any).bowlingHand || 'right',
      isSelected: true // Default all existing players as selected
    }));
  });

  const [t2Roster, setT2Roster] = useState<any[]>(() => {
    const existing = teams[1]?.players || [];
    return existing.map(p => ({
      ...p,
      email: (p as any).email || '',
      battingHand: (p as any).battingHand || 'right',
      bowlingHand: (p as any).bowlingHand || 'right',
      isSelected: true
    }));
  });

  const inputRefs = useRef<{ [key: number]: RNTextInput[] }>({ 0: [], 1: [] });

  const focusInput = (teamIndex: number, playerIndex: number) => {
    const input = inputRefs.current[teamIndex]?.[playerIndex];
    if (input) input.focus();
  };

  const lookupPlayerByEmail = async (teamIndex: number, playerIndex: number, email: string) => {
    if (!email.includes('@') || email.length < 5) return;

    // Check if player already exists in either team
    const allPlayers = [...t1Roster, ...t2Roster];
    const isAlreadyPresent = allPlayers.some((p, idx) => {
      // Skip the current player we are editing
      const isCurrentEditing = (teamIndex === 0 && idx === playerIndex) ||
        (teamIndex === 1 && idx === (playerIndex + t1Roster.length));

      return !isCurrentEditing && p.email.toLowerCase() === email.toLowerCase().trim();
    });

    if (isAlreadyPresent) {
      Alert.alert('Duplicate Player', 'This player is already added to one of the teams.');
      return;
    }

    const key = `${teamIndex}-${playerIndex}`;
    setSearching(prev => ({ ...prev, [key]: true }));

    try {
      const profile = await findUserProfileByEmail(email);
      if (profile) {
        const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
        setRoster(prev => {
          const list = [...prev];
          list[playerIndex] = {
            ...list[playerIndex],
            id: profile.id,
            name: profile.name ?? email.split('@')[0],
            role: profile.role || 'batsman',
            battingHand: profile.battingHand ?? 'right',
            bowlingHand: profile.bowlingHand ?? 'right',
            isGuest: false // Once found, it's no longer just a manual guest
          };
          return list;
        });
      }
    } catch (error) {
      console.error('Lookup failed:', error);
    } finally {
      setSearching(prev => ({ ...prev, [key]: false }));
    }
  };

  const togglePlayerSelection = (teamIndex: number, playerIndex: number) => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      const list = [...prev];
      list[playerIndex].isSelected = !list[playerIndex].isSelected;
      return list;
    });
  };

  const updatePlayerEmail = (teamIndex: number, playerIndex: number, email: string) => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      const list = [...prev];
      list[playerIndex] = { ...list[playerIndex], email };
      return list;
    });

    if (email.endsWith('.com')) {
      lookupPlayerByEmail(teamIndex, playerIndex, email);
    }
  };

  const updatePlayerName = (teamIndex: number, playerIndex: number, name: string) => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      const list = [...prev];
      list[playerIndex].name = name;
      return list;
    });
  };

  const updateBattingHand = (teamIndex: number, index: number, hand: 'right' | 'left') => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      const list = [...prev];
      list[index] = { ...list[index], battingHand: hand };
      return list;
    });
  };

  const updateBowlingHand = (teamIndex: number, index: number, hand: 'right' | 'left') => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      const list = [...prev];
      list[index] = { ...list[index], bowlingHand: hand };
      return list;
    });
  };

  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    // One-time sync of all players with their Firestore profiles
    t1Roster.forEach((p, idx) => {
      if (p.email && p.email.includes('@')) lookupPlayerByEmail(0, idx, p.email);
    });
    t2Roster.forEach((p, idx) => {
      if (p.email && p.email.includes('@')) lookupPlayerByEmail(1, idx, p.email);
    });
  }, []);

  const handleContinue = () => {
    try {
      const selectedT1 = t1Roster.filter(p => p.isSelected);
      const selectedT2 = t2Roster.filter(p => p.isSelected);

      const validTeam1 = selectedT1.filter(p => p.name && p.name.trim());
      const validTeam2 = selectedT2.filter(p => p.name && p.name.trim());

      if (validTeam1.length < 11 || validTeam2.length < 11) {
        Alert.alert('Invalid Squad', `Select at least 11 named players per team. Team 1: ${validTeam1.length}, Team 2: ${validTeam2.length}`);
        return;
      }

      const team1Base = teams[0] || { name: 'Team 1' };
      const team2Base = teams[1] || { name: 'Team 2' };

      const mapPlayer = (p: any, i: number, prefix: string) => ({
        id: p.id || `${prefix}-p-${i}-${Date.now()}`,
        name: p.name.trim(),
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        ballsBowled: 0,
        wickets: 0,
        runsGiven: 0,
        role: p.role || 'allrounder',
        status: 'not_out' as const,
        isOut: false,
        isReserve: i >= 11,
        isCaptain: p.isCaptain || false,
        isWicketKeeper: p.isWicketKeeper || false,
        battingHand: p.battingHand || 'right',
        email: p.email || '',
      });

      const updatedTeams = [
        {
          ...team1Base,
          players: validTeam1.map((p: any, i) => mapPlayer(p, i, 't1')),
        },
        {
          ...team2Base,
          players: validTeam2.map((p: any, i) => mapPlayer(p, i, 't2')),
        },
      ];

      console.log('Setting teams:', updatedTeams[0].name, updatedTeams[0].players.length, updatedTeams[1].name, updatedTeams[1].players.length);
      setTeams(updatedTeams);
      router.push('/role-selection');
    } catch (error: any) {
      console.error('handleContinue error:', error);
      Alert.alert('Error', error?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleDelete = (teamIndex: number, index: number) => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      const list = [...prev];
      list.splice(index, 1);
      return list;
    });
  };

  const handleAddPlayer = (teamIndex: number) => {
    const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
    setRoster(prev => {
      if (prev.length < 15) {
        const updated = [...prev, { name: '', email: '', role: 'both', isCaptain: false, isWicketKeeper: false, battingHand: 'right' as const, bowlingHand: 'right' as const, isSelected: true }];
        return updated;
      }
      return prev;
    });
  };

  const renderProgressBar = (teamIndex: number) => {
    const roster = teamIndex === 0 ? t1Roster : t2Roster;
    const selectedCount = roster.filter(p => p.isSelected).length;
    const percent = Math.min((selectedCount / 11) * 100, 100);
    const isReady = selectedCount >= 11;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>SQUAD SELECTION</Text>
          <TouchableOpacity
            onPress={() => {
              t1Roster.forEach((p, i) => p.email && lookupPlayerByEmail(0, i, p.email));
              t2Roster.forEach((p, i) => p.email && lookupPlayerByEmail(1, i, p.email));
            }}
            style={styles.refreshBtn}
          >
            <RefreshCw size={12} color={colors.accent} />
            <Text style={styles.refreshText}>SYNC PROFILES</Text>
          </TouchableOpacity>
          <View style={styles.progressBadge}>
            <Text style={[styles.progressCount, isReady && { color: colors.success }]}>
              {selectedCount}<Text style={styles.progressTotal}> SELECTED</Text>
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

  const renderRosterPlayer = (p: any, i: number, teamIndex: number) => {
    const isSelected = p.isSelected;
    const searchKey = `${teamIndex}-${i}`;
    const isSearching = searching[searchKey];

    const formatRole = (role: string) => {
      const r = role?.toLowerCase().replace(/[^a-z]/g, ''); // Remove spaces/dashes
      if (r === 'both' || r === 'allrounder' || r === 'all-rounder' || r === 'ar') return 'All Rounder';
      if (r === 'batsman' || r === 'bat') return 'Batsman';
      if (r === 'bowler' || r === 'bowl') return 'Bowler';
      if (r === 'wicketkeeper' || r === 'wk' || r === 'keeper') return 'Wicket Keeper';
      return 'Not Specified';
    };

    return (
      <View key={p.id || i} style={[styles.playerCard, isSelected ? styles.activeCard : { opacity: 0.5 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.rankText}>PLAYER {i + 1}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {isSearching && <ActivityIndicator size="small" color={colors.accent} />}
            {!p.id && (
              <TouchableOpacity onPress={() => {
                const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
                setRoster(prev => prev.filter((_, idx) => idx !== i));
              }}>
                <Trash2 size={14} color="#ef4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => togglePlayerSelection(teamIndex, i)}>
              <CheckCircle2 size={16} color={isSelected ? colors.accent : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardMain}>
          <View style={styles.rosterAvatar}>
            <User size={20} color={isSelected ? colors.accent : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            {p.id ? (
              <>
                <Text style={[styles.rosterPlayerName, isSelected && { color: '#fff' }]}>{p.name || 'Unknown Player'}</Text>
                <Text style={styles.rosterPlayerRole}>{formatRole(p.role)}</Text>
              </>
            ) : (
              <View style={styles.guestInputArea}>
                <TextInput
                  style={styles.playerInputCompact}
                  value={p.email}
                  onChangeText={(val) => updatePlayerEmail(teamIndex, i, val)}
                  placeholder="Enter Email to find player..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.guestHint}>Type email to link official profile</Text>
              </View>
            )}
          </View>

          <View style={styles.profileIndicator}>
            <View style={[styles.miniHandBadge, p.battingHand === 'left' ? styles.lhbBadge : styles.rhbBadge]}>
              <Text style={styles.miniHandBadgeText}>{p.battingHand === 'left' ? 'LHB' : 'RHB'}</Text>
            </View>
            <View style={[styles.miniHandBadge, styles.bowlBadge]}>
              <Text style={styles.miniHandBadgeText}>{p.bowlingHand === 'left' ? 'LA' : 'RA'}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTeamForm = (teamIndex: number) => {
    const roster = teamIndex === 0 ? t1Roster : t2Roster;

    return (
      <View style={styles.formContent}>
        {renderProgressBar(teamIndex)}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SQUAD ROSTER</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.playersList}>
          {roster.map((p, i) => renderRosterPlayer(p, i, teamIndex))}
        </View>

        <TouchableOpacity
          onPress={() => {
            const setRoster = teamIndex === 0 ? setT1Roster : setT2Roster;
            setRoster(prev => [...prev, { name: 'New Player', email: '', isSelected: true, battingHand: 'right', bowlingHand: 'right' }]);
          }}
          style={styles.addPlayerBtn}
        >
          <Plus size={18} color={colors.accentSecondary} />
          <Text style={styles.addPlayerText}>Add Guest Player</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
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
          {activeTab === 0 ? renderTeamForm(0) : renderTeamForm(1)}

          {t1Roster.filter(p => p.isSelected && p.name && p.name.trim()).length >= 11 &&
            t2Roster.filter(p => p.isSelected && p.name && p.name.trim()).length >= 11 && (
              <Pressable style={styles.continueBtn} onPress={handleContinue}>
                <LinearGradient
                  colors={[colors.accent, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueGradient}
                >
                  <Text style={styles.continueText}>Continue to Toss</Text>
                </LinearGradient>
              </Pressable>
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
  playerInputCompact: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  rosterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rosterPlayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rosterPlayerRole: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  guestInputArea: {
    flex: 1,
    justifyContent: 'center',
  },
  guestHint: {
    fontSize: 9,
    color: colors.accentSecondary,
    opacity: 0.6,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 205, 5, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.2)',
  },
  refreshText: {
    fontSize: 9,
    color: colors.accent,
    fontWeight: '700',
  },
  handToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileIndicator: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 80,
  },
  miniHandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  lhbBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  rhbBadge: {
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    borderColor: 'rgba(249, 205, 5, 0.4)',
  },
  bowlBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  miniHandBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
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
