import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Easing, Dimensions, BackHandler } from 'react-native';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from './theme';
import BroadcastTicker from './BroadcastTicker';
import { useRouter, usePathname } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { getCurrentPartnership } from '../store/partnershipUtils';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';
import OversModal from '../components/OversModal';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, RotateCcw, ArrowRightLeft, UserCircle2, Zap } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

export default function Scorecard() {
  const router = useRouter();
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Confirm Exit',
          'You cannot go back from this page. If you want to close match means press ok else cancel',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => { } },
            { text: 'OK', onPress: () => router.replace('/entryPage') }
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router])
  );
  const {
    teams,
    striker,
    nonStriker,
    currentBowler,
    battingTeam,
    bowlingTeam,
    ballHistory,
    currentInningsNumber,
    target,
    totalOvers,
    updateScore,
    undoLastBall,
    swapBatsmen,
    setStriker,
    setNonStriker,
    setCurrentBowler,
    startSecondInnings,
    awaitingSecondInningsStart,
    setAwaitingSecondInningsStart,
    oversData,
    previousStriker,
    setPreviousStriker,
    matchCompleted,
    batsmanToReplace
  } = useGameStore();

  const [showNewBowlerSelection, setShowNewBowlerSelection] = useState(false);
  const [showNewBatsmanSelection, setShowNewBatsmanSelection] = useState(false);
  const [showExtraRunsModal, setShowExtraRunsModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [extraType, setExtraType] = useState<'wide' | 'no-ball' | 'lb' | 'bye'>('wide');
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationText, setCelebrationText] = useState<string | null>(null);
  const [wicketAnimation, setWicketAnimation] = useState<{ type: 'golden' | 'duck' | 'normal', score: number, name: string } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const cheerBounceAnim = useRef(new Animated.Value(0)).current;
  const cheerRotateAnim = useRef(new Animated.Value(0)).current;
  const lastBallCountRef = useRef(ballHistory.length);

  const battingTeamObj = teams.find(team => team.name === battingTeam);
  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);

  const legalDeliveries = ballHistory.filter(ball =>
    !ball.isExtra || (ball.isExtra && (ball.extraType === 'bye' || ball.extraType === 'lb'))
  );

  const totalCompletedOvers = Math.floor(legalDeliveries.length / 6);
  const currentOver = legalDeliveries.length % 6;
  const totalScore = ballHistory.reduce((sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0), 0);
  const totalWickets = ballHistory.filter(ball => ball.isWicket).length;

  const runsNeeded = target !== null ? target - totalScore + 1 : null;
  const ballsRemaining = totalOvers * 6 - ballHistory.filter(ball => !ball.isExtra || (ball.isExtra && (ball.extraType !== 'bye' && ball.extraType !== 'lb'))).length;

  const currentRunRate = legalDeliveries.length > 0
    ? (totalScore / (legalDeliveries.length / 6)).toFixed(2)
    : '0.00';

  const projectedScore = legalDeliveries.length > 0
    ? Math.round((totalScore / (legalDeliveries.length / 6)) * totalOvers)
    : 0;

  const requiredRunRate = (currentInningsNumber === 2 && ballsRemaining > 0)
    ? ((runsNeeded! - 1) / (ballsRemaining / 6)).toFixed(2)
    : null;

  const partnership = getCurrentPartnership(ballHistory, striker, nonStriker);

  const getAvailableBatsmen = () => {
    return battingTeamObj?.players.filter(player =>
      player.status !== 'out' &&
      !player.isOut &&
      player.name !== striker?.name &&
      player.name !== nonStriker?.name
    ) || [];
  };

  const getCurrentOverBalls = () => {
    return oversData.find((e) => e.overNumber === totalCompletedOvers && e.innings === currentInningsNumber)?.deliveries ?? [];
  };

  useEffect(() => {
    if (matchCompleted && pathname === '/scorecard') {
      router.replace('/full-scorecard');
    }
  }, [matchCompleted, pathname]);

  useEffect(() => {
    const battingTeamPlayers = battingTeamObj?.players || [];
    const maxWickets = battingTeamPlayers.length - 1;
    const isInningsOver = (totalCompletedOvers >= totalOvers || totalWickets >= maxWickets);

    if (currentInningsNumber === 1 && isInningsOver && !awaitingSecondInningsStart) {
      setAwaitingSecondInningsStart(true);
      Alert.alert('Innings Over', 'First innings has ended. Ready to start second innings.');
    }

    // Over Completion Check (only if not innings over and not awaiting batsman)
    const isForward = ballHistory.length > lastBallCountRef.current;
    lastBallCountRef.current = ballHistory.length;

    if (!isForward) return;

    const lastBall = ballHistory[ballHistory.length - 1];
    const isLastBallLegal = lastBall && (!lastBall.isExtra || (lastBall.isExtra && (lastBall.extraType === 'bye' || lastBall.extraType === 'lb')));

    if (isLastBallLegal && legalDeliveries.length > 0 && legalDeliveries.length % 6 === 0 && !isInningsOver && !showNewBatsmanSelection) {
      setShowNewBowlerSelection(true);
    }
  }, [ballHistory.length, showNewBatsmanSelection]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playCelebrationSound = async (runs: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const soundSource = runs === 4
        ? require('../assets/audio/FOUR.mp3')
        : require('../assets/audio/SIX.mp3');

      const { sound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsAudioPlaying(true);

      // Start Cheerleader Animation Loop
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(cheerBounceAnim, { toValue: -20, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(cheerBounceAnim, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true })
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(cheerRotateAnim, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(cheerRotateAnim, { toValue: -1, duration: 500, easing: Easing.linear, useNativeDriver: true })
          ])
        )
      ]).start();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsAudioPlaying(false);
          cheerBounceAnim.setValue(0);
          cheerRotateAnim.setValue(0);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });

    } catch (error) {
      console.error('Error playing sound:', error);
      setIsAudioPlaying(false);
    }
  };

  const handleRun = (runs: number) => {
    if (!striker || !currentBowler) return;
    updateScore({ runs, isExtra: false, isNoBall: false, batsmanName: striker.name, bowlerName: currentBowler.name, isWicket: false });

    if (runs === 4 || runs === 6) {
      setCelebrationText(runs === 6 ? 'MASSIVE SIX!' : 'FANTASTIC FOUR!');
      setShowConfetti(true);
      playCelebrationSound(runs);

      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 3 }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true })
      ]).start(() => {
        setShowConfetti(false);
        setCelebrationText(null);
        scaleAnim.setValue(0);
        fadeAnim.setValue(1);
      });
      fadeAnim.setValue(1);
    }
  };

  const handleExtra = (type: 'wide' | 'no-ball' | 'lb' | 'bye') => {
    setExtraType(type);
    setShowExtraRunsModal(true);
  };

  const handleExtraRuns = (runs: number) => {
    if (!striker || !currentBowler) return;
    updateScore({ runs, isExtra: true, isNoBall: extraType === 'no-ball', extraType, batsmanName: striker.name, bowlerName: currentBowler.name, isWicket: false });
    setShowExtraRunsModal(false);
  };

  const handleWicket = () => {
    if (getAvailableBatsmen().length === 0) {
      Alert.alert('Innings Over', 'No more batsmen available');
      return;
    }
    setShowWicketModal(true);
  };

  const handleWicketConfirm = (wicketType: string, runOutBatsman?: string, runOutRuns?: number) => {
    if (!striker || !currentBowler) return;
    const outBatsman = runOutBatsman ?
      (runOutBatsman === striker.name ? striker : nonStriker) :
      striker;

    if (outBatsman) {
      const isGolden = (outBatsman.balls === 0 && (wicketType !== 'run-out')) || (outBatsman.balls === 1 && outBatsman.runs === 0);
      const isDuck = outBatsman.runs === 0;

      setWicketAnimation({
        type: isGolden ? 'golden' : (isDuck ? 'duck' : 'normal'),
        score: outBatsman.runs,
        name: outBatsman.name
      });

      Animated.sequence([
        Animated.timing(slideAnim, { toValue: width + 100, duration: 4000, easing: Easing.linear, useNativeDriver: true })
      ]).start(() => {
        setWicketAnimation(null);
        slideAnim.setValue(-200);
      });
    }

    updateScore({ runs: runOutRuns || 0, isExtra: false, isNoBall: false, batsmanName: runOutBatsman || striker.name, bowlerName: currentBowler.name, isWicket: true, wicketType: wicketType as any, runOutBatsman, runOutRuns });
    setShowWicketModal(false);
    setShowNewBatsmanSelection(true);
  };

  const selectNewBowler = (player: typeof currentBowler) => {
    if (player?.name === currentBowler?.name) {
      Alert.alert('Error', 'Same bowler cannot bowl consecutive overs');
      return;
    }
    if (player) setCurrentBowler(player);
    setShowNewBowlerSelection(false);
  };

  const selectNewBatsman = (player: typeof striker) => {
    if (!player) return;

    // Determine which end to replace
    const isReplacingNonStriker = batsmanToReplace === 'non-striker';
    const otherPlayer = isReplacingNonStriker ? striker : nonStriker;

    if (player.name === otherPlayer?.name) {
      Alert.alert('Error', `This batsman is already at the ${isReplacingNonStriker ? 'striker' : 'non-striker'} end`);
      return;
    }

    if (isReplacingNonStriker) {
      setNonStriker(player);
    } else {
      setPreviousStriker(striker);
      setStriker(player);
    }
    setShowNewBatsmanSelection(false);

    // After batsman is selected, check if we need a new bowler
    if (legalDeliveries.length > 0 && legalDeliveries.length % 6 === 0) {
      const battingTeamPlayers = battingTeamObj?.players || [];
      const maxWickets = battingTeamPlayers.length - 1;
      const isStillInnings = totalCompletedOvers < totalOvers && totalWickets < maxWickets;
      if (isStillInnings) {
        setShowNewBowlerSelection(true);
      }
    }
  };

  const startNewInnings = () => {
    startSecondInnings();
    router.replace('/select-players');
  };

  const renderAnimations = () => {
    return (
      <>
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
                {isAudioPlaying ? (
                  <View style={styles.cheerleaderContainer}>
                    {[1, 2, 3].map((_, i) => (
                      <Animated.Image
                        key={i}
                        source={require('../assets/images/cheerleader.png')}
                        style={[
                          styles.cheerImage,
                          {
                            transform: [
                              { translateY: cheerBounceAnim },
                              {
                                rotate: cheerRotateAnim.interpolate({
                                  inputRange: [-1, 1],
                                  outputRange: ['-15deg', '15deg']
                                })
                              },
                              { scaleX: i === 1 ? 1.2 : 1 }
                            ]
                          }
                        ]}
                        resizeMode="contain"
                      />
                    ))}
                  </View>
                ) : (
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
                )}
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
              <Text style={styles.duckEmoji}>
                {wicketAnimation.type === 'golden' ? '👑🦆' : (wicketAnimation.type === 'duck' ? '🦆' : '🚶')}
              </Text>
              <View style={styles.wicketInfoCard}>
                <Text style={styles.wicketInfoTitle}>
                  {wicketAnimation.type === 'golden' ? 'GOLDEN DUCK!' :
                    wicketAnimation.type === 'duck' ? 'OUT FOR DUCK!' : 'OUT!'}
                </Text>
                <Text style={styles.wicketInfoName}>{wicketAnimation.name}</Text>
                <Text style={styles.wicketInfoScore}>{wicketAnimation.score} Runs</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <View style={styles.safeArea}>
      <BroadcastTicker />

      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Scoreboard Header */}
        <LinearGradient
          colors={[colors.surface, '#111827']}
          style={styles.headerCard}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.teamNameText}>{battingTeam}</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.totalScoreText}>{totalScore}-{totalWickets}</Text>
                <Text style={styles.oversCountText}>({totalCompletedOvers}.{currentOver})</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.crrText}>CRR: {currentRunRate}</Text>
              {currentInningsNumber === 1 && projectedScore > 0 && (
                <Text style={styles.projScoreText}>PROJ: {projectedScore}</Text>
              )}
              {currentInningsNumber === 2 && requiredRunRate && (
                <Text style={styles.rrrText}>RRR: {requiredRunRate}</Text>
              )}
            </View>
          </View>

          {currentInningsNumber === 2 && target !== null && (
            <View style={styles.targetBanner}>
              <Text style={styles.targetBannerText}>
                Need {runsNeeded} runs in {ballsRemaining} balls
              </Text>
            </View>
          )}

          <View style={styles.headerSecondary}>
            <Text style={styles.partnershipText}>
              Partnership: <Text style={{ color: colors.accentSecondary }}>{partnership.runs} ({partnership.balls})</Text>
            </Text>
            <TouchableOpacity style={styles.miniBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.miniBtnText}>Overs</Text>
              <ChevronRight size={14} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={{ height: 4 }} />

        {/* Live Match Stats */}
        <View style={styles.matchStatsCard}>
          <View style={styles.statsBatting}>
            {[striker, nonStriker].map((player, idx) => (
              <View key={idx} style={[styles.playerRow, idx === 0 && styles.activePlayerBg]}>
                <View style={styles.playerNameCol}>
                  <Text style={[styles.playerLabel, player?.name === striker?.name && styles.strikerText]}>
                    {player?.name || 'Batsman'} {player?.name === striker?.name ? '*' : ''}
                  </Text>
                </View>
                <View style={styles.playerRunsCol}>
                  <Text style={styles.playerRunsText}>
                    {player?.runs || 0} <Text style={styles.playerBallsText}>({player?.balls || 0})</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsBowling}>
            <View style={styles.playerRow}>
              <View style={styles.playerNameCol}>
                <Text style={styles.bowlerLabel}>{currentBowler?.name || 'Bowler'} *</Text>
              </View>
              <View style={styles.playerRunsCol}>
                <Text style={styles.bowlerStatsText}>
                  {currentBowler?.wickets}-{currentBowler?.runsGiven}
                </Text>
                <Text style={styles.bowlerOversText}>
                  ({Math.floor((currentBowler?.ballsBowled || 0) / 6)}.{(currentBowler?.ballsBowled || 0) % 6})
                </Text>
              </View>
            </View>
            <Text style={styles.econText}>
              Econ: {currentBowler?.ballsBowled ? (currentBowler.runsGiven / (currentBowler.ballsBowled / 6)).toFixed(1) : '0.0'}
            </Text>
          </View>
        </View>

        {/* Recent Over */}
        <View style={styles.overStrip}>
          <Text style={styles.overStripTitle}>This Over:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ballsList}>
            {getCurrentOverBalls().map((ball, idx) => (
              <View key={idx} style={[
                styles.ballCircle,
                ball.isWicket && styles.wicketBall,
                (ball.runs === 4 || ball.runs === 6) && styles.boundaryBall,
                ball.isExtra && styles.extraBall
              ]}>
                <Text style={styles.ballCircleText}>
                  {ball.isWicket ? 'W' :
                    ball.isExtra ? (ball.extraType === 'wide' ? 'wd' : ball.extraType === 'no-ball' ? 'nb' : 'lb') :
                      ball.runs}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Controls Section */}
        {!showNewBowlerSelection && !showNewBatsmanSelection && !awaitingSecondInningsStart && !matchCompleted && (
          <View style={styles.controlsSection}>
            <View style={styles.runGrid}>
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <TouchableOpacity
                  key={runs}
                  style={[
                    styles.gridBtn,
                    (runs === 4 || runs === 6) && styles.boundaryGridBtn,
                    isAudioPlaying && styles.playerDisabled
                  ]}
                  onPress={() => handleRun(runs)}
                  disabled={isAudioPlaying}
                >
                  <Text style={styles.gridBtnText}>{runs}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.extraActionsRow}>
              {[
                { label: 'Wide', type: 'wide' },
                { label: 'NB', type: 'no-ball' },
                { label: 'LB', type: 'lb' },
                { label: 'Byes', type: 'bye' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.extraBtnNew, isAudioPlaying && styles.playerDisabled]}
                  onPress={() => handleExtra(item.type as any)}
                  disabled={isAudioPlaying}
                >
                  <Text style={styles.extraBtnNewText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.mainActionsRow}>
              <TouchableOpacity
                style={[styles.wicketBtnNew, isAudioPlaying && styles.playerDisabled]}
                onPress={handleWicket}
                disabled={isAudioPlaying}
              >
                <Text style={styles.wicketBtnNewText}>Wicket</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.actionIconBtn, isAudioPlaying && styles.playerDisabled]}
                  onPress={swapBatsmen}
                  disabled={isAudioPlaying}
                >
                  <ArrowRightLeft size={20} color={colors.textSecondary} />
                  <Text style={styles.actionIconText}>Swap</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconBtn, isAudioPlaying && styles.playerDisabled]}
                  onPress={undoLastBall}
                  disabled={isAudioPlaying}
                >
                  <RotateCcw size={20} color={colors.textSecondary} />
                  <Text style={styles.actionIconText}>Undo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.fullScorecardLink} onPress={() => router.push('/full-scorecard')}>
              <Text style={styles.fullScorecardLinkText}>View Full Scorecard</Text>
              <ChevronRight size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* Selection Screens */}
        {showNewBowlerSelection && !awaitingSecondInningsStart && (
          <View style={styles.selectionOverlay}>
            <Text style={styles.selectionHeading}>Next Bowler</Text>
            <ScrollView style={styles.selectionList}>
              {bowlingTeamObj?.players.map((player, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.playerSelectItem, player.name === currentBowler?.name && styles.playerDisabled]}
                  onPress={() => selectNewBowler(player)}
                  disabled={player.name === currentBowler?.name}
                >
                  <UserCircle2 size={24} color={player.name === currentBowler?.name ? colors.disabled : colors.accent} />
                  <Text style={styles.playerSelectName}>{player.name}</Text>
                  {player.name === currentBowler?.name && <Text style={styles.disabledTag}>Cannot bowl</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showNewBatsmanSelection && (
          <View style={styles.selectionOverlay}>
            <Text style={styles.selectionHeading}>New Batsman</Text>
            <ScrollView style={styles.selectionList}>
              {getAvailableBatsmen().map((player, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.playerSelectItem}
                  onPress={() => selectNewBatsman(player)}
                >
                  <UserCircle2 size={24} color={colors.accent} />
                  <Text style={styles.playerSelectName}>{player.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {currentInningsNumber === 1 && awaitingSecondInningsStart && (
          <View style={styles.inningsEndSection}>
            <TouchableOpacity style={styles.startInningsBtn} onPress={startNewInnings}>
              <Text style={styles.startInningsBtnText}>Start 2nd Innings</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ExtraRunsModal visible={showExtraRunsModal} onClose={() => setShowExtraRunsModal(false)} onSelectRuns={handleExtraRuns} extraType={extraType} />
      <OversModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      {striker && nonStriker && (
        <WicketModal
          visible={showWicketModal}
          onClose={() => setShowWicketModal(false)}
          onConfirm={handleWicketConfirm}
          strikerName={striker.name}
          nonStrikerName={nonStriker.name}
          outBatsmen={battingTeamObj?.players.filter(p => p.isOut || p.status === 'out').map(p => p.name) || []}
        />
      )}

      {renderAnimations()}
    </View>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerCard: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  teamNameText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  totalScoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  oversCountText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginLeft: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  crrText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  rrrText: {
    fontSize: 14,
    color: colors.accentWarn,
    fontWeight: '700',
    marginTop: 2,
  },
  projScoreText: {
    fontSize: 14,
    color: colors.accentYellow,
    fontWeight: '700',
    marginTop: 2,
  },
  targetBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  targetBannerText: {
    color: colors.accentSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  partnershipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  miniBtnText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  matchStatsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 4,
  },
  statsBatting: {
    flex: 1.2,
  },
  statsBowling: {
    flex: 1,
    paddingLeft: 12,
  },
  statsDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activePlayerBg: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  playerNameCol: {
    flex: 1,
  },
  playerRunsCol: {
    alignItems: 'flex-end',
  },
  playerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  strikerText: {
    color: colors.text,
    fontWeight: '700',
  },
  playerRunsText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  playerBallsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  bowlerLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  bowlerStatsText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  bowlerOversText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  econText: {
    fontSize: 11,
    color: colors.accentYellow,
    marginTop: 2,
    marginLeft: 8,
  },
  overStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  overStripTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginRight: 10,
  },
  ballsList: {
    paddingRight: 20,
  },
  ballCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 2,
  },
  ballCircleText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  wicketBall: {
    backgroundColor: colors.accentWarn,
    borderColor: colors.accentWarn,
  },
  boundaryBall: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  extraBall: {
    backgroundColor: colors.accentPurple,
    borderColor: colors.accentPurple,
  },
  controlsSection: {
    paddingHorizontal: 12,
    marginTop: 8,
  },
  runGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridBtn: {
    width: (width - 48) / 3,
    height: 54,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  boundaryGridBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  gridBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  extraActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  extraBtnNew: {
    flex: 1,
    height: 40,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  extraBtnNewText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  wicketBtnNew: {
    flex: 1,
    height: 56,
    backgroundColor: colors.accentWarn,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
  },
  wicketBtnNewText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIconBtn: {
    width: 56,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  fullScorecardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  fullScorecardLinkText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
    marginRight: 4,
  },
  selectionOverlay: {
    margin: 12,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 300,
  },
  selectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  selectionList: {
    flex: 1,
  },
  playerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerSelectName: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    fontWeight: '600',
  },
  playerDisabled: {
    opacity: 0.5,
  },
  disabledTag: {
    fontSize: 10,
    color: colors.accentWarn,
    marginLeft: 'auto',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inningsEndSection: {
    padding: 20,
    alignItems: 'center',
  },
  startInningsBtn: {
    width: '100%',
    height: 56,
    backgroundColor: colors.accent,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  startInningsBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: height * 0.25,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  cheerleaderContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 14, 26, 0.8)',
    padding: 20,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cheerImage: {
    width: 100,
    height: 140,
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    gap: 15,
    elevation: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  celebrationText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wicketAnimationContainer: {
    position: 'absolute',
    top: height * 0.45,
    height: 120,
    width: 300,
    zIndex: 1000,
  },
  duckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.accentWarn,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  duckEmoji: {
    fontSize: 50,
    marginRight: 15,
  },
  wicketInfoCard: {
    flex: 1,
  },
  wicketInfoTitle: {
    color: colors.accentWarn,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  wicketInfoName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  wicketInfoScore: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
