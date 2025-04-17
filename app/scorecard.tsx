import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';

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
    startSecondInnings
  } = useGameStore();

  const [showNewBowlerSelection, setShowNewBowlerSelection] = useState(false);
  const [showNewBatsmanSelection, setShowNewBatsmanSelection] = useState(false);
  const [showExtraRunsModal, setShowExtraRunsModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [extraType, setExtraType] = useState<'wide' | 'no-ball'>('wide');

  const battingTeamObj = teams.find(team => team.name === battingTeam);
  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);

  const currentOver = ballHistory.filter(ball => !ball.isExtra).length % 6;
  const totalCompletedOvers = Math.floor(ballHistory.filter(ball => !ball.isExtra).length / 6);

  const totalScore = ballHistory.reduce((sum, ball) => sum + ball.runs + (ball.isExtra ? 1 : 0), 0);
  const totalWickets = ballHistory.filter(ball => ball.isWicket).length;

  const runsNeeded = target ? target - totalScore + 1 : null;
  const ballsRemaining = totalOvers * 6 - ballHistory.filter(ball => !ball.isExtra).length;

  const getCurrentOverBalls = () => {
    const allBalls = [...ballHistory].reverse();
    const currentOverBalls = [];

    for (const ball of allBalls) {
      if (currentOverBalls.length < 6 || ball.isExtra) {
        currentOverBalls.push(ball);
      } else {
        break;
      }
    }

    return currentOverBalls.reverse();
  };

  const handleRun = (runs: number) => {
    if (!striker || !currentBowler) return;

    updateScore({
      runs,
      isExtra: false,
      batsmanName: striker.name,
      bowlerName: currentBowler.name,
      isWicket: false
    });

    if (currentOver === 5 && !showNewBowlerSelection) {
      setShowNewBowlerSelection(true);
    }
  };

  const handleExtra = (type: 'wide' | 'no-ball') => {
    setExtraType(type);
    setShowExtraRunsModal(true);
  };

  const handleExtraRuns = (runs: number) => {
    if (!striker || !currentBowler) return;

    updateScore({
      runs,
      isExtra: true,
      extraType,
      batsmanName: striker.name,
      bowlerName: currentBowler.name,
      isWicket: false
    });

    setShowExtraRunsModal(false);
  };

  const handleWicket = () => {
    setShowWicketModal(true);
  };

  const handleWicketConfirm = (wicketType: string, runOutBatsman?: string, runOutRuns?: number) => {
    if (!striker || !currentBowler) return;

    updateScore({
      runs: runOutRuns || 0,
      isExtra: false,
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
    if (player?.name === nonStriker?.name) {
      Alert.alert('Error', 'This batsman is already at non-striker end');
      return;
    }
    if (player) setStriker(player);
    setShowNewBatsmanSelection(false);
  };

  const viewFullScorecard = () => {
    router.push('/full-scorecard');
  };

  const startNewInnings = () => {
    startSecondInnings();
    router.push('/select-players');
  };


  return (
    <ScrollView style={styles.container}>
      {/* Score Summary */}
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreText}>
          {battingTeam} {totalScore}/{totalWickets}
        </Text>
        <Text style={styles.oversText}>
          Overs: {totalCompletedOvers}.{currentOver}
        </Text>
        {currentInnings === 2 && target && (
          <View style={styles.targetInfo}>
            <Text style={styles.targetText}>
              Need {runsNeeded} runs from {ballsRemaining} balls
            </Text>
            <Text style={styles.targetText}>
              Target: {target + 1}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.fullScorecardButton}
          onPress={viewFullScorecard}
        >
          <Text style={styles.fullScorecardButtonText}>View Full Scorecard</Text>
        </TouchableOpacity>
      </View>

      {/* Batting Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Batting</Text>
        <View style={styles.playerStats}>
          <View style={styles.playerInfo}>
            <Text style={[styles.playerName, striker?.name && styles.strikerHighlight]}>
              {striker?.name} *
            </Text>
            <Text style={styles.statText}>
              {striker?.runs} ({striker?.balls})
            </Text>
          </View>
          <Text style={styles.strikeRate}>
            SR: {striker?.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(1) : '0.0'}
          </Text>
        </View>
        <View style={styles.playerStats}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{nonStriker?.name}</Text>
            <Text style={styles.statText}>
              {nonStriker?.runs} ({nonStriker?.balls})
            </Text>
          </View>
          <Text style={styles.strikeRate}>
            SR: {nonStriker?.balls > 0 ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : '0.0'}
          </Text>
        </View>
      </View>

      {/* Bowling Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Bowling</Text>
        <View style={styles.playerStats}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{currentBowler?.name}</Text>
            <Text style={styles.statText}>
              {currentBowler?.wickets}-{currentBowler?.runsGiven}
              ({Math.floor(currentBowler?.ballsBowled || 0 / 6)}.{(currentBowler?.ballsBowled || 0) % 6})
            </Text>
          </View>
          <Text style={styles.economy}>
            Econ: {currentBowler?.ballsBowled ?
              ((currentBowler.runsGiven / (currentBowler.ballsBowled / 6)) || 0).toFixed(1) :
              '0.0'
            }
          </Text>
        </View>
      </View>

      {/* Current Over */}
      <View style={styles.currentOver}>
        <Text style={styles.sectionTitle}>This Over</Text>
        <View style={styles.ballsContainer}>
          {getCurrentOverBalls().map((ball, index) => (
            <View key={index} style={styles.ball}>
              <Text style={styles.ballText}>
                {ball.isWicket ? 'W' : ball.isExtra ? (ball.extraType === 'wide' ? 'wd' : 'nb') : ball.runs}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Scoring Controls */}
      {!showNewBowlerSelection && !showNewBatsmanSelection && (
        <View style={styles.controls}>
          {[0, 1, 2, 3, 4, 6].map(runs => (
            <TouchableOpacity
              key={runs}
              style={styles.runButton}
              onPress={() => handleRun(runs)}
            >
              <Text style={styles.buttonText}>{runs}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.runButton, styles.wideButton]}
            onPress={() => handleExtra('wide')}
          >
            <Text style={styles.buttonText}>Wide</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runButton, styles.noBallButton]}
            onPress={() => handleExtra('no-ball')}
          >
            <Text style={styles.buttonText}>No Ball</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runButton, styles.wicketButton]}
            onPress={handleWicket}
          >
            <Text style={styles.buttonText}>Wicket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runButton, styles.undoButton]}
            onPress={undoLastBall}
          >
            <Text style={styles.buttonText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runButton, styles.swapButton]}
            onPress={swapBatsmen}
          >
            <Text style={styles.buttonText}>Swap</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* New Bowler Selection */}
      {showNewBowlerSelection && (
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionTitle}>Select New Bowler</Text>
          {bowlingTeamObj?.players.map((player, index) => (
            <TouchableOpacity
              key={index}
              style={styles.selectionButton}
              onPress={() => selectNewBowler(player)}
            >
              <Text style={styles.selectionButtonText}>{player.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* New Batsman Selection */}
      {showNewBatsmanSelection && (
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionTitle}>Select New Batsman</Text>
          {battingTeamObj?.players.map((player, index) => (
            <TouchableOpacity
              key={index}
              style={styles.selectionButton}
              onPress={() => selectNewBatsman(player)}
              disabled={player.name === nonStriker?.name}
            >
              <Text style={styles.selectionButtonText}>{player.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Extra Runs Modal */}
      <ExtraRunsModal
        visible={showExtraRunsModal}
        onClose={() => setShowExtraRunsModal(false)}
        onSelectRuns={handleExtraRuns}
      />

      {/* Wicket Modal */}
      {striker && nonStriker && (
        <WicketModal
          visible={showWicketModal}
          onClose={() => setShowWicketModal(false)}
          onConfirm={handleWicketConfirm}
          strikerName={striker.name}
          nonStrikerName={nonStriker.name}
          outBatsmen={battingTeamObj?.players.filter(p => p.isOut).map(p => p.name) || []}
        />
      )}

      {/* Start Second Innings Button */}
      {currentInnings === 1 && totalCompletedOvers >= totalOvers && (
        <TouchableOpacity
          style={styles.startInningsButton}
          onPress={startNewInnings}
        >
          <Text style={styles.startInningsButtonText}>Start Second Innings</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
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
  ballText: {
    fontSize: 14,
    color: '#333',
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
  selectionButtonText: {
    fontSize: 16,
    color: '#333',
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
});