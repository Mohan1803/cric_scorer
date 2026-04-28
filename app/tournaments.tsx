import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Trophy, 
  Users, 
  Calendar, 
  ChevronLeft, 
  Plus, 
  QrCode, 
  ChevronRight,
  PlusCircle,
  Clock,
  MapPin,
  X,
  Target
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { 
  createTournament, 
  getMyTournaments, 
  getTournamentFixtures, 
  Tournament, 
  TournamentFixture 
} from '../services/tournamentService';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

export default function TournamentHub() {
  const { user } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [fixtures, setFixtures] = useState<TournamentFixture[]>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // New Tournament State
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentDesc, setNewTournamentDesc] = useState('');

  useEffect(() => {
    if (user) {
      loadTournaments();
    }
  }, [user]);

  const loadTournaments = async () => {
    setLoading(true);
    const data = await getMyTournaments(user!.id);
    setTournaments(data);
    setLoading(false);
  };

  const handleCreateTournament = async () => {
    if (!newTournamentName.trim()) {
      Alert.alert('Error', 'Please enter a tournament name.');
      return;
    }

    const tournamentId = await createTournament({
      name: newTournamentName.trim(),
      description: newTournamentDesc.trim(),
      organizerId: user!.id,
      rules: {
        overs: 20,
        ballsPerOver: 6,
        maxPlayers: 15
      },
      status: 'upcoming'
    });

    if (tournamentId) {
      setShowCreateModal(false);
      setNewTournamentName('');
      setNewTournamentDesc('');
      loadTournaments();
      Alert.alert('Success', 'Tournament created! Share the ID or QR with teams.');
    }
  };

  const selectTournament = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setLoadingFixtures(true);
    const data = await getTournamentFixtures(tournament.id!);
    setFixtures(data);
    setLoadingFixtures(false);
  };

  const renderTournamentCard = (tournament: Tournament) => (
    <TouchableOpacity 
      key={tournament.id} 
      style={styles.tournamentCard}
      onPress={() => selectTournament(tournament)}
    >
      <LinearGradient
        colors={['rgba(249, 205, 5, 0.1)', 'rgba(249, 205, 5, 0.02)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardHeader}>
        <View style={styles.trophyIcon}>
          <Trophy color={colors.accent} size={20} />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.cardName}>{tournament.name}</Text>
          <Text style={styles.cardTeams}>{tournament.teamIds?.length || 0} TEAMS REGISTERED</Text>
        </View>
        <ChevronRight color="rgba(255,255,255,0.2)" size={20} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#040508', '#0F172A', '#020305']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TOURNAMENT HUB</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus color={colors.accent} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!selectedTournament ? (
          <>
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Manage Your Leagues</Text>
              <Text style={styles.heroSub}>Create tournaments, schedule matches, and track professional career stats.</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY TOURNAMENTS</Text>
              <View style={styles.sectionLine} />
            </View>

            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
            ) : tournaments.length === 0 ? (
              <View style={styles.emptyState}>
                <Target size={48} color="rgba(255,255,255,0.05)" />
                <Text style={styles.emptyText}>No tournaments created</Text>
                <TouchableOpacity 
                  style={styles.createBtnInline}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createBtnInlineText}>CREATE YOUR FIRST LEAGUE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              tournaments.map(renderTournamentCard)
            )}
          </>
        ) : (
          <View style={styles.detailsContainer}>
            <TouchableOpacity 
              style={styles.backToLeagues}
              onPress={() => setSelectedTournament(null)}
            >
              <ChevronLeft color={colors.accent} size={16} />
              <Text style={styles.backToLeaguesText}>BACK TO ALL LEAGUES</Text>
            </TouchableOpacity>

            <View style={styles.tournamentDetailHeader}>
              <Text style={styles.detailName}>{selectedTournament.name}</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{selectedTournament.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <QrCode color={colors.accent} size={20} />
                <Text style={styles.actionCardTitle}>Invite Teams</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Calendar color="#38bdf8" size={20} />
                <Text style={styles.actionCardTitle}>Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Users color="#a855f7" size={20} />
                <Text style={styles.actionCardTitle}>Standings</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fixtureSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>UPCOMING FIXTURES</Text>
                <View style={styles.sectionLine} />
              </View>

              {loadingFixtures ? (
                <ActivityIndicator color={colors.accent} />
              ) : fixtures.length === 0 ? (
                <View style={styles.emptyFixtures}>
                  <Calendar size={32} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptyFixturesText}>No matches scheduled yet</Text>
                </View>
              ) : (
                fixtures.map((fixture) => (
                  <View key={fixture.id} style={styles.fixtureCard}>
                    <View style={styles.fixtureTeams}>
                        <Text style={styles.fixtureTeam}>Team A</Text>
                        <Text style={styles.fixtureVs}>VS</Text>
                        <Text style={styles.fixtureTeam}>Team B</Text>
                    </View>
                    <View style={styles.fixtureFooter}>
                        <Clock size={12} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.fixtureInfo}>TOMORROW, 10:00 AM</Text>
                        <View style={{ width: 10 }} />
                        <MapPin size={12} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.fixtureInfo} numberOfLines={1}>{fixture.venue}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE LEAGUE</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color="rgba(255,255,255,0.5)" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>TOURNAMENT NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. City Premier League"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={newTournamentName}
              onChangeText={setNewTournamentName}
            />

            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="About this tournament..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={newTournamentDesc}
              onChangeText={setNewTournamentDesc}
              multiline
            />

            <TouchableOpacity 
              style={styles.modalSaveBtn}
              onPress={handleCreateTournament}
            >
              <Text style={styles.modalSaveBtnText}>FINALIZE & CREATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(249, 205, 5, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { padding: 25 },
  heroSection: { marginBottom: 40 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 22, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.accent, letterSpacing: 1.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(249, 205, 5, 0.1)' },
  tournamentCard: { borderRadius: 24, padding: 20, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  trophyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(249, 205, 5, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cardTeams: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginTop: 4 },
  emptyState: { padding: 60, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, marginTop: 15 },
  createBtnInline: { marginTop: 25, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  createBtnInlineText: { color: '#000', fontSize: 12, fontWeight: '900' },
  detailsContainer: { flex: 1 },
  backToLeagues: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backToLeaguesText: { color: colors.accent, fontSize: 11, fontWeight: '900', marginLeft: 8 },
  tournamentDetailHeader: { marginBottom: 30 },
  detailName: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
  statusText: { color: '#22c55e', fontSize: 9, fontWeight: '900' },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  actionCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  actionCardTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginTop: 10 },
  fixtureSection: { flex: 1 },
  emptyFixtures: { padding: 40, alignItems: 'center' },
  emptyFixturesText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 15 },
  fixtureCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fixtureTeams: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  fixtureTeam: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  fixtureVs: { color: colors.accent, fontSize: 12, fontWeight: '900', marginHorizontal: 15 },
  fixtureFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  fixtureInfo: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#1E293B', borderRadius: 32, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 20, color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalSaveBtn: { backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 20, alignItems: 'center', ...shadows.medium },
  modalSaveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});
