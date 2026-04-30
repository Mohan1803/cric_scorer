import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2,
  ChevronLeft,
  Zap,
  Target,
  TrendingUp,
  Award,
  History
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { matchService } from '../services/matchService';
import WagonWheel from '../components/WagonWheel';

export default function PlayerInsights() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const data = await matchService.getPlayerInsights(user!.id);
      setInsights(data);
    } catch (e) {
      console.error('Failed to fetch insights:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>SYNCING CLOUD PERFORMANCE DATA...</Text>
      </View>
    );
  }

  const hasData = insights && (insights.totalBalls > 0);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#040508', '#0F172A', '#020305']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRO INSIGHTS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasData ? (
          <View style={styles.emptyState}>
            <History size={64} color="rgba(255,255,255,0.05)" />
            <Text style={styles.emptyTitle}>No Performance Data</Text>
            <Text style={styles.emptyDesc}>Play matches to unlock your Wagon Wheel and shot analytics.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/match-setup')}>
              <Text style={styles.emptyActionText}>Start a Match</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Target color={colors.accent} size={20} />
                <Text style={styles.cardTitle}>WAGON WHEEL (ACTUAL DATA)</Text>
              </View>
              <WagonWheel
                balls={insights.wagonWheelBalls}
                size={Dimensions.get('window').width - 80}
                isLeftHanded={user?.battingHand === 'left'}
              />
            </View>

            <View style={styles.grid}>
              <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
                <View style={styles.cardHeader}>
                  <Target color="#38bdf8" size={18} />
                  <Text style={styles.cardTitleSmall}>DOMINANT REGION</Text>
                </View>
                <Text style={styles.statLarge} numberOfLines={1}>{insights.bestRegion?.name || 'N/A'}</Text>
                <Text style={styles.statSub}>{insights.bestRegion?.runs || 0} Runs Scored</Text>
              </View>

              <View style={[styles.card, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.cardHeader}>
                  <Zap color="#fb923c" size={18} />
                  <Text style={styles.cardTitleSmall}>PRIMARY SHOT</Text>
                </View>
                <Text style={styles.statLarge} numberOfLines={1}>{insights.shotStats[0]?.type || 'N/A'}</Text>
                <Text style={styles.statSub}>Avg. {insights.shotStats[0]?.avg || 0} Runs</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <TrendingUp color={colors.accent} size={20} />
                <Text style={styles.cardTitle}>SHOT PRODUCTIVITY</Text>
              </View>
              {insights.shotStats.length === 0 ? (
                <Text style={styles.noDataText}>No shot data recorded yet.</Text>
              ) : (
                insights.shotStats.map((shot: any, idx: number) => (
                  <View key={idx} style={styles.shotRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shotName}>{shot.type.toUpperCase()}</Text>
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${(shot.runs / insights.totalRuns) * 100}%` }]} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.shotRuns}>{shot.runs} Runs</Text>
                      <Text style={styles.shotAvg}>{shot.avg} Avg</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <History color={colors.accent} size={20} />
                <Text style={styles.cardTitle}>LAST 5 MATCHES PERFORMANCE</Text>
              </View>
              
              <View style={styles.recentGrid}>
                <View style={styles.recentSection}>
                  <Text style={styles.recentSubHeader}>BATTING</Text>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Total Runs</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.batting.runs}</Text>
                  </View>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Average</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.batting.avg}</Text>
                  </View>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Strike Rate</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.batting.sr}</Text>
                  </View>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>4s / 6s</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.batting.fours} / {insights.last5Matches.batting.sixes}</Text>
                  </View>
                </View>

                <View style={styles.recentDivider} />

                <View style={styles.recentSection}>
                  <Text style={styles.recentSubHeader}>BOWLING</Text>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Wickets</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.bowling.wickets}</Text>
                  </View>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Overs</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.bowling.overs}</Text>
                  </View>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Economy</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.bowling.econ}</Text>
                  </View>
                  <View style={styles.recentStatRow}>
                    <Text style={styles.recentStatLabel}>Runs Given</Text>
                    <Text style={styles.recentStatValue}>{insights.last5Matches.bowling.runs}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Award color="#f472b6" size={20} />
                <Text style={styles.cardTitle}>SQUAD METRICS</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Balls Faced</Text>
                <Text style={styles.metricValue}>{insights.totalBalls}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Runs Scored</Text>
                <Text style={styles.metricValue}>{insights.totalRuns}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Strike Rate (Est.)</Text>
                <Text style={styles.metricValue}>
                  {insights.totalBalls > 0 ? ((insights.totalRuns / insights.totalBalls) * 100).toFixed(1) : '0.0'}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginTop: 20, letterSpacing: 1 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...shadows.medium },
  grid: { flexDirection: 'row', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cardTitleSmall: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statLarge: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
  shotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  shotName: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  shotRuns: { color: '#fff', fontSize: 14, fontWeight: '900' },
  shotAvg: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700' },
  progressBarContainer: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  metricLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  noDataText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 24 },
  emptyDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  emptyAction: { marginTop: 32, backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 100 },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  recentGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  recentSection: { flex: 1 },
  recentSubHeader: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  recentStatRow: { marginBottom: 12 },
  recentStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  recentStatValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  recentDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20 },
});
