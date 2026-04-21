import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Play, Radio, History, Zap, ChevronRight, LayoutDashboard, Settings, CheckCircle2, XCircle, MapPin } from 'lucide-react-native';

export default function EntryDashboard() {
  const renderGridItem = (
    icon: React.ReactNode,
    title: string,
    onPress: () => void,
    accentColor: string = colors.accent
  ) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.gridItem}
      onPress={onPress}
    >
      <View style={[styles.gridIconContainer, { backgroundColor: `${accentColor}10` }]}>
        {icon}
      </View>
      <Text style={styles.gridTitle}>{title}</Text>
      <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={styles.gridArrow} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, '#080A0F', '#040508']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHeader}>
          <View style={styles.brandContainer}>
            <Image
              source={require('../assets/images/one_scorer_icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <View style={styles.brandTextGroup}>
              <Text style={styles.brandMain}>ONE</Text>
              <Text style={styles.brandSub}>SCORER</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* <View style={styles.proBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.proText}>SYSTEMS ONLINE</Text>
            </View> */}
            {/* <TouchableOpacity style={styles.settingsBtn}>
              <Settings size={20} color={colors.textSecondary} />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Hero Section */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.heroCard}
          onPress={() => router.push('/match-setup')}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconBox}>
                <Play size={20} color="#fff" fill="#fff" />
              </View>
              <View>
                <Text style={styles.heroTitle}>Start New Match</Text>
                <Text style={styles.heroSubtitle}>Setup teams • Real-time scoring</Text>
              </View>
            </View>
            <View style={styles.heroArrowBox}>
              <ChevronRight size={20} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.mainContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Game Center</Text>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.actionGrid}>
            <View style={styles.gridRow}>
              {renderGridItem(
                <Radio size={20} color={colors.accentAlt} />,
                "Live Matches",
                () => router.push({ pathname: '/live-matches', params: { tab: 'live' } } as any),
                colors.accentAlt
              )}
              {renderGridItem(
                <History size={20} color={colors.accentGold} />,
                "Archives",
                () => router.push({ pathname: '/live-matches', params: { tab: 'past' } } as any),
                colors.accentGold
              )}
            </View>

            <View style={styles.gridRow}>
              {renderGridItem(
                <MapPin size={20} color={colors.accentSecondary} />,
                "Add/Register Grounds",
                () => router.push('/grounds-network' as any),
                colors.accentSecondary
              )}
            </View>
          </View>

          <View style={[styles.sectionHeader, { marginTop: 40 }]}>
            <Text style={styles.sectionLabel}>Advanced Tech</Text>
            <View style={styles.sectionLine} />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.drsCard}
            onPress={() => router.push('/lbw-recorder' as any)}
          // onPress={() => router.push('/coming-soon' as any)}
          >
            <View style={styles.drsHeader}>
              <View style={styles.drsBadge}>
                <Zap size={14} color="#7C3AED" fill="#7C3AED" />
                <Text style={styles.drsText}>DRS TOOLKIT</Text>
              </View>
            </View>
            <Text style={styles.drsTitle}>LBW Visual Tracking</Text>
            <Text style={styles.drsDescription}>Powered by point-of-impact video analysis</Text>

            <View style={styles.demoPreview}>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_out' } })}
              // onPress={() => router.push('/coming-soon' as any)}
              >
                <XCircle size={12} color="#ef4444" />
                <Text style={styles.demoPillText}>Simulation: Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_not_out' } })}
              // onPress={() => router.push('/coming-soon' as any)}
              >
                <CheckCircle2 size={12} color="#22c55e" />
                <Text style={styles.demoPillText}>Simulation: Not Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionLabel}>BUILD v2.4.0 PRO</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.copyrightText}>© 2026 PROFESSIONAL CRICKET SYSTEMS</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040508',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 40,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  brandTextGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  brandMain: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  brandSub: {
    fontSize: 28,
    fontWeight: '200',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  proText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 1,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  heroArrowBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.4,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionGrid: {
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  gridIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  gridArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.3,
  },
  drsCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.03)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  drsHeader: {
    marginBottom: 16,
  },
  drsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  drsText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  drsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  drsDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    opacity: 0.6,
  },
  demoPreview: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 8,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  demoPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  footer: {
    marginTop: 60,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerDivider: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  versionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 2,
    opacity: 0.3,
  },
  copyrightText: {
    fontSize: 8,
    color: colors.textSecondary,
    opacity: 0.2,
    letterSpacing: 1,
  },
});