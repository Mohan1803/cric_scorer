import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  ChevronLeft,
  Edit3,
  Target,
  Activity,
  Trophy,
  ShieldCheck,
  Mail,
  Award,
  Zap,
  Star,
  Settings,
  QrCode,
  X,
  Share2,
  LogOut,
  ChevronRight
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { matchService } from '../services/matchService';
import QRCode from 'react-native-qrcode-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileView() {
  const { user } = useAuthStore();
  const [showQR, setShowQR] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const data = await matchService.getUserStats(user!.id, user!.email);
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section?: string) => {
    if (section) {
      router.push(`/profile-setup?focus=${section}`);
    } else {
      router.push('/profile-setup');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#040508', '#0F172A', '#020305']}
        style={StyleSheet.absoluteFill}
      />

      {/* Modern Floating Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navAction}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>PLAYER PROFILE</Text>
          {/* <View style={styles.navBadge}>
            <Text style={styles.navBadgeText}>PRO ID: #{user?.id?.slice(-6).toUpperCase() || 'OFFICIAL'}</Text>
          </View> */}
        </View>

        <TouchableOpacity
          style={styles.navAction}
          onPress={() => handleEdit()}
        >
          <Edit3 color={colors.accent} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Elite Player Card */}
        <View style={styles.playerCardContainer}>
          <LinearGradient
            colors={['rgba(249, 205, 5, 0.15)', 'rgba(249, 205, 5, 0.05)', 'transparent']}
            style={styles.cardGlow}
          />
          <View style={styles.eliteCard}>
            <View style={styles.cardHeaderArea}>
              <View style={styles.cardBrand}>
                <Trophy size={14} color={colors.accent} />
                <Text style={styles.cardBrandText}>ELITE SERIES</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQR(true)}>
                <QrCode color="rgba(255,255,255,0.4)" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardProfileArea}>
              <View style={styles.eliteAvatarFrame}>
                <View style={styles.eliteAvatarInner}>
                  {user?.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.eliteAvatarImg} />
                  ) : (
                    <User size={48} color="rgba(255,255,255,0.2)" />
                  )}
                </View>
                <View style={styles.eliteVerified}>
                  <ShieldCheck size={14} color="#000" />
                </View>
              </View>

              <View style={styles.eliteInfo}>
                <Text style={styles.eliteName}>{user?.name || 'Pro Athlete'}</Text>
                <View style={styles.eliteRoleTag}>
                  <Zap size={10} color="#000" fill="#000" />
                  <Text style={styles.eliteRoleText}>{(user?.role || 'All-Rounder').toUpperCase()}</Text>
                </View>
                <View style={styles.eliteEmailRow}>
                  <Mail size={10} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.eliteEmail} numberOfLines={1} ellipsizeMode="tail">{user?.email}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardStatsOverview}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{user?.battingHand === 'left' ? 'LHB' : 'RHB'}</Text>
                <Text style={styles.miniStatLab}>BATTING</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{user?.bowlingHand === 'left' ? 'LA' : 'RA'}</Text>
                <Text style={styles.miniStatLab}>BOWLING</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.miniStatVal}>{stats?.totalMatches || 0}</Text>
                )}
                <Text style={styles.miniStatLab}>MATCHES</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Professional Technical Specifications */}
        <View style={styles.specsContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>TECHNICAL PROFILE</Text>
          </View>

          <View style={styles.specList}>
            <TouchableOpacity style={styles.proSpecRow} onPress={() => handleEdit('batting')}>
              <View style={styles.proSpecLeft}>
                <View style={[styles.proSpecIcon, { backgroundColor: 'rgba(249, 205, 5, 0.1)' }]}>
                  <Target size={18} color={colors.accent} />
                </View>
                <Text style={styles.proSpecLabel}>BATTING STYLE</Text>
              </View>
              <View style={styles.proSpecRight}>
                <Text style={styles.proSpecValue}>{user?.battingHand === 'left' ? 'Left Handed' : 'Right Handed'}</Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proSpecRow} onPress={() => handleEdit('bowling')}>
              <View style={styles.proSpecLeft}>
                <View style={[styles.proSpecIcon, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                  <Activity size={18} color="#38bdf8" />
                </View>
                <Text style={styles.proSpecLabel}>BOWLING ARM</Text>
              </View>
              <View style={styles.proSpecRight}>
                <Text style={styles.proSpecValue}>{user?.bowlingHand === 'left' ? 'Left Arm' : 'Right Arm'}</Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proSpecRow} onPress={() => handleEdit('spec')}>
              <View style={styles.proSpecLeft}>
                <View style={[styles.proSpecIcon, { backgroundColor: 'rgba(244, 114, 182, 0.1)' }]}>
                  <Trophy size={18} color="#f472b6" />
                </View>
                <Text style={styles.proSpecLabel}>SPECIALIZATION</Text>
              </View>
              <View style={styles.proSpecRight}>
                <Text style={styles.proSpecValue}>{user?.bowlingType || 'Not Specified'}</Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proSpecRow} onPress={() => handleEdit('role')}>
              <View style={styles.proSpecLeft}>
                <View style={[styles.proSpecIcon, { backgroundColor: 'rgba(251, 146, 60, 0.1)' }]}>
                  <Zap size={18} color="#fb923c" />
                </View>
                <Text style={styles.proSpecLabel}>PRIMARY ROLE</Text>
              </View>
              <View style={styles.proSpecRight}>
                <Text style={styles.proSpecValue}>{user?.role || 'Not Set'}</Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Settings / Edit Action */}
          <TouchableOpacity
            style={styles.fullSettingsBtn}
            onPress={() => handleEdit()}
          >
            <View style={styles.settingsContent}>
              <View style={styles.settingsLeft}>
                <View style={styles.settingsIcon}>
                  <Settings size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.settingsTitle}>Account Settings</Text>
                  <Text style={styles.settingsSubtitle}>Manage your pro player profile</Text>
                </View>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fullSettingsBtn, { marginTop: 12, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }]}
            onPress={() => useAuthStore.getState().logout()}
          >
            <View style={styles.settingsContent}>
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <LogOut size={18} color="#ef4444" />
                </View>
                <View>
                  <Text style={[styles.settingsTitle, { color: '#ef4444' }]}>Logout</Text>
                  <Text style={styles.settingsSubtitle}>Sign out of your account</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.certification}>
          <Award size={14} color="rgba(255,255,255,0.2)" />
          <Text style={styles.certText}>BROADCAST-GRADE ANALYTICS COMPLIANT</Text>
        </View>
      </ScrollView>

      {/* QR IDENTITY MODAL */}
      <Modal visible={showQR} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowQR(false)}>
          <View style={styles.qrModal}>
            <View style={styles.qrHeader}>
              <View>
                <Text style={styles.qrTitle}>PLAYER ID</Text>
                <Text style={styles.qrName}>{user?.name?.toUpperCase() || 'PLAYER'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQR(false)} style={styles.qrClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrMain}>
              <LinearGradient
                colors={['#fff', '#f8f9fa']}
                style={styles.qrFrame}
              >
                <QRCode
                  value={user?.qrCode || user?.id || 'unknown'}
                  size={200}
                  color="#000"
                  backgroundColor="transparent"
                />
              </LinearGradient>
              <Text style={styles.qrSubText}>Scan this code to add me to your team</Text>
            </View>

            <View style={styles.qrFooter}>
              <View style={styles.qrFooterBadge}>
                <ShieldCheck size={16} color={colors.accent} />
                <Text style={styles.qrBadgeText}>OFFICIAL ONE SCORER ID</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn}>
                <Share2 size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040508' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navAction: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navCenter: {
    alignItems: 'center',
  },
  navTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  navBadge: {
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  navBadgeText: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
  },
  mainScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  playerCardContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 50,
    opacity: 0.5,
  },
  eliteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...shadows.large,
  },
  cardHeaderArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  cardBrandText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardProfileArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
  },
  eliteAvatarFrame: {
    width: 90,
    height: 90,
    position: 'relative',
  },
  eliteAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  eliteAvatarImg: {
    width: '100%',
    height: '100%',
  },
  eliteVerified: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E293B',
  },
  eliteInfo: {
    flex: 1,
  },
  eliteName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  eliteRoleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  eliteRoleText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  eliteEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eliteEmail: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  cardStatsOverview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatVal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  miniStatLab: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  miniStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  specsContainer: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  specList: {
    gap: 10,
    marginBottom: 24,
  },
  proSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  proSpecLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proSpecIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proSpecLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  proSpecRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proSpecValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  fullSettingsBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  settingsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  settingsSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  certification: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  certText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrModal: { width: '100%', backgroundColor: '#1E293B', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...shadows.large },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  qrTitle: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  qrName: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  qrClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  qrMain: { alignItems: 'center', marginBottom: 30 },
  qrFrame: { padding: 20, borderRadius: 24, ...shadows.medium },
  qrSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 20, fontWeight: '600' },
  qrFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  qrFooterBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(249, 205, 5, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  qrBadgeText: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  shareBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }
});
