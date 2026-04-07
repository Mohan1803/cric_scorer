import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MapPin } from 'lucide-react-native';
import { colors, shadows } from '../app/theme';

const { width, height } = Dimensions.get('window');

const FIELD_REGIONS = [
  { id: 'third_man', name: 'Third Man', angle: 225, distance: 'deep' },
  { id: 'deep_point', name: 'Deep Point', angle: 270, distance: 'deep' },
  { id: 'deep_cover', name: 'Deep Cover', angle: 315, distance: 'deep' },
  { id: 'long_off', name: 'Long Off', angle: 350, distance: 'deep' },
  { id: 'long_on', name: 'Long On', angle: 10, distance: 'deep' },
  { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', angle: 45, distance: 'deep' },
  { id: 'deep_square_leg', name: 'Deep Square Leg', angle: 90, distance: 'deep' },
  { id: 'deep_fine_leg', name: 'Deep Fine Leg', angle: 135, distance: 'deep' },
  
  { id: 'gully', name: 'Gully', angle: 240, distance: 'inner' },
  { id: 'point', name: 'Point', angle: 270, distance: 'inner' },
  { id: 'cover', name: 'Cover', angle: 315, distance: 'inner' },
  { id: 'mid_off', name: 'Mid-Off', angle: 345, distance: 'inner' },
  { id: 'mid_on', name: 'Mid-On', angle: 15, distance: 'inner' },
  { id: 'mid_wicket', name: 'Mid-Wicket', angle: 45, distance: 'inner' },
  { id: 'square_leg', name: 'Square Leg', angle: 90, distance: 'inner' },
  { id: 'fine_leg', name: 'Fine Leg', angle: 120, distance: 'inner' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (position: string) => void;
  batsmanName: string;
}

const FieldMapModal: React.FC<Props> = ({ visible, onClose, onSelect, batsmanName }) => {
  const renderFieldDot = (region: typeof FIELD_REGIONS[0]) => {
    const fieldSize = width * 0.8;
    const centerX = fieldSize / 2;
    const centerY = fieldSize / 2;
    const radius = region.distance === 'deep' ? fieldSize * 0.42 : fieldSize * 0.22;
    
    // Adjust angle for visual alignment (0 is top/Long Off in this coordinate system)
    // In standard math, 0 is right. We want 0 to be top.
    const rad = (region.angle - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(rad);
    const y = centerY + radius * Math.sin(rad);

    return (
      <TouchableOpacity
        key={region.id}
        style={[styles.fieldDot, { left: x - 8, top: y - 8 }]}
        onPress={() => onSelect(region.name)}
      >
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          style={styles.dotGradient}
        />
        <View style={styles.dotLabelContainer}>
          <Text style={styles.dotLabel}>{region.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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
                <Text style={styles.title}>Where did {batsmanName} hit it?</Text>
                <Text style={styles.subtitle}>Tap a position on the field</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <View style={styles.cricketField}>
                {/* Outfield Boundary */}
                <View style={styles.boundaryLine} />
                {/* 30-Yard Circle */}
                <View style={styles.innerCircle} />
                {/* Pitch */}
                <View style={styles.pitch} />
                
                {/* Field Dots */}
                {FIELD_REGIONS.map(renderFieldDot)}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSelect}>
              {FIELD_REGIONS.map(region => (
                <TouchableOpacity
                  key={region.id + '_quick'}
                  style={styles.quickBtn}
                  onPress={() => onSelect(region.name)}
                >
                  <Text style={styles.quickBtnText}>{region.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    width: '95%',
    maxWidth: 500,
    borderRadius: 32,
    overflow: 'hidden',
    ...shadows.large,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  fieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  cricketField: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#1B4D3E', // Deep Green
    borderRadius: (width * 0.8) / 2,
    borderWidth: 4,
    borderColor: '#2D5A27',
    position: 'relative',
    overflow: 'visible',
  },
  boundaryLine: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: (width * 0.8 - 20) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  innerCircle: {
    position: 'absolute',
    top: width * 0.22,
    left: width * 0.22,
    right: width * 0.22,
    bottom: width * 0.22,
    borderRadius: (width * 0.36) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pitch: {
    position: 'absolute',
    top: '40%',
    left: '46%',
    width: '8%',
    height: '20%',
    backgroundColor: '#C2B280', // Sand color
    borderRadius: 2,
  },
  fieldDot: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  dotGradient: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    ...shadows.small,
  },
  dotLabelContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  dotLabel: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  quickSelect: {
    marginTop: 20,
  },
  quickBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FieldMapModal;
