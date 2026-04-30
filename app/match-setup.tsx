import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from './theme';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, ChevronLeft, Plus, MapPin, Search, Zap } from 'lucide-react-native';
import { groundService, FirebaseGround } from '../services/groundService';
import { getMyTeams, Team as FirestoreTeam, searchAllTeams } from '../services/teamService';
import { useAuthStore } from '../store/authStore';

export default function MatchSetup() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const { user } = useAuthStore();
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [overs, setOvers] = useState('');

  const {
    setTeams,
    setTotalOvers,
    enableAnimations,
    enableSounds,
    enableFieldMap,
    setEnableAnimations,
    setEnableSounds,
    setEnableFieldMap,
    startNewMatch,
    groundName,
    tournamentName,
    setGroundName,
    setTournamentName
  } = useGameStore();

  const [allMyTeams, setAllMyTeams] = useState<FirestoreTeam[]>([]);
  const [team1Suggestions, setTeam1Suggestions] = useState<FirestoreTeam[]>([]);
  const [team2Suggestions, setTeam2Suggestions] = useState<FirestoreTeam[]>([]);
  const [team1Players, setTeam1Players] = useState<any[]>([]);
  const [team2Players, setTeam2Players] = useState<any[]>([]);

  const [allGrounds, setAllGrounds] = useState<FirebaseGround[]>([]);
  const [groundSuggestions, setGroundSuggestions] = useState<FirebaseGround[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSearchingGlobal1, setIsSearchingGlobal1] = useState(false);
  const [isSearchingGlobal2, setIsSearchingGlobal2] = useState(false);

  // Fetch teams on screen focus
  useFocusEffect(
    useCallback(() => {
      const fetchTeams = async () => {
        if (user) {
          const teams = await getMyTeams(user.id, user.email);
          setAllMyTeams(teams);
        }
      };
      fetchTeams();
    }, [user])
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch Grounds
        const grounds = await groundService.getGrounds();
        setAllGrounds(grounds);

        // Fetch User's Teams from Firebase
        if (user) {
          const teams = await getMyTeams(user.id, user.email);
          setAllMyTeams(teams);

          // If navigated from a specific team in the drawer
          if (teamId) {
            const selectedTeam = teams.find(t => t.id === teamId);
            if (selectedTeam) {
              setTeam1Name(selectedTeam.name);
              setTeam1Players(selectedTeam.players);
            }
          }
        }
      } catch (error) {
        console.error("Setup initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, teamId]);

  const searchTeams = (query: string, otherTeamName: string) => {
    if (!query) return [];
    return allMyTeams.filter(t =>
      t.name.toLowerCase().includes(query.toLowerCase()) &&
      t.name.toLowerCase() !== otherTeamName.toLowerCase()
    ).slice(0, 5);
  };

  const getGroundsByQuery = async (queryStr: string) => {
    if (!queryStr || queryStr.length < 1) {
      setGroundSuggestions([]);
      return;
    }
    
    const lower = queryStr.toLowerCase();
    const localMatches = allGrounds.filter(g =>
      g.name.toLowerCase().includes(lower) ||
      g.city.toLowerCase().includes(lower)
    ).slice(0, 5);

    setGroundSuggestions(localMatches);

    // If local matches are few, search globally for registered venues
    if (localMatches.length < 3 && queryStr.length > 2) {
      const globalMatches = await groundService.searchAllGrounds(queryStr);
      setGroundSuggestions(prev => {
        const combined = [...prev];
        globalMatches.forEach(gm => {
          if (!combined.some(c => c.id === gm.id)) {
            combined.push(gm);
          }
        });
        return combined.slice(0, 5);
      });
    }
  };

  const handleTeamSearch = async (text: string, teamNum: 1 | 2) => {
    if (teamNum === 1) {
      setTeam1Name(text);
      if (!text.trim()) {
        setTeam1Suggestions([]);
        return;
      }

      // Check personal teams first
      const localMatches = searchTeams(text, team2Name);
      const exactMatch = allMyTeams.find(t => t.name.toLowerCase() === text.trim().toLowerCase());

      if (exactMatch) {
        setTeam1Players(exactMatch.players);
        setTeam1Suggestions([]);
      } else {
        setTeam1Players([]);
        setTeam1Suggestions(localMatches);

        // If few local matches, search global
        if (localMatches.length < 3 && text.length > 2) {
          setIsSearchingGlobal1(true);
          const globalMatches = await searchAllTeams(text);
          setTeam1Suggestions(prev => {
            const combined = [...prev];
            globalMatches.forEach(gm => {
              if (!combined.some(c => c.id === gm.id) && gm.name !== team2Name) {
                combined.push(gm);
              }
            });
            return combined.slice(0, 5);
          });
          setIsSearchingGlobal1(false);
        }
      }
    } else {
      setTeam2Name(text);
      if (!text.trim()) {
        setTeam2Suggestions([]);
        return;
      }

      const localMatches = searchTeams(text, team1Name);
      const exactMatch = allMyTeams.find(t => t.name.toLowerCase() === text.trim().toLowerCase());

      if (exactMatch) {
        setTeam2Players(exactMatch.players);
        setTeam2Suggestions([]);
      } else {
        setTeam2Players([]);
        setTeam2Suggestions(localMatches);

        if (localMatches.length < 3 && text.length > 2) {
          setIsSearchingGlobal2(true);
          const globalMatches = await searchAllTeams(text);
          setTeam2Suggestions(prev => {
            const combined = [...prev];
            globalMatches.forEach(gm => {
              if (!combined.some(c => c.id === gm.id) && gm.name !== team1Name) {
                combined.push(gm);
              }
            });
            return combined.slice(0, 5);
          });
          setIsSearchingGlobal2(false);
        }
      }
    }
  };

  const handleContinue = () => {
    if (!team1Name.trim() || !team2Name.trim() || !overs.trim()) {
      Alert.alert('Configuration Error', 'Please complete the team identities and match length.');
      return;
    }

    const numOvers = parseInt(overs);
    if (isNaN(numOvers) || numOvers < 1) {
      Alert.alert('Configuration Error', 'Please enter a valid operational overs count.');
      return;
    }

    finalizeSetup(numOvers);
  };

  const finalizeSetup = (numOvers: number) => {
    try {
      startNewMatch();
      setTeams([
        { name: team1Name.trim(), players: team1Players || [] },
        { name: team2Name.trim(), players: team2Players || [] },
      ]);
      setTotalOvers(numOvers);

      // Navigate immediately
      router.replace('/players');
    } catch (error) {
      console.error("Finalization error:", error);
      Alert.alert("Setup Error", "Failed to initialize the match.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: '#fff', marginTop: 20, fontWeight: '700' }}>LOADING ROSTERS...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.simpleHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Match Setup</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Tournament Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Tournament Name</Text>
              <View style={styles.inputWrapper}>
                <Trophy size={18} color="rgba(255,255,255,0.2)" />
                <TextInput
                  style={styles.simpleInput}
                  value={tournamentName}
                  onChangeText={setTournamentName}
                  placeholder="e.g. World Championship"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
            </View>

            {/* Teams Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Team 1 (Your Roster)</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                {allMyTeams.map(team => {
                  const isSelectedForTeam2 = team.name === team2Name;
                  const isActive = team1Name === team.name;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamChip,
                        isActive && styles.activeChip,
                        isSelectedForTeam2 && styles.disabledChip
                      ]}
                      onPress={() => {
                        if (isSelectedForTeam2) return;
                        setTeam1Name(team.name);
                        setTeam1Players(team.players || []);
                      }}
                      disabled={isSelectedForTeam2}
                    >
                      <Users size={14} color={isActive ? '#000' : (isSelectedForTeam2 ? 'rgba(255,255,255,0.1)' : colors.accent)} />
                      <Text style={[
                        styles.teamChipText,
                        isActive && styles.activeChipText,
                        isSelectedForTeam2 && styles.disabledChipText
                      ]}>{team.name.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.inputWrapper}>
                <Users size={18} color={colors.accent} />
                <TextInput
                  style={styles.simpleInput}
                  value={team1Name}
                  onChangeText={(text) => handleTeamSearch(text, 1)}
                  placeholder="Search your teams..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              {team1Suggestions.length > 0 && (
                <View style={styles.simpleSuggestions}>
                  {team1Suggestions.map((team, idx) => (
                    <TouchableOpacity key={idx} style={styles.simpleSuggestionRow} onPress={() => {
                      setTeam1Name(team.name);
                      setTeam1Players(team.players || []);
                      setTeam1Suggestions([]);
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={styles.simpleSuggestionText}>{team.name}</Text>
                          <Text style={styles.suggestionSubtext}>{team.players.length} Players Registered</Text>
                        </View>
                        {allMyTeams.some(t => t.id === team.id) ? (
                          <View style={styles.personalBadge}><Text style={styles.badgeText}>MINE</Text></View>
                        ) : (
                          <View style={styles.globalBadge}><Text style={styles.badgeText}>GLOBAL</Text></View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Team 2 (Opponent)</Text>
              <View style={styles.inputWrapper}>
                <Users size={18} color="#38bdf8" />
                <TextInput
                  style={styles.simpleInput}
                  value={team2Name}
                  onChangeText={(text) => handleTeamSearch(text, 2)}
                  placeholder="Search or enter name..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              {team2Suggestions.length > 0 && (
                <View style={styles.simpleSuggestions}>
                  {team2Suggestions.map((team, idx) => (
                    <TouchableOpacity key={idx} style={styles.simpleSuggestionRow} onPress={() => {
                      setTeam2Name(team.name);
                      setTeam2Players(team.players || []);
                      setTeam2Suggestions([]);
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={styles.simpleSuggestionText}>{team.name}</Text>
                          <Text style={styles.suggestionSubtext}>{team.players.length} Players Registered</Text>
                        </View>
                        {allMyTeams.some(t => t.id === team.id) ? (
                          <View style={styles.personalBadge}><Text style={styles.badgeText}>MINE</Text></View>
                        ) : (
                          <View style={styles.globalBadge}><Text style={styles.badgeText}>GLOBAL</Text></View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Venue Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Ground / Venue</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={18} color="rgba(255,255,255,0.2)" />
                <TextInput
                  style={styles.simpleInput}
                  value={groundName}
                  onChangeText={(text) => {
                    setGroundName(text);
                    getGroundsByQuery(text);
                  }}
                  placeholder="Search registered grounds..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              {groundSuggestions.length > 0 && (
                <View style={styles.simpleSuggestions}>
                  {groundSuggestions.map((ground, idx) => (
                    <TouchableOpacity key={idx} style={styles.simpleSuggestionRow} onPress={() => {
                      setGroundName(ground.name);
                      setGroundSuggestions([]);
                    }}>
                      <View>
                        <Text style={styles.simpleSuggestionText}>{ground.name}</Text>
                        <Text style={styles.simpleSuggestionCity}>{ground.city}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Mechanics Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Match Overs</Text>
              <TextInput
                style={styles.simpleInputStandalone}
                value={overs}
                onChangeText={setOvers}
                placeholder="20"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            {/* Feature Toggles */}
            <View style={styles.togglesRow}>
              <TouchableOpacity
                style={[styles.simpleToggle, enableAnimations && styles.toggleActive]}
                onPress={() => setEnableAnimations(!enableAnimations)}
              >
                <Text style={[styles.toggleText, enableAnimations && { color: '#fff' }]}>Animations</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.simpleToggle, enableSounds && styles.toggleActive]}
                onPress={() => setEnableSounds(!enableSounds)}
              >
                <Text style={[styles.toggleText, enableSounds && { color: '#fff' }]}>Sounds</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.primaryBtn}
            onPress={handleContinue}
          >
            <Text style={styles.primaryBtnText}>CONTINUE TO PLAYERS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => router.push('/match-pairing')}
          >
            <Zap size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={styles.joinBtnText}>JOIN EXISTING MATCH</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  simpleHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, marginBottom: 32, gap: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  formContainer: { gap: 24 },
  inputSection: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  simpleInput: { flex: 1, height: 54, fontSize: 16, color: '#fff', marginLeft: 12 },
  simpleInputStandalone: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, height: 54, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  simpleSuggestions: { backgroundColor: '#1E293B', borderRadius: 12, marginTop: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...shadows.medium, zIndex: 1000 },
  personalBadge: { backgroundColor: 'rgba(52, 211, 153, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#34d399' },
  globalBadge: { backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#38bdf8' },
  badgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  simpleSuggestionRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  simpleSuggestionText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  suggestionSubtext: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  simpleSuggestionCity: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  togglesRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  simpleToggle: { flex: 1, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  toggleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  primaryBtn: { marginTop: 40, backgroundColor: colors.accent, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...shadows.medium, zIndex: 2000, elevation: 5, cursor: 'pointer' },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  joinBtn: { marginTop: 15, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(249, 205, 5, 0.3)', backgroundColor: 'rgba(249, 205, 5, 0.05)' },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: colors.accent, letterSpacing: 1 },
  suggestionsScroll: { marginBottom: 15, paddingVertical: 5 },
  teamChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
  activeChip: { backgroundColor: colors.accent, borderColor: colors.accent },
  teamChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  activeChipText: { color: '#000' },
  disabledChip: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.4,
  },
  disabledChipText: {
    color: 'rgba(255,255,255,0.1)',
  },
});
