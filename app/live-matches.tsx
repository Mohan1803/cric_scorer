import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  Trophy, 
  MapPin, 
  Award, 
  Activity, 
  Radio, 
  Users, 
  Clock,
  ArrowRight
} from 'lucide-react-native';
import { colors } from './theme';
import { listenForLiveMatches, listenForPastMatches, type GlobalMatch } from '../services/matchSyncService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LiveMatches() {
  const [matches, setMatches] = useState<GlobalMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    let unsubscribe: () => void;

    if (activeTab === 'live') {
      unsubscribe = listenForLiveMatches((data) => {
        setMatches(data);
        setLoading(false);
        setRefreshing(false);
      });
    } else {
      unsubscribe = listenForPastMatches(20, (data) => {
        setMatches(data);
        setLoading(false);
        setRefreshing(false);
      });
    }

    return () => unsubscribe();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    // onSnapshot will handle the update, we just set the UI state
  };

  const renderMatchCard = ({ item }: { item: GlobalMatch }) => (
    <View style={styles.matchCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={styles.cardGradient}
      />
      
      <View style={styles.cardHeader}>
        <View style={styles.tournamentBadge}>
          <Award size={12} color={colors.accentGold} />
          <Text style={styles.tournamentText}>{item.tournamentName || 'Local Match'}</Text>
        </View>
        {item.status === 'live' ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <View style={[styles.liveBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Clock size={10} color={colors.textSecondary} />
            <Text style={[styles.liveText, { color: colors.textSecondary }]}>FINISHED</Text>
          </View>
        )}
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.teamInfo}>
          <Text style={[styles.teamName, item.battingTeam === item.team1 && styles.activeTeam]} numberOfLines={1}>
            {item.team1}
          </Text>
          <Text style={styles.scoreText}>{item.score1}</Text>
        </View>
        
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamInfo}>
          <Text style={[styles.teamName, item.battingTeam === item.team2 && styles.activeTeam]} numberOfLines={1}>
            {item.team2}
          </Text>
          <Text style={styles.scoreText}>{item.score2}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Activity size={14} color={colors.textSecondary} />
          <Text style={styles.statLabel}>Overs: {item.overs}</Text>
        </View>
        <View style={styles.statItem}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={styles.statLabel} numberOfLines={1}>{item.groundName || 'Unknown Ground'}</Text>
        </View>
      </View>

      {item.status === 'completed' && item.matchResult && (
        <View style={styles.resultBadge}>
          <Trophy size={14} color={colors.accentGold} />
          <Text style={styles.resultText}>{item.matchResult}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.watchButton}
        activeOpacity={0.8}
        onPress={() => router.push(`/match-viewer/${item.id}` as any)}
      >
        <LinearGradient
          colors={[colors.accent, colors.accentAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.watchGradient}
        >
          <Text style={styles.watchButtonText}>Watch Scorecard</Text>
          <ArrowRight size={16} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Radio size={20} color={colors.accentAlt} />
          <Text style={styles.headerTitle}>Global Matches</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'live' && styles.activeTab]} 
          onPress={() => setActiveTab('live')}
        >
          <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>Live Now</Text>
          {activeTab === 'live' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]} 
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Recent Results</Text>
          {activeTab === 'past' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Fetching live matches...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            {activeTab === 'live' ? <Activity size={64} color="rgba(255,255,255,0.1)" /> : <Clock size={64} color="rgba(255,255,255,0.1)" />}
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'live' ? 'No Live Matches' : 'No Past Matches'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'live' 
              ? 'Be the first to start a match and broadcast it to the world!' 
              : 'Completed matches will appear here once they finish syncing.'}
          </Text>
          
          {activeTab === 'live' && (
            <TouchableOpacity 
              style={styles.startMatchButton}
              onPress={() => router.replace('/entryPage')}
            >
              <Text style={styles.startMatchText}>Start Your Match</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    position: 'relative',
  },
  activeTab: {
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.accentAlt,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accentAlt,
    borderRadius: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 15,
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tournamentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  tournamentText: {
    color: colors.accentGold,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  teamInfo: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  activeTeam: {
    color: colors.textPrimary,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  vsContainer: {
    width: 40,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    gap: 20,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  watchButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  watchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  watchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  startMatchButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  startMatchText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
  },
  resultText: {
    color: colors.accentGold,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  }
});
