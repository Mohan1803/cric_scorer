import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';

export default function FullScorecard() {
  const {
    teams,
    battingTeam,
    bowlingTeam,
    ballHistory,
    firstInningsBallHistory,
    currentInnings,
    matchCompleted,
    target,
    startNewMatch
  } = useGameStore();




  // const generateHTML = () => {
  //   const firstInningsTeam = teams.find(team => team.name === (currentInnings === 1 ? battingTeam : bowlingTeam));
  //   const secondInningsTeam = teams.find(team => team.name === (currentInnings === 1 ? bowlingTeam : battingTeam));
  //   const firstBowlingTeam = teams.find(team => team.name === (currentInnings === 1 ? bowlingTeam : battingTeam));
  //   const secondBowlingTeam = teams.find(team => team.name === (currentInnings === 1 ? battingTeam : bowlingTeam));

  //   const generateBattingTable = (team: any) => `
  //     <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
  //       <thead>
  //         <tr style="background-color: #2196F3; color: white;">
  //           <th style="padding: 10px; text-align: left;">Batsman</th>
  //           <th style="padding: 10px; text-align: left;">Runs</th>
  //           <th style="padding: 10px; text-align: left;">Balls</th>
  //           <th style="padding: 10px; text-align: left;">4s</th>
  //           <th style="padding: 10px; text-align: left;">6s</th>
  //           <th style="padding: 10px; text-align: left;">SR</th>
  //         </tr>
  //       </thead>
  //       <tbody>
  //         ${team?.players.map((player: any) => `
  //           <tr style="border: 1px solid #ddd; padding: 10px; background-color: ${player.isOut ? '#f2dede' : 'white'};">
  //             <td style="padding: 10px;">${player.name}</td>
  //             <td style="padding: 10px;">${player.runs}</td>
  //             <td style="padding: 10px;">${player.balls}</td>
  //             <td style="padding: 10px;">${player.fours}</td>
  //             <td style="padding: 10px;">${player.sixes}</td>
  //             <td style="padding: 10px;">${player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}</td>
  //           </tr>
  //         `).join('')}
  //       </tbody>
  //     </table>
  //   `;

  //   const generateBowlingTable = (team: any) => `
  //     <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
  //       <thead>
  //         <tr style="background-color: #2196F3; color: white;">
  //           <th style="padding: 10px; text-align: left;">Bowler</th>
  //           <th style="padding: 10px; text-align: left;">Overs</th>
  //           <th style="padding: 10px; text-align: left;">Runs</th>
  //           <th style="padding: 10px; text-align: left;">Wickets</th>
  //           <th style="padding: 10px; text-align: left;">Econ</th>
  //         </tr>
  //       </thead>
  //       <tbody>
  //         ${team?.players
  //           .filter((p: any) => p.ballsBowled > 0)
  //           .map((player: any) => {
  //             const overs = Math.floor(player.ballsBowled / 6);
  //             const balls = player.ballsBowled % 6;
  //             const econ = (player.ballsBowled > 0)
  //               ? (player.runsGiven / (player.ballsBowled / 6)).toFixed(1)
  //               : '0.0';

  //             return `
  //               <tr style="border: 1px solid #ddd; padding: 10px;">
  //                 <td style="padding: 10px;">${player.name}</td>
  //                 <td style="padding: 10px;">${overs}.${balls}</td>
  //                 <td style="padding: 10px;">${player.runsGiven}</td>
  //                 <td style="padding: 10px;">${player.wickets}</td>
  //                 <td style="padding: 10px;">${econ}</td>
  //               </tr>
  //             `;
  //           }).join('')}
  //       </tbody>
  //     </table>
  //   `;

  //   return `
  //     <html>
  //       <head>
  //         <style>
  //           body {
  //             font-family: 'Arial', sans-serif;
  //             padding: 20px;
  //             background-color: #f4f4f4;
  //             color: #333;
  //           }
  //           h1 {
  //             text-align: center;
  //             color: #2196F3;
  //             font-size: 30px;
  //             margin-bottom: 20px;
  //           }
  //           .innings-header {
  //             font-size: 24px;
  //             font-weight: bold;
  //             color:rgb(14, 101, 223);
  //             margin: 20px 0;
  //           }
  //           table {
  //             width: 100%;
  //             border-collapse: collapse;
  //             margin: 20px 0;
  //             border-radius: 5px;
  //             box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  //           }
  //           th, td {
  //             padding: 12px;
  //             text-align: left;
  //           }
  //           th {
  //             background-color: #2196F3;
  //             color: white;
  //           }
  //           tr:nth-child(even) {
  //             background-color: #f9f9f9;
  //           }
  //           tr:hover {
  //             background-color: #e0f7fa;
  //           }
  //         </style>
  //       </head>
  //       <body>
  //         <h1>Cricket Match Scorecard</h1>

  //         <div class="innings-header">First Innings: ${firstInningsTeam?.name}</div>
  //         <h3>Batting</h3>
  //         ${generateBattingTable(firstInningsTeam)}
  //         <h3>Bowling</h3>
  //         ${generateBowlingTable(firstBowlingTeam)}

  //         ${currentInnings === 2 || matchCompleted ? `
  //           <div class="innings-header">Second Innings: ${secondInningsTeam?.name}</div>
  //           <h3>Batting</h3>
  //           ${generateBattingTable(secondInningsTeam)}
  //           <h3>Bowling</h3>
  //           ${generateBowlingTable(secondBowlingTeam)}
  //         ` : ''}
  //       </body>
  //     </html>
  //   `;
  // };


  const generateHTML = () => {
    const firstInningsTeam = teams.find(team => team.name === (currentInnings === 1 ? battingTeam : bowlingTeam));
    const secondInningsTeam = teams.find(team => team.name === (currentInnings === 1 ? bowlingTeam : battingTeam));
    const firstBowlingTeam = teams.find(team => team.name === (currentInnings === 1 ? bowlingTeam : battingTeam));
    const secondBowlingTeam = teams.find(team => team.name === (currentInnings === 1 ? battingTeam : bowlingTeam));

    const getTopScorer = (players: any[]) =>
      players.reduce((top, p) => (p.runs > (top?.runs || 0) ? p : top), null);

    const getTopBowler = (players: any[]) =>
      players.reduce((top, p) => (p.wickets > (top?.wickets || 0) ? p : top), null);

    const generateBattingTable = (team: any) => {
      const topScorer = getTopScorer(team?.players || []);
      return `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #2196F3; color: white;">
            <th style="padding: 10px;">Batsman</th>
            <th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>SR Bar</th>
          </tr>
        </thead>
        <tbody>
          ${team?.players.map((p: any) => {
        const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
        const barWidth = Math.min(Number(sr), 200);
        const isTopScorer = p.name === topScorer?.name;
        return `
              <tr style="background-color: ${p.isOut ? '#f2dede' : 'white'}; ${isTopScorer ? 'font-weight: bold; background-color: #d0f0c0;' : ''}">
                <td>${p.name}</td>
                <td>${p.runs}</td>
                <td>${p.balls}</td>
                <td>${p.fours}</td>
                <td>${p.sixes}</td>
                <td>${sr}</td>
                <td>
                  <div style="height: 10px; width: 100px; background-color: #eee;">
                    <div style="height: 100%; width: ${barWidth / 2}%; background-color: #4CAF50;"></div>
                  </div>
                </td>
              </tr>
            `;
      }).join('')}
        </tbody>
      </table>`;
    };

    const generateBowlingTable = (team: any) => {
      const topBowler = getTopBowler(team?.players || []);
      const maxOvers = Math.max(...team?.players.map((p: any) => Math.floor(p.ballsBowled / 6) + (p.ballsBowled % 6) / 6) || []);

      return `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #2196F3; color: white;">
            <th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th><th>Overs Bar</th>
          </tr>
        </thead>
        <tbody>
          ${team?.players
          .filter((p: any) => p.ballsBowled > 0)
          .map((p: any) => {
            const overs = Math.floor(p.ballsBowled / 6);
            const balls = p.ballsBowled % 6;
            const econ = p.ballsBowled > 0 ? (p.runsGiven / (p.ballsBowled / 6)).toFixed(1) : '0.0';
            const oversDecimal = overs + balls / 6;
            const barWidth = maxOvers ? (oversDecimal / maxOvers) * 100 : 0;
            const isTopBowler = p.name === topBowler?.name;

            return `
                <tr style="${isTopBowler ? 'font-weight: bold; background-color: #fff8dc;' : ''}">
                  <td>${p.name}</td>
                  <td>${overs}.${balls}</td>
                  <td>${p.runsGiven}</td>
                  <td>${p.wickets}</td>
                  <td>${econ}</td>
                  <td>
                    <div style="height: 10px; width: 100px; background-color: #eee;">
                      <div style="height: 100%; width: ${barWidth}%; background-color: #2196F3;"></div>
                    </div>
                  </td>
                </tr>
              `;
          }).join('')}
        </tbody>
      </table>`;
    };

    return `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              padding: 20px;
              background-color: #f4f4f4;
              color: #333;
            }
            h1 {
              text-align: center;
              color: #2196F3;
              font-size: 30px;
              margin-bottom: 20px;
            }
            .innings-header {
              font-size: 24px;
              font-weight: bold;
              color: rgb(14, 101, 223);
              margin: 20px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              border-radius: 5px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            th, td {
              padding: 12px;
              text-align: center;
            }
            th {
              background-color: #2196F3;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #e0f7fa;
            }
          </style>
        </head>
        <body>
          <h1>Cricket Match Scorecard</h1>
          
          <div class="innings-header">First Innings: ${firstInningsTeam?.name}</div>
          <h3>Batting</h3>
          ${generateBattingTable(firstInningsTeam)}
          <h3>Bowling</h3>
          ${generateBowlingTable(firstBowlingTeam)}
  
          ${currentInnings === 2 || matchCompleted ? `
            <div class="innings-header">Second Innings: ${secondInningsTeam?.name}</div>
            <h3>Batting</h3>
            ${generateBattingTable(secondInningsTeam)}
            <h3>Bowling</h3>
            ${generateBowlingTable(secondBowlingTeam)}
          ` : ''}
        </body>
      </html>
    `;
  };


  const handleExport = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error exporting scorecard:', error);
    }
  };

  const handleNewMatch = () => {
    startNewMatch();
    router.replace('/');
  };

  const renderInnings = (inningsBallHistory: typeof ballHistory, inningsBattingTeam: string, inningsBowlingTeam: string) => {
    const battingTeamObj = teams.find(team => team.name === inningsBattingTeam);
    const bowlingTeamObj = teams.find(team => team.name === inningsBowlingTeam);

    const totalScore = inningsBallHistory.reduce((sum, ball) => sum + ball.runs + (ball.isExtra ? 1 : 0), 0);
    const totalWickets = inningsBallHistory.filter(ball => ball.isWicket).length;
    const totalOvers = Math.floor(inningsBallHistory.filter(ball => !ball.isExtra).length / 6);
    const currentBalls = inningsBallHistory.filter(ball => !ball.isExtra).length % 6;

    return (
      <View style={styles.inningsContainer}>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {inningsBattingTeam} {totalScore}/{totalWickets}
          </Text>
          <Text style={styles.oversText}>
            ({totalOvers}.{currentBalls} Overs)
          </Text>
        </View>

        {/* Batting Statistics */}
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
          {battingTeamObj?.players.map((player, index) => {
            const strikeRate = player.balls > 0
              ? ((player.runs / player.balls) * 100).toFixed(1)
              : '0.0';

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.playerCell]}>{player.name}</Text>
                <Text style={styles.cell}>{player.runs}</Text>
                <Text style={styles.cell}>{player.balls}</Text>
                <Text style={styles.cell}>{player.fours}</Text>
                <Text style={styles.cell}>{player.sixes}</Text>
                <Text style={styles.cell}>{strikeRate}</Text>
              </View>
            );
          })}
        </View>

        {/* Bowling Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bowling</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.playerCell]}>Bowler</Text>
            <Text style={styles.cell}>O</Text>
            <Text style={styles.cell}>R</Text>
            <Text style={styles.cell}>W</Text>
            <Text style={styles.cell}>Econ</Text>
          </View>
          {bowlingTeamObj?.players.map((player, index) => {
            const overs = Math.floor(player.ballsBowled / 6);
            const balls = player.ballsBowled % 6;
            const economy = player.ballsBowled > 0
              ? ((player.runsGiven / (player.ballsBowled / 6)) || 0).toFixed(1)
              : '0.0';

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.playerCell]}>{player.name}</Text>
                <Text style={styles.cell}>{overs}.{balls}</Text>
                <Text style={styles.cell}>{player.runsGiven}</Text>
                <Text style={styles.cell}>{player.wickets}</Text>
                <Text style={styles.cell}>{economy}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* First Innings */}
      {renderInnings(
        currentInnings === 1 ? ballHistory : firstInningsBallHistory,
        currentInnings === 1 ? battingTeam! : bowlingTeam!,
        currentInnings === 1 ? bowlingTeam! : battingTeam!
      )}

      {/* Second Innings */}
      {(currentInnings === 2 || matchCompleted) && renderInnings(
        ballHistory,
        battingTeam!,
        bowlingTeam!
      )}

      {/* Export and New Match Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.buttonText}>Export Scorecard</Text>
        </TouchableOpacity>

        {matchCompleted && (
          <TouchableOpacity style={styles.newMatchButton} onPress={handleNewMatch}>
            <Text style={styles.buttonText}>Start New Match</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inningsContainer: {
    marginBottom: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  oversText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 5,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
  },
  playerCell: {
    flex: 2,
    textAlign: 'left',
  },
  buttonContainer: {
    padding: 15,
    gap: 10,
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  newMatchButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});