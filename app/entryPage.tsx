import { useState, useEffect } from 'react';
import { getMatchData } from './firebaseService';
import * as Print from 'expo-print';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users, Hash, Settings2, Shield, Calendar, Zap, Search } from 'lucide-react-native';
import { useTeamLibraryStore } from '../store/teamLibraryStore';
import { Team } from '../store/gameStore';

export default function TeamEntry() {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [overs, setOvers] = useState('');
  const {
    setTeams,
    setTotalOvers,
    enableAnimations,
    enableSounds,
    setEnableAnimations,
    setEnableSounds,
    hasHydrated,
    matchCompleted,
    teams,
    startNewMatch
  } = useGameStore();

  // Removed resume logic - now handled in index.tsx



  const { getTeamsByQuery } = useTeamLibraryStore();
  const [team1Suggestions, setTeam1Suggestions] = useState<Team[]>([]);
  const [team2Suggestions, setTeam2Suggestions] = useState<Team[]>([]);
  const [team1Players, setTeam1Players] = useState<any[]>([]);
  const [team2Players, setTeam2Players] = useState<any[]>([]);

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
        <td>
          ${p.name}${isBatting && p.isOut === false ? ' (not out)' : ''}
          ${isBatting && p.isOut && p.dismissalDetail ? `<br/><small style="color: #666; font-size: 10px;">${p.dismissalDetail}</small>` : ''}
        </td>
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
      const legalBalls = balls.filter((ball: any) => !ball.isExtra || (ball.isExtra && (ball.extraType === 'bye' || ball.extraType === 'lb' || ball.extraType === 'penalty'))).length;
      const totalOvers = Math.floor(legalBalls / 6);
      const currentBalls = legalBalls % 6;
      let wides = 0, noBalls = 0, legByes = 0, byes = 0, penalty = 0;
      balls.forEach((ball: any) => {
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
      type Wicket = { runs: number; number: number; batter: string; over: string; detail: string };
      const wickets = balls.map((ball: any, i: number) => (ball.isWicket ? {
        runs: balls.slice(0, i + 1).reduce((sum: number, b: any) => sum + b.runs + (b.isExtra ? 1 : 0), 0),
        number: balls.filter((b: any, idx: number) => b.isWicket && idx <= i).length,
        batter: ball.batter || '',
        over: (() => {
          const legalBalls = balls.slice(0, i + 1).filter((b: any) => !b.isExtra).length;
          return `${Math.floor((legalBalls - 1) / 6)}.${(legalBalls - 1) % 6}`;
        })(),
        detail: ball.dismissalDetail || ''
      } : null)).filter((w: any): w is Wicket => w !== null);
      const fowSection = `<h3>Fall of Wickets</h3><p>${wickets.length > 0
        ? wickets.map((w: any) => `${w.runs}/${w.number} (${w.batter}${w.detail ? ', ' + w.detail : ''}, ${w.over})`).join('; ')
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
    }
    let html = `
      <html>
      <head>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
          body {
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 40px;
            background: #FFFFFF;
            color: #1E293B;
          }
          .teams-header {
            border-bottom: 3px solid #EE2A34;
            padding: 20px 0;
            text-align: left;
            margin-bottom: 30px;
          }
          .teams-header h1 {
            margin: 0;
            font-size: 32px;
            color: #EE2A34;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .teams-header h2 {
            margin: 10px 0 0;
            font-size: 20px;
            color: #0F172A;
            font-weight: 700;
          }
          .teams-header p {
            margin: 5px 0 0;
            color: #64748B;
            font-size: 14px;
            font-weight: 600;
          }
          .section {
            margin-bottom: 30px;
            border: 1px solid #E2E8F0;
          }
          .section h2 {
            padding: 10px 15px;
            background: #F1F5F9;
            margin: 0;
            font-size: 18px;
            color: #0F172A;
            border-bottom: 2px solid #CBD5E1;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
          }
          th {
            background: #F8FAFC;
            text-align: center;
            padding: 10px;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #E2E8F0;
          }
          td {
            padding: 10px;
            border: 1px solid #F1F5F9;
            font-size: 13px;
            color: #334155;
            text-align: center;
          }
          .fow, .extras {
            padding: 15px;
            background: #FFFFFF;
            font-size: 12px;
            color: #475569;
            line-height: 1.5;
            border-top: 1px solid #E2E8F0;
          }
          .empty-innings {
            padding: 20px;
            color: #94A3B8;
            font-style: italic;
            text-align: center;
          }
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

    startNewMatch();

    setTeams([
      { name: team1Name, players: team1Players },
      { name: team2Name, players: team2Players },
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.accent, colors.accentAlt]}
            style={styles.iconBadge}
          >
            <Trophy size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Match Setup</Text>
          <Text style={styles.headerSubtitle}>Configure your match details below</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Settings2 size={20} color={colors.accent} />
            <Text style={styles.cardTitle}>Match Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Team 1 Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={team1Name}
              onChangeText={(text) => {
                setTeam1Name(text);
                setTeam1Suggestions(getTeamsByQuery(text));
              }}
              onFocus={() => {
                if (team1Name) setTeam1Suggestions(getTeamsByQuery(team1Name));
              }}
              // placeholder="e.g. Royal Challengers"
              // placeholderTextColor="rgba(148, 163, 184, 0.4)"
              maxLength={30}
            />
            {team1Suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {team1Suggestions.map((team, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setTeam1Name(team.name);
                      setTeam1Players(team.players);
                      setTeam1Suggestions([]);
                    }}
                  >
                    <Users size={14} color={colors.accent} />
                    <Text style={styles.suggestionText}>{team.name}</Text>
                    <Text style={styles.suggestionSubtext}>{team.players.length} players</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Team 2 Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={team2Name}
              onChangeText={(text) => {
                setTeam2Name(text);
                setTeam2Suggestions(getTeamsByQuery(text));
              }}
              onFocus={() => {
                if (team2Name) setTeam2Suggestions(getTeamsByQuery(team2Name));
              }}
              // placeholder="e.g. Mumbai Indians"
              // placeholderTextColor="rgba(148, 163, 184, 0.4)"
              maxLength={30}
            />
            {team2Suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {team2Suggestions.map((team, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setTeam2Name(team.name);
                      setTeam2Players(team.players);
                      setTeam2Suggestions([]);
                    }}
                  >
                    <Users size={14} color={colors.accent} />
                    <Text style={styles.suggestionText}>{team.name}</Text>
                    <Text style={styles.suggestionSubtext}>{team.players.length} players</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Hash size={16} color={colors.textSecondary} />
              <Text style={styles.label}>Number of Overs</Text>
            </View>
            <TextInput
              style={styles.input}
              value={overs}
              onChangeText={setOvers}
              placeholder="e.g. 20"
              placeholderTextColor="rgba(148, 163, 184, 0.4)"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.settingsRow}>
            <TouchableOpacity
              style={[styles.settingItem, !enableAnimations && styles.settingDisabled]}
              onPress={() => setEnableAnimations(!enableAnimations)}
            >
              <Zap size={16} color={enableAnimations ? colors.accent : colors.textMuted} />
              <Text style={[styles.settingText, !enableAnimations && { color: colors.textMuted }]}>Animations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, !enableSounds && styles.settingDisabled]}
              onPress={() => setEnableSounds(!enableSounds)}
            >
              <Shield size={16} color={enableSounds ? colors.accentSecondary : colors.textMuted} />
              <Text style={[styles.settingText, !enableSounds && { color: colors.textMuted }]}>Sounds</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.button} onPress={handleContinue}>
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue to Players</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { marginTop: 24, borderLeftWidth: 4, borderLeftColor: colors.accentAlt }]}>
          <View style={styles.cardHeader}>
            <Zap size={20} color={colors.accentAlt} />
            <Text style={styles.cardTitle}>LBW Visual Tracking</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
            Use DRS-style ball tracking to verify LBW decisions with video recording.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, { marginTop: 0 }]}
            onPress={() => router.push('/lbw-recorder' as any)}
          >
            <LinearGradient
              colors={[colors.accentAlt, '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Record LBW Video</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, { marginTop: 12, backgroundColor: 'rgba(124, 58, 237, 0.1)', borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.3)' }]}
            onPress={() => router.push('/lbw-demo' as any)}
          >
            <View style={styles.buttonGradient}>
              <Text style={[styles.buttonText, { color: colors.accentAlt }]}>View Animation Demo</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerInfo}>
          <Shield size={16} color={colors.textSecondary} />
          <Text style={styles.footerText}>Secure scoring environment active</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  button: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  settingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(21, 42, 85, 0.95)',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionText: {
    color: colors.textPrimary,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  suggestionSubtext: {
    color: colors.textSecondary,
    fontSize: 10,
  },
});