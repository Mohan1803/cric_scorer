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
        Alert.alert('Success', 'Team created successfully!', [
          { text: 'View QR', onPress: () => setShowQRModal(true) },
          { text: 'Done', onPress: () => router.replace('/entryPage') }
        ]);
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Team Identity */}
        <View style={styles.section}>
          <Text style={styles.label}>TEAM IDENTITY</Text>
          <View style={styles.inputWrapper}>
            <Users size={20} color={colors.accent} style={{ marginRight: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="Team Name (e.g. Mumbai Indians)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={teamName}
              onChangeText={setTeamName}
            />
          </View>
        </View>

        {/* Add Players Section */}
        <View style={styles.section}>
          <Text style={styles.label}>ADD PLAYERS</Text>
          <View style={styles.searchRow}>
            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
              <Mail size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Search by Email"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={lookupEmail}
                onChangeText={setLookupEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <TouchableOpacity onPress={handleAddByEmail}>
                  <Search size={20} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={styles.scanBtn}
              onPress={startScanner}
            >
              <Scan size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Player List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>ROSTER ({players.length})</Text>
            <View style={styles.listLine} />
          </View>

          {players.length === 0 ? (
            <View style={styles.emptyState}>
              <UserPlus size={48} color="rgba(255,255,255,0.05)" />
              <Text style={styles.emptyText}>No players added yet</Text>
              <Text style={styles.emptySub}>Add players by email or scan their profile QR</Text>
            </View>
          ) : (
            <View style={styles.playerList}>
              {players.map((player) => (
                <View key={player.id} style={styles.playerCard}>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerAvatar}>
                      {player.photoURL ? (
                        <Image source={{ uri: player.photoURL }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarLetter}>{player.name[0].toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerRole}>{(player.role || 'Player').toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.playerActions}>
                    <View style={styles.playerQR}>
                      <QRCode value={player.id} size={30} color={colors.accent} backgroundColor="transparent" />
                    </View>
                    <TouchableOpacity onPress={() => removePlayer(player.id)} style={styles.removeBtn}>
                      <Trash2 size={18} color="rgba(239, 68, 68, 0.6)" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveBtn}
          onPress={handleSaveTeam}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentAlt]}
            style={styles.btnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>CREATE PROFESSIONAL TEAM</Text>
                <Check size={20} color="#fff" />
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  listSection: {
    flex: 1,
    marginBottom: 40,
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
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
  },
  listLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySub: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  playerList: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  playerRole: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playerQR: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  removeBtn: {
    padding: 8,
  },
  saveBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.large,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  qrModal: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSub: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 30,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 30,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scannerFooter: {
    padding: 30,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  scannerInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  }
});
