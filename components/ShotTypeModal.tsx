import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Zap, Shield, Flame, Anchor, Scissors,
  RotateCcw, MoveUp, Eye, Waves, TrendingUp,
  TrendingDown, ArrowUpRight, ArrowDownLeft,
  Wind
} from 'lucide-react-native';
import { colors, shadows } from '../app/theme';

const { width } = Dimensions.get('window');

const SHOT_TYPES = [
  { id: 'drive', name: 'Drive', icon: MoveUp, color: '#38BDF8' },
  { id: 'cut', name: 'Cut', icon: Scissors, color: '#F472B6' },
  { id: 'pull', name: 'Pull', icon: RotateCcw, color: '#FB923C' },
  { id: 'flick', name: 'Flick', icon: Zap, color: '#FACC15' },
  { id: 'glance', name: 'Glance', icon: Eye, color: '#818CF8' },
  { id: 'sweep', name: 'Sweep', icon: Waves, color: '#2DD4BF' },
  { id: 'hook', name: 'Hook', icon: Anchor, color: '#F87171' },
  { id: 'scoop', name: 'Scoop', icon: ArrowUpRight, color: '#A78BFA' },
  { id: 'reverse_sweep', name: 'Reverse Sweep', icon: ArrowDownLeft, color: '#4ADE80' },
  { id: 'slog', name: 'Slog', icon: Flame, color: '#EF4444' },
  { id: 'defensive', name: 'Defensive', icon: Shield, color: '#94A3B8' },
  { id: 'outside_edge', name: 'Outside Edge', icon: TrendingUp, color: '#64748B' },
  { id: 'inside_edge', name: 'Inside Edge', icon: TrendingDown, color: '#64748B' },
  { id: 'lofted_shot', name: 'Lofted Shot', icon: Wind, color: '#06B6D4' },
];

const REGION_SHOTS: Record<string, string[]> = {
  'Third Man': ['cut', 'glance', 'outside_edge', 'reverse_sweep', 'defensive'],
  'Deep Point': ['cut', 'drive', 'reverse_sweep', 'defensive'],
  'Deep Cover': ['drive', 'cut', 'lofted_shot', 'defensive'],
  'Long Off': ['drive', 'lofted_shot', 'slog', 'defensive'],
  'Long On': ['drive', 'lofted_shot', 'slog', 'defensive'],
  'Deep Mid-Wicket': ['pull', 'slog', 'sweep', 'flick', 'drive', 'defensive'],
  'Deep Square Leg': ['pull', 'sweep', 'flick', 'hook', 'defensive'],
  'Fine Leg': ['glance', 'inside_edge', 'scoop', 'sweep', 'hook', 'defensive'],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (shot: string) => void;
  batsmanName: string;
  selectedRegion?: string | null;
}

const ShotTypeModal: React.FC<Props> = ({ visible, onClose, onSelect, batsmanName, selectedRegion }) => {
  const filteredShots = React.useMemo(() => {
    if (selectedRegion && REGION_SHOTS[selectedRegion]) {
      const allowedShotIds = REGION_SHOTS[selectedRegion];
      return SHOT_TYPES.filter(shot => allowedShotIds.includes(shot.id));
    }
    return SHOT_TYPES;
  }, [selectedRegion]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={30} style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[colors.surfaceDeeper, '#0F172A']}
              style={styles.content}
            >
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <View style={styles.titleRow}>
                    <Zap size={18} color={colors.accentSecondary} style={styles.titleIcon} />
                    <Text style={styles.title}>Select Shot Type</Text>
                  </View>
                  <Text style={styles.subtitle}>
                    {selectedRegion ? `${batsmanName} hits it through ${selectedRegion.toLowerCase()}` : `How did ${batsmanName} hit the ball?`}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X color={colors.text} size={20} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={filteredShots}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.shotBtn}
                    onPress={() => onSelect(item.name)}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                      style={styles.shotGradient}
                    >
                      <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                        <item.icon size={16} color={item.color} />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={styles.shotText}>{item.name}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            </LinearGradient>
          </View>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  safeArea: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    ...shadows.large,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  listContent: {
    paddingBottom: 10,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  shotBtn: {
    width: (width - 48 - 16) / 3, // Full width minus padding and gaps
    height: 48,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  shotGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
  },
  shotText: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 12,
  },
});

export default ShotTypeModal;
