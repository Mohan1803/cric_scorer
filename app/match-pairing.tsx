import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Scan, 
  Zap, 
  Smartphone, 
  ChevronLeft, 
  CheckCircle2,
  Cpu,
  Orbit,
  Wifi
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { 
  syncFullMatchDetails, 
  getMatchDetails, 
  registerPairingNode, 
  listenForNearbyNodes, 
  removePairingNode 
} from '../services/matchSyncService';
import { getDeviceId } from '../services/deviceIdService';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function MatchPairing() {
  const { matchId, teams, groundName, tournamentName, totalOvers, setTeams, setMatchId } = useGameStore();
  const [mode, setMode] = useState<'hub' | 'show-qr' | 'scan-qr' | 'tap-sync'>('hub');
  const [pairingStatus, setPairingStatus] = useState<'idle' | 'pairing' | 'success'>('idle');
  const [permission, requestPermission] = useCameraPermissions();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(height)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const [nearbyNodes, setNearbyNodes] = useState<any[]>([]);

  useEffect(() => {
    const initPairing = async () => {
      const deviceId = await getDeviceId();
      registerPairingNode(deviceId, { 
        matchId, 
        teams, 
        groundName, 
        tournamentName,
        type: 'captain'
      });
    };

    initPairing();

    const unsubscribe = listenForNearbyNodes((nodes) => {
      // Filter out self
      getDeviceId().then(id => {
        setNearbyNodes(nodes.filter(n => n.id !== id));
      });
    });

    // Pulse animation for "Searching" effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    // Rotation for orbit effect
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.spring(slideUpAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }).start();

    return () => {
      unsubscribe();
      getDeviceId().then(id => removePairingNode(id));
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleStartScan = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes.');
        return;
      }
    }
    setMode('scan-qr');
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (pairingStatus === 'pairing' || pairingStatus === 'success') return;
    
    try {
      setPairingStatus('pairing');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const externalMatchData = await getMatchDetails(data);
      if (externalMatchData) {
        // Sync teams from the scanned match
        setTeams(externalMatchData.teams);
        setMatchId(data);
        setPairingStatus('success');
        
        setTimeout(() => {
          router.replace('/toss');
        }, 1500);
      } else {
        throw new Error('Invalid Match QR');
      }
    } catch (e) {
      setPairingStatus('idle');
      Alert.alert('Sync Failed', 'Could not retrieve match data. Please try again.');
    }
  };

  const triggerTapHandshake = () => {
    if (nearbyNodes.length === 0) {
      Alert.alert('PitchPulse Offline', 'Ensure the other captain is on the PitchPulse screen and try again.');
      return;
    }

    setPairingStatus('pairing');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Pick the first available node to sync with
    const targetNode = nearbyNodes[0];

    // Simulate high-end data collision animation
    Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        // Sync teams from the discovered node
        if (targetNode.teams) setTeams(targetNode.teams);
        if (targetNode.matchId) setMatchId(targetNode.matchId);

        setPairingStatus('success');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          router.replace('/toss');
        }, 1500);
      }, 1000);
    });
  };

  const renderHub = () => (
    <Animated.View style={[styles.hubContainer, { transform: [{ translateY: slideUpAnim }] }]}>
      <Text style={styles.title}>SYNC MATCH</Text>
      <Text style={styles.subtitle}>Connect with the opposing captain to finalize the match squads.</Text>

      <View style={styles.optionGrid}>
        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('show-qr')}>
          <LinearGradient colors={['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.02)']} style={styles.optionGradient} />
          <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
            <Zap color="#a855f7" size={24} />
          </View>
          <Text style={styles.optionTitle}>Host Match</Text>
          <Text style={styles.optionDesc}>Generate a QR for others to join.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={handleStartScan}>
          <LinearGradient colors={['rgba(56, 189, 248, 0.1)', 'rgba(56, 189, 248, 0.02)']} style={styles.optionGradient} />
          <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
            <Scan color="#38bdf8" size={24} />
          </View>
          <Text style={styles.optionTitle}>Join Match</Text>
          <Text style={styles.optionDesc}>Scan host QR to sync squads.</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.tapOption} onPress={() => setMode('tap-sync')}>
        <LinearGradient colors={['rgba(249, 205, 5, 0.1)', 'rgba(249, 205, 5, 0.02)']} style={styles.optionGradient} />
        <View style={styles.tapContent}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 205, 5, 0.1)' }]}>
            <Smartphone color={colors.accent} size={24} />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.optionTitle}>PitchPulse</Text>
            <Text style={styles.optionDesc}>Bring phones closer and tap to handshake.</Text>
          </View>
          <Wifi color={colors.accent} size={20} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderShowQR = () => (
    <View style={styles.centerContent}>
      <Text style={styles.pairingTitle}>MATCH IDENTITY</Text>
      <View style={styles.qrContainer}>
        <View style={styles.qrFrame}>
          <QRCode
            value={matchId || 'invalid'}
            size={220}
            color="#fff"
            backgroundColor="transparent"
          />
        </View>
        <Animated.View style={[styles.orbit, { transform: [{ rotate: spin }] }]}>
          <View style={styles.orbitDot} />
        </Animated.View>
      </View>
      <Text style={styles.qrDesc}>Opposing captain must scan this to sync.</Text>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('hub')}>
        <Text style={styles.cancelText}>CANCEL</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScanQR = () => (
    <View style={StyleSheet.absoluteFill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.scanText}>ALIGN QR WITHIN FRAME</Text>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('hub')}>
          <Text style={styles.cancelText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTapSync = () => (
    <View style={styles.centerContent}>
      <Text style={styles.pairingTitle}>{pairingStatus === 'success' ? 'CONNECTED' : 'SEARCHING...'}</Text>
      
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={triggerTapHandshake} 
        style={styles.tapCircleContainer}
      >
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: Animated.multiply(pulseAnim, 1.4) }], opacity: 0.3 }]} />
        
        <LinearGradient 
          colors={[colors.accent, '#f59e0b']} 
          style={styles.mainCircle}
        >
          {pairingStatus === 'success' ? (
            <CheckCircle2 color="#fff" size={64} />
          ) : (
            <Smartphone color="#fff" size={64} />
          )}
        </LinearGradient>

        <Animated.View style={[styles.collisionGlow, { opacity: glowAnim }]} />
      </TouchableOpacity>

      <Text style={styles.tapDesc}>
        {pairingStatus === 'success' 
          ? 'PitchPulse collision successful. Syncing squads...' 
          : 'Hold phones near each other and tap the screen to initiate PitchPulse.'}
      </Text>
      
      {pairingStatus !== 'success' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('hub')}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#040508', '#0F172A', '#020305']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MATCH MAKING</Text>
        <View style={{ width: 44 }} />
      </View>

      {mode === 'hub' && renderHub()}
      {mode === 'show-qr' && renderShowQR()}
      {mode === 'scan-qr' && renderScanQR()}
      {mode === 'tap-sync' && renderTapSync()}

      {pairingStatus === 'pairing' && (
        <View style={styles.pairingOverlay}>
          <Cpu color={colors.accent} size={48} />
          <Text style={styles.pairingOverlayText}>STABLIZING QUANTUM LINK...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040508' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  hubContainer: { flex: 1, padding: 25 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 10 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 22, marginBottom: 40 },
  optionGrid: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  optionCard: { flex: 1, borderRadius: 24, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...shadows.medium },
  optionGradient: { ...StyleSheet.absoluteFillObject },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  optionTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 5 },
  optionDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  tapOption: { borderRadius: 24, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tapContent: { flexDirection: 'row', alignItems: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  pairingTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 4, marginBottom: 60 },
  qrContainer: { padding: 30, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  qrFrame: { padding: 10, backgroundColor: 'transparent' },
  orbit: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-start' },
  orbitDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, marginTop: -6, ...shadows.medium },
  qrDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 40, lineHeight: 20 },
  cancelBtn: { marginTop: 40, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 250, height: 250, borderRadius: 30, borderWidth: 2, borderColor: '#38bdf8', borderStyle: 'dashed' },
  scanText: { color: '#38bdf8', fontSize: 12, fontWeight: '900', marginTop: 30, letterSpacing: 2 },
  tapCircleContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  mainCircle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', zIndex: 10, ...shadows.large },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: colors.accent, opacity: 0.2 },
  collisionGlow: { position: 'absolute', width: width, height: width, borderRadius: width/2, backgroundColor: 'rgba(249, 205, 5, 0.4)', zIndex: 5 },
  tapDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 60, lineHeight: 24 },
  pairingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  pairingOverlayText: { color: colors.accent, fontSize: 12, fontWeight: '900', marginTop: 20, letterSpacing: 2 }
});
