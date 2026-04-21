import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, Hash, Settings2, Shield, Search, MapPin, Award, Zap, ChevronLeft, Plus } from 'lucide-react-native';
import { useTeamLibraryStore } from '../store/teamLibraryStore';
import { Team } from '../store/gameStore';
import { groundService, FirebaseGround } from '../services/groundService';

export default function MatchSetup() {
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

  const { getTeamsByQuery } = useTeamLibraryStore();
  const [team1Suggestions, setTeam1Suggestions] = useState<Team[]>([]);
  const [team2Suggestions, setTeam2Suggestions] = useState<Team[]>([]);
  const [team1Players, setTeam1Players] = useState<any[]>([]);
  const [team2Players, setTeam2Players] = useState<any[]>([]);

  const [allGrounds, setAllGrounds] = useState<FirebaseGround[]>([]);
  const [groundSuggestions, setGroundSuggestions] = useState<FirebaseGround[]>([]);

  useEffect(() => {
    const fetchGrounds = async () => {
      try {
        const grounds = await groundService.getGrounds();
        setAllGrounds(grounds);
      } catch (error) {
        console.error("Error fetching grounds for setup:", error);
      }
    };
    fetchGrounds();
  }, []);

  const getGroundsByQuery = (query: string) => {
    if (!query) return [];
    return allGrounds.filter(g =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  };

  const handleContinue = () => {
    if (!team1Name.trim() || !team2Name.trim() || !overs.trim()) {
      Alert.alert('Configuration Error', 'Please complete the team identities and match length.');
      return;
    }

    if (team1Name.trim() === team2Name.trim()) {
      Alert.alert('Configuration Error', 'Team identities must be distinct.');
      return;
    }

    const numOvers = parseInt(overs);
    if (isNaN(numOvers) || numOvers < 1) {
      Alert.alert('Configuration Error', 'Please enter a valid operational overs count.');
      return;
    }

    // New Ground Logic
    if (groundName.trim()) {
      const exists = allGrounds.some(g => g.name.toLowerCase() === groundName.trim().toLowerCase());
      if (!exists) {
        Alert.alert(
          'Venue Not Found',
          `The ground "${groundName}" is not registered in the global directory. Record quality is better with verified venues.`,
          [
            { text: 'Register Now', onPress: () => router.push('/add-ground') },
            {
              text: 'Proceed Anyway',
              style: 'destructive',
              onPress: () => finalizeSetup(numOvers)
            }
          ]
        );
        return;
      }
    }

    finalizeSetup(numOvers);
  };

  const finalizeSetup = (numOvers: number) => {
    startNewMatch();
    setTeams([
      { name: team1Name, players: team1Players },
      { name: team2Name, players: team2Players },
    ]);
    setTotalOvers(numOvers);
    router.push('/players');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <TextInput
              style={styles.simpleInput}
              value={tournamentName}
              onChangeText={setTournamentName}
              placeholder="e.g. Dream 11 Series"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Teams Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Team 1 Name</Text>
            <TextInput
              style={styles.simpleInput}
              value={team1Name}
              onChangeText={(text) => {
                setTeam1Name(text);
                setTeam1Suggestions(getTeamsByQuery(text));
              }}
              placeholder="Search or enter team..."
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            {team1Suggestions.length > 0 && (
              <View style={styles.simpleSuggestions}>
                {team1Suggestions.map((team, idx) => (
                  <TouchableOpacity key={idx} style={styles.simpleSuggestionRow} onPress={() => {
                    setTeam1Name(team.name);
                    setTeam1Players(team.players);
                    setTeam1Suggestions([]);
                  }}>
                    <Text style={styles.simpleSuggestionText}>{team.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Team 2 Name</Text>
            <TextInput
              style={styles.simpleInput}
              value={team2Name}
              onChangeText={(text) => {
                setTeam2Name(text);
                setTeam2Suggestions(getTeamsByQuery(text));
              }}
              placeholder="Search or enter team..."
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            {team2Suggestions.length > 0 && (
              <View style={styles.simpleSuggestions}>
                {team2Suggestions.map((team, idx) => (
                  <TouchableOpacity key={idx} style={styles.simpleSuggestionRow} onPress={() => {
                    setTeam2Name(team.name);
                    setTeam2Players(team.players);
                    setTeam2Suggestions([]);
                  }}>
                    <Text style={styles.simpleSuggestionText}>{team.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Venue Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Ground / Venue</Text>
            <TextInput
              style={styles.simpleInput}
              value={groundName}
              onChangeText={(text) => {
                setGroundName(text);
                setGroundSuggestions(getGroundsByQuery(text));
              }}
              placeholder="Search registered grounds..."
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
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

            {groundName.length > 2 && groundSuggestions.length === 0 && !allGrounds.some(g => g.name.toLowerCase() === groundName.toLowerCase()) && (
              <TouchableOpacity
                style={styles.simpleRegisterLink}
                onPress={() => router.push('/add-ground')}
              >
                <Plus size={16} color={colors.accent} />
                <Text style={styles.simpleRegisterText}>New ground? Register here</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Mechanics Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Match Overs</Text>
            <TextInput
              style={styles.simpleInput}
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

            <TouchableOpacity
              style={[styles.simpleToggle, enableFieldMap && styles.toggleActive]}
              onPress={() => setEnableFieldMap(!enableFieldMap)}
            >
              <Text style={[styles.toggleText, enableFieldMap && { color: '#fff' }]}>Field Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.primaryBtn}
          onPress={handleContinue}
        >
          <Text style={styles.primaryBtnText}>START MATCH</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    marginBottom: 32,
    gap: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  formContainer: {
    gap: 24,
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  simpleInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  simpleSuggestions: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  simpleSuggestionRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  simpleSuggestionText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  simpleSuggestionCity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  simpleRegisterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingLeft: 4,
  },
  simpleRegisterText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  togglesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  simpleToggle: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  toggleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryBtn: {
    marginTop: 40,
    backgroundColor: colors.accent,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
});
