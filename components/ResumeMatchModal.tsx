import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, RotateCcw, Trophy, Users, Calendar } from 'lucide-react-native';
import { colors } from '../app/theme';

interface ResumeMatchModalProps {
  visible: boolean;
  onResume: () => void;
  onDiscard: () => void;
  team1Name: string;
  team2Name: string;
  score: string;
  overs: string;
  matchDate?: string;
}

const { width } = Dimensions.get('window');

export default function ResumeMatchModal({
  visible,
  onResume,
  onDiscard,
  team1Name,
  team2Name,
  score,
  overs,
  matchDate
}: ResumeMatchModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.centeredView}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalView}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
            style={styles.gradientBg}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Trophy size={28} color={colors.accent} />
              </View>
              <Text style={styles.title}>Unfinished Match</Text>
              <Text style={styles.subtitle}>You have a match in progress. Would you like to continue from where you left off?</Text>
            </View>

            <View style={styles.matchCard}>
              <View style={styles.teamsRow}>
                <View style={styles.teamInfo}>
                  <Users size={16} color={colors.textSecondary} />
                  <Text style={styles.teamName} numberOfLines={1}>{team1Name}</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.teamInfo}>
                  <Users size={16} color={colors.textSecondary} />
                  <Text style={styles.teamName} numberOfLines={1}>{team2Name}</Text>
                </View>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Score</Text>
                  <Text style={styles.statValue}>{score}</Text>
                </View>
                <View style={[styles.statBox, styles.statBorder]}>
                  <Text style={styles.statLabel}>Overs</Text>
                  <Text style={styles.statValue}>{overs}</Text>
                </View>
              </View>

              {matchDate && (
                <View style={styles.dateRow}>
                  <Calendar size={12} color={colors.textMuted} />
                  <Text style={styles.dateText}>{matchDate}</Text>
                </View>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={onDiscard}
                activeOpacity={0.7}
              >
                <RotateCcw size={18} color="#EF4444" />
                <Text style={styles.discardText}>Start New</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resumeButton}
                onPress={onResume}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resumeGradient}
                >
                  <Play size={18} color="#fff" fill="#fff" />
                  <Text style={styles.resumeText}>Resume Match</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientBg: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.2)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  vsText: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 12,
    marginHorizontal: 12,
    opacity: 0.8,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
  },
  statBox: {
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 30,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    opacity: 0.6,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  discardText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  resumeButton: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resumeGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  resumeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
