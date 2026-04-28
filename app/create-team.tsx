import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users, 
  UserPlus, 
  Mail, 
  QrCode, 
  Trash2, 
  ChevronLeft, 
  Check,
  Search,
  Scan,
  X
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { findUserProfileByEmail, getUserProfile } from '../services/userService';
import { createTeam } from '../services/teamService';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CreateTeam() {
  const { user } = useAuthStore();
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasInitializedOwner, setHasInitializedOwner] = useState(false);

  // Auto-add the owner (current user) to the team by default
  React.useEffect(() => {
    if (user && !hasInitializedOwner) {
      setPlayers([{
        id: user.id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'Captain'
      }]);
      setHasInitializedOwner(true);
    }
  }, [user, hasInitializedOwner]);

  const handleAddByEmail = async () => {
    if (!lookupEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSearching(true);
    try {
      const profile = await findUserProfileByEmail(lookupEmail);
      if (profile) {
        if (players.find(p => p.id === profile.id)) {
          Alert.alert('Already Added', 'This player is already in the team.');
        } else {
          setPlayers([...players, {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            photoURL: profile.photoURL,
            role: profile.role
          }]);
          setLookupEmail('');
        }
      } else {
        Alert.alert('Not Found', 'No player found with this email address.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search for player.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    setLoading(true);
    try {
      // Data should be the User ID
      const profile = await getUserProfile(data);
      if (profile) {
        if (players.find(p => p.id === profile.id)) {
          Alert.alert('Already Added', 'This player is already in the team.');
        } else {
          setPlayers([...players, {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            photoURL: profile.photoURL,
            role: profile.role
          }]);
        }
      } else {
        Alert.alert('Invalid QR', 'No player found for this QR code.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch player details.');
    } finally {
      setLoading(false);
    }
  };

  const [savedTeamId, setSavedTeamId] = useState('');
  
  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Missing Name', 'Please enter a team name.');
      return;
    }
    if (players.length === 0) {
      Alert.alert('Empty Team', 'Please add at least one player.');
      return;
    }

    setLoading(true);
    try {
      const teamId = await createTeam({
        name: teamName.trim(),
        ownerId: user!.id,
        players
      });

      if (teamId) {
        setSavedTeamId(teamId);
        // Instant redirect for professional speed
        router.replace('/entryPage');
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setShowScanner(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#040508', '#0F172A', '#080A0F']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE NEW TEAM</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Team Identity Card */}
        <View style={styles.identityCard}>
          <LinearGradient
            colors={['rgba(6, 182, 212, 0.1)', 'rgba(0, 0, 0, 0.5)']}
            style={styles.cardGradient}
          />
          <Text style={styles.label}>TEAM FRANCHISE IDENTITY</Text>
          <View style={styles.inputWrapper}>
            <Users size={20} color={colors.accent} style={{ marginRight: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="Enter Team Name"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={teamName}
              onChangeText={setTeamName}
            />
          </View>
        </View>

        {/* Recruitment Hub */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>PLAYER RECRUITMENT</Text>
            <TouchableOpacity style={styles.scanBtnMini} onPress={startScanner}>
              <Scan size={18} color={colors.accent} />
              <Text style={styles.scanBtnText}>SCAN PROFILE</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchRow}>
            <View style={styles.searchWrapper}>
              <Mail size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Registered Email"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={lookupEmail}
                onChangeText={setLookupEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <TouchableOpacity onPress={handleAddByEmail} style={styles.searchActionBtn}>
                  <Search size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Pro Roster Display */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>SQUAD ROSTER ({players.length})</Text>
            <View style={styles.listLine} />
          </View>

          {players.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="rgba(6, 182, 212, 0.1)" />
              <Text style={styles.emptyText}>Roster is Empty</Text>
              <Text style={styles.emptySub}>Recruit players to build your championship squad</Text>
            </View>
          ) : (
            <View style={styles.playerList}>
              {players.map((player) => (
                <View key={player.id} style={styles.playerCard}>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerAvatarContainer}>
                      {player.photoURL ? (
                        <Image source={{ uri: player.photoURL }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarLetter}>{player.name[0].toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={styles.statusIndicator} />
                    </View>
                    <View style={styles.playerDetails}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{(player.role || 'Player').toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removePlayer(player.id)} style={styles.removeBtn}>
                    <Trash2 size={18} color={colors.accentWarn} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Finalize Action */}
        <TouchableOpacity 
          style={styles.saveBtn}
          onPress={handleSaveTeam}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.accent, '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>REGISTER FRANCHISE</Text>
                <Check size={22} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModal}>
            <Text style={styles.modalTitle}>TEAM QR CODE</Text>
            <Text style={styles.modalSub}>{teamName.toUpperCase()}</Text>
            <View style={styles.qrContainer}>
              <QRCode 
                value={teamName + Date.now()} // Using a temp unique id
                size={200} 
                color={colors.accent} 
                backgroundColor="#fff"
                logoSize={50}
                logoBorderRadius={10}
              />
            </View>
            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={() => { setShowQRModal(false); router.replace('/entryPage'); }}
            >
              <Text style={styles.closeBtnText}>CLOSE & FINISH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <X color="#fff" size={30} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>SCAN PLAYER QR</Text>
            <View style={{ width: 30 }} />
          </View>
          <CameraView 
            style={{ flex: 1 }} 
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInfo}>Scan the QR code from the player's profile</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040508',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
  },
  identityCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  scanBtnText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  searchRow: {
    marginTop: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  listSection: {
    flex: 1,
    marginBottom: 30,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  listLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySub: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  playerList: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  playerAvatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  avatarLetter: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: '#080A0F',
  },
  playerDetails: {
    gap: 4,
  },
  playerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  roleTag: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.large,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModal: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
  },
  modalSub: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 30,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 30,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scannerFooter: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scannerInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
