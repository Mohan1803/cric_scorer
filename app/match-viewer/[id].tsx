import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Trophy, MapPin, Award, Activity, Star, MessageSquare, Zap } from 'lucide-react-native';
import { colors, shadows } from '../theme';
import { getMatchDetails, listenToMatchDetails } from '../../services/matchSyncService';
import BatsmanStatsModal from '../../components/BatsmanStatsModal';
import { useFollowStore } from '../../store/followStore';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');


export default function MatchViewer() {
  const { id } = useLocalSearchParams();
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<any>(null);
  const { toggleFollow, followedPlayers } = useFollowStore();


  const [lastProcessedBallCount, setLastProcessedBallCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationText, setCelebrationText] = useState('');
  const [wicketAnimation, setWicketAnimation] = useState<any>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (typeof id === 'string') {
      unsubscribe = listenToMatchDetails(id, (data) => {
        if (data) {
          // Detect new balls for animations
          const currentBalls = data.ballHistory || [];
          if (currentBalls.length > lastProcessedBallCount && lastProcessedBallCount > 0) {
            const lastBall = currentBalls[currentBalls.length - 1];

            if (lastBall.runs === 4 || lastBall.runs === 6) {
              setCelebrationText(lastBall.runs === 6 ? 'MASSIVE SIX!' : 'FANTASTIC FOUR!');
              setShowConfetti(true);
              Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 3 }),
                Animated.delay(2000),
                Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true })
              ]).start(() => {
                setShowConfetti(false);
                setCelebrationText('');
                scaleAnim.setValue(0);
                fadeAnim.setValue(1);
              });
            } else if (lastBall.isWicket) {
              setWicketAnimation({
                name: lastBall.batsmanName,
                dismissalDetail: lastBall.dismissalDetail,
                score: lastBall.runs
              });
              Animated.sequence([
                Animated.timing(slideAnim, { toValue: width + 100, duration: 4000, easing: Easing.linear, useNativeDriver: true })
              ]).start(() => {
                setWicketAnimation(null);
                slideAnim.setValue(-200);
              });
            }
          }
          setLastProcessedBallCount(currentBalls.length);
          setMatchData(data);
          setLoading(false);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, lastProcessedBallCount]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading scorecard...</Text>
      </SafeAreaView>
    );
  }

  if (!matchData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Match not found or not yet synced.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { teams, ballHistory, firstInningsBallHistory, matchResult, groundName, tournamentName, currentInningsNumber } = matchData;

  const renderInnings = (
    inningsBallHistory: any[],
    inningsLabel: string
  ) => {
    if (!inningsBallHistory || inningsBallHistory.length === 0) return null;

    // Identify teams
    const firstBall = inningsBallHistory[0];
    const battingTeamObj = teams.find((t: any) =>
      t.players.some((p: any) => p.id === firstBall.batsmanId)
    ) || teams[0];
    const bowlingTeamObj = teams.find((t: any) => t.name !== battingTeamObj.name) || teams[1];

    const totalScore = inningsBallHistory.reduce(
      (sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0),
      0
    );
    const wicketsCount = inningsBallHistory.filter(ball => ball.isWicket).length;
    const legalBalls = inningsBallHistory.filter(ball => !ball.isExtra).length;

    // Derive orders
    const battingOrderIds: string[] = [];
    const bowlingOrderIds: string[] = [];

    inningsBallHistory.forEach(b => {
      if (b.batsmanId && !battingOrderIds.includes(b.batsmanId)) battingOrderIds.push(b.batsmanId);
      if (b.nonStrikerId && !battingOrderIds.includes(b.nonStrikerId)) battingOrderIds.push(b.nonStrikerId);
      if (b.bowlerId && !bowlingOrderIds.includes(b.bowlerId)) bowlingOrderIds.push(b.bowlerId);
    });

    const batters = battingOrderIds.map(id => battingTeamObj.players.find((p: any) => p.id === id)).filter(Boolean);
    const bowlers = bowlingOrderIds.map(id => bowlingTeamObj.players.find((p: any) => p.id === id)).filter(Boolean);

    return (
      <View style={styles.inningsSection}>
        <LinearGradient
          colors={[colors.surface, colors.surfaceDeeper]}
          style={styles.inningsHeader}
        >
          <View>
            <Text style={styles.inningsTitle}>{inningsLabel}</Text>
            <Text style={styles.teamNameText}>{battingTeamObj.name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.scoreText}>{totalScore}/{wicketsCount}</Text>
            <Text style={styles.oversText}>{Math.floor(legalBalls / 6)}.{legalBalls % 6} Overs</Text>
          </View>
        </LinearGradient>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { flex: 2 }]}>Batter</Text>
            <Text style={styles.columnHeader}>R</Text>
            <Text style={styles.columnHeader}>B</Text>
            <Text style={styles.columnHeader}>4s</Text>
            <Text style={styles.columnHeader}>6s</Text>
          </View>
          {batters.map((p: any, index: number) => {
            const isFollowing = followedPlayers.includes(p.name);
            return (
              <View key={p.id || `p-${index}`} style={styles.tableRow}>
                <View style={[styles.playerNameContainer, { flex: 2 }]}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  <TouchableOpacity onPress={() => toggleFollow(p.name)} style={styles.inlineFollowBtn}>
                    <Star
                      size={14}
                      color={isFollowing ? colors.accentGold : colors.textSecondary}
                      fill={isFollowing ? colors.accentGold : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.playerStat}>{p.runs}</Text>
                <Text style={styles.playerStat}>{p.balls}</Text>
                <Text style={styles.playerStat}>{p.fours}</Text>
                <Text style={styles.playerStat}>{p.sixes}</Text>
              </View>
            );
          })}

        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { flex: 2, textAlign: 'left', paddingLeft: 5 }]}>Bowler ({bowlingTeamObj.name})</Text>
            <Text style={styles.columnHeader}>O</Text>
            <Text style={styles.columnHeader}>R</Text>
            <Text style={styles.columnHeader}>W</Text>
            <Text style={styles.columnHeader}>Econ</Text>
          </View>
          {bowlers.map((p: any, index: number) => {
            const isFollowing = followedPlayers.includes(p.name);
            const overs = Math.floor(p.ballsBowled / 6);
            const balls = p.ballsBowled % 6;
            const econ = p.ballsBowled > 0 ? (p.runsGiven / (p.ballsBowled / 6)).toFixed(1) : '0.0';
            return (
              <View key={p.id || `b-${index}`} style={styles.tableRow}>
                <View style={[styles.playerNameContainer, { flex: 2 }]}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  <TouchableOpacity onPress={() => toggleFollow(p.name)} style={styles.inlineFollowBtn}>
                    <Star
                      size={14}
                      color={isFollowing ? colors.accentGold : colors.textSecondary}
                      fill={isFollowing ? colors.accentGold : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.playerStat}>{overs}.{balls}</Text>
                <Text style={styles.playerStat}>{p.runsGiven}</Text>
                <Text style={styles.playerStat}>{p.wickets}</Text>
                <Text style={styles.playerStat}>{econ}</Text>
              </View>
            );
          })}

        </View>
      </View>
    );
  };

  const renderCommentary = () => {
    if (!ballHistory || ballHistory.length === 0) return null;

    // Process ball history into reverse chronological order
    const processedBalls = [...ballHistory].reverse().slice(0, 10); // Show last 10 balls

    return (
      <View style={styles.commentarySection}>
        <View style={styles.sectionHeader}>
          <MessageSquare size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Recent Commentary</Text>
        </View>

        {processedBalls.map((ball: any, index: number) => {
          let desc = ball.commentary;
          if (!desc) {
            desc = `${ball.batsmanName} scores ${ball.runs} runs off ${ball.bowlerName}`;
            if (ball.isWicket) desc = `${ball.batsmanName} is OUT! ${ball.dismissalDetail || ''}`;
            if (ball.isExtra) {
              desc = `${ball.bowlerName} bowls a ${ball.extraType}. ${ball.runs > 0 ? ball.runs + ' runs taken' : ''}`;
            }
          }

          return (
            <View key={index} style={styles.commentaryCard}>
              <View style={styles.commentaryMeta}>
                <View style={[
                  styles.commentaryBadge,
                  ball.isWicket && styles.wicketBadge,
                  (ball.runs === 4 || ball.runs === 6) && styles.boundaryBadge,
                  ball.isExtra && styles.extraBadge
                ]}>
                  <Text style={styles.commentaryBadgeText}>
                    {ball.isWicket ? 'W' : ball.isExtra ? ball.extraType?.substring(0, 2).toUpperCase() : ball.runs}
                  </Text>
                </View>
              </View>
              <View style={styles.commentaryContent}>
                <Text style={styles.commentaryText}>{desc}</Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.viewFullCommentaryBtn}
          onPress={() => router.push('/commentary')}
        >
          <Text style={styles.viewFullCommentaryText}>View Full Commentary</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.fixedHeader}>
        <TouchableOpacity style={styles.backButtonCircle} onPress={handleBack}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Match Archive</Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSubtitle}>{tournamentName || 'Local Match'}</Text>
            {matchData.status === 'live' && (
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.liveLabel}>LIVE</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.venueCard}>
          <View style={styles.venueItem}>
            <MapPin size={16} color={colors.accentGold} />
            <Text style={styles.venueText}>{groundName || 'Unknown Ground'}</Text>
          </View>
        </View>

        {matchResult && (
          <View style={styles.resultBanner}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.05)']}
              style={styles.resultGradient}
            >
              <Trophy size={20} color={colors.accentGold} />
              <Text style={styles.resultValue}>{matchResult}</Text>
            </LinearGradient>
          </View>
        )}

        {renderInnings(firstInningsBallHistory, '1st Innings')}
        {renderInnings(ballHistory, '2nd Innings')}
        {renderCommentary()}
      </ScrollView>

      {/* Animations */}
      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            count={200}
            origin={{ x: width / 2, y: -20 }}
            fadeOut={true}
            fallSpeed={3000}
          />
          {celebrationText && (
            <View style={styles.celebrationOverlay}>
              <Animated.View style={[
                { transform: [{ scale: scaleAnim }], opacity: fadeAnim }
              ]}>
                <LinearGradient
                  colors={[colors.accent, colors.accentSecondary]}
                  style={styles.celebrationBadge}
                >
                  <Zap color="#fff" size={32} />
                  <Text style={styles.celebrationText}>{celebrationText}</Text>
                </LinearGradient>
              </Animated.View>
            </View>
          )}
        </View>
      )}

      {wicketAnimation && (
        <Animated.View style={[
          styles.wicketAnimationContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}>
          <View style={styles.duckContainer}>
            <Text style={styles.duckEmoji}>🚶</Text>
            <View style={styles.wicketInfoCard}>
              <Text style={styles.wicketInfoTitle}>OUT!</Text>
              <Text style={styles.wicketInfoName}>{wicketAnimation.name}</Text>
              {wicketAnimation.dismissalDetail && (
                <Text style={styles.wicketInfoDismissal}>{wicketAnimation.dismissalDetail}</Text>
              )}
              <Text style={styles.wicketInfoScore}>{wicketAnimation.score} Runs</Text>
            </View>
          </View>
        </Animated.View>
      )}

      <BatsmanStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        player={selectedStatsPlayer}
        ballHistory={[...(firstInningsBallHistory || []), ...(ballHistory || [])]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.accentGold,
    fontWeight: '600',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveLabel: {
    color: '#ef4444',
    fontSize: 8,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 20,
  },
  venueCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  venueText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  resultBanner: {
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  resultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  resultValue: {
    color: colors.accentGold,
    fontSize: 16,
    fontWeight: '800',
  },
  inningsSection: {
    marginBottom: 30,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  inningsTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  teamNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  oversText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  table: {
    padding: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  columnHeader: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  playerName: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 5,
  },
  inlineFollowBtn: {
    padding: 2,
  },
  playerStat: {

    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentarySection: {
    marginTop: 20,
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  commentaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  commentaryMeta: {
    marginRight: 12,
  },
  commentaryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentaryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  boundaryBadge: {
    backgroundColor: colors.accent,
  },
  wicketBadge: {
    backgroundColor: colors.accentWarn,
  },
  extraBadge: {
    backgroundColor: colors.accentGold,
  },
  commentaryContent: {
    flex: 1,
    justifyContent: 'center',
  },
  commentaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  viewFullCommentaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  viewFullCommentaryText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  celebrationBadge: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    ...shadows.large,
  },
  celebrationText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  wicketAnimationContainer: {
    position: 'absolute',
    top: 150,
    left: -200,
    zIndex: 1000,
  },
  duckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accentWarn,
    ...shadows.large,
  },
  duckEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  wicketInfoCard: {
    gap: 2,
  },
  wicketInfoTitle: {
    color: colors.accentWarn,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  wicketInfoName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  wicketInfoDismissal: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  wicketInfoScore: {
    color: colors.accentGold,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  }
});
