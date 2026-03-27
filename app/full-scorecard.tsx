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
import { ChevronLeft, Download } from 'lucide-react-native';

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
  currentInningsNumber,
} = useGameStore();
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
        <td>${p.name}${isBatting && p.isOut === false ? ' (not out)' : ''}</td>
        ${isBatting
          ? `<td>${p.runs}</td><td>${p.balls}</td><td>${p.fours}</td><td>${p.sixes}</td><td>${p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0'}</td>`
          : `<td>${Math.floor(p.ballsBowled / 6)}.${p.ballsBowled % 6}</td><td>${p.runsGiven}</td><td>${p.wickets}</td><td>${p.ballsBowled > 0 ? (p.runsGiven / (p.ballsBowled / 6)).toFixed(1) : '0.0'}</td>`}
      </tr>`
      ).join('');

    const makeInningsHtml = (label: string, battingTeam: any, bowlingTeam: any, balls: any[]) => {
      if (!battingTeam || !bowlingTeam || balls.length === 0) return '';
      const totalScore = balls.reduce((sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0), 0);
      const totalWickets = balls.filter(ball => ball.isWicket).length;
      const legalBalls = balls.filter(ball => !ball.isExtra).length;
      const totalOvers = Math.floor(legalBalls / 6);
      const currentBalls = legalBalls % 6;

      let wides = 0, noBalls = 0, legByes = 0, byes = 0;
      balls.forEach(ball => {
        if (ball.extraType === 'wide') wides += (1 + ball.runs);
        if (ball.extraType === 'no-ball') noBalls += (1 + ball.runs);
        if (ball.extraType === 'leg bye' || ball.extraType === 'lb') legByes += ball.runs;
        if (ball.extraType === 'bye') byes += ball.runs;
      });
      const extras = wides + noBalls + legByes + byes;

      const battingTable = `
        <table border="1" cellpadding="4" cellspacing="0">
          <tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
          ${getTableRows(battingTeam.players, true)}
        </table>
      `;

      const bowlingTable = `
        <table border="1" cellpadding="4" cellspacing="0">
          <tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr>
          ${getTableRows(bowlingTeam.players.filter((p: any) => p.ballsBowled > 0), false)}
        </table>
      `;

      // Fall of Wickets (FOW)
      type Wicket = { runs: number; number: number; batter: string; over: string };
      const wickets: Wicket[] = balls.map((ball, i) => (ball.isWicket ? {
        runs: balls.slice(0, i + 1).reduce((sum, b) => sum + b.runs + (b.isExtra ? 1 : 0), 0),
        number: balls.filter((b, idx) => b.isWicket && idx <= i).length,
        batter: ball.batter || '',
        over: (() => {
          const legalBalls = balls.slice(0, i + 1).filter(b => !b.isExtra).length;
          return `${Math.floor((legalBalls - 1) / 6)}.${(legalBalls - 1) % 6}`;
        })()
      } : null))
        .filter((w): w is Wicket => w !== null);
      const fowSection = `<h3>Fall of Wickets</h3><p>${wickets.length > 0
        ? wickets.map(w => `${w.runs}/${w.number} (${w.batter}, ${w.over})`).join('; ')
        : 'None'}</p>`;

      return `
      <h2>${label}: ${battingTeam.name} ${totalScore}/${totalWickets} (${totalOvers}.${currentBalls} ov)</h2>
      ${battingTable}
      ${bowlingTable}
      ${fowSection}
      <h3>Extras</h3>
      <p>Total: ${extras}${wides ? `, Wides: ${wides}` : ''}${noBalls ? `, No Balls: ${noBalls}` : ''}${legByes ? `, Leg Byes: ${legByes}` : ''}${byes ? `, Byes: ${byes}` : ''}</p>
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
            padding: 20px;
            background: #0A0E1A;
            color: #FFFFFF;
          }
          .card {
            background: #111827;
            border-radius: 16px;
            margin-bottom: 24px;
            overflow: hidden;
            border: 1px solid rgba(6, 182, 212, 0.2);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          }
          .header {
            background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%);
            padding: 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            color: #0A0E1A;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0;
            color: rgba(10, 14, 26, 0.8);
            font-weight: 500;
          }
          .innings-title {
            padding: 16px 24px;
            background: rgba(6, 182, 212, 0.1);
            border-bottom: 1px solid rgba(6, 182, 212, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .innings-title h2 {
            margin: 0;
            font-size: 20px;
            color: #06B6D4;
          }
          .score-label {
            font-size: 22px;
            font-weight: 700;
            color: #FFFFFF;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th {
            background: rgba(255, 255, 255, 0.05);
            text-align: left;
            padding: 12px 16px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 14px;
          }
          .fow, .extras {
            padding: 16px 24px;
            background: rgba(255, 255, 255, 0.02);
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.6;
          }
          .section-label {
            color: #06B6D4;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.4);
            font-size: 12px;
          }
          .winner-banner {
            background: rgba(16, 185, 129, 0.1);
            color: #10B981;
            padding: 12px;
            text-align: center;
            font-weight: 600;
            border-radius: 8px;
            margin-bottom: 24px;
            border: 1px solid rgba(16, 185, 129, 0.3);
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
  
  console.log('[FullScorecard] ballHistory:', ballHistory);
  console.log('[FullScorecard] firstInningsBallHistory:', firstInningsBallHistory);

  const firstInningsBattingTeamName = currentInningsNumber === 1 ? battingTeam : bowlingTeam;
  const firstInningsBowlingTeamName = currentInningsNumber === 1 ? bowlingTeam : battingTeam;
  const secondInningsBattingTeamName = currentInningsNumber === 2 ? battingTeam : bowlingTeam;
  const secondInningsBowlingTeamName = currentInningsNumber === 2 ? bowlingTeam : battingTeam;

  const showNotice = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      alert(msg);
    }
  };


  const handleNewMatch = () => {
    showNotice('Starting new match');
    startNewMatch();
    router.replace('/');
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
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerSticky}
        >
          <Text style={styles.inningsLabelText}>{inningsLabel}</Text>
          <View style={styles.scoreRowLarge}>
            <Text style={styles.headerText}>
              {inningsBattingTeam} {totalScore}/{totalWickets}
            </Text>
            <Text style={styles.oversText}>({totalOvers}.{currentBalls})</Text>
          </View>
        </LinearGradient>

        {/* Batting Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batting</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.playerCell]}>Batter</Text>
            <Text style={styles.cell}>R</Text>
            <Text style={styles.cell}>B</Text>
            <Text style={styles.cell}>4s</Text>
            <Text style={styles.cell}>6s</Text>
            <Text style={styles.cell}>SR</Text>
          </View>
          <FlatList
            data={battingTeamObj.players}
            keyExtractor={(item) => item.id}
            renderItem={({ item: player }) => {
              const strikeRate = player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0';
              return (
                <View style={styles.tableRow}>
                  <Text style={[styles.cell, styles.playerCell]}>{player.name}</Text>
                  <Text style={styles.cell}>{player.runs}</Text>
                  <Text style={styles.cell}>{player.balls}</Text>
                  <Text style={styles.cell}>{player.fours}</Text>
                  <Text style={styles.cell}>{player.sixes}</Text>
                  <Text style={styles.cell}>{strikeRate}</Text>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No batting data.</Text>}
          />
        </View>

        {/* Bowling Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bowling</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.playerCell]}>Bowler</Text>
            <Text style={styles.cell}>O</Text>
            <Text style={styles.cell}>R</Text>
            <Text style={styles.cell}>W</Text>
            <Text style={styles.cell}>Econ</Text>
          </View>
          <FlatList
            data={bowlingTeamObj.players.filter(p => p.ballsBowled > 0)}
            keyExtractor={(item) => item.id}
            renderItem={({ item: player }) => {
              const overs = Math.floor(player.ballsBowled / 6);
              const balls = player.ballsBowled % 6;
              const economy = player.ballsBowled > 0
                ? (player.runsGiven / (player.ballsBowled / 6)).toFixed(1)
                : '0.0';
              return (
                <View style={styles.tableRow}>
                  <Text style={[styles.cell, styles.playerCell]}>{player.name}</Text>
                  <Text style={styles.cell}>{overs}.{balls}</Text>
                  <Text style={styles.cell}>{player.runsGiven}</Text>
                  <Text style={styles.cell}>{player.wickets}</Text>
                  <Text style={styles.cell}>{economy}</Text>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No bowling data.</Text>}
          />
        </View>

        {/* Fall of Wickets (FOW) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fall of Wickets</Text>
          <Text style={styles.fowText}>{(() => {
            const balls = inningsBallHistory;
            const wickets = balls
              .map((ball, i) => ball.isWicket ? ({
                runs: balls.slice(0, i + 1).reduce((sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0), 0),
                number: balls.filter((b, idx) => b.isWicket && idx <= i).length,
                batter: ball.batsmanName || '',
                over: (() => {
                  const legalBalls = balls.slice(0, i + 1).filter(b => !b.isExtra).length;
                  return `${Math.floor((legalBalls - 1) / 6)}.${(legalBalls - 1) % 6}`;
                })()
              }) : null)
              .filter((w) => w !== null);
            return wickets.length > 0
              ? wickets.map(w => w ? `${w.runs}/${w.number} (${w.batter}, ${w.over})` : '').filter(Boolean).join('; ')
              : 'None';
          })()}</Text>
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

      {matchCompleted && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.exportButton} onPress={handleDownloadScorecard}>
            <Text style={styles.buttonText}>Download Scorecard</Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  fowText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  inningsLabelText: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
  },
  scoreRowLarge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  container: {
    padding: 16,
  },
  inningsContainer: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.1)',
  },
  headerSticky: {
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textDark,
  },
  oversText: {
    fontSize: 16,
    color: colors.textDark,
    opacity: 0.9,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 14,
  },
  playerCell: {
    flex: 2,
    textAlign: 'left',
    color: colors.textPrimary,
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
    marginRight: 40, // Offset for the back button to keep title centered
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
