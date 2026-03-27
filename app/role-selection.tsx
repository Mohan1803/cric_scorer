import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Shield, ChevronLeft, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function RoleSelection() {
  const { teams, setTeams } = useGameStore();
  const [team1Roles, setTeam1Roles] = useState({
    captainId: teams[0]?.players.find(p => p.isCaptain)?.id || '',
    wicketKeeperId: teams[0]?.players.find(p => p.isWicketKeeper)?.id || '',
  });
  const [team2Roles, setTeam2Roles] = useState({
    captainId: teams[1]?.players.find(p => p.isCaptain)?.id || '',
    wicketKeeperId: teams[1]?.players.find(p => p.isWicketKeeper)?.id || '',
  });

  const handleToggle = (teamIndex: number, playerId: string, role: 'captain' | 'wicketKeeper') => {
    if (teamIndex === 0) {
      setTeam1Roles(prev => ({
        ...prev,
        [role === 'captain' ? 'captainId' : 'wicketKeeperId']: playerId
      }));
    } else {
      setTeam2Roles(prev => ({
        ...prev,
        [role === 'captain' ? 'captainId' : 'wicketKeeperId']: playerId
      }));
    }
  };

  const handleContinue = () => {
    if (!team1Roles.captainId || !team1Roles.wicketKeeperId || !team2Roles.captainId || !team2Roles.wicketKeeperId) {
      // Allow moving forward even if not selected if user wants, but better to alert
      // Actually, let's just update and move.
    }

    const updatedTeams = teams.map((team, idx) => {
      const roles = idx === 0 ? team1Roles : team2Roles;
      return {
        ...team,
        players: team.players.map(p => ({
          ...p,
          isCaptain: p.id === roles.captainId,
          isWicketKeeper: p.id === roles.wicketKeeperId,
        }))
      };
    });

    setTeams(updatedTeams);
    router.push('/toss');
  };

  const renderTeamSection = (teamIndex: number, roles: any) => {
    const team = teams[teamIndex];
    if (!team) return null;

    return (
      <View style={styles.teamSection}>
        <View style={styles.teamHeader}>
          <Text style={styles.teamName}>{team.name}</Text>
          <View style={styles.teamLine} />
        </View>

        <View style={styles.rolePickerContainer}>
          <View style={styles.roleRow}>
            <View style={styles.roleIconBox}>
                <Shield size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>Captain (C)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
                    {team.players.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            onPress={() => handleToggle(teamIndex, p.id, 'captain')}
                            style={[styles.playerChip, roles.captainId === p.id && styles.playerChipActive]}
                        >
                            <Text style={[styles.playerChipText, roles.captainId === p.id && styles.playerChipTextActive]}>
                                {p.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
          </View>

          <View style={[styles.roleRow, { marginTop: 20 }]}>
            <View style={styles.roleIconBox}>
                <User size={20} color={colors.accentSecondary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>Wicket Keeper (WK)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
                    {team.players.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            onPress={() => handleToggle(teamIndex, p.id, 'wicketKeeper')}
                            style={[styles.playerChip, roles.wicketKeeperId === p.id && styles.playerChipActiveSecondary]}
                        >
                            <Text style={[styles.playerChipText, roles.wicketKeeperId === p.id && styles.playerChipTextActive]}>
                                {p.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Role Selection</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introBox}>
            <Text style={styles.introText}>Assign leadership and keeping roles for both teams before starting the match.</Text>
        </View>

        {renderTeamSection(0, team1Roles)}
        {renderTeamSection(1, team2Roles)}

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <LinearGradient
            colors={[colors.accent, colors.accentAlt]}
            style={styles.continueGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueText}>Continue to Toss</Text>
            <CheckCircle2 size={20} color={colors.textDark} />
          </LinearGradient>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  introText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  teamSection: {
    marginBottom: 32,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  teamLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rolePickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  roleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerScroll: {
    flexDirection: 'row',
  },
  playerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  playerChipActiveSecondary: {
    backgroundColor: colors.accentSecondary,
    borderColor: colors.accentSecondary,
  },
  playerChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  playerChipTextActive: {
    color: colors.background,
    fontWeight: '800',
  },
  continueBtn: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.medium,
  },
  continueGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
