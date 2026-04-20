import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, Hash, Settings2, Shield, Search, MapPin, Award, Zap, ChevronLeft } from 'lucide-react-native';
import { useTeamLibraryStore } from '../store/teamLibraryStore';
import { Team } from '../store/gameStore';

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

  const handleContinue = () => {
    if (!team1Name.trim() || !team2Name.trim() || !overs.trim()) {
      Alert.alert('Error', 'Please enter both team names and number of overs');
      return;
    }

    if (team1Name.trim() === team2Name.trim()) {
      Alert.alert('Error', 'Team names must be different');
      return;
    }

    const numOvers = parseInt(overs);
    if (isNaN(numOvers) || numOvers < 1) {
      Alert.alert('Error', 'Please enter a valid number of overs');
      return;
    }

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Settings2 size={24} color={colors.accent} />
            <Text style={styles.headerTitle}>Match Setup</Text>
          </View>
          <Text style={styles.headerSubtitle}>Configure your match details below</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Team 1 Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={team1Name}
              onChangeText={(text) => {
                setTeam1Name(text);
                setTeam1Suggestions(getTeamsByQuery(text));
              }}
              onFocus={() => {
                if (team1Name) setTeam1Suggestions(getTeamsByQuery(team1Name));
              }}
              placeholder="e.g. Royal Challengers"
              placeholderTextColor="rgba(148, 163, 184, 0.4)"
              maxLength={30}
            />
            {team1Suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {team1Suggestions.map((team, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setTeam1Name(team.name);
                      setTeam1Players(team.players);
                      setTeam1Suggestions([]);
                    }}
                  >
                    <Users size={14} color={colors.accent} />
                    <Text style={styles.suggestionText}>{team.name}</Text>
                    <Text style={styles.suggestionSubtext}>{team.players.length} players</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Team 2 Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={team2Name}
              onChangeText={(text) => {
                setTeam2Name(text);
                setTeam2Suggestions(getTeamsByQuery(text));
              }}
              onFocus={() => {
                if (team2Name) setTeam2Suggestions(getTeamsByQuery(team2Name));
              }}
              placeholder="e.g. Mumbai Indians"
              placeholderTextColor="rgba(148, 163, 184, 0.4)"
              maxLength={30}
            />
            {team2Suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {team2Suggestions.map((team, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setTeam2Name(team.name);
                      setTeam2Players(team.players);
                      setTeam2Suggestions([]);
                    }}
                  >
                    <Users size={14} color={colors.accent} />
                    <Text style={styles.suggestionText}>{team.name}</Text>
                    <Text style={styles.suggestionSubtext}>{team.players.length} players</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Hash size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Number of Overs</Text>
            </View>
            <TextInput
              style={styles.input}
              value={overs}
              onChangeText={setOvers}
              placeholder="e.g. 20"
              placeholderTextColor="rgba(148, 163, 184, 0.4)"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MapPin size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Ground Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={groundName}
              onChangeText={setGroundName}
              placeholder="e.g. Lords Cricket Ground"
              placeholderTextColor="rgba(148, 163, 184, 0.4)"
              maxLength={40}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Award size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Tournament Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={tournamentName}
              onChangeText={setTournamentName}
              placeholder="e.g. World Cup 2024"
              placeholderTextColor="rgba(148, 163, 184, 0.4)"
              maxLength={40}
            />
          </View>

          <View style={styles.settingsRow}>
            <TouchableOpacity
              style={[styles.settingItem, !enableAnimations && styles.settingDisabled]}
              onPress={() => setEnableAnimations(!enableAnimations)}
            >
              <Zap size={16} color={enableAnimations ? colors.accent : colors.textMuted} />
              <Text style={[styles.settingText, !enableAnimations && { color: colors.textMuted }]}>Animations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, !enableSounds && styles.settingDisabled]}
              onPress={() => setEnableSounds(!enableSounds)}
            >
              <Shield size={16} color={enableSounds ? colors.accentSecondary : colors.textMuted} />
              <Text style={[styles.settingText, !enableSounds && { color: colors.textMuted }]}>Sounds</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, !enableFieldMap && styles.settingDisabled]}
              onPress={() => setEnableFieldMap(!enableFieldMap)}
            >
              <Search size={16} color={enableFieldMap ? colors.accentGold : colors.textMuted} />
              <Text style={[styles.settingText, !enableFieldMap && { color: colors.textMuted }]}>Field Map</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.button} onPress={handleContinue}>
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue to Players</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    padding: 24,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 30,
  },
  settingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(21, 42, 85, 0.95)',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionText: {
    color: colors.textPrimary,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  suggestionSubtext: {
    color: colors.textSecondary,
    fontSize: 10,
  },
});
