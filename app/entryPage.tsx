import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions, Animated, Easing, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trophy,
  Play,
  Radio,
  History,
  Zap,
  ChevronRight,
  MapPin,
  User,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Plus,
  Users,
  CheckCircle2,
  BarChart2,
  TrendingUp,
  QrCode,
  RefreshCw
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useRef, useState, useEffect } from 'react';
import { getMyTeams, Team, repairTeamIndices, TeamPlayer } from '../services/teamService';
import { getUserProfile } from '../services/userService';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { matchService, FirebaseMatch } from '../services/matchService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EntryDashboard() {
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user } = useAuthStore();

  // Data State
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [recentMatches, setRecentMatches] = useState<FirebaseMatch[]>([]);
  const [stats, setStats] = useState({ wins: '0', rating: '0.0' });
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamForQR, setSelectedTeamForQR] = useState<Team | null>(null);
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState<Team | null>(null);
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [matches, userStats] = await Promise.all([
        matchService.getRecentMatches(user!.id, 3),
        matchService.getUserStats(user!.id)
      ]);
      setRecentMatches(matches);
      setStats({ wins: userStats.wins.toString(), rating: userStats.rating });
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!user) return;
    setLoadingTeams(true);
    try {
      const teams = await getMyTeams(user.id, user.email);
      setMyTeams(teams);
    } catch (e) {
      console.error('Failed to fetch teams:', e);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (isDrawerOpen && user) {
      fetchTeams();
    }
  }, [isDrawerOpen, user]);

  const toggleDrawer = (open: boolean) => {
    setIsDrawerOpen(open);
    Animated.timing(drawerAnim, {
      toValue: open ? 0 : -SCREEN_WIDTH,
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const handleAddPlayerToTeam = async () => {
    if (!selectedTeamForRoster || !newPlayerEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid player email.');
      return;
    }

    setIsAddingPlayer(true);
    try {
      const playerProfile = await getUserProfile(`user_${newPlayerEmail.split('@')[0]}`);

      const newPlayerData: TeamPlayer = {
        id: playerProfile?.id || `user_${newPlayerEmail.split('@')[0]}`,
        name: playerProfile?.name || newPlayerEmail.split('@')[0],
        email: newPlayerEmail.toLowerCase(),
        photoURL: playerProfile?.photoURL || '',
        role: 'Player'
      };

      // Check if already in team
      if (selectedTeamForRoster.players.find(p => p.email.toLowerCase() === newPlayerEmail.toLowerCase())) {
        Alert.alert('Duplicate', 'This player is already in the squad.');
        return;
      }

      const teamRef = doc(db, 'teams', selectedTeamForRoster.id!);
      await updateDoc(teamRef, {
        players: arrayUnion(newPlayerData)
      });

      // Update local state for immediate feedback
      const updatedTeam = {
        ...selectedTeamForRoster,
        players: [...selectedTeamForRoster.players, newPlayerData]
      };

      // Auto-repair indices so the new player sees the team immediately
      await repairTeamIndices(updatedTeam);

      setSelectedTeamForRoster(updatedTeam);
      setMyTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
      setNewPlayerEmail('');
      Alert.alert('Success', `${newPlayerData.name} has been drafted into the squad!`);
    } catch (e) {
      console.error('Add player failed:', e);
      Alert.alert('Error', 'Failed to add player to squad.');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, '#0F172A', '#040508']}
        style={StyleSheet.absoluteFill}
      />

      {/* Custom Drawer Overlay */}
      {isDrawerOpen && (
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => toggleDrawer(false)}
        >
          <Animated.View style={[
            styles.drawerContainer,
            {
              transform: [{ translateX: drawerAnim }],
              opacity: drawerAnim.interpolate({
                inputRange: [-SCREEN_WIDTH, 0],
                outputRange: [0, 1]
              })
            }
          ]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserInfo}>
                <View style={styles.drawerAvatar}>
                  {user?.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.drawerAvatarImg} />
                  ) : (
                    <User size={24} color={colors.accent} />
                  )}
                </View>
                <View>
                  <Text style={styles.drawerUserName}>{user?.name || 'Pro Player'}</Text>
                  <Text style={styles.drawerUserEmail}>{user?.email}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleDrawer(false)}
                style={styles.drawerCloseBtn}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionTitle}>MAIN MENU</Text>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { toggleDrawer(false); router.push('/insights'); }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                  <BarChart2 size={20} color="#a855f7" />
                </View>
                <Text style={styles.drawerItemText}>Insights</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { toggleDrawer(false); router.push('/stats'); }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                  <TrendingUp size={20} color="#38bdf8" />
                </View>
                <Text style={styles.drawerItemText}>Career Stats</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { toggleDrawer(false); router.push('/create-team' as any); }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: 'rgba(249, 205, 5, 0.1)' }]}>
                  <Plus size={20} color={colors.accent} />
                </View>
                <Text style={styles.drawerItemText}>Create New Team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { toggleDrawer(false); router.push({ pathname: '/live-matches', params: { tab: 'past' } } as any); }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                  <History size={20} color="#38bdf8" />
                </View>
                <Text style={styles.drawerItemText}>Match History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { toggleDrawer(false); router.push('/tournaments'); }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: 'rgba(249, 205, 5, 0.1)' }]}>
                  <Trophy size={20} color={colors.accent} />
                </View>
                <Text style={styles.drawerItemText}>Tournament Hub</Text>
              </TouchableOpacity>

              <View style={styles.drawerSectionHeader}>
                <Text style={styles.drawerSectionTitle}>MY TEAMS ({myTeams.length})</Text>
                <TouchableOpacity onPress={fetchTeams} disabled={loadingTeams}>
                  <RefreshCw size={12} color={colors.accent} style={{ transform: [{ rotate: loadingTeams ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
              </View>

              {loadingTeams ? (
                <View style={{ padding: 20 }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : myTeams.length === 0 ? (
                <View style={styles.drawerEmptyTeams}>
                  <Text style={styles.drawerEmptyText}>No teams created yet</Text>
                </View>
              ) : (
                myTeams.map((team) => {
                  const isOwner = team.ownerId === user?.id;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={styles.drawerItem}
                      onPress={() => setSelectedTeamForRoster(team)}
                    >
                      <View style={[styles.drawerItemIconBox, { backgroundColor: isOwner ? 'rgba(249, 205, 5, 0.1)' : 'rgba(56, 189, 248, 0.1)' }]}>
                        <Users size={18} color={isOwner ? colors.accent : '#38bdf8'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.drawerItemText}>{team.name}</Text>
                        {isOwner && <Text style={styles.ownerBadgeText}>CAPTAIN</Text>}
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedTeamForQR(team);
                        }}
                        style={{ padding: 10 }}
                      >
                        <QrCode size={18} color={colors.accent} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}

              <View style={styles.drawerDivider} />

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => { toggleDrawer(false); useAuthStore.getState().logout(); }}
              >
                <View style={[styles.drawerItemIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <LogOut size={20} color={colors.accentWarn} />
                </View>
                <Text style={styles.drawerItemText}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Pressable>
      )}

      {/* Main Dashboard Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainContent}
      >
        <View style={styles.dashboardHeader}>
          <View style={styles.brandContainer}>
            <TouchableOpacity
              onPress={() => toggleDrawer(true)}
              style={styles.menuToggle}
            >
              <Menu color="#fff" size={28} />
            </TouchableOpacity>
            <View>
              <Text style={styles.brandName}>ONE SCORER</Text>
              <Text style={styles.brandTag}>THE PRO NETWORK</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.headerAvatar}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.headerAvatarImg} />
              ) : (
                <User size={20} color={colors.accent} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Hero Section with REAL Stats */}
        <LinearGradient
          colors={['rgba(249, 205, 5, 0.15)', 'rgba(249, 205, 5, 0.05)']}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Welcome Back,</Text>
              <Text style={styles.heroName}>{user?.name?.split(' ')[0] || 'Player'}</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Trophy size={16} color={colors.accent} />
                <Text style={styles.statValue}>{loading ? '..' : stats.wins}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statBox}>
                <Zap size={16} color="#38bdf8" />
                <Text style={styles.statValue}>{loading ? '..' : stats.rating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Main Actions */}


        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/match-setup')}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              style={styles.actionGradient}
            >
              <Play color="#fff" size={32} fill="#fff" />
              <Text style={styles.actionTitle}>START MATCH</Text>
              <Text style={styles.actionDesc}>Begin a new pro game</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.actionColumn}>
            <TouchableOpacity
              style={styles.actionCardSmall}
              onPress={() => router.push('/live-matches')}
            >
              <LinearGradient
                colors={['#38bdf8', '#0ea5e9']}
                style={styles.actionGradientSmall}
              >
                <Radio color="#fff" size={24} />
                <Text style={styles.actionTitleSmall}>LIVE SCORES</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardSmall}
              onPress={() => router.push('/create-team')}
            >
              <LinearGradient
                colors={['#f472b6', '#db2777']}
                style={styles.actionGradientSmall}
              >
                <PlusCircle color="#fff" size={24} />
                <Text style={styles.actionTitleSmall}>CREATE TEAM</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* REAL Recent Matches Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT GAMES</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/live-matches', params: { tab: 'past' } } as any)}>
            <Text style={styles.seeAll}>SEE ALL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.matchesList}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          ) : recentMatches.length === 0 ? (
            <View style={styles.emptyMatchCard}>
              <History size={32} color="rgba(255,255,255,0.1)" />
              <Text style={styles.emptyMatchText}>No matches played yet.</Text>
              <TouchableOpacity onPress={() => router.push('/match-setup')}>
                <Text style={styles.emptyMatchAction}>Start your first match</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentMatches.map((match) => (
              <TouchableOpacity key={match.id} style={styles.matchItem}>
                <View style={styles.matchStatus}>
                  <CheckCircle2 size={12} color="#22c55e" />
                  <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
                </View>
                <View style={styles.matchTeams}>
                  <View style={styles.matchTeam}>
                    <Text style={styles.matchTeamName}>{match.team1.name}</Text>
                    <Text style={styles.matchScore}>{match.team1.score}/{match.team1.wickets}</Text>
                  </View>
                  <Text style={styles.matchVs}>VS</Text>
                  <View style={styles.matchTeam}>
                    <Text style={styles.matchTeamName}>{match.team2.name}</Text>
                    <Text style={styles.matchScore}>{match.team2.score}/{match.team2.wickets}</Text>
                  </View>
                </View>
                <View style={styles.matchFooter}>
                  <MapPin size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.matchVenue} numberOfLines={1}>{match.venue || 'Unknown Ground'}</Text>
                  <View style={styles.footerFlex} />
                  <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Team Roster Modal */}
      <Modal
        visible={!!selectedTeamForRoster}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTeamForRoster(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rosterModal}>
            <View style={styles.rosterHeader}>
              <View>
                <Text style={styles.rosterTitle}>{selectedTeamForRoster?.name.toUpperCase()}</Text>
                <Text style={styles.rosterSub}>SQUAD ROSTER ({selectedTeamForRoster?.players.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.rosterCloseBtn}
                onPress={() => setSelectedTeamForRoster(null)}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {selectedTeamForRoster?.ownerId === user?.id && (
              <View style={styles.rosterAddSection}>
                <View style={styles.rosterInputWrapper}>
                  <Plus size={16} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={styles.rosterInput}
                    value={newPlayerEmail}
                    onChangeText={setNewPlayerEmail}
                    placeholder="Recruit by Email..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.rosterAddBtn}
                    onPress={handleAddPlayerToTeam}
                    disabled={isAddingPlayer}
                  >
                    {isAddingPlayer ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.rosterAddBtnText}>DRAFT</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <ScrollView style={styles.rosterList} showsVerticalScrollIndicator={false}>
              {selectedTeamForRoster?.players.map((player, idx) => (
                <View key={player.id || idx} style={styles.rosterItem}>
                  <View style={styles.rosterPlayerInfo}>
                    <View style={styles.rosterAvatar}>
                      {player.photoURL ? (
                        <Image source={{ uri: player.photoURL }} style={styles.rosterAvatarImg} />
                      ) : (
                        <View style={styles.rosterAvatarPlaceholder}>
                          <Text style={styles.rosterAvatarLetter}>{player.name[0].toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={styles.rosterPlayerName}>{player.name}</Text>
                      <Text style={styles.rosterPlayerRole}>{(player.role || 'Player').toUpperCase()}</Text>
                    </View>
                  </View>
                  {player.id === selectedTeamForRoster.ownerId && (
                    <View style={styles.captainBadge}>
                      <Trophy size={10} color={colors.accent} />
                      <Text style={styles.captainBadgeText}>OWNER</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.rosterActionBtn}
              onPress={() => {
                const teamId = selectedTeamForRoster?.id;
                setSelectedTeamForRoster(null);
                toggleDrawer(false);
                router.push({ pathname: '/match-setup', params: { teamId } } as any);
              }}
            >
              <LinearGradient
                colors={[colors.accent, '#b45309']}
                style={styles.rosterActionGradient}
              >
                <Text style={styles.rosterActionText}>START MATCH WITH THIS TEAM</Text>
                <Play size={18} color="#000" fill="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Team QR Modal */}
      <Modal
        visible={!!selectedTeamForQR}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTeamForQR(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedTeamForQR(null)}
        >
          <View style={styles.qrModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>TEAM IDENTITY</Text>
            <Text style={styles.modalSub}>{selectedTeamForQR?.name.toUpperCase()}</Text>

            <View style={styles.qrContainer}>
              {selectedTeamForQR && (
                <QRCode
                  value={selectedTeamForQR.id}
                  size={200}
                  color={colors.accent}
                  backgroundColor="#fff"
                />
              )}
            </View>

            <Text style={styles.qrDesc}>
              Other captains can scan this QR to instantly import your squad for a match.
            </Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedTeamForQR(null)}
            >
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  qrModal: { width: '100%', backgroundColor: '#1E293B', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  modalSub: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 30 },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 20, marginBottom: 30 },
  qrDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  closeBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000 },
  drawerContainer: { width: SCREEN_WIDTH * 0.8, height: '100%', backgroundColor: '#0F172A', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  drawerHeader: { padding: 30, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)' },
  drawerUserInfo: { flex: 1 },
  drawerAvatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(249, 205, 5, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: colors.accent, overflow: 'hidden' },
  drawerAvatarImg: { width: '100%', height: '100%' },
  drawerUserName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  drawerUserEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  drawerCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  drawerContent: { flex: 1, padding: 20 },
  drawerSectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15, marginTop: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  drawerItemIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  drawerItemText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  drawerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 15 },
  drawerEmptyTeams: { padding: 20, alignItems: 'center' },
  drawerEmptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic' },
  mainContent: { padding: 24 },
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuToggle: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  brandName: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  brandTag: { color: colors.accent, fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  headerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  headerAvatarImg: { width: '100%', height: '100%' },
  heroCard: { borderRadius: 30, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(249, 205, 5, 0.1)' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  statsContainer: { flexDirection: 'row', gap: 12 },
  statBox: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, alignItems: 'center', minWidth: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', marginTop: 2 },
  actionGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  actionCard: { flex: 1.2, height: 180, borderRadius: 30, overflow: 'hidden', ...shadows.medium },
  actionGradient: { flex: 1, padding: 24, justifyContent: 'flex-end' },
  actionTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 16 },
  actionDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },
  actionColumn: { flex: 1, gap: 16 },
  actionCardSmall: { flex: 1, borderRadius: 24, overflow: 'hidden', ...shadows.small },
  actionGradientSmall: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionTitleSmall: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  seeAll: { color: colors.accent, fontSize: 11, fontWeight: '900' },
  matchesList: { gap: 16 },
  matchItem: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  matchStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  statusText: { color: '#22c55e', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  matchTeams: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  matchTeam: { flex: 1, alignItems: 'center' },
  matchTeamName: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  matchScore: { color: '#fff', fontSize: 22, fontWeight: '900' },
  matchVs: { color: colors.accent, fontSize: 12, fontWeight: '900', paddingHorizontal: 20 },
  matchFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  matchVenue: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
  footerFlex: { flex: 1 },
  emptyMatchCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 40, alignItems: 'center', gap: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyMatchText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
  emptyMatchAction: { color: colors.accent, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  drawerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
    paddingRight: 10,
  },
  ownerBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },
  rosterModal: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    bottom: 0,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rosterTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rosterSub: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 2,
  },
  rosterAddSection: {
    marginBottom: 20,
  },
  rosterInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 50,
  },
  rosterInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  rosterAddBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rosterAddBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  rosterCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterList: {
    marginBottom: 24,
  },
  rosterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rosterPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rosterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rosterAvatarImg: {
    width: '100%',
    height: '100%',
  },
  rosterAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
  },
  rosterAvatarLetter: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  rosterPlayerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  rosterPlayerRole: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  captainBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
  },
  rosterActionBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.medium,
  },
  rosterActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  rosterActionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});