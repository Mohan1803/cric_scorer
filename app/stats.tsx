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
  ChevronLeft, 
  Trophy, 
  Zap, 
  Target, 
  TrendingUp,
  Award,
  History,
  Activity,
  Star
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { matchService } from '../services/matchService';

export default function CareerStats() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    const data = await matchService.getPlayerStats(user!.id);
    setStats(data);
    setLoading(false);
  };

  const renderBattingStats = () => {
    // Default values if no stats exist
    const b = stats?.batting || {
      matches: 0,
      innings: 0,
      runs: 0,
      balls: 0,
      highest: 0,
      fifties: 0,
      hundreds: 0,
      thirties: 0,
      ducks: 0,
      fours: 0,
      sixes: 0,
      avg: '0.00',
      sr: '0.00'
    };

    return (
      <View style={styles.statsList}>
        {/* Top Tier Highlights */}
        <View style={styles.grid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>MATCHES</Text>
            <Text style={styles.statValue}>{b.matches}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>INNINGS</Text>
            <Text style={styles.statValue}>{b.innings}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL RUNS</Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>{b.runs}</Text>
          </View>
        </View>

        {/* Milestone Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>BATTING MILESTONES</Text>
        </View>
        <View style={styles.milestoneGrid}>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(249, 205, 5, 0.1)' }]}>
              <Trophy size={16} color={colors.accent} />
            </View>
            <Text style={styles.milestoneCount}>{b.hundreds}</Text>
            <Text style={styles.milestoneLabel}>100s</Text>
          </View>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
              <Award size={16} color="#38bdf8" />
            </View>
            <Text style={styles.milestoneCount}>{b.fifties}</Text>
            <Text style={styles.milestoneLabel}>50s</Text>
          </View>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Star size={16} color="#a855f7" />
            </View>
            <Text style={styles.milestoneCount}>{b.thirties}</Text>
            <Text style={styles.milestoneLabel}>30s</Text>
          </View>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Target size={16} color="#ef4444" />
            </View>
            <Text style={styles.milestoneCount}>{b.ducks}</Text>
            <Text style={styles.milestoneLabel}>0s (Ducks)</Text>
          </View>
        </View>

        {/* Technical Efficiency */}
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Highest Score</Text>
            <Text style={styles.rowValue}>{b.highest}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Overall Average</Text>
            <Text style={styles.rowValue}>{b.avg}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Overall Strike Rate</Text>
            <Text style={styles.rowValue}>{b.sr}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Total Balls Faced</Text>
            <Text style={styles.rowValue}>{b.balls}</Text>
          </View>
        </View>

        {/* Boundary Control */}
        <View style={styles.boundaryGrid}>
          <View style={[styles.boundaryCard, { backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
            <Text style={styles.boundaryValue}>{b.fours}</Text>
            <Text style={styles.boundaryLabel}>TOTAL 4s</Text>
          </View>
          <View style={[styles.boundaryCard, { backgroundColor: 'rgba(249, 205, 5, 0.05)' }]}>
            <Text style={styles.boundaryValue}>{b.sixes}</Text>
            <Text style={styles.boundaryLabel}>TOTAL 6s</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBowlingStats = () => {
    // Default values if no stats exist
    const bo = stats?.bowling || {
      overs: '0.0',
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
      best: { wickets: 0, runs: 0 },
      econ: '0.00',
      threeWickets: 0,
      fiveWickets: 0
    };

    return (
      <View style={styles.statsList}>
        {/* Core Bowling Stats */}
        <View style={styles.grid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>OVERS</Text>
            <Text style={styles.statValue}>{bo.overs}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WICKETS</Text>
            <Text style={[styles.statValue, { color: '#38bdf8' }]}>{bo.wickets}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ECONOMY</Text>
            <Text style={styles.statValue}>{bo.econ}</Text>
          </View>
        </View>

        {/* Wicket Hauls & Control */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HAULS & CONTROL</Text>
        </View>
        <View style={styles.milestoneGrid}>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
              <Target size={16} color="#38bdf8" />
            </View>
            <Text style={styles.milestoneCount}>{bo.threeWickets}</Text>
            <Text style={styles.milestoneLabel}>3W Hauls</Text>
          </View>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(249, 205, 5, 0.1)' }]}>
              <Trophy size={16} color={colors.accent} />
            </View>
            <Text style={styles.milestoneCount}>{bo.fiveWickets}</Text>
            <Text style={styles.milestoneLabel}>5W Hauls</Text>
          </View>
          <View style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <Zap size={16} color="#22c55e" />
            </View>
            <Text style={styles.milestoneCount}>{bo.maidens}</Text>
            <Text style={styles.milestoneLabel}>Maidens</Text>
          </View>
        </View>

        {/* Performance Detail */}
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Best Performance (BBI)</Text>
            <Text style={[styles.rowValue, { color: colors.accent }]}>
              {bo.best.wickets}/{bo.best.runs}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Total Runs Conceded</Text>
            <Text style={styles.rowValue}>{bo.runs}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.rowLabel}>Total Balls Bowled</Text>
            <Text style={styles.rowValue}>{bo.balls}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>SYNCING CAREER DASHBOARD...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#040508', '#0F172A', '#020305']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CAREER DASHBOARD</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'batting' && styles.activeTab]} 
          onPress={() => setActiveTab('batting')}
        >
          <Text style={[styles.tabText, activeTab === 'batting' && styles.activeTabText]}>BATTING</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'bowling' && styles.activeTab]} 
          onPress={() => setActiveTab('bowling')}
        >
          <Text style={[styles.tabText, activeTab === 'bowling' && styles.activeTabText]}>BOWLING</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'batting' ? renderBattingStats() : renderBowlingStats()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.05)' },
  activeTab: { borderBottomColor: colors.accent },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  activeTabText: { color: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsList: { paddingTop: 10 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginTop: 20, letterSpacing: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sectionHeader: { marginBottom: 15, marginTop: 10 },
  sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  milestoneGrid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  milestoneItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  milestoneIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  milestoneCount: { color: '#fff', fontSize: 16, fontWeight: '900' },
  milestoneLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginTop: 2 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...shadows.medium },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  rowLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  rowValue: { color: '#fff', fontSize: 15, fontWeight: '800' },
  boundaryGrid: { flexDirection: 'row', gap: 15 },
  boundaryCard: { flex: 1, borderRadius: 20, padding: 20, alignItems: 'center' },
  boundaryValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  boundaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
});
