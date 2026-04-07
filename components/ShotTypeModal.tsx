import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Zap } from 'lucide-react-native';
import { colors, shadows } from '../app/theme';

const { width } = Dimensions.get('window');

const SHOT_TYPES = [
  { id: 'drive', name: 'Drive' },
  { id: 'cut', name: 'Cut' },
  { id: 'pull', name: 'Pull' },
  { id: 'flick', name: 'Flick' },
  { id: 'glance', name: 'Glance' },
  { id: 'sweep', name: 'Sweep' },
  { id: 'hook', name: 'Hook' },
  { id: 'scoop', name: 'Scoop' },
  { id: 'reverse_sweep', name: 'Reverse Sweep' },
  { id: 'slog', name: 'Slog' },
  { id: 'defensive', name: 'Defensive' },
  { id: 'other', name: 'Other' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (shot: string) => void;
  batsmanName: string;
}

const ShotTypeModal: React.FC<Props> = ({ visible, onClose, onSelect, batsmanName }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[colors.surfaceDeeper, '#0F172A']}
            style={styles.content}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>How did {batsmanName} hit it?</Text>
                <Text style={styles.subtitle}>Select the shot type</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={SHOT_TYPES}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.shotBtn}
                  onPress={() => onSelect(item.name)}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                    style={styles.shotGradient}
                  >
                    <Zap size={16} color={colors.accentSecondary} style={styles.shotIcon} />
                    <Text style={styles.shotText}>{item.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 32,
    overflow: 'hidden',
    ...shadows.large,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 10,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
  shotBtn: {
    flex: 1,
    height: 60,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  shotGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  shotIcon: {
    marginRight: 10,
  },
  shotText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ShotTypeModal;
