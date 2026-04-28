import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ToastAndroid,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../store/gameStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { colors } from './theme';
import { ChevronLeft, Download, Trophy, Star, Award, Target } from 'lucide-react-native';
import BatsmanStatsModal from '../components/BatsmanStatsModal';
import { useFollowStore } from '../store/followStore';


import { SafeAreaView } from 'react-native-safe-area-context';

export default function FullScorecard() {
  // Defensive: fallback for missing teams or players
  const {
    teams,
    battingTeam,
    bowlingTeam,
    ballHistory,
    firstInningsBallHistory,
    startNewMatch,
    matchCompleted,
    matchResult,
    clearMatchResult,
    currentInningsNumber,
  } = useGameStore();
  const [showVictoryModal, setShowVictoryModal] = useState(!!matchResult);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<any>(null);
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const { toggleFollow, followedPlayers } = useFollowStore();


  // Safe team name derivation for both ongoing and completed matches
  const firstInningsBattingTeamName = useMemo(() => {
    if (currentInningsNumber === 2) return bowlingTeam;
    return battingTeam;
  }, [currentInningsNumber, battingTeam, bowlingTeam]);

  const firstInningsBowlingTeamName = useMemo(() => {
    if (currentInningsNumber === 2) return battingTeam;
    return bowlingTeam;
  }, [currentInningsNumber, battingTeam, bowlingTeam]);

  const secondInningsBattingTeamName = useMemo(() => {
    if (currentInningsNumber === 2) return battingTeam;
    return null;
  }, [currentInningsNumber, battingTeam]);

  const secondInningsBowlingTeamName = useMemo(() => {
    if (currentInningsNumber === 2) return bowlingTeam;
    return null;
  }, [currentInningsNumber, bowlingTeam]);

  if (!teams || teams.length < 2 || !teams[0]?.players || !teams[1]?.players) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>Loading full scorecard...</Text>
      </SafeAreaView>
    );
  }
  // ...existing code...
  const handleDownloadScorecard = async () => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const getTableRows = (players: any[], isBatting: boolean) =>
      players.map((p: any) =>
        `<tr>
        <td>
          ${p.name}${isBatting && p.isOut === false ? ' (not out)' : ''}
          ${isBatting && p.isOut && p.dismissalDetail ? `<br/><small style="color: #94A3B8; font-size: 11px;">${p.dismissalDetail}</small>` : ''}
        </td>
        ${isBatting
          ? `<td>${p.runs}</td><td>${p.balls}</td><td>${p.fours}</td><td>${p.sixes}</td><td>${p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0'}</td>`
          : `<td>${Math.floor(p.ballsBowled / 6)}.${p.ballsBowled % 6}</td><td>${p.runsGiven}</td><td>${p.wickets}</td><td>${p.ballsBowled > 0 ? (p.runsGiven / (p.ballsBowled / 6)).toFixed(1) : '0.0'}</td>`}
      </tr>`
      ).join('');

    const makeInningsHtml = (label: string, battingTeam: any, bowlingTeam: any, balls: any[]) => {
      if (!battingTeam || !bowlingTeam || balls.length === 0) return '';
      const totalScore = balls.reduce((sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0), 0);
      const totalWickets = balls.filter(ball => ball.isWicket).length;
      const legalBalls = balls.filter(ball => !ball.isExtra || (ball.isExtra && (ball.extraType === 'bye' || ball.extraType === 'lb' || ball.extraType === 'penalty'))).length;
      const totalOvers = Math.floor(legalBalls / 6);
      const currentBalls = legalBalls % 6;

      // Derive Batting Order
      const battingOrderIds: string[] = [];
      balls.forEach(b => {
        if (b.batsmanId && !battingOrderIds.includes(b.batsmanId)) {
          battingOrderIds.push(b.batsmanId);
        }
        if (b.nonStrikerId && !battingOrderIds.includes(b.nonStrikerId)) {
          battingOrderIds.push(b.nonStrikerId);
        }
        if (b.runOutBatsmanId && !battingOrderIds.includes(b.runOutBatsmanId)) {
          battingOrderIds.push(b.runOutBatsmanId);
        }
      });
      const sortedBatters = battingOrderIds
        .map(id => battingTeam.players.find((p: any) => p.id === id))
        .filter((p): p is any => !!p);

      // Derive Bowling Order
      const bowlingOrderIds: string[] = [];
      balls.forEach(b => {
        if (b.bowlerId && !bowlingOrderIds.includes(b.bowlerId)) {
          bowlingOrderIds.push(b.bowlerId);
        }
      });
      const sortedBowlers = bowlingOrderIds
        .map(id => bowlingTeam.players.find((p: any) => p.id === id))
        .filter((p): p is any => !!p);

      let wides = 0, noBalls = 0, legByes = 0, byes = 0, penalty = 0;
      balls.forEach(ball => {
        if (ball.extraType === 'wide') wides += (1 + ball.runs);
        if (ball.extraType === 'no-ball') noBalls += (1 + ball.runs);
        if (ball.extraType === 'leg bye' || ball.extraType === 'lb') legByes += ball.runs;
        if (ball.extraType === 'bye') byes += ball.runs;
        if (ball.extraType === 'penalty') penalty += ball.runs;
      });
      const extras = wides + noBalls + legByes + byes + penalty;

      const battingTable = `
        <table border="1" cellpadding="4" cellspacing="0">
          <tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
          ${getTableRows(sortedBatters, true)}
        </table>
      `;

      const bowlingTable = `
        <table border="1" cellpadding="4" cellspacing="0">
          <tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr>
          ${getTableRows(sortedBowlers, false)}
        </table>
      `;

      // Fall of Wickets (FOW)
      type Wicket = { runs: number; number: number; batter: string; over: string; detail: string };
      const wickets: Wicket[] = balls.map((ball, i) => (ball.isWicket ? {
        runs: balls.slice(0, i + 1).reduce((sum, b) => sum + b.runs + (b.isExtra ? 1 : 0), 0),
        number: balls.filter((b, idx) => b.isWicket && idx <= i).length,
        batter: ball.batter || '',
        over: (() => {
          const legalBalls = balls.slice(0, i + 1).filter(b => !b.isExtra).length;
          return `${Math.floor((legalBalls - 1) / 6)}.${(legalBalls - 1) % 6}`;
        })(),
        detail: ball.dismissalDetail || ''
      } : null))
        .filter((w): w is Wicket => w !== null);
      const fowSection = `<h3>Fall of Wickets</h3><p>${wickets.length > 0
        ? wickets.map(w => `${w.runs}/${w.number} (${w.batter}${w.detail ? ', ' + w.detail : ''}, ${w.over})`).join('; ')
        : 'None'}</p>`;

      return `
      <h2>${label}: ${battingTeam.name} ${totalScore}/${totalWickets} (${totalOvers}.${currentBalls} ov)</h2>
      ${battingTable}
      ${bowlingTable}
      ${fowSection}
      <h3>Extras</h3>
      <p>Total: ${extras}${wides ? `, Wides: ${wides}` : ''}${noBalls ? `, No Balls: ${noBalls}` : ''}${legByes ? `, Leg Byes: ${legByes}` : ''}${byes ? `, Byes: ${byes}` : ''}${penalty ? `, Penalty: ${penalty}` : ''}</p>
      <hr/>
    `;
    };

    function getMatchMetaHtml() {
      let html = `<h2>Match: ${teams?.map(t => t.name).join(' vs ')}</h2>`;
      html += `<p>Date: ${formatDate(new Date())}</p>`;
      return html;
    }

    const firstInningsBattingTeamName = currentInningsNumber === 1 ? battingTeam : bowlingTeam;
    const firstInningsBowlingTeamName = currentInningsNumber === 1 ? bowlingTeam : battingTeam;
    const secondInningsBattingTeamName = currentInningsNumber === 2 ? battingTeam : bowlingTeam;
    const secondInningsBowlingTeamName = currentInningsNumber === 2 ? bowlingTeam : battingTeam;

    const firstInningsBatting = teams.find(t => t.name === firstInningsBattingTeamName);
    const firstInningsBowling = teams.find(t => t.name === firstInningsBowlingTeamName);
    const secondInningsBatting = teams.find(t => t.name === secondInningsBattingTeamName);
    const secondInningsBowling = teams.find(t => t.name === secondInningsBowlingTeamName);
    // Always export both innings: firstInningsBallHistory for first, ballHistory for second (if available)
    const firstInningsBalls = firstInningsBallHistory.length > 0 ? firstInningsBallHistory : ballHistory;
    const secondInningsBalls = firstInningsBallHistory.length > 0 ? ballHistory : [];

    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
          body {
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 40px;
            background: #FFFFFF;
            color: #1E293B;
          }
          .card {
            background: #FFFFFF;
            border-radius: 0;
            margin-bottom: 30px;
            overflow: hidden;
            border: 1px solid #E2E8F0;
          }
          .header {
            border-bottom: 3px solid #EE2A34;
            padding: 20px 0;
            text-align: left;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            color: #EE2A34;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header p {
            margin: 5px 0 0;
            color: #64748B;
            font-size: 14px;
            font-weight: 600;
          }
          .innings-title {
            padding: 10px 15px;
            background: #F1F5F9;
            border-bottom: 2px solid #CBD5E1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .innings-title h2 {
            margin: 0;
            font-size: 18px;
            color: #0F172A;
            font-weight: 700;
          }
          .score-label {
            font-size: 20px;
            font-weight: 800;
            color: #EE2A34;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
          }
          th {
            background: #F8FAFC;
            text-align: left;
            padding: 10px 15px;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #E2E8F0;
          }
          td {
            padding: 10px 15px;
            border-bottom: 1px solid #F1F5F9;
            font-size: 13px;
            color: #334155;
          }
          .fow, .extras {
            padding: 15px;
            background: #FFFFFF;
            font-size: 12px;
            color: #475569;
            line-height: 1.5;
            border-top: 1px solid #E2E8F0;
          }
          .section-label {
            color: #EE2A34;
            font-weight: 700;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 11px;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            border-top: 1px solid #E2E8F0;
            color: #94A3B8;
            font-size: 10px;
          }
          .winner-banner {
            background: #F0FDF4;
            color: #166534;
            padding: 15px;
            text-align: center;
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 30px;
            border: 2px solid #BCF0DA;
            text-transform: uppercase;
          }
          small {
            color: #64748B !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Cric Scorer</h1>
          <p>${teams?.map(t => t.name).join(' vs ')} • ${formatDate(new Date())}</p>
        </div>

        <div style="padding: 24px 0;">
          <div class="card">
            ${makeInningsHtml('First Innings', firstInningsBatting, firstInningsBowling, firstInningsBalls)}
          </div>
          
          <div class="card">
            ${makeInningsHtml('Second Innings', secondInningsBatting, secondInningsBowling, secondInningsBalls)}
          </div>
        </div>

        <div class="footer">
          Generated by Cric Scorer App
        </div>
      </body>
    </html>
  `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to export scorecard', ToastAndroid.LONG);
      } else {
        alert('Failed to export scorecard');
      }
    }
  };

  // Debug: log histories

  // Safe team name derivation was moved to the top to avoid hook order issues

  const handleNewMatch = () => {
    startNewMatch();
    setShowNewMatchModal(false);
    router.replace('/entryPage');
  };

  const renderInnings = (
    inningsBallHistory: typeof ballHistory,
    inningsBattingTeam: string,
    inningsBowlingTeam: string,
    inningsLabel: string
  ) => {
    // DEBUG LOGGING
    console.log('[renderInnings]', {
      inningsLabel,
      inningsBattingTeam,
      inningsBowlingTeam,
      inningsBallHistoryLength: inningsBallHistory.length,
      teams: teams.map(t => t.name)
    });
    const battingTeamObj = teams.find(team => team.name === inningsBattingTeam);
    const bowlingTeamObj = teams.find(team => team.name === inningsBowlingTeam);

    if (!battingTeamObj || !bowlingTeamObj || inningsBallHistory.length === 0) {
      return (
        <View style={styles.inningsContainer}>
          <Text style={styles.emptyText}>No data for this innings.</Text>
        </View>
      );
    }

    // Derive Batting Order
    const battingOrderIds: string[] = [];
    inningsBallHistory.forEach(b => {
      if (b.batsmanId && !battingOrderIds.includes(b.batsmanId)) {
        battingOrderIds.push(b.batsmanId);
      }
      if (b.nonStrikerId && !battingOrderIds.includes(b.nonStrikerId)) {
        battingOrderIds.push(b.nonStrikerId);
      }
      if (b.runOutBatsmanId && !battingOrderIds.includes(b.runOutBatsmanId)) {
        battingOrderIds.push(b.runOutBatsmanId);
      }
    });

    const participatingBatters = battingOrderIds
      .map(id => battingTeamObj.players.find(p => p.id === id))
      .filter((p): p is any => !!p);

    // Derive Bowling Order
    const bowlingOrderIds: string[] = [];
    inningsBallHistory.forEach(b => {
      if (b.bowlerId && !bowlingOrderIds.includes(b.bowlerId)) {
        bowlingOrderIds.push(b.bowlerId);
      }
    });

    const participatingBowlers = bowlingOrderIds
      .map(id => bowlingTeamObj.players.find(p => p.id === id))
      .filter((p): p is any => !!p);

    const totalScore = inningsBallHistory.reduce(
      (sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0),
      0
    );
    const totalWickets = inningsBallHistory.filter(ball => ball.isWicket).length;
    const legalBalls = inningsBallHistory.filter(ball => !ball.isExtra).length;
    const totalOvers = Math.floor(legalBalls / 6);
    const currentBalls = legalBalls % 6;

    return (
      <View style={styles.inningsContainer}>
        <LinearGradient
          colors={['rgba(21, 42, 85, 0.95)', 'rgba(8, 17, 38, 0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerSticky}
        >
          <Text style={styles.inningsHeaderPhase}>{inningsLabel}</Text>
          <View style={styles.inningsHeaderMain}>
            <Text style={styles.inningsHeaderTeam} numberOfLines={1}>{inningsBattingTeam}</Text>
            <View>
              <Text style={styles.inningsHeaderScore}>{totalScore}/{totalWickets}</Text>
              <Text style={styles.inningsHeaderOvers}>{totalOvers}.{currentBalls} Overs</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Batting Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batting Performance</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderLabel, styles.colPlayer]}>Batter</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>R</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>B</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>4s</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>6s</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStatLarge]}>SR</Text>
          </View>
          {participatingBatters.map((player, idx) => {
            const strikeRate = player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0';
            return (
              <TouchableOpacity
                key={player.id}
                style={[styles.tableBodyRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}
                onPress={() => {
                  setSelectedStatsPlayer(player);
                  setShowStatsModal(true);
                }}
              >
                <View style={styles.colPlayer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.playerCellName} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </View>
                  {player.isOut && player.dismissalDetail && (
                    <Text style={styles.dismissalText}>{player.dismissalDetail}</Text>
                  )}
                  {!player.isOut && <Text style={[styles.dismissalText, { color: '#4ADE80' }]}>not out</Text>}
                </View>

                <Text style={[styles.statValue, styles.colStat]}>{player.runs}</Text>
                <Text style={[styles.statLabel, styles.colStat]}>{player.balls}</Text>
                <Text style={[styles.statLabel, styles.colStat]}>{player.fours}</Text>
                <Text style={[styles.statLabel, styles.colStat]}>{player.sixes}</Text>
                <Text style={[styles.statValue, styles.colStatLarge, styles.srValue]}>{strikeRate}</Text>
              </TouchableOpacity>
            );
          })}
          {participatingBatters.length === 0 && <Text style={styles.emptyText}>No batting data.</Text>}
        </View>

        {/* Bowling Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bowling Performance</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderLabel, styles.colPlayer]}>Bowler</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>O</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>R</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStat]}>W</Text>
            <Text style={[styles.tableHeaderLabel, styles.colStatLarge]}>Econ</Text>
          </View>
          {participatingBowlers.map((player, idx) => {
            const overs = Math.floor(player.ballsBowled / 6);
            const balls = player.ballsBowled % 6;
            const economy = player.ballsBowled > 0
              ? (player.runsGiven / (player.ballsBowled / 6)).toFixed(1)
              : '0.0';
            return (
              <View key={player.id} style={[styles.tableBodyRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                <View style={styles.colPlayer}>
                  <Text style={styles.playerCellName}>
                    {player.name}
                  </Text>
                </View>

                <Text style={[styles.statLabel, styles.colStat]}>{overs}.{balls}</Text>
                <Text style={[styles.statLabel, styles.colStat]}>{player.runsGiven}</Text>
                <Text style={[styles.statValue, styles.colStat]}>{player.wickets}</Text>
                <Text style={[styles.statValue, styles.colStatLarge, styles.econValue]}>{economy}</Text>
              </View>
            );
          })}
          {participatingBowlers.length === 0 && <Text style={styles.emptyText}>No bowling data.</Text>}
        </View>

        {/* Fall of Wickets (FOW) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fall of Wickets</Text>
          <View style={styles.fowContainer}>
            {(() => {
              const balls = inningsBallHistory;
              const wickets = balls
                .map((ball, i) => ball.isWicket ? ({
                  runs: balls.slice(0, i + 1).reduce((sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0), 0),
                  number: balls.filter((b, idx) => b.isWicket && idx <= i).length,
                  batter: ball.batsmanName || '',
                  detail: ball.dismissalDetail || '',
                  over: (() => {
                    const legalBalls = balls.slice(0, i + 1).filter(b => !b.isExtra).length;
                    return `${Math.floor((legalBalls - 1) / 6)}.${(legalBalls - 1) % 6}`;
                  })()
                }) : null)
                .filter((w): w is any => w !== null);

              if (wickets.length === 0) return <Text style={styles.emptyText}>None</Text>;

              return wickets.map((w, idx) => (
                <View key={idx} style={styles.fowCard}>
                  <Text style={styles.fowWktNum}>WICKET {w.number}</Text>
                  <Text style={styles.fowScore}>{w.runs}/{w.number}</Text>
                  <Text style={styles.fowDetails} numberOfLines={1}>{w.batter}</Text>
                  <Text style={styles.fowDetails}>{w.over} ov</Text>
                </View>
              ));
            })()}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.accent} size={28} />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerMainTitle}>Full Scorecard</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Robust innings rendering: */}
        {/* First Innings */}
        {teams.length >= 2 && firstInningsBattingTeamName && firstInningsBowlingTeamName && renderInnings(
          firstInningsBallHistory.length > 0 ? firstInningsBallHistory : ballHistory,
          firstInningsBattingTeamName,
          firstInningsBowlingTeamName,
          'First Innings'
        )}

        {/* Second Innings */}
        {teams.length >= 2 && firstInningsBallHistory.length > 0 && secondInningsBattingTeamName && secondInningsBowlingTeamName &&
          renderInnings(
            ballHistory,
            secondInningsBattingTeamName,
            secondInningsBowlingTeamName,
            'Second Innings'
          )}

        {/* ====== MATCH AWARDS SECTION ====== */}
        {matchCompleted && <MatchAwards
          teams={teams}
          firstInningsBallHistory={firstInningsBallHistory}
          secondInningsBallHistory={ballHistory}
          firstInningsBattingTeamName={firstInningsBattingTeamName}
          firstInningsBowlingTeamName={firstInningsBowlingTeamName}
          secondInningsBattingTeamName={secondInningsBattingTeamName}
          secondInningsBowlingTeamName={secondInningsBowlingTeamName}
        />}

      </ScrollView>

      {/* Glassmorphic Export Bar */}
      {matchCompleted && (
        <View style={styles.exportBar}>
          <TouchableOpacity style={styles.exportButton} onPress={handleDownloadScorecard}>
            <Download color={colors.textDark} size={20} />
            <Text style={styles.buttonText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}
            onPress={handleNewMatch}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>🏁 Finish</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ====== VICTORY MODAL ====== */}
      <Modal
        visible={showVictoryModal && !!matchResult}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowVictoryModal(false);
          clearMatchResult();
        }}
      >
        <View style={victoryStyles.overlay}>
          <View style={victoryStyles.card}>
            <LinearGradient
              colors={['#152A55', '#0B0E14']}
              style={victoryStyles.cardGradient}
            >
              {/* Confetti hint */}
              <Text style={victoryStyles.confettiTop}>🎉  🏆  🎉</Text>

              {/* Result heading */}
              <Text style={victoryStyles.matchOverLabel}>MATCH OVER</Text>

              <View style={victoryStyles.resultContainer}>
                <LinearGradient
                  colors={['#F9CD05', '#E11A22']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={victoryStyles.resultBadge}
                >
                  <Trophy size={28} color="#0B0E14" />
                </LinearGradient>
                <Text style={victoryStyles.resultText}>{matchResult}</Text>
              </View>

              {/* Decorative line */}
              <View style={victoryStyles.divider}>
                <LinearGradient
                  colors={[colors.accentAlt, colors.accentGold, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={victoryStyles.ctaButton}
                onPress={() => {
                  setShowVictoryModal(false);
                  clearMatchResult();
                }}
              >
                <LinearGradient
                  colors={['#F9CD05', '#E11A22']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={victoryStyles.ctaGradient}
                >
                  <Text style={victoryStyles.ctaText}>VIEW SCORECARD</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ====== NEW MATCH CONFIRMATION MODAL ====== */}
      <Modal
        visible={showNewMatchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewMatchModal(false)}
      >
        <View style={victoryStyles.overlay}>
          <View style={victoryStyles.card}>
            <LinearGradient
              colors={['#152A55', '#0B0E14']}
              style={victoryStyles.cardGradient}
            >
              <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
              <Text style={victoryStyles.matchOverLabel}>NEW MATCH</Text>
              <Text style={[victoryStyles.resultText, { fontSize: 20, marginBottom: 8 }]}>
                Start a new match?
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                All current match data including scores, overs, and player stats will be permanently cleared.
              </Text>

              <View style={victoryStyles.divider}>
                <LinearGradient
                  colors={[colors.accentAlt, colors.accentGold, colors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: colors.textSecondary, paddingVertical: 14, alignItems: 'center' }}
                  onPress={() => setShowNewMatchModal(false)}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
                  onPress={handleNewMatch}
                >
                  <LinearGradient
                    colors={['#E11A22', '#B91C1C']}
                    style={{ paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>CONFIRM</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </LinearGradient>
          </View>
        </View>
      </Modal>

      <BatsmanStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        player={selectedStatsPlayer}
        ballHistory={[...firstInningsBallHistory, ...ballHistory]}
      />

    </SafeAreaView>
  );
}

// ====== MATCH AWARDS COMPONENT ======
function MatchAwards({ teams, firstInningsBallHistory, secondInningsBallHistory, firstInningsBattingTeamName, firstInningsBowlingTeamName, secondInningsBattingTeamName, secondInningsBowlingTeamName }: any) {
  const awards = useMemo(() => {
    // Collect all players from both teams
    const allPlayers = teams.flatMap((t: any) => t.players.map((p: any) => ({ ...p, teamName: t.name })));

    // --- BEST BATSMAN ---
    // Highest runs, then highest SR as tiebreaker
    const batsmen = allPlayers
      .filter((p: any) => p.balls > 0 || p.runs > 0)
      .sort((a: any, b: any) => {
        if (b.runs !== a.runs) return b.runs - a.runs;
        const srA = a.balls > 0 ? (a.runs / a.balls) * 100 : 0;
        const srB = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
        return srB - srA;
      });
    const bestBatsman = batsmen[0] || null;

    // --- BEST BOWLER ---
    // Most wickets, then best (lowest) economy as tiebreaker
    const bowlers = allPlayers
      .filter((p: any) => p.ballsBowled > 0)
      .sort((a: any, b: any) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        const econA = a.ballsBowled > 0 ? a.runsGiven / (a.ballsBowled / 6) : 999;
        const econB = b.ballsBowled > 0 ? b.runsGiven / (b.ballsBowled / 6) : 999;
        return econA - econB; // lower economy is better
      });
    const bestBowler = bowlers[0] || null;

    // --- PLAYER OF THE MATCH ---
    // Weighted score: batting runs + (wickets * 25) + boundary bonus + SR bonus
    const playerScores = allPlayers.map((p: any) => {
      let score = 0;
      // Batting contribution
      score += p.runs * 1;
      score += p.fours * 2; // boundary bonus
      score += p.sixes * 4; // six bonus
      if (p.balls > 0) {
        const sr = (p.runs / p.balls) * 100;
        if (sr > 150) score += 15;
        else if (sr > 100) score += 8;
      }
      // Bowling contribution
      score += p.wickets * 25;
      if (p.ballsBowled > 0) {
        const econ = p.runsGiven / (p.ballsBowled / 6);
        if (econ < 4) score += 20;
        else if (econ < 6) score += 10;
      }
      return { ...p, motmScore: score };
    }).sort((a: any, b: any) => b.motmScore - a.motmScore);
    const playerOfMatch = playerScores[0] || null;

    return { bestBatsman, bestBowler, playerOfMatch };
  }, [teams]);

  if (!awards.bestBatsman && !awards.bestBowler) return null;

  const { bestBatsman, bestBowler, playerOfMatch } = awards;

  const AwardCard = ({ icon, title, player, stat, gradientColors }: { icon: React.ReactNode, title: string, player: any, stat: string, gradientColors: [string, string] }) => (
    <View style={awardStyles.card}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={awardStyles.cardGradient}
      >
        <View style={awardStyles.iconContainer}>{icon}</View>
        <Text style={awardStyles.awardTitle}>{title}</Text>
        <Text style={awardStyles.playerName} numberOfLines={1}>{player?.name || 'N/A'}</Text>
        <Text style={awardStyles.teamName} numberOfLines={1}>{player?.teamName || ''}</Text>
        <View style={awardStyles.statBadge}>
          <Text style={awardStyles.statLine}>{stat}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={awardStyles.container}>
      <Text style={awardStyles.sectionHeader}>🏆  MATCH AWARDS</Text>

      {playerOfMatch && (
        <View style={awardStyles.motmCard}>
          <LinearGradient
            colors={['#F9CD05', '#E11A22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={awardStyles.motmGradient}
          >
            <View style={awardStyles.motmBadge}>
              <Trophy size={20} color="#F9CD05" fill="#F9CD05" />
              <Text style={awardStyles.motmBadgeText}>PLAYER OF THE MATCH</Text>
            </View>
            <Text style={awardStyles.motmName}>{playerOfMatch.name}</Text>
            <Text style={awardStyles.motmTeam}>{playerOfMatch.teamName}</Text>

            <View style={awardStyles.motmStatsRow}>
              {playerOfMatch.runs > 0 && (
                <View style={awardStyles.motmStatItem}>
                  <Text style={awardStyles.motmStatVal}>{playerOfMatch.runs}</Text>
                  <Text style={awardStyles.motmStatLab}>RUNS</Text>
                </View>
              )}
              {playerOfMatch.wickets > 0 && (
                <View style={awardStyles.motmStatItem}>
                  <Text style={awardStyles.motmStatVal}>{playerOfMatch.wickets}</Text>
                  <Text style={awardStyles.motmStatLab}>WKT</Text>
                </View>
              )}
              {playerOfMatch.balls > 0 && (
                <View style={awardStyles.motmStatItem}>
                  <Text style={awardStyles.motmStatVal}>{((playerOfMatch.runs / playerOfMatch.balls) * 100).toFixed(0)}</Text>
                  <Text style={awardStyles.motmStatLab}>SR</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      )}

      <View style={awardStyles.cardsRow}>
        {bestBatsman && (
          <AwardCard
            icon={<Star size={20} color="#F9CD05" fill="#F9CD05" />}
            title="TOP BATSMAN"
            player={bestBatsman}
            stat={`${bestBatsman.runs} Runs`}
            gradientColors={['rgba(21, 42, 85, 0.8)', 'rgba(8, 17, 38, 0.9)']}
          />
        )}
        {bestBowler && (
          <AwardCard
            icon={<Award size={20} color="#38BDF8" fill="#38BDF8" />}
            title="TOP BOWLER"
            player={bestBowler}
            stat={`${bestBowler.wickets} Wkts`}
            gradientColors={['rgba(21, 42, 85, 0.8)', 'rgba(8, 17, 38, 0.9)']}
          />
        )}
      </View>
    </View>
  );
}

const awardStyles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accentGold,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 3,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 10,
  },
  awardTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  teamName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statLine: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  motmCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.5)',
    shadowColor: colors.accentGold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  motmGradient: {
    padding: 24,
    alignItems: 'center',
  },
  motmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  motmBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.accentGold,
    letterSpacing: 1,
  },
  motmName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0B0E14',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  motmTeam: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(11, 14, 20, 0.6)',
    marginTop: 4,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  motmStatsRow: {
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 14, 20, 0.1)',
    paddingTop: 16,
    width: '100%',
    justifyContent: 'center',
  },
  motmStatItem: {
    alignItems: 'center',
  },
  motmStatVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0B0E14',
  },
  motmStatLab: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(11, 14, 20, 0.5)',
    letterSpacing: 1,
  },
});

const victoryStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(249, 205, 5, 0.3)',
  },
  cardGradient: {
    padding: 32,
    alignItems: 'center',
  },
  confettiTop: {
    fontSize: 36,
    marginBottom: 16,
  },
  matchOverLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 4,
    marginBottom: 20,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  divider: {
    width: 120,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 24,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B0E14',
    letterSpacing: 2,
  },
});

const styles = StyleSheet.create({
  fowText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  inningsLabelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.9,
  },
  scoreRowLarge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 6,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  inningsContainer: {
    marginBottom: 28,
    borderRadius: 24,
    backgroundColor: colors.surfaceDeeper,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  headerSticky: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  oversText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    color: colors.accentGold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  playerCell: {
    flex: 2,
    textAlign: 'left',
    color: '#fff',
    fontWeight: '700',
  },
  playerCellName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inlineFollowBtn: {
    padding: 4,
  },
  dismissalText: {
    color: colors.accentWarn,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  exportButton: {
    backgroundColor: colors.accent,
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 24,
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerMainTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  inningsHeaderPhase: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.accentGold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.8,
  },
  inningsHeaderMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  inningsHeaderTeam: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    flex: 1,
  },
  inningsHeaderScore: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'right',
  },
  inningsHeaderOvers: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rowOdd: {
    backgroundColor: 'transparent',
  },
  colPlayer: {
    flex: 3,
  },
  colStat: {
    width: 35,
    textAlign: 'center',
  },
  colStatLarge: {
    width: 50,
    textAlign: 'right',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  srValue: {
    color: colors.accentGold,
  },
  econValue: {
    color: '#38BDF8',
  },
  fowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  fowCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 110,
  },
  fowWktNum: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.accentGold,
    marginBottom: 2,
  },
  fowScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  fowDetails: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  exportBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 14, 20, 0.95)',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    gap: 12,
  },
});

