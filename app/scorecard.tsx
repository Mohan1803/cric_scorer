import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Easing, Dimensions, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, shadows } from './theme';
import { useRouter, usePathname, Stack } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { getCurrentPartnership } from '../store/partnershipUtils';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';
import OversModal from '../components/OversModal';
import FieldMapModal from '../components/FieldMapModal';
import ShotTypeModal from '../components/ShotTypeModal';
import BatsmanStatsModal from '../components/BatsmanStatsModal';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, RotateCcw, ArrowRightLeft, UserCircle2, Zap, MessageSquare } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

export default function Scorecard() {
  const router = useRouter();
  const pathname = usePathname();

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only show alert and prevent navigation if in restricted states
      if (awaitingSecondInningsStart || currentInningsNumber === 2) {
        e.preventDefault();
        Alert.alert(
          'Navigation Restricted',
          'You cannot go back during the innings transition or second innings. Please complete the match or use the home button to exit via a new match.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Hardware back press on Android
        return true; // We let beforeRemove handle the alert
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
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
    enableFieldMap,
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
    batsmanToReplace,
    showNewBowlerSelection,
    showNewBatsmanSelection,
    setShowNewBowlerSelection,
    setShowNewBatsmanSelection,
    enableAnimations,
    enableSounds,
  } = useGameStore();

  // Removed local selection states, now using store states

  const [showExtraRunsModal, setShowExtraRunsModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [extraType, setExtraType] = useState<'wide' | 'no-ball' | 'lb' | 'bye' | 'penalty'>('wide');
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationText, setCelebrationText] = useState('');
  const [scoreAnimation, setScoreAnimation] = useState<number | null>(null);
  const [wicketAnimation, setWicketAnimation] = useState<{ type: 'golden' | 'duck' | 'normal', score: number, name: string, dismissalDetail?: string } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showFieldMap, setShowFieldMap] = useState(false);
  const [showShotType, setShowShotType] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<any>(null);
  const [currentBallData, setCurrentBallData] = useState<{ runs: number, fieldPosition?: string, shotType?: string } | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const lastBallCountRef = useRef(ballHistory.length);

  const battingTeamObj = teams.find(team => team.name === battingTeam);
  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);

  const legalDeliveries = useMemo(() => ballHistory.filter(ball =>
    !ball.isExtra || (ball.isExtra && (ball.extraType === 'bye' || ball.extraType === 'lb' || ball.extraType === 'penalty'))
  ), [ballHistory]);

  const totalCompletedOvers = Math.floor(legalDeliveries.length / 6);
  const currentOver = legalDeliveries.length % 6;
  const totalScore = useMemo(() => ballHistory.reduce((sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0), 0), [ballHistory]);
  const totalWickets = useMemo(() => ballHistory.filter(ball => ball.isWicket).length, [ballHistory]);

  const runsNeeded = target !== null ? target - totalScore + 1 : null;
  const ballsRemaining = totalOvers * 6 - legalDeliveries.length;

  const currentRunRate = legalDeliveries.length > 0
    ? (totalScore / (legalDeliveries.length / 6)).toFixed(2)
    : '0.00';

  const projectedScore = legalDeliveries.length > 0
    ? Math.round((totalScore / (legalDeliveries.length / 6)) * totalOvers)
    : 0;

  const requiredRunRate = (currentInningsNumber === 2 && ballsRemaining > 0 && runsNeeded !== null)
    ? (Math.max(0, runsNeeded - 1) / (ballsRemaining / 6)).toFixed(2)
    : (currentInningsNumber === 2 && ballsRemaining === 0 && runsNeeded !== null && runsNeeded > 1) ? '∞' : null;

  const partnership = useMemo(() => getCurrentPartnership(ballHistory, striker, nonStriker), [ballHistory, striker?.id, nonStriker?.id]);

  const getAvailableBatsmen = () => {
    return battingTeamObj?.players.filter(player =>
      player.status !== 'out' &&
      !player.isOut &&
      player.id !== striker?.id &&
      player.id !== nonStriker?.id
    ) || [];
  };

  const getCurrentOverBalls = useCallback(() => {
    return oversData.find((e) => e.overNumber === totalCompletedOvers && e.innings === currentInningsNumber)?.deliveries ?? [];
  }, [oversData, totalCompletedOvers, currentInningsNumber]);

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
    const isLastBallLegal = lastBall && (!lastBall.isExtra || (lastBall.isExtra && (lastBall.extraType === 'bye' || lastBall.extraType === 'lb' || lastBall.extraType === 'penalty')));

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
    if (!enableSounds) return;
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

      // Sound is playing

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsAudioPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });

    } catch (error) {
      console.error('Error playing sound:', error);
      setIsAudioPlaying(false);
    }
  };

  const playWicketSound = async () => {
    if (!enableSounds) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/audio/Wicket.mp3'),
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsAudioPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsAudioPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.error('Error playing wicket sound:', error);
      setIsAudioPlaying(false);
    }
  };

  const handleRun = (runs: number) => {
    if (!striker || !currentBowler) return;

    if (runs > 0 && enableFieldMap) {
      setCurrentBallData({ runs });
      setShowFieldMap(true);
    } else {
      updateScore({
        runs,
        isExtra: false,
        isNoBall: false,
        batsmanName: striker.name,
        batsmanId: striker.id,
        bowlerName: currentBowler.name,
        bowlerId: currentBowler.id,
        isWicket: false,
        commentary: runs === 0 ? `${striker.name} plays a dot ball` : `${striker.name} scores ${runs} ${runs === 1 ? 'run' : 'runs'}`
      });

      // Trigger celebration if 4 or 6 and field map is disabled
      if (!enableFieldMap && (runs === 4 || runs === 6)) {
        setCelebrationText(runs === 6 ? 'MASSIVE SIX!' : 'FANTASTIC FOUR!');
        if (enableAnimations) {
          setShowConfetti(true);
          playCelebrationSound(runs);
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
        } else {
          setTimeout(() => setCelebrationText(''), 2000);
        }
      }
    }
  };

  const onFieldSelect = (position: string) => {
    if (currentBallData) {
      setCurrentBallData({ ...currentBallData, fieldPosition: position });
      setShowFieldMap(false);
      setShowShotType(true);
    }
  };

  const onShotSelect = (shot: string) => {
    if (currentBallData && striker && currentBowler) {
      const { runs, fieldPosition } = currentBallData;
      const displayField = fieldPosition || 'outfield';
      const commentary = `${striker.name} hits it for ${runs} ${runs === 1 ? 'run' : 'runs'} in the ${displayField.toLowerCase()} through ${shot.toLowerCase()} shot`;

      updateScore({
        runs,
        isExtra: false,
        isNoBall: false,
        batsmanName: striker.name,
        batsmanId: striker.id,
        bowlerName: currentBowler.name,
        bowlerId: currentBowler.id,
        isWicket: false,
        fieldPosition: displayField,
        shotType: shot,
        commentary
      });

      setShowShotType(false);
      const runsValue = currentBallData.runs;
      setCurrentBallData(null);

      // Trigger celebration if 4 or 6
      if (runsValue === 4 || runsValue === 6) {
        setCelebrationText(runsValue === 6 ? 'MASSIVE SIX!' : 'FANTASTIC FOUR!');

        if (enableAnimations) {
          setShowConfetti(true);
          playCelebrationSound(runsValue);

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
          fadeAnim.setValue(1);
        } else {
          playCelebrationSound(runsValue);
          setCelebrationText(runsValue === 6 ? 'MASSIVE SIX!' : 'FANTASTIC FOUR!');
          setTimeout(() => setCelebrationText(''), 2000);
        }
      }
    }
  };

  const handleExtra = (type: 'wide' | 'no-ball' | 'lb' | 'bye' | 'penalty') => {
    if (type === 'penalty') {
      if (!striker || !currentBowler) return;
      updateScore({ runs: 5, isExtra: true, isNoBall: false, extraType: 'penalty', batsmanName: striker.name, batsmanId: striker.id, bowlerName: currentBowler.name, bowlerId: currentBowler.id, isWicket: false });
      return;
    }
    setExtraType(type);
    setShowExtraRunsModal(true);
  };

  const handleExtraRuns = (runs: number) => {
    if (!striker || !currentBowler) return;
    updateScore({ runs, isExtra: true, isNoBall: extraType === 'no-ball', extraType, batsmanName: striker.name, batsmanId: striker.id, bowlerName: currentBowler.name, bowlerId: currentBowler.id, isWicket: false });
    setShowExtraRunsModal(false);
  };

  const handleWicket = () => {
    setShowWicketModal(true);
  };

  const handleWicketConfirm = (wicketType: string, runOutBatsman?: string, runOutBatsmanId?: string, runOutRuns?: number, fielderName?: string, fielderId?: string) => {
    if (!striker || !currentBowler) return;
    const outBatsman = runOutBatsmanId ?
      (runOutBatsmanId === striker.id ? striker : nonStriker) :
      striker;

    if (outBatsman) {
      const isGolden = (outBatsman.balls === 0 && (wicketType !== 'run-out')) || (outBatsman.balls === 1 && outBatsman.runs === 0);
      const isDuck = outBatsman.runs === 0;

      let detail = '';
      switch (wicketType) {
        case 'caught': detail = `c ${fielderName || 'Fielder'} b ${currentBowler.name}`; break;
        case 'bowled': detail = `b ${currentBowler.name}`; break;
        case 'lbw': detail = `lbw b ${currentBowler.name}`; break;
        case 'stumped': detail = `st ${fielderName || 'Fielder'} b ${currentBowler.name}`; break;
        case 'run-out': detail = `run out (${fielderName || ''})`; break;
        case 'caught-&-bowled':
        case 'caught-and-bowled': detail = `c&b ${currentBowler.name}`; break;
        case 'hit-wicket': detail = `hit wicket b ${currentBowler.name}`; break;
        default: detail = `b ${currentBowler.name}`;
      }

      setWicketAnimation({
        type: isGolden ? 'golden' : (isDuck ? 'duck' : 'normal'),
        score: outBatsman.runs,
        name: outBatsman.name,
        dismissalDetail: detail
      });

      playWicketSound();

      if (enableAnimations) {
        Animated.sequence([
          Animated.timing(slideAnim, { toValue: width + 100, duration: 4000, easing: Easing.linear, useNativeDriver: true })
        ]).start(() => {
          setWicketAnimation(null);
          slideAnim.setValue(-200);
        });
      } else {
        setTimeout(() => setWicketAnimation(null), 2000);
      }
    }

    updateScore({
      runs: runOutRuns || 0,
      isExtra: false,
      isNoBall: false,
      batsmanName: runOutBatsman || striker.name,
      batsmanId: runOutBatsmanId || striker.id,
      bowlerName: currentBowler.name,
      bowlerId: currentBowler.id,
      isWicket: true,
      wicketType: wicketType as any,
      runOutBatsman,
      runOutBatsmanId,
      runOutRuns,
      fielderName,
      fielderId
    });
    setShowWicketModal(false);

    // Only show selection if there are more batsmen to come in
    if (getAvailableBatsmen().length > 0) {
      setShowNewBatsmanSelection(true);
    }
  };

  const selectNewBowler = (player: typeof currentBowler) => {
    if (player?.id === currentBowler?.id) {
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

    if (player.id === otherPlayer?.id) {
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
              <Text style={styles.duckEmoji}>
                {wicketAnimation.type === 'golden' ? '👑🦆' : (wicketAnimation.type === 'duck' ? '🦆' : '🚶')}
              </Text>
              <View style={styles.wicketInfoCard}>
                <Text style={styles.wicketInfoTitle}>
                  {wicketAnimation.type === 'golden' ? 'GOLDEN DUCK!' :
                    wicketAnimation.type === 'duck' ? 'OUT FOR DUCK!' : 'OUT!'}
                </Text>
                <Text style={styles.wicketInfoName}>{wicketAnimation.name}</Text>
                {wicketAnimation.dismissalDetail && (
                  <Text style={styles.wicketInfoDismissal}>{wicketAnimation.dismissalDetail}</Text>
                )}
                <Text style={styles.wicketInfoScore}>{wicketAnimation.score} Runs</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Scoreboard Header */}
        <LinearGradient
          colors={[colors.accent, colors.surfaceDeeper]}
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
                <>
                  <Text style={styles.rrrText}>RRR: {requiredRunRate}</Text>
                </>
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
              <TouchableOpacity
                key={idx}
                style={[styles.playerRow, idx === 0 && styles.activePlayerBg]}
                onPress={() => {
                  if (player) {
                    setSelectedStatsPlayer(player);
                    setShowStatsModal(true);
                  }
                }}
              >
                <View style={styles.playerNameCol}>
                  <Text style={[styles.playerLabel, player?.id === striker?.id && styles.strikerText]}>
                    {player?.name || 'Batsman'}{player?.isCaptain ? ' (C)' : ''}{player?.isWicketKeeper ? ' (WK)' : ''} {player?.id === striker?.id ? '*' : ''}
                  </Text>
                  {player?.isOut && player?.dismissalDetail && (
                    <Text style={styles.dismissalTextSmall}>{player.dismissalDetail}</Text>
                  )}
                </View>
                <View style={styles.playerRunsCol}>
                  <Text style={styles.playerRunsText}>
                    {player?.runs || 0} <Text style={styles.playerBallsText}>({player?.balls || 0})</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsBowling}>
            <View style={styles.playerRow}>
              <View style={styles.playerNameCol}>
                <Text style={styles.bowlerLabel}>{currentBowler?.name || 'Bowler'}{currentBowler?.isCaptain ? ' (C)' : ''}{currentBowler?.isWicketKeeper ? ' (WK)' : ''} *</Text>
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
                    ball.isExtra ? (ball.extraType === 'wide' ? 'wd' : ball.extraType === 'no-ball' ? 'nb' : ball.extraType === 'penalty' ? 'pen' : 'lb') :
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
                { label: 'BYE', type: 'bye' },
                { label: 'PEN', type: 'penalty' },
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

            <View style={styles.bottomLinks}>
              <TouchableOpacity style={styles.fullScorecardLink} onPress={() => router.push('/commentary')}>
                <MessageSquare size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={styles.fullScorecardLinkText}>View Commentary</Text>
                <ChevronRight size={18} color={colors.accent} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.fullScorecardLink} onPress={() => router.push('/full-scorecard')}>
                <Text style={styles.fullScorecardLinkText}>View Full Scorecard</Text>
                <ChevronRight size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selection Screens */}
        {showNewBowlerSelection && !awaitingSecondInningsStart && (
          <View style={styles.selectionOverlay}>
            <Text style={styles.selectionHeading}>Next Bowler</Text>
            <ScrollView style={styles.selectionList}>
              {bowlingTeamObj?.players.map((player, idx) => (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerSelectItem, (player.id === currentBowler?.id || player.isWicketKeeper) && styles.playerDisabled]}
                  onPress={() => selectNewBowler(player)}
                  disabled={player.id === currentBowler?.id || player.isWicketKeeper}
                >
                  <UserCircle2 size={24} color={(player.id === currentBowler?.id || player.isWicketKeeper) ? colors.disabled : colors.accent} />
                  <View style={styles.playerSelectNameContainer}>
                    <View>
                      <Text style={styles.playerSelectName}>{player.name}</Text>
                      <Text style={styles.bowlerOversMini}>
                        {Math.floor(player.ballsBowled / 6)}.{player.ballsBowled % 6} Overs
                      </Text>
                    </View>
                    {player.isWicketKeeper ? (
                      <View style={[styles.miniStatusTag, styles.xiTag, { backgroundColor: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }]}>
                        <Text style={[styles.miniStatusTagText, { color: colors.accentSecondary }]}>WK</Text>
                      </View>
                    ) : player.isReserve ? (
                      <View style={[styles.miniStatusTag, styles.subTag]}>
                        <Text style={styles.miniStatusTagText}>SUB</Text>
                      </View>
                    ) : (
                      <View style={[styles.miniStatusTag, styles.xiTag]}>
                        <Text style={styles.miniStatusTagText}>XI</Text>
                      </View>
                    )}
                  </View>
                  {player.id === currentBowler?.id && <Text style={styles.disabledTag}>Prev Bowler</Text>}
                  {player.isWicketKeeper && <Text style={styles.disabledTag}>WK Cannot bowl</Text>}
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
                  key={player.id}
                  style={styles.playerSelectItem}
                  onPress={() => selectNewBatsman(player)}
                >
                  <UserCircle2 size={24} color={colors.accent} />
                  <View style={styles.playerSelectNameContainer}>
                    <Text style={styles.playerSelectName}>{player.name}</Text>
                    {player.isReserve ? (
                      <View style={[styles.miniStatusTag, styles.subTag]}>
                        <Text style={styles.miniStatusTagText}>SUB</Text>
                      </View>
                    ) : (
                      <View style={[styles.miniStatusTag, styles.xiTag]}>
                        <Text style={styles.miniStatusTagText}>XI</Text>
                      </View>
                    )}
                  </View>
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
          strikerId={striker.id}
          nonStrikerName={nonStriker.name}
          nonStrikerId={nonStriker.id}
          outBatsmen={battingTeamObj?.players.filter(p => p.isOut || p.status === 'out').map(p => p.name) || []}
          fielders={bowlingTeamObj?.players || []}
          wicketKeeper={bowlingTeamObj?.players.find(p => p.isWicketKeeper)}
        />
      )}

      {striker && (
        <>
          <FieldMapModal
            visible={showFieldMap}
            onClose={() => setShowFieldMap(false)}
            onSelect={onFieldSelect}
            batsmanName={striker.name}
            isLeftHanded={striker.battingHand === 'left'}
          />
          <ShotTypeModal
            visible={showShotType}
            onClose={() => setShowShotType(false)}
            onSelect={onShotSelect}
            batsmanName={striker.name}
          />
        </>
      )}

      <BatsmanStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        player={selectedStatsPlayer}
        ballHistory={currentInningsNumber === 1 ? ballHistory : [...useGameStore.getState().firstInningsBallHistory, ...ballHistory]}
      />

      {renderAnimations()}
    </SafeAreaView>
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
    margin: 12,
    padding: 16,
    borderRadius: 20,
    ...shadows.large,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.2)', // RCB Gold border
    borderBottomWidth: 3,
    borderBottomColor: colors.accentSecondary,
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
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
  },
  oversCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    fontWeight: '600',
    opacity: 0.8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  crrText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rrrText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  projScoreText: {
    fontSize: 14,
    color: '#FFFFFF',
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
    marginTop: 12,
    paddingTop: 8,
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
    backgroundColor: colors.surfaceDeeper,
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    ...shadows.small,
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
    paddingVertical: 4,
    paddingHorizontal: 6,
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
    color: colors.accent,
    fontWeight: '700',
  },
  dismissalTextSmall: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  playerRunsText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  playerBallsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  bowlerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bowlerStatsText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  bowlerOversText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ballCircleText: {
    color: colors.textPrimary,
    fontSize: 11,
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
    backgroundColor: colors.accentSecondary,
    borderColor: colors.accentSecondary,
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
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  boundaryGridBtn: {
    backgroundColor: 'rgba(225, 26, 34, 0.08)',
    borderColor: colors.accent,
    borderWidth: 1,
  },
  gridBtnText: {
    fontSize: 18,
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
    height: 36,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  extraBtnNewText: {
    fontSize: 11,
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
    height: 50,
    backgroundColor: colors.accentWarn,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    elevation: 4,
  },
  wicketBtnNewText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIconBtn: {
    width: 50,
    height: 50,
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
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flex: 1,
  },
  fullScorecardLinkText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '700',
    marginRight: 4,
  },
  bottomLinks: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 4,
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
    fontWeight: '600',
  },
  playerSelectNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  miniStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  xiTag: {
    backgroundColor: 'rgba(225, 26, 34, 0.1)',
    borderColor: 'rgba(225, 26, 34, 0.3)',
  },
  subTag: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  miniStatusTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.textSecondary,
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
  bowlerOversMini: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  wicketInfoDismissal: {
    fontSize: 14,
    color: colors.accentWarn,
    fontWeight: '700',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  wicketInfoScore: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
