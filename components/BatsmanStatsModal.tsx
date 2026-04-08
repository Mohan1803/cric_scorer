import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, User, ChevronRight, Target } from 'lucide-react-native';
import { colors, shadows } from '../app/theme';
import WagonWheel from './WagonWheel';
import { BallRecord, Player } from '../store/gameStore';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  player: Player | null;
  ballHistory: BallRecord[];
}

const BatsmanStatsModal: React.FC<Props> = ({ visible, onClose, player, ballHistory }) => {
  if (!player) return null;

  const batsmanBalls = ballHistory.filter(b => b.batsmanId === player.id);
  const strikeRate = player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0';

  const renderBall = ({ item, index }: { item: BallRecord, index: number }) => {
    const isBoundary = item.runs === 4 || item.runs === 6;
    const isWicket = item.isWicket && (item.wicketType !== 'run-out' || item.runOutBatsmanId === player.id);

    return (
      <View style={styles.ballItem}>
        <View style={styles.ballLeft}>
          <View style={[
            styles.ballCircle,
            isBoundary && styles.boundaryBall,
            isWicket && styles.wicketBall,
            item.isExtra && styles.extraBall
          ]}>
            <Text style={styles.ballText}>
              {isWicket ? 'W' : item.isExtra ? item.extraType?.substring(0, 2).toUpperCase() : item.runs}
            </Text>
          </View>
          <View style={styles.ballInfo}>
            <Text style={styles.bowlerName}>vs {item.bowlerName}</Text>
            {item.commentary && (
              <Text style={styles.commentaryText} numberOfLines={1}>{item.commentary}</Text>
            )}
          </View>
        </View>
        <Text style={styles.overText}>Ball {index + 1}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={30} style={styles.overlay}>
        <View style={styles.modalContent}>
          <LinearGradient colors={['#0F1729', '#0B1120']} style={styles.gradient}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.playerInfo}>
                <View style={styles.avatar}>
                  <User color={colors.accent} size={24} />
                </View>
                <View>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerRole}>{player.role || 'Batsman'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Stats Summary */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{player.runs}</Text>
                  <Text style={styles.statLabel}>Runs</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{player.balls}</Text>
                  <Text style={styles.statLabel}>Balls</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{strikeRate}</Text>
                  <Text style={styles.statLabel}>SR</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{player.fours} / {player.sixes}</Text>
                  <Text style={styles.statLabel}>4s / 6s</Text>
                </View>
              </View>

              {/* Wagon Wheel Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Target color={colors.accent} size={20} />
                  <Text style={styles.sectionTitle}>Wagon Wheel</Text>
                </View>
                <View style={styles.wagonWheelContainer}>
                  <WagonWheel balls={batsmanBalls} isLeftHanded={player.battingHand === 'left'} />
                </View>
              </View>

              {/* Ball-by-Ball Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ChevronRight color={colors.accent} size={20} />
                  <Text style={styles.sectionTitle}>Ball-by-Ball Track</Text>
                </View>
                <View style={styles.ballList}>
                  {batsmanBalls.length > 0 ? (
                    batsmanBalls.map((ball, idx) => (
                      <React.Fragment key={idx}>
                        {renderBall({ item: ball, index: idx })}
                      </React.Fragment>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No balls faced yet</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: height * 0.9,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    ...shadows.large,
  },
  gradient: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  playerRole: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wagonWheelContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ballList: {
    gap: 12,
  },
  ballItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ballLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ballCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundaryBall: {
    backgroundColor: colors.accent,
  },
  wicketBall: {
    backgroundColor: '#EF4444',
  },
  extraBall: {
    backgroundColor: colors.accentSecondary,
  },
  ballText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  ballInfo: {
    flex: 1,
  },
  bowlerName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  commentaryText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  overText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});

export default BatsmanStatsModal;
