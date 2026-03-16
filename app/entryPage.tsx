import { useState } from 'react';
import { getMatchData } from './firebaseService';
import * as Print from 'expo-print';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';

export default function TeamEntry() {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [overs, setOvers] = useState('');
  const setTeams = useGameStore((state) => state.setTeams);
  const setTotalOvers = useGameStore((state) => state.setTotalOvers);

  const downloadMatchPDF = (matchData: any, matchName: string) => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };
    const teams = matchData.teams || [];
    const firstInningsBalls = matchData.firstInningsBallHistory || [];
    const secondInningsBalls = matchData.ballHistory || [];
    const firstInningsBatting = teams[0];
    const firstInningsBowling = teams[1];
    const secondInningsBatting = teams[1];
    const secondInningsBowling = teams[0];
    function getTableRows(players: any[], isBatting: boolean) {
      return players.map((p: any) =>
        `<tr>
        <td>${p.name}${isBatting && p.isOut === false ? ' (not out)' : ''}</td>
        ${isBatting
          ? `<td>${p.runs}</td><td>${p.balls}</td><td>${p.fours}</td><td>${p.sixes}</td><td>${p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0'}</td>`
          : `<td>${Math.floor(p.ballsBowled / 6)}.${p.ballsBowled % 6}</td><td>${p.runsGiven}</td><td>${p.wickets}</td><td>${p.ballsBowled > 0 ? (p.runsGiven / (p.ballsBowled / 6)).toFixed(1) : '0.0'}</td>`}
      </tr>`
      ).join('');
    }
    function makeInningsHtml(label: string, battingTeam: any, bowlingTeam: any, balls: any[]) {
      if (!battingTeam || !bowlingTeam || balls.length === 0) return '';
      const totalScore = balls.reduce((sum, ball) => sum + ball.runs + (ball.isExtra ? 1 : 0), 0);
      const totalWickets = balls.filter((ball: any) => ball.isWicket).length;
      const legalBalls = balls.filter((ball: any) => !ball.isExtra).length;
      const totalOvers = Math.floor(legalBalls / 6);
      const currentBalls = legalBalls % 6;
      let wides = 0, noBalls = 0, legByes = 0, byes = 0;
      balls.forEach((ball: any) => {
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
      const wickets = balls.map((ball: any, i: number) => (ball.isWicket ? {
        runs: balls.slice(0, i + 1).reduce((sum: number, b: any) => sum + b.runs + (b.isExtra ? 1 : 0), 0),
        number: balls.filter((b: any, idx: number) => b.isWicket && idx <= i).length,
        batter: ball.batter || '',
        over: (() => {
          const legalBalls = balls.slice(0, i + 1).filter((b: any) => !b.isExtra).length;
          return `${Math.floor((legalBalls - 1) / 6)}.${(legalBalls - 1) % 6}`;
        })()
      } : null)).filter((w: any): w is Wicket => w !== null);
      const fowSection = `<h3>Fall of Wickets</h3><p>${wickets.length > 0
        ? wickets.map((w: any) => `${w.runs}/${w.number} (${w.batter}, ${w.over})`).join('; ')
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
    }
    let html = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; background: #f7f7f7; }
          h1, h2, h3 { color: #24527a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #fff; }
          th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: center; }
          th { background: #e3eefc; }
          .section { margin-bottom: 32px; }
          .extras, .fow { font-size: 14px; color: #555; }
          .empty-innings { color: #999; font-style: italic; }
          .teams-header { font-size: 20px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="teams-header">
          <h1>Full Match Scorecard</h1>
          <h2>${teams?.map((t: any) => t.name).join(' vs ')}</h2>
          <p>Date: ${formatDate(new Date(matchData.matchDate || Date.now()))}</p>
        </div>
        <div class="section">
          <h2>First Innings</h2>
          ${makeInningsHtml('First Innings', firstInningsBatting, firstInningsBowling, firstInningsBalls) || '<div class="empty-innings">No data for this innings.</div>'}
        </div>
        <div class="section">
          <h2>Second Innings</h2>
          ${makeInningsHtml('Second Innings', secondInningsBatting, secondInningsBowling, secondInningsBalls) || '<div class="empty-innings">No data for this innings.</div>'}
        </div>
      </body>
    </html>`;
    Print.printAsync({ html });
  };

  const handleContinue = () => {
    if (!team1Name.trim() || !team2Name.trim() || !overs.trim()) {
      Alert.alert('Error', 'Please enter both team names and number of overs');
      return;
    }

    if (team1Name.trim() === team2Name.trim()) {
      Alert.alert('Error', 'Team names must be different');
      return;
    }

    const numOvers = parseInt(overs);
    if (isNaN(numOvers) || numOvers < 1) {
      Alert.alert('Error', 'Please enter a valid number of overs');
      return;
    }

    setTeams([
      { name: team1Name, players: [] },
      { name: team2Name, players: [] },
    ]);
    setTotalOvers(numOvers);
    
    router.push('/players');
  };

  const [downloadMatchName, setDownloadMatchName] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadMatch = async () => {
    if (!downloadMatchName.trim()) {
      Alert.alert('Error', 'Enter a match name to download');
      return;
    }
    setDownloading(true);
    const matchData = await getMatchData(downloadMatchName.trim());
    setDownloading(false);
    if (!matchData) {
      Alert.alert('Not found', 'No match found with that name');
      return;
    }
    downloadMatchPDF(matchData, downloadMatchName.trim());
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Download Previous Match Scorecard</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Match Name</Text>
          <TextInput
            style={styles.input}
            value={downloadMatchName}
            onChangeText={setDownloadMatchName}
            placeholder="e.g. TeamA_TeamB_2025-05-05"
            placeholderTextColor={colors.textSecondary}
            maxLength={50}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleDownloadMatch} disabled={downloading}>
          <Text style={styles.buttonText}>{downloading ? 'Downloading...' : 'Download Scorecard PDF'}</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
        <Text style={styles.title}>Enter Match Details</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Team 1 Name</Text>
        <TextInput
          style={styles.input}
          value={team1Name}
          onChangeText={setTeam1Name}
          placeholder="Enter team 1 name"
          placeholderTextColor={colors.textSecondary}
          maxLength={30}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Team 2 Name</Text>
        <TextInput
          style={styles.input}
          value={team2Name}
          onChangeText={setTeam2Name}
          placeholder="Enter team 2 name"
          placeholderTextColor={colors.textSecondary}
          maxLength={30}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Number of Overs</Text>
        <TextInput
          style={styles.input}
          value={overs}
          onChangeText={setOvers}
          placeholder="Enter number of overs"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: colors.accent,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.textDark,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    
    
    
  },
});