import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';
import OversModal from '@/components/OversModal';
import { Animated } from 'react-native';

export default function Scorecard() {
  const {
    teams,
    striker,
    nonStriker,
    currentBowler,
    battingTeam,
    bowlingTeam,
    ballHistory,
    currentInnings,
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
    oversData
  } = useGameStore();

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


  const [modalVisible, setModalVisible] = useState(false);

  // Get available batsmen (not out and not currently batting)
  const getAvailableBatsmen = () => {
    return battingTeamObj?.players.filter(player =>
      player.status !== 'out' &&
      player.status === "" &&
      player.name !== striker?.name &&
      player.name !== nonStriker?.name
    ) || [];
  };

  const getCurrentOverBalls = () => {
    const allBalls = [...ballHistory].reverse();
    let currentOverBalls = oversData.find((e) => e.overNumber === totalCompletedOvers && e.innings === currentInnings)?.deliveries ?? [];



    // for (const ball of allBalls) {

    //   if (currentOverBalls.length < 6 || (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball'))) {
    //     currentOverBalls.push(ball);
    //   } else {
    //     break;
    //   }
    // }

    return currentOverBalls
  };

  useEffect(() => {
    const battingTeamPlayers = battingTeamObj?.players || [];
    const maxWickets = battingTeamPlayers.length - 1;
    console.log("STRIKER ", striker)
    const inningsShouldEnd =
      totalCompletedOvers >= totalOvers ||
      totalWickets >= maxWickets;

    if (currentInnings === 1 && inningsShouldEnd && !awaitingSecondInningsStart) {
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
      isNoBall: false, // ✅ Add this
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
      isNoBall: extraType === 'no-ball', // ✅ Set based on type
      extraType,
      batsmanName: striker.name,
      bowlerName: currentBowler.name,
      isWicket: false
    });

    setShowExtraRunsModal(false);
  };

  const handleWicket = () => {
    // Check if there are any available batsmen before showing wicket modal
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
      isNoBall: false, // ✅ Add this
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

    // Check if player is already batting
    if (player.name === nonStriker?.name) {
      Alert.alert('Error', 'This batsman is already at non-striker end');
      return;
    }

    // Check if player is out
    if (player.status === 'out' || player.isOut) {
      Alert.alert('Error', 'This batsman is already out');
      return;
    }

    setStriker(player);
    setShowNewBatsmanSelection(false);
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

  const requiredRunRate = (currentInnings === 2 && ballsRemaining > 0)
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
    <>
      <View>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreText}>
            {battingTeam} {totalScore}/{totalWickets}
          </Text>
          <Text style={styles.oversText}>
            Overs: {totalCompletedOvers}.{currentOver}
          </Text>

          <Text style={styles.runRateText}>CRR: {currentRunRate}</Text>
          {requiredRunRate !== null && (
            parseFloat(requiredRunRate) > parseFloat(currentRunRate) ? (
              <Animated.Text
                style={[
                  styles.runRateText,
                  styles.rrrWarning,
                  { opacity: blinkAnim }
                ]}
              >
                RRR: {requiredRunRate}
              </Animated.Text>
            ) : (
              <Text style={styles.runRateText}>RRR: {requiredRunRate}</Text>
            )
          )}
          <Text style={styles.runRateText}>Projected Score: {projectedScore}</Text>


          {currentInnings === 2 && target && (
            <View style={styles.targetInfo}>
              <Text style={styles.targetText}>
                Need {runsNeeded} runs from {ballsRemaining} balls
              </Text>
              <Text style={styles.targetText}>Target: {target + 1}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.fullScorecardButton} onPress={viewFullScorecard}>
            <Text style={styles.fullScorecardButtonText}>View Full Scorecard</Text>
          </TouchableOpacity>


          <TouchableOpacity style={styles.fullScorecardButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.fullScorecardButtonText}>View Overs</Text>
          </TouchableOpacity>

          <OversModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        </View>
      </View>
      <ScrollView style={styles.container}>




        {/* Batting Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Batting</Text>
          {/* {battingTeamObj?.players.map((player, index) => (
          player.balls > 0 || player.isOut || player.status === 'out' ? (
            <View key={index} style={styles.playerStats}>
              <View style={styles.playerInfo}>
                <Text style={[
                  styles.playerName,
                  striker?.name === player.name && styles.strikerHighlight,
                  (player.isOut || player.status === 'out') && styles.outBatsman
                ]}>
                  {player.name}
                  {player.name === striker?.name ? ' *' : ''}
                  {player.name === nonStriker?.name ? '' : ''}
                  {(player.isOut || player.status === 'out') ? ' (out)' : ''}
                </Text>
                <Text style={styles.statText}>
                  {player.runs} ({player.balls})
                </Text>
              </View>
              <Text style={styles.strikeRate}>
                SR: {player.balls ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}
              </Text>
            </View>
          ) : null
        ))} */}


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

        {/* Bowling Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Bowling</Text>
          {bowlingTeamObj?.players
            .filter(player => player.ballsBowled > 0)
            .slice(0, 2)
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

        {/* Current Over */}
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

        {/* Controls */}
        {!showNewBowlerSelection && !showNewBatsmanSelection && (
          <View style={styles.controls}>
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <TouchableOpacity key={runs} style={styles.runButton} onPress={() => handleRun(runs)}>
                <Text style={styles.buttonText}>{runs}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('wide')}>
              <Text style={styles.buttonText}>Wide</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runButton, styles.noBallButton]} onPress={() => handleExtra('no-ball')}>
              <Text style={styles.buttonText}>No Ball</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('lb')}>
              <Text style={styles.buttonText}>Leg Byes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('bye')}>
              <Text style={styles.buttonText}>Byes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runButton, styles.wicketButton]} onPress={handleWicket}>
              <Text style={styles.buttonText}>Wicket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runButton, styles.undoButton]} onPress={undoLastBall}>
              <Text style={styles.buttonText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runButton, styles.swapButton]} onPress={swapBatsmen}>
              <Text style={styles.buttonText}>Swap</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* New Bowler Selection */}
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

        {/* New Batsman Selection */}
        {showNewBatsmanSelection && (



          <View style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>Select New Batsman</Text>
            {battingTeamObj?.players.map((player, index) => {
              // Don't allow picking the batsman still at the crease


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

        {/* Modals */}
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

        {/* Start Second Innings Button */}
        {currentInnings === 1 && totalCompletedOvers >= totalOvers && awaitingSecondInningsStart && (
          <TouchableOpacity style={styles.startInningsButton} onPress={startNewInnings}>
            <Text style={styles.startInningsButtonText}>Start Second Innings</Text>
          </TouchableOpacity>
        )}
      </ScrollView></>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scoreHeader: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  oversText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 5,
  },
  targetInfo: {
    marginTop: 10,
    alignItems: 'center',
  },
  targetText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  fullScorecardButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  fullScorecardButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    color: '#333',
  },
  strikerHighlight: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  currentBowlerHighlight: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  outBatsman: {
    color: '#F44336',
    textDecorationLine: 'line-through',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  },
  ballsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wicketBall: {
    backgroundColor: '#F44336',
  },
  fourBall: {
    backgroundColor: '#4CAF50',
  },
  sixBall: {
    backgroundColor: '#2196F3',
  },
  extraBall: {
    backgroundColor: '#FF9800',
  },
  ballText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  controls: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  runButton: {
    width: '30%',
    padding: 15,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  wideButton: {
    backgroundColor: '#FF9800',
  },
  noBallButton: {
    backgroundColor: '#F44336',
  },
  wicketButton: {
    backgroundColor: '#4CAF50',
  },
  undoButton: {
    backgroundColor: '#9C27B0',
  },
  swapButton: {
    backgroundColor: '#795548',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionContainer: {
    padding: 15,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  selectionButton: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
    opacity: 0.6,
  },
  selectionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  disabledButtonText: {
    color: '#999',
  },
  startInningsButton: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startInningsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  runRateContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1976D2',
    borderRadius: 10,
    alignItems: 'center',
  },
  runRateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rrrWarning: {
    color: '#FF5252', // bright red
  },

  partnershipContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f4f4f4', // Add background for the partnership section
    marginBottom: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  partnershipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});




