import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Pressable
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
  Share2
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import QRCode from 'react-native-qrcode-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileView() {
  const { user } = useAuthStore();
  const [showQR, setShowQR] = useState(false);

  const handleEdit = (section?: string) => {
    if (section) {
      router.push(`/profile-setup?focus=${section}`);
    } else {
      router.push('/profile-setup');
    }
  };

  const renderSkillBadge = (label: string, IconComp: any, value: string, section: string, color: string = colors.accent) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleEdit(section)}
      style={styles.skillCard}
    >
      <View style={[styles.skillIconBox, { backgroundColor: `${color}15` }]}>
        <IconComp size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.skillLabel}>{label}</Text>
        <Text style={styles.skillValue}>{value.toUpperCase().replace('_', ' ')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#040508', '#0F172A', '#020305']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>PRO PLAYER CARD</Text>
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>VERIFIED</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerCircleBtn, { backgroundColor: 'rgba(249, 205, 5, 0.1)', marginRight: 10 }]}
            onPress={() => setShowQR(true)}
          >
            <QrCode color={colors.accent} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerCircleBtn, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}
            onPress={() => handleEdit()}
          >
            <Edit3 color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleEdit('name')}
          style={styles.identitySection}
        >
          <View style={styles.profileHero}>
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarMain}>
                  {user?.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
                  ) : (
                    <User size={64} color="#fff" />
                  )}
                </View>
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={14} color={colors.accent} />
                </View>
              </View>

              <Text style={styles.userName}>{user?.name || 'Pro Player'}</Text>
              <View style={styles.roleContainer}>
                <Zap size={12} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.roleText}>{(user?.role || 'ALL-ROUNDER').toUpperCase()}</Text>
              </View>
              <View style={styles.editIndicator}>
                <Edit3 size={10} color="rgba(255,255,255,0.6)" />
                <Text style={styles.editIndicatorText}>TAP TO EDIT IDENTITY</Text>
              </View>
            </LinearGradient>

            <View style={styles.heroFooter}>
              <View style={styles.contactItem}>
                <Mail size={14} color="rgba(255,255,255,0.4)" />
                <Text style={styles.contactText}>{user?.email}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.contactItem}>
                <Star size={14} color={colors.accent} />
                <Text style={styles.contactText}>PRO MEMBER</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TECHNICAL ATTRIBUTES</Text>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.skillsGrid}>
            {renderSkillBadge('Batting Hand', Target, (user?.battingHand || 'right') + ' Hand', 'batting')}
            {renderSkillBadge('Bowling Arm', Activity, (user?.bowlingHand || 'right') + ' Arm', 'bowling', '#38bdf8')}
            {renderSkillBadge('Specialization', Trophy, user?.bowlingType || 'Medium', 'spec', '#f472b6')}
            {renderSkillBadge('Primary Role', Zap, user?.role || 'Allrounder', 'role', '#fb923c')}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.fullEditBtn}
            onPress={() => handleEdit()}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fullEditGradient}
            >
              <View style={styles.fullEditContent}>
                <View>
                  <Text style={styles.fullEditTitle}>EDIT ALL FIELDS</Text>
                  <Text style={styles.fullEditSubtitle}>Modify your technical specs and info</Text>
                </View>
                <View style={styles.fullEditIconBox}>
                  <Settings size={20} color={colors.accent} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footerInfo}>
          <Award size={16} color="rgba(255,255,255,0.1)" />
          <Text style={styles.infoText}>GLOBAL PLAYER NETWORK CERTIFIED</Text>
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
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerCircleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerActions: { flexDirection: 'row' },
  headerTitleGroup: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#22c55e', marginRight: 6 },
  activeText: { color: '#22c55e', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  identitySection: { marginBottom: 32 },
  profileHero: { borderRadius: 32, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...shadows.large },
  heroGradient: { paddingVertical: 40, alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginBottom: 20 },
  avatarMain: { width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 4, borderColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', ...shadows.medium },
  avatarImg: { width: '100%', height: '100%' },
  verifiedBadge: { position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.accent, ...shadows.small },
  userName: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10, letterSpacing: -0.5 },
  roleContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  editIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  editIndicatorText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroFooter: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  divider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
  detailsSection: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 2 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  skillCard: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  skillIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  skillLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginBottom: 4 },
  skillValue: { fontSize: 12, fontWeight: '800', color: '#fff' },
  fullEditBtn: { borderRadius: 28, overflow: 'hidden', ...shadows.large, shadowColor: colors.accent },
  fullEditGradient: { paddingVertical: 20, paddingHorizontal: 24 },
  fullEditContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fullEditTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  fullEditSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  fullEditIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  footerInfo: { marginTop: 40, alignItems: 'center', gap: 10 },
  infoText: { fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: '900', letterSpacing: 1.5 },
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
