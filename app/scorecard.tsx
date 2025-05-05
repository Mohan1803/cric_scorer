import { useEffect, useState, useRef } from 'react';

// --- Type Definitions ---
import type { Player } from '../store/gameStore';
type Team = {
  name: string;
  players: Player[];
};

// --- Type Guard ---
function isTeam(obj: any): obj is Team {
  return obj && typeof obj === 'object' && 'name' in obj;
}
import { saveMatchData } from './firebaseService';
import Celebration from './Celebration';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Easing } from 'react-native';
import { colors } from './theme';
import BroadcastTicker from './BroadcastTicker';
import { useRouter, usePathname } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { getCurrentPartnership, getHighestPartnership } from '../store/partnershipUtils';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';
import OversModal from '../components/OversModal';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function Scorecard() {
  // Defensive: fallback for missing teams
  const { teams, battingTeam, bowlingTeam } = useGameStore() as {
  teams: Team[];
  battingTeam: string | Team;
  bowlingTeam: string | Team;
};
  const battingTeamObj = teams.find(team => team.name === battingTeam);
  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);
  if (!battingTeamObj || !bowlingTeamObj) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>Loading teams...</Text>
      </SafeAreaView>
    );
  }

  // Remove duplicate declarations below

  const [showCelebration, setShowCelebration] = useState(false);
  // --- Player Replacement State and Handlers ---
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceContext, setReplaceContext] = useState<{ player: any, type: 'batting' | 'bowling' } | null>(null);
  const [eligibleReplacements, setEligibleReplacements] = useState<any[]>([]);

  const handlePlayerReplacePress = (player: any, type: 'batting' | 'bowling') => {
    Alert.alert(
      'Replace Player',
      `Replace ${player.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => {
            let eligible;
            if (type === 'batting') {
              if (!battingTeamObj) return;
              eligible = battingTeamObj.players.filter(
                p => p.name !== player.name &&
                  p.name !== striker?.name &&
                  p.name !== nonStriker?.name
              );
            } else {
              eligible = bowlingTeamObj?.players.filter(
                p => p.name !== player.name &&
                  p.name !== currentBowler?.name &&
                  p.name !== striker?.name &&
                  p.name !== nonStriker?.name
              ) || [];
            }
            setReplaceContext({ player, type });
            setEligibleReplacements(eligible);
            setShowReplaceModal(true);
          },
        },
      ]
    );
  };

  const handleConfirmReplace = (replacement: any) => {
    if (!replaceContext) return;
    // Replace logic (update player in store)
    if (replaceContext.type === 'batting') {
      if (!battingTeamObj) return; // Prevent undefined error
      const idx = battingTeamObj.players.findIndex(p => p.name === replaceContext.player.name);
      if (idx !== -1) {
        const newPlayers = [...battingTeamObj.players];
        newPlayers[idx] = replacement;
        const newTeams = teams.map(team =>
          team.name === battingTeamObj.name ? { ...team, players: newPlayers } : team
        );
        useGameStore.getState().setTeams(newTeams);
      }
    } else if (bowlingTeamObj) {
      const idx = bowlingTeamObj.players.findIndex(p => p.name === replaceContext.player.name);
      if (idx !== -1) {
        const newPlayers = [...bowlingTeamObj.players];
        newPlayers[idx] = replacement;
        const newTeams = teams.map(team =>
          team.name === bowlingTeamObj.name ? { ...team, players: newPlayers } : team
        );
        useGameStore.getState().setTeams(newTeams);
      }
    }
    setShowReplaceModal(false);
    setReplaceContext(null);
  };

  const router = useRouter();
  const pathname = usePathname();
  const {
    striker,
    nonStriker,
    currentBowler,
    ballHistory,
    firstInningsBallHistory,
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
  const [savePromptShown, setSavePromptShown] = useState(false);

  // Prompt to save match data after match completion
  useEffect(() => {
    if (matchCompleted && !savePromptShown) {
      setSavePromptShown(true);
      const matchName = `${teams[0]?.name || 'TeamA'}_${teams[1]?.name || 'TeamB'}_${new Date().toISOString().slice(0,10)}`;
      Alert.alert(
        'Save Match?',
        `Do you want to save this match as "${matchName}"?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                await saveMatchData(matchName, {
                  teams,
                  battingTeam,
                  bowlingTeam,
                  ballHistory,
                  firstInningsBallHistory,
                  totalOvers,
                  matchDate: new Date().toISOString(),
                });
                Alert.alert('Success', 'Match data saved to Firestore!');
              } catch (e) {
                Alert.alert('Error', 'Failed to save match data.');
              }
            }
          }
        ]
      );
    }
  }, [matchCompleted]);

  // --- Retired Hurt Handler ---
  const handleRetiredHurt = (which: 'striker' | 'nonStriker') => {
    if (!battingTeamObj) return;
    let batsman = which === 'striker' ? striker : nonStriker;
    if (!batsman || batsman.status === 'out' || batsman.status === 'retiredHurt') return;
    // Update status in team store
    const idx = battingTeamObj.players.findIndex(p => p.name === batsman.name);
    if (idx === undefined || idx === -1) return;
    const newPlayers = [...battingTeamObj.players];
    newPlayers[idx] = { ...newPlayers[idx], status: 'retiredHurt' };
    const newTeams = teams.map(team =>
      team.name === battingTeamObj.name ? { ...team, players: newPlayers } : team
    );
    useGameStore.getState().setTeams(newTeams);
    // Remove from striker/nonStriker and prompt for new batsman
    setStriker(null);
    setShowNewBatsmanSelection(true);
    // Optionally, set batsmanToReplace to which (if used for UI)
  };


  const getAvailableBatsmen = () => {
    if (!battingTeamObj) return [];
    // Allow selection of players who are not out, including retired hurt
    return battingTeamObj.players.filter(player =>
      player.status !== 'out' &&
      player.name !== striker?.name &&
      player.name !== nonStriker?.name
    );
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

    // Trigger celebration for 4s and 6s
    if (runs === 4 || runs === 6) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }

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
    // Trigger celebration for wicket
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <BroadcastTicker />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={[styles.scoreHeader]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.scoreText}>
                {/* Ensure battingTeam is a string, not an object */}
                {typeof battingTeam === 'string'
  ? battingTeam
  : isTeam(battingTeam)
    ? battingTeam.name
    : JSON.stringify(battingTeam)} {totalScore}/{totalWickets}
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
          <Text style={styles.elegantSectionTitle}>Batting</Text>
          {battingTeamObj?.players
            .filter(player =>
              player.name === striker?.name || player.name === nonStriker?.name
            )
            .map((player, index) => (
              <View key={index} style={styles.elegantPlayerCard}>
                <View>
                  <TouchableOpacity onPress={() => handlePlayerReplacePress(player, 'batting')}>
                    <Text style={[
                      styles.elegantPlayerName,
                      striker?.name === player.name && styles.elegantHighlight
                    ]}>
                      {player.name}
                      {player.status === 'retiredHurt' ? ' (retired hurt)' : ''}
                      {player.name === striker?.name ? ' *' : ''}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.elegantStatText}>
                    {player.runs} ({player.balls})
                  </Text>
                  <Text style={styles.elegantStatText}>
                    4s: {player.fours} | 6s: {player.sixes}
                  </Text>
                  <Text style={styles.elegantStatText}>
                    {(() => {
                      const balls = ballHistory.filter(ball => ball.batsmanName === player.name && !ball.isExtra && !ball.isWicket);
                      const zeros = balls.filter(ball => ball.runs === 0).length;
                      const ones = balls.filter(ball => ball.runs === 1).length;
                      const twos = balls.filter(ball => ball.runs === 2).length;
                      const threes = balls.filter(ball => ball.runs === 3).length;
                      return `0s: ${zeros} | 1s: ${ones} | 2s: ${twos} | 3s: ${threes}`;
                    })()}
                  </Text>
                </View>
                <Text style={styles.elegantStrikeRate}>
                  SR: {player.balls ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}
                </Text>
              </View>
            ))}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.elegantSectionTitle}>Bowling</Text>
          {bowlingTeamObj?.players
            .filter(player => player.ballsBowled > 0)
            .slice(0, 1)
            .map((player, index) => (
              <View key={index} style={styles.elegantPlayerCard}>
                <View>
                  <TouchableOpacity onPress={() => handlePlayerReplacePress(player, 'bowling')}>
                    <Text style={[
                      styles.elegantPlayerName,
                      currentBowler?.name === player.name && styles.elegantBowlerHighlight
                    ]}>
                      {player.name}
                      {currentBowler?.name === player.name ? ' *' : ''}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.elegantStatText}>
                    {player.wickets}-{player.runsGiven}
                    ({Math.floor(player.ballsBowled / 6)}.{player.ballsBowled % 6})
                  </Text>
                </View>
                <Text style={styles.elegantStrikeRate}>
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
          <View style={styles.runsSelectionCard}>
            <Text style={styles.runsSelectionTitle}>Runs Selection</Text>
            <View style={styles.runsButtonGrid}>
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <TouchableOpacity key={runs} style={styles.runButton} onPress={() => handleRun(runs)}>
                  <Text style={styles.runButtonText}>{runs}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.extraButtonRow}>
              <TouchableOpacity style={[styles.runButton, styles.wicketButton]} onPress={handleWicket}>
                <Text style={styles.runButtonText}>Wicket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.wicketButton]} onPress={() => handleRetiredHurt('striker')}>
                <Text style={styles.runButtonText}>Retired Hurt (S)</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity style={[styles.runButton, styles.wicketButton]} onPress={() => handleRetiredHurt('nonStriker')}>
                <Text style={styles.runButtonText}>Retired Hurt (NS)</Text>
              </TouchableOpacity> */}
              <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('wide')}>
                <Text style={styles.runButtonText}>Wide</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.runButton, styles.wideButton]} onPress={() => handleExtra('no-ball')}>
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
                    {player.status === 'out' ? ' (out)' : player.status === 'retiredHurt' ? ' (retired hurt)' : ''}
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
      {/* Player Replacement Modal */}
      {showReplaceModal && replaceContext && (
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 14, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 14, color: colors.accent }}>
              Select Replacement for {replaceContext.player.name}
            </Text>
            {eligibleReplacements.length === 0 && (
              <Text style={{ color: colors.error, marginBottom: 10 }}>No eligible replacements available.</Text>
            )}
            {eligibleReplacements.map((player, idx) => (
              <TouchableOpacity
                key={player.name}
                style={{ paddingVertical: 12, borderBottomWidth: idx === eligibleReplacements.length - 1 ? 0 : 1, borderColor: '#eee' }}
                onPress={() => handleConfirmReplace(player)}
              >
                <Text style={{ fontSize: 16 }}>{player.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowReplaceModal(false)} style={{ marginTop: 18, alignSelf: 'flex-end' }}>
              <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  runsSelectionCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    marginHorizontal: 12,
    marginTop: 18,
    marginBottom: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  runsSelectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  runsButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  extraButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },

  elegantPlayerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginVertical: 10,
    marginHorizontal: 14,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  elegantSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 18,
    marginBottom: 10,
    textAlign: 'left',
    letterSpacing: 1.2,
  },
  elegantPlayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  elegantStatText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginRight: 12,
    fontWeight: '500',
  },
  elegantStrikeRate: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    marginLeft: 10,
  },
  elegantHighlight: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  elegantBowlerHighlight: {
    color: colors.success,
    fontWeight: 'bold',
  },
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
    color: colors.textPrimary,
    fontWeight: 'bold',
    
    
    
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
    color: colors.textPrimary,
    fontWeight: 'bold',
    
    
    
    fontSize: 20,
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
    color: colors.textPrimary,
    fontWeight: 'bold',
    
    
    
    fontSize: 18,
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
    color: colors.textPrimary,
    fontWeight: 'bold',
    
    
    
    fontSize: 16,
    textAlign: 'center',
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
