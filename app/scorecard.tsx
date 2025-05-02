import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Easing } from 'react-native';
import { colors } from './theme';
import BroadcastTicker from './BroadcastTicker';
import { useRouter, usePathname } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { getCurrentPartnership, getHighestPartnership } from '../store/partnershipUtils';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';
import OversModal from '../components/OversModal';

export default function Scorecard() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    teams,
    striker,
    nonStriker,
    currentBowler,
    battingTeam,
    bowlingTeam,
    ballHistory,
    currentInnings,
    currentInningsNumber,
    target,
    totalOvers,
    updateScore,
    undoLastBall,
    swapBatsmen,
    setStriker,
    setCurrentBowler,
    startSecondInnings,
    awaitingSecondInningsStart,
    setAwaitingSecondInningsStart,
    batsmanToReplace,
    oversData,
    previousStriker,
    setPreviousStriker,
    matchCompleted
  } = useGameStore();

  // --- Broadcast Studio Ticker ---
  // Place at the very top of the screen

  // ...rest of hooks
  const [showNewBowlerSelection, setShowNewBowlerSelection] = useState(false);
  const [showNewBatsmanSelection, setShowNewBatsmanSelection] = useState(false);
  const [showExtraRunsModal, setShowExtraRunsModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [extraType, setExtraType] = useState<'wide' | 'no-ball' | 'lb' | 'bye'>('wide');

  const battingTeamObj = teams.find(team => team.name === battingTeam);

  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);

  const legalDeliveries = ballHistory.filter(ball =>
    !ball.isExtra || (ball.isExtra && (ball.extraType === 'bye' || ball.extraType === 'lb'))
  );

  const totalCompletedOvers = Math.floor(legalDeliveries.length / 6);
  const currentOver = legalDeliveries.length % 6;
  const totalScore = ballHistory.reduce((sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0), 0);
  const totalWickets = ballHistory.filter(ball => ball.isWicket).length;

  const runsNeeded = target ? target - totalScore + 1 : null;
  const ballsRemaining = totalOvers * 6 - ballHistory.filter(ball => !ball.isExtra || (ball.isExtra && (ball.extraType !== 'bye' && ball.extraType !== 'lb'))).length;

  // Partnership calculation
  const partnership = getCurrentPartnership(ballHistory, striker, nonStriker);

  const [modalVisible, setModalVisible] = useState(false);

  const getAvailableBatsmen = () => {
    return battingTeamObj?.players.filter(player =>
      player.status !== 'out' &&
      player.status === "" &&
      player.name !== striker?.name &&
      player.name !== nonStriker?.name
    ) || [];
  };

  const getCurrentOverBalls = () => {
    const undoBatsmanSelection = () => {
      if (!previousStriker) return;

      setStriker(previousStriker);
      setPreviousStriker(null);
    };
    const allBalls = [...ballHistory].reverse();
    let currentOverBalls = oversData.find((e) => e.overNumber === totalCompletedOvers && e.innings === currentInningsNumber)?.deliveries ?? [];

    return currentOverBalls
  };

  useEffect(() => {
    // Redirect to full scorecard if match is completed
    if (matchCompleted && pathname === '/scorecard') {
      router.replace('/full-scorecard');
    }
  }, [matchCompleted, pathname]);

  useEffect(() => {
    const battingTeamPlayers = battingTeamObj?.players || [];
    const maxWickets = battingTeamPlayers.length - 1;
    console.log("STRIKER ", striker)
    const inningsShouldEnd =
      totalCompletedOvers >= totalOvers ||
      totalWickets >= maxWickets;

    if (currentInningsNumber === 1 && inningsShouldEnd && !awaitingSecondInningsStart) {
      setAwaitingSecondInningsStart(true);
      Alert.alert('Innings Over', 'First innings has ended. Ready to start second innings.');
      startNewInnings();
    }
  }, [ballHistory]);

  const handleRun = (runs: number) => {
    if (!striker || !currentBowler) return;

    updateScore({
      runs,
      isExtra: false,
      isNoBall: false,
      batsmanName: striker.name,
      bowlerName: currentBowler.name,
      isWicket: false
    });

    if (currentOver === 5 && !showNewBowlerSelection) {
      setShowNewBowlerSelection(true);
    }
  };

  const handleExtra = (type: 'wide' | 'no-ball' | 'lb' | 'bye') => {
    setExtraType(type);
    setShowExtraRunsModal(true);
  };

  const handleExtraRuns = (runs: number) => {
    if (!striker || !currentBowler) return;

    updateScore({
      runs,
      isExtra: true,
      isNoBall: extraType === 'no-ball',
      extraType,
      batsmanName: striker.name,
      bowlerName: currentBowler.name,
      isWicket: false
    });

    setShowExtraRunsModal(false);
  };

  const handleWicket = () => {
    const availableBatsmen = getAvailableBatsmen();

    if (availableBatsmen.length === 0) {
      Alert.alert('Innings Over', 'No more batsmen available');
      startNewInnings()
      return;
    }
    setShowWicketModal(true);
  };

  const handleWicketConfirm = (wicketType: string, runOutBatsman?: string, runOutRuns?: number) => {
    if (!striker || !currentBowler) return;

    updateScore({
      runs: runOutRuns || 0,
      isExtra: false,
      isNoBall: false,
      batsmanName: runOutBatsman || striker.name,
      bowlerName: currentBowler.name,
      isWicket: true,
      wicketType: wicketType as any,
      runOutBatsman,
      runOutRuns
    });

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

    if (player.name === nonStriker?.name) {
      Alert.alert('Error', 'This batsman is already at non-striker end');
      return;
    }

    if (player.status === 'out' || player.isOut) {
      Alert.alert('Error', 'This batsman is already out');
      return;
    }

    setPreviousStriker(striker);
    setStriker(player);
    setShowNewBatsmanSelection(false);
  };

  const undoBatsmanSelection = () => {
    if (!previousStriker) return;

    setStriker(previousStriker);
    setPreviousStriker(null);
  };

  const viewFullScorecard = () => {
    router.push('/full-scorecard');
  };

  const startNewInnings = () => {
    startSecondInnings();
    router.push('/select-players');
  };

  const currentRunRate = legalDeliveries.length > 0
    ? (totalScore / (legalDeliveries.length / 6)).toFixed(2)
    : '0.00';

  const projectedScore = legalDeliveries.length > 0
    ? Math.round((totalScore / (legalDeliveries.length / 6)) * totalOvers)
    : 0;

  const requiredRunRate = (currentInningsNumber === 2 && ballsRemaining > 0)
    ? ((runsNeeded! - 1) / (ballsRemaining / 6)).toFixed(2)
    : null;

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const partnershipRuns = (striker?.runs || 0) + (nonStriker?.runs || 0);
  return (
  <View style={{ flex: 1, backgroundColor: colors.background }}>
    <BroadcastTicker />
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={[styles.scoreHeader, { transform: [{ translateY: blinkAnim }] }]}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.scoreText}>
              {battingTeam} {totalScore}/{totalWickets}
            </Text>
            {striker && nonStriker && (
              <Text style={{ fontSize: 15, color: colors.accent, fontWeight: '600', marginVertical: 2 }}>
                Current Partnership: {partnership.runs} runs, {partnership.balls} balls
              </Text>
            )}
            {/* {(() => {
              const high = getHighestPartnership(ballHistory);
              return high && high.runs > 0 ? (
                <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 }}>
                  Highest Partnership: {high.runs} runs, {high.balls} balls
                  {high.batsmen[0] && high.batsmen[1] ? ` (${high.batsmen[0]} & ${high.batsmen[1]})` : ''}
                </Text>
              ) : null;
            })()} */}
            <Text style={styles.oversText}>
              Overs: {totalCompletedOvers}.{currentOver}
            </Text>
          </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.runRateText}>CRR: {currentRunRate}</Text>
                {requiredRunRate !== null && (
                  parseFloat(requiredRunRate) > parseFloat(currentRunRate) ? (
                    <Text
                      style={[
                        styles.runRateText,
                        styles.rrrWarning,
                        { opacity: blinkAnim }
                      ]}
                    >
                      RRR: {requiredRunRate}
                    </Text>
                  ) : (
                    <Text style={styles.runRateText}>RRR: {requiredRunRate}</Text>
                  )
                )}
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.runRateText}>Projected Score: {projectedScore}</Text>
              </View>
            </View>

            {currentInningsNumber === 2 && target && (
              <View style={styles.targetInfo}>
                <Text style={styles.targetText}>
                  Need {runsNeeded} runs from {ballsRemaining} balls
                </Text>
                <Text style={styles.targetText}>Target: {target + 1}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 }}>
              {!matchCompleted && (
                <TouchableOpacity style={styles.fullScorecardButton} onPress={viewFullScorecard}>
                  <Text style={styles.fullScorecardButtonText}>Scorecard</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.fullScorecardButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.fullScorecardButtonText}>Overs</Text>
              </TouchableOpacity>
            </View>

            <OversModal visible={modalVisible} onClose={() => setModalVisible(false)} />
          </View>
        </View>
       
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Batting</Text>
          {battingTeamObj?.players
            .filter(player =>
              player.name === striker?.name || player.name === nonStriker?.name
            )
            .map((player, index) => (
              <View key={index} style={styles.playerStats}>
                <View style={styles.playerInfo}>
                  <Text style={[
                    styles.playerName,
                    striker?.name === player.name && styles.strikerHighlight
                  ]}>
                    {player.name}
                    {player.name === striker?.name ? ' *' : ''}
                  </Text>
                  <Text style={styles.statText}>
                    {player.runs} ({player.balls})
                  </Text>
                </View>
                <Text style={styles.strikeRate}>
                  SR: {player.balls ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}
                </Text>
              </View>
            ))}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Bowling</Text>
          {bowlingTeamObj?.players
            .filter(player => player.ballsBowled > 0)
            .slice(0, 1)
            .map((player, index) => (
              <View key={index} style={styles.playerStats}>
                <View style={styles.playerInfo}>
                  <Text style={[
                    styles.playerName,
                    currentBowler?.name === player.name && styles.currentBowlerHighlight
                  ]}>
                    {player.name}
                    {currentBowler?.name === player.name ? ' *' : ''}
                  </Text>
                  <Text style={styles.statText}>
                    {player.wickets}-{player.runsGiven}
                    ({Math.floor(player.ballsBowled / 6)}.{player.ballsBowled % 6})
                  </Text>
                </View>
                <Text style={styles.economy}>
                  Econ: {player.ballsBowled
                    ? ((player.runsGiven / (player.ballsBowled / 6)) || 0).toFixed(1)
                    : '0.0'}
                </Text>
              </View>
            ))}
        </View>

        <View style={styles.currentOver}>
          <Text style={styles.sectionTitle}>This Over</Text>
          <View style={styles.ballsContainer}>
            {getCurrentOverBalls().map((ball, index) => (
              <View key={index} style={[
                styles.ball,
                ball.isWicket && styles.wicketBall,
                ball.runs === 4 && styles.fourBall,
                ball.runs === 6 && styles.sixBall,
                ball.isExtra && styles.extraBall
              ]}>
                <Text style={styles.ballText}>
                  {ball.isWicket ? 'W' + ball.runs :
                    ball.isExtra ?
                      (ball.extraType === 'wide' ? 'wd' + ball.runs :
                        ball.extraType === 'no-ball' ? 'nb' + ball.runs : ball.extraType === 'lb' ? 'lb' + ball.runs :
                          'b' + ball.runs) : + ball.runs}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {!showNewBowlerSelection && !showNewBatsmanSelection && (
          <View style={styles.controls}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <TouchableOpacity key={runs} style={styles.runButton} onPress={() => handleRun(runs)}>
                  <Text style={styles.runButtonText}>{runs}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.runButton, styles.wicketButton]} onPress={handleWicket}>
                <Text style={styles.runButtonText}>Wicket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('wide')}>
                <Text style={styles.runButtonText}>Wide</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.noBallButton]} onPress={() => handleExtra('no-ball')}>
                <Text style={styles.runButtonText}>No Ball</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('lb')}>
                <Text style={styles.runButtonText}>Leg Byes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('bye')}>
                <Text style={styles.runButtonText}>Byes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.undoButton]} onPress={() => {
                if (previousStriker) {
                  undoBatsmanSelection();
                } else {
                  undoLastBall();
                }
              }}>
                <Text style={styles.runButtonText}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.swapButton]} onPress={swapBatsmen}>
                <Text style={styles.runButtonText}>Swap</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showNewBowlerSelection && !awaitingSecondInningsStart && (
          <View style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>Select New Bowler</Text>
            {bowlingTeamObj?.players.map((player, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.selectionButton,
                  player.name === currentBowler?.name && styles.disabledButton
                ]}
                onPress={() => selectNewBowler(player)}
                disabled={player.name === currentBowler?.name}
              >
                <Text style={[
                  styles.selectionButtonText,
                  player.name === currentBowler?.name && styles.disabledButtonText
                ]}>
                  {player.name}
                  {player.name === currentBowler?.name ? ' (current)' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showNewBatsmanSelection && (
          <View style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>Select New Batsman</Text>
            {battingTeamObj?.players.map((player, index) => {
              const isOtherBatsman =
                batsmanToReplace === 'striker'
                  ? player.name === nonStriker?.name
                  : player.name === striker?.name;

              const isAvailable = player.status !== 'out' && !isOtherBatsman;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.selectionButton,
                    !isAvailable && styles.disabledButton
                  ]}
                  onPress={() => selectNewBatsman(player)}
                  disabled={!isAvailable}
                >
                  <Text
                    style={[
                      styles.selectionButtonText,
                      !isAvailable && styles.disabledButtonText
                    ]}
                  >
                    {player.name}
                    {player.name === striker?.name && batsmanToReplace !== 'striker'
                      ? ' (striker)'
                      : ''}
                    {player.name === nonStriker?.name && batsmanToReplace !== 'non-striker'
                      ? ' (non-striker)'
                      : ''}
                    {player.status === 'out' ? ' (out)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <ExtraRunsModal
          visible={showExtraRunsModal}
          onClose={() => setShowExtraRunsModal(false)}
          onSelectRuns={handleExtraRuns}
          extraType={extraType}
        />

        {striker && nonStriker && (
          <WicketModal
            visible={showWicketModal}
            onClose={() => setShowWicketModal(false)}
            onConfirm={handleWicketConfirm}
            strikerName={striker.name}
            nonStrikerName={nonStriker.name}
            outBatsmen={battingTeamObj?.players
              .filter(p => p.isOut || p.status === 'out')
              .map(p => p.name) || []}
          />
        )}

        {currentInningsNumber === 1 && totalCompletedOvers >= totalOvers && awaitingSecondInningsStart && (
          <TouchableOpacity style={styles.startInningsButton} onPress={startNewInnings}>
            <Text style={styles.startInningsButtonText}>Start Second Innings</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 8,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    width: '100%',
  },
  scoreHeader: {
    marginTop: 18,
    marginBottom: 18,
    marginHorizontal: 10,
    padding: 26,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderRadius: 26,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  oversText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 6,
    opacity: 0.9,
    fontWeight: '600',
  },
  runRateText: {
    fontSize: 16,
    color: colors.accent,
    marginTop: 8,
    opacity: 0.95,
    fontWeight: '600',
  },
  targetInfo: {
    marginTop: 18,
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 20,
  },
  targetText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
    opacity: 1,
  },
  fullScorecardButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 32,
    marginTop: 12,
    marginHorizontal: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fullScorecardButtonText: {
    color: colors.textDark,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 1.2,
    fontFamily: 'System',
  },
  statsContainer: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    marginBottom: 12,
    backgroundColor: 'transparent',
    marginHorizontal: 0,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 14,
    marginTop: 6,
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    padding: 16,
    backgroundColor: colors.cardAlt,
    borderRadius: 20,
    marginHorizontal: 8,
    marginVertical: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 260,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  strikerHighlight: {
    color: colors.accentAlt,
    fontWeight: 'bold',
  },
  currentBowlerHighlight: {
    color: colors.accentOrange,
    fontWeight: 'bold',
  },
  outBatsman: {
    color: '#F44336',
    textDecorationLine: 'line-through',
  },
  statText: {
    fontSize: 14,
    color: colors.textSecondary,
    opacity: 0.8,
    fontWeight: '500',
  },
  strikeRate: {
    fontSize: 14,
    color: '#4CAF50',
  },
  economy: {
    fontSize: 14,
    color: '#FF9800',
  },
  currentOver: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.card,
    marginHorizontal: 10,
    borderRadius: 14,
    marginBottom: 12,
    marginTop: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  ballsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: 10,
  },
  ball: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  ballText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: 'bold',
  },
  wicketBall: {
    backgroundColor: colors.accentWarn,
    borderColor: '#b71c1c',
  },
  fourBall: {
    backgroundColor: colors.accentAlt,
    borderColor: colors.accent,
  },
  sixBall: {
    backgroundColor: colors.accentYellow,
    borderColor: colors.accentOrange,
  },
  extraBall: {
    backgroundColor: colors.accentPurple,
    borderColor: colors.accent,
  },
  rrrWarning: {
    color: colors.accentWarn,
    fontWeight: 'bold',
  },
  startInningsButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 26,
    margin: 18,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  startInningsButtonText: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  runButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    marginHorizontal: 6,
    marginVertical: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  runButtonText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: 'System',
  },
  wicketButton: {
    backgroundColor: colors.accentWarn,
  },
  wideButton: {
    backgroundColor: colors.accentAlt,
  },
  noBallButton: {
    backgroundColor: colors.accentYellow,
  },
  undoButton: {
    backgroundColor: colors.accentPurple,
  },
  swapButton: {
    backgroundColor: colors.accent,
  },
  selectionContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 18,
    marginHorizontal: 10,
    marginTop: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  selectionButton: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionButtonText: {
    color: colors.textDark,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: colors.card,
    opacity: 0.4,
  },
  disabledButtonText: {
    color: colors.border,
  },
  controls: {
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 26,
    marginHorizontal: 10,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 18,
    elevation: 12,
  },
});
