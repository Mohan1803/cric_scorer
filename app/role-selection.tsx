import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Shield, ChevronLeft, CheckCircle2, Zap, QrCode } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function RoleSelection() {
  const { teams, setTeams } = useGameStore();
  const [showSyncModal, setShowSyncModal] = useState(false);
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
    setShowSyncModal(true);
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
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/players');
            }
          }}
          style={styles.backBtn}
        >
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

        <Pressable style={styles.continueBtn} onPress={handleContinue}>
          <LinearGradient
            colors={[colors.accent, colors.accentAlt]}
            style={styles.continueGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueText}>Continue to Toss</Text>
            <CheckCircle2 size={20} color={colors.textDark} />
          </LinearGradient>
        </Pressable>
      </ScrollView>

      {/* Sync Choice Modal - cross-platform replacement for Alert.alert */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSyncModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSyncModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>READY TO START?</Text>
            <Text style={styles.modalSubtitle}>
              Do you want to sync this match with the opposing captain before starting?
            </Text>

            <Pressable
              style={styles.modalOptionPrimary}
              onPress={() => {
                setShowSyncModal(false);
                router.push('/toss');
              }}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentAlt]}
                style={styles.modalOptionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Zap size={18} color={colors.textDark} />
                <Text style={styles.modalOptionPrimaryText}>Direct Start</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.modalOptionSecondary}
              onPress={() => {
                setShowSyncModal(false);
                router.push('/match-pairing');
              }}
            >
              <QrCode size={18} color={colors.accent} />
              <Text style={styles.modalOptionSecondaryText}>Sync & Start (QR/Tap)</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    fontSize: 16,
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
    fontSize: 14,
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
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
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
    fontSize: 12,
    color: colors.textSecondary,
  },
  playerChipTextActive: {
    color: colors.background,
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
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Sync Choice Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOptionPrimary: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  modalOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  modalOptionPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalOptionSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.3)',
    backgroundColor: 'rgba(249, 205, 5, 0.05)',
  },
  modalOptionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
