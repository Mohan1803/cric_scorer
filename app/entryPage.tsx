import { useState, useEffect } from 'react';
import * as Print from 'expo-print';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, Hash, Settings2, Shield, Calendar, Zap, Search } from 'lucide-react-native';
import { useTeamLibraryStore } from '../store/teamLibraryStore';
import { Team } from '../store/gameStore';

export default function TeamEntry() {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [overs, setOvers] = useState('');
  const {
    setTeams,
    setTotalOvers,
    enableAnimations,
    enableSounds,
    setEnableAnimations,
    setEnableSounds,
    hasHydrated,
    matchCompleted,
    teams,
    startNewMatch
  } = useGameStore();

  // Removed resume logic - now handled in index.tsx



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
          <LinearGradient
            colors={[colors.accent, colors.accentAlt]}
            style={styles.iconBadge}
          >
            <Trophy size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Match Setup</Text>
          <Text style={styles.headerSubtitle}>Configure your match details below</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Settings2 size={20} color={colors.accent} />
            <Text style={styles.cardTitle}>Match Details</Text>
          </View>

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
              // placeholder="e.g. Royal Challengers"
              // placeholderTextColor="rgba(148, 163, 184, 0.4)"
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
              // placeholder="e.g. Mumbai Indians"
              // placeholderTextColor="rgba(148, 163, 184, 0.4)"
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

        <View style={[styles.card, { marginTop: 24, borderLeftWidth: 4, borderLeftColor: colors.accentAlt }]}>
          <View style={styles.cardHeader}>
            <Zap size={20} color={colors.accentAlt} />
            <Text style={styles.cardTitle}>LBW Visual Tracking</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
            Use DRS-style ball tracking to verify LBW decisions with video recording.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, { marginTop: 0 }]}
            onPress={() => router.push('/lbw-recorder' as any)}
          >
            <LinearGradient
              colors={[colors.accentAlt, '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Record LBW Video</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.demoRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.demoButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_out' } })}
            >
              <Text style={[styles.demoButtonText, { color: '#ef4444' }]}>Out Demo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.demoButton, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}
              onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_not_out' } })}
            >
              <Text style={[styles.demoButtonText, { color: '#22c55e' }]}>Not Out Demo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Shield size={16} color={colors.textSecondary} />
          <Text style={styles.footerText}>Secure scoring environment active</Text>
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
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  button: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  settingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
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
  demoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});