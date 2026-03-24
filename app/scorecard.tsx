import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Easing, Dimensions } from 'react-native';
import { colors } from './theme';
import BroadcastTicker from './BroadcastTicker';
import { useRouter, usePathname } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { getCurrentPartnership } from '../store/partnershipUtils';
import ExtraRunsModal from '../components/ExtraRunsModal';
import WicketModal from '../components/WicketModal';
import OversModal from '../components/OversModal';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, RotateCcw, ArrowRightLeft, UserCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
    if (currentInningsNumber === 1 && (totalCompletedOvers >= totalOvers || totalWickets >= maxWickets) && !awaitingSecondInningsStart) {
      setAwaitingSecondInningsStart(true);
      Alert.alert('Innings Over', 'First innings has ended. Ready to start second innings.');
    }
  }, [ballHistory]);

  const handleRun = (runs: number) => {
    if (!striker || !currentBowler) return;
    updateScore({ runs, isExtra: false, isNoBall: false, batsmanName: striker.name, bowlerName: currentBowler.name, isWicket: false });
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
  };

  const startNewInnings = () => {
    startSecondInnings();
    router.replace('/select-players');
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
          colors={[colors.surface, colors.background]}
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
               Partnership: <Text style={{color: colors.accent}}>{partnership.runs} ({partnership.balls})</Text>
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
        {!showNewBowlerSelection && !showNewBatsmanSelection && (
          <View style={styles.controlsSection}>
            <View style={styles.runGrid}>
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <TouchableOpacity 
                  key={runs} 
                  style={[styles.gridBtn, (runs === 4 || runs === 6) && styles.boundaryGridBtn]} 
                  onPress={() => handleRun(runs)}
                >
                  <Text style={styles.gridBtnText}>{runs}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.extraActionsRow}>
              {['Wide', 'NB', 'LB', 'Byes'].map((type) => (
                <TouchableOpacity 
                  key={type} 
                  style={styles.extraBtnNew} 
                  onPress={() => handleExtra(type.toLowerCase().replace(' ', '-') as any)}
                >
                  <Text style={styles.extraBtnNewText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.mainActionsRow}>
              <TouchableOpacity style={styles.wicketBtnNew} onPress={handleWicket}>
                <Text style={styles.wicketBtnNewText}>Wicket</Text>
              </TouchableOpacity>
              
              <View style={styles.secondaryActions}>
                <TouchableOpacity style={styles.actionIconBtn} onPress={swapBatsmen}>
                  <ArrowRightLeft size={20} color={colors.textSecondary} />
                  <Text style={styles.actionIconText}>Swap</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={undoLastBall}>
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
    margin: 12,
    padding: 16,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    marginLeft: 8,
    fontWeight: '500',
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
  targetBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  targetBannerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
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
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: colors.accent,
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
    color: colors.text,
    fontWeight: '600',
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
  }
});