import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Play, Radio, History, Zap, ChevronRight, LayoutDashboard, Settings, CheckCircle2, XCircle, MapPin } from 'lucide-react-native';

export default function EntryDashboard() {
  const renderActionItem = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    onPress: () => void,
    accentColor: string = colors.accent
  ) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.actionItem}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${accentColor}15` }]}>
        {icon}
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.minimalHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.brandName}>ONE SCORER</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>PRO BROADCAST READY</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainSection}>
          <Text style={styles.sectionLabel}>Scoring</Text>
          {renderActionItem(
            <Play size={24} color={colors.accent} fill={colors.accent} />,
            "Start New Match",
            "Setup teams and begin a new broadcast",
            () => router.push('/match-setup')
          )}
        </View>

        <View style={styles.mainSection}>
          <Text style={styles.sectionLabel}>Discovery</Text>
          {renderActionItem(
            <MapPin size={24} color={colors.accentSecondary} />,
            "Ground Network",
            "Discover and book cricket grounds nearby",
            () => router.push('/grounds-network' as any),
            colors.accentSecondary
          )}
          {renderActionItem(
            <Radio size={24} color={colors.accentAlt} />,
            "Live Global Feed",
            "Watch matches in real-time worldwide",
            () => router.push({ pathname: '/live-matches', params: { tab: 'live' } } as any),
            colors.accentAlt
          )}
          {renderActionItem(
            <History size={24} color={colors.accentGold} />,
            "Match Archive",
            "Explore completed match results",
            () => router.push({ pathname: '/live-matches', params: { tab: 'past' } } as any),
            colors.accentGold
          )}
        </View>

        <View style={styles.mainSection}>
          <Text style={styles.sectionLabel}>DRS Toolkit</Text>
          {renderActionItem(
            <Zap size={24} color="#7C3AED" fill="#7C3AED" />,
            "LBW Visual Tracking",
            "Video-based DRS and ball tracking",
            () => router.push('/lbw-recorder' as any),
            "#7C3AED"
          )}

          <View style={styles.demoSection}>
            <TouchableOpacity
              style={styles.demoItem}
              onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_out' } })}
            >
              <XCircle size={18} color="#ef4444" />
              <Text style={styles.demoText}>Simulation: Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoItem}
              onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_not_out' } })}
            >
              <CheckCircle2 size={18} color="#22c55e" />
              <Text style={styles.demoText}>Simulation: Not Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>ONE SCORER v2.4.0</Text>
          <Text style={styles.copyrightText}>© 2026 Professional Cricket Systems</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  minimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  titleContainer: {
    gap: 4,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentAlt,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.accentAlt,
    letterSpacing: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mainSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
    opacity: 0.6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    opacity: 0.8,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 40,
    opacity: 0.3,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  copyrightText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 4,
  },
  demoSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  demoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  demoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});