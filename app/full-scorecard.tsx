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
  ScrollView
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { colors } from './theme';

export default function FullScorecard() {
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
      const totalScore = balls.reduce((sum, ball) => sum + ball.runs + (ball.isExtra ? 1 : 0), 0);
      const totalWickets = balls.filter(ball => ball.isWicket).length;
      const legalBalls = balls.filter(ball => !ball.isExtra).length;
      const totalOvers = Math.floor(legalBalls / 6);
      const currentBalls = legalBalls % 6;

      let wides = 0, noBalls = 0, legByes = 0, byes = 0;
      balls.forEach(ball => {
        if (ball.extraType === 'wide') wides += ball.runs;
        if (ball.extraType === 'no ball') noBalls += ball.runs;
        if (ball.extraType === 'leg bye') legByes += ball.runs;
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

    const firstInningsBatting = teams[0];
    const firstInningsBowling = teams[1];
    const secondInningsBatting = teams[1];
    const secondInningsBowling = teams[0];
    // Always export both innings: firstInningsBallHistory for first, ballHistory for second (if available)
    const firstInningsBalls = firstInningsBallHistory.length > 0 ? firstInningsBallHistory : ballHistory;
    const secondInningsBalls = firstInningsBallHistory.length > 0 ? ballHistory : [];

    const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2, h3 { color: #1a237e; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #888; padding: 6px 10px; text-align: center; }
          th { background: #e3e6fc; }
          .section { margin-bottom: 28px; }
          ul { margin-bottom: 18px; }
          .empty-innings { color: #b71c1c; font-style: italic; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Full Scorecard</h1>
        ${getMatchMetaHtml()}
        <div class="section">
          <h2>First Innings</h2>
          ${makeInningsHtml('First Innings', firstInningsBatting, firstInningsBowling, firstInningsBalls) || '<div class="empty-innings">No data for this innings.</div>'}
        </div>
        <div class="section">
          <h2>Second Innings</h2>
          ${makeInningsHtml('Second Innings', secondInningsBatting, secondInningsBowling, secondInningsBalls) || '<div class="empty-innings">No data for this innings.</div>'}
        </div>
      </body>
    </html>
  `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      ToastAndroid.show('Failed to export scorecard', ToastAndroid.LONG);
    }
  };

  // Debug: log histories
  const {
    teams,
    battingTeam,
    bowlingTeam,
    ballHistory,
    firstInningsBallHistory,
    startNewMatch,
  } = useGameStore();
  console.log('[FullScorecard] ballHistory:', ballHistory);
  console.log('[FullScorecard] firstInningsBallHistory:', firstInningsBallHistory);

  // Always show both innings, regardless of currentInningsNumber
  const firstInningsTeam = useMemo(
    () => teams.find(team => team.name === battingTeam),
    [teams, battingTeam]
  );
  const secondInningsTeam = useMemo(
    () => teams.find(team => team.name === bowlingTeam),
    [teams, bowlingTeam]
  );



  const showToast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);


  const handleNewMatch = () => {
    showToast('Starting new match');
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
      (sum, ball) => sum + ball.runs + (ball.isExtra ? 1 : 0),
      0
    );
    const totalWickets = inningsBallHistory.filter(ball => ball.isWicket).length;
    const legalBalls = inningsBallHistory.filter(ball => !ball.isExtra).length;
    const totalOvers = Math.floor(legalBalls / 6);
    const currentBalls = legalBalls % 6;

    return (
      <View style={styles.inningsContainer}>
        <View style={styles.headerSticky}>
          <Text style={styles.headerText}>
            {inningsBattingTeam} {totalScore}/{totalWickets}
          </Text>
          <Text style={styles.oversText}>({totalOvers}.{currentBalls} Overs)</Text>
        </View>

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
            keyExtractor={(item) => item.name}
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
            keyExtractor={(item) => item.name}
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
                runs: balls.slice(0, i + 1).reduce((sum, b) => sum + b.runs + (b.isExtra ? 1 : 0), 0),
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
    <ScrollView contentContainerStyle={styles.container}>

      {/* Robust innings rendering: */}
      {/* First Innings: Always use teams[0] as batting team, teams[1] as bowling team */}
      {teams.length >= 2 && renderInnings(
        firstInningsBallHistory.length > 0 ? firstInningsBallHistory : ballHistory,
        teams[0].name,
        teams[1].name,
        'First Innings'
      )}

      {/* Second Innings: Always use teams[1] as batting team, teams[0] as bowling team */}
      {teams.length >= 2 && firstInningsBallHistory.length > 0 &&
        renderInnings(
          ballHistory,
          teams[1].name,
          teams[0].name,
          'Second Innings'
        )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleDownloadScorecard}>
          <Text style={styles.buttonText}>Download Scorecard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={handleNewMatch}>
          <Text style={styles.buttonText}>New Match</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  fowText: {
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginVertical: 4,
  },
  container: {
    padding: 20,
  },
  inningsContainer: {
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    elevation: 2,
  },
  headerSticky: {
    padding: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  oversText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 5,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.accentAlt,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  topScorerRow: {
    backgroundColor: colors.accentAlt,
  },
  topBowlerRow: {
    backgroundColor: colors.success,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  playerCell: {
    flex: 2,
    textAlign: 'left',
    color: colors.textPrimary,
  },
  topScorerBadge: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
  },
  topBowlerBadge: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 16,
  },
  notOutBadge: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 12,
  },
  outBadge: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonContainer: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 170,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  backButtonText: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 18,
  },
});
