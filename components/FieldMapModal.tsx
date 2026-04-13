import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import Svg, { Circle, Rect, Line, Path, G, Text as SvgText } from 'react-native-svg';
import { colors, shadows } from '../app/theme';

const { width } = Dimensions.get('window');

// Batsman is at the TOP of the screen, facing DOWN toward bowler.
// 0° = straight up (behind batsman = Fine Leg / Third Man area).
// 180° = straight down (Long On / Long Off area, past the bowler).
// Off-side (right-hander) = LEFT side of screen.
// On-side / Leg-side = RIGHT side of screen.
const FIELD_REGIONS = [
  { id: 'third_man',         name: 'Third Man',         angle: -22.5 },   // top-left (behind batsman, off-side)
  { id: 'deep_point',        name: 'Deep Point',        angle: -67.5 },   // left (square off-side)
  { id: 'deep_cover',        name: 'Deep Cover',        angle: -112.5 },  // bottom-left
  { id: 'long_off',          name: 'Long Off',          angle: -157.5 },  // bottom, off-side
  { id: 'long_on',           name: 'Long On',           angle: 157.5 },   // bottom, leg-side
  { id: 'deep_mid_wicket',   name: 'Deep Mid-Wicket',   angle: 112.5 },   // bottom-right
  { id: 'deep_square_leg',   name: 'Deep Square Leg',   angle: 67.5 },    // right (square leg-side)
  { id: 'fine_leg',          name: 'Fine Leg',          angle: 22.5 },    // top-right (behind batsman, leg-side)
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (position: string) => void;
  batsmanName: string;
  isLeftHanded?: boolean;
}

const FieldMapModal: React.FC<Props> = ({ visible, onClose, onSelect, batsmanName, isLeftHanded = false }) => {
  const fieldSize = width * 0.88;
  const cx = fieldSize / 2;
  const cy = fieldSize / 2;
  const boundaryR = fieldSize / 2 - 6;
  const innerR = boundaryR * 0.42;
  const pitchW = 14;
  const pitchH = boundaryR * 0.38;

  // For left-handers, mirror the field by negating angles (flips off-side ↔ on-side)
  const regions = FIELD_REGIONS.map(r => ({
    ...r,
    angle: isLeftHanded ? -r.angle : r.angle,
  }));

  // Convert angle (0° = up, CW positive) to SVG x/y
  const toXY = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    };
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#0F1729', '#0B1120']} style={styles.content}>
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
              <View style={{ width: fieldSize, height: fieldSize, position: 'relative' }}>
                <Svg width={fieldSize} height={fieldSize}>
                  {/* Outfield */}
                  <Circle cx={cx} cy={cy} r={boundaryR} fill="#1B5E3A" />
                  {/* Boundary rope */}
                  <Circle cx={cx} cy={cy} r={boundaryR} fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.6} />
                  {/* 30-yard circle */}
                  <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="6,4" />

                  {/* Pitch */}
                  <Rect x={cx - pitchW / 2} y={cy - pitchH / 2} width={pitchW} height={pitchH} fill="#C8B87A" rx={2} />
                  {/* Crease lines */}
                  <Line x1={cx - pitchW / 2 - 4} y1={cy - pitchH / 2 + 8} x2={cx + pitchW / 2 + 4} y2={cy - pitchH / 2 + 8} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
                  <Line x1={cx - pitchW / 2 - 4} y1={cy + pitchH / 2 - 8} x2={cx + pitchW / 2 + 4} y2={cy + pitchH / 2 - 8} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
                  {/* Stumps - Batsman end (top) */}
                  <Line x1={cx - 3} y1={cy - pitchH / 2 + 6} x2={cx + 3} y2={cy - pitchH / 2 + 6} stroke="#fff" strokeWidth={1.5} />
                  {/* Stumps - Bowler end (bottom) */}
                  <Line x1={cx - 3} y1={cy + pitchH / 2 - 6} x2={cx + 3} y2={cy + pitchH / 2 - 6} stroke="#fff" strokeWidth={1.5} />

                  {/* Batsman dot (top) */}
                  <Circle cx={cx} cy={cy - pitchH / 2 + 12} r={4} fill="#fff" stroke="#000" strokeWidth={1} />
                  {/* Bowler dot (bottom) */}
                  <Circle cx={cx} cy={cy + pitchH / 2 - 12} r={3.5} fill="#4FC3F7" stroke="#fff" strokeWidth={0.8} />

                  {/* Labels */}
                  <SvgText x={cx} y={cy - pitchH / 2 - 3} fill="#fff" fontSize={7} fontWeight="800" textAnchor="middle">
                    BATSMAN
                  </SvgText>
                  <SvgText x={cx} y={cy + pitchH / 2 + 8} fill="#B0BEC5" fontSize={6} fontWeight="700" textAnchor="middle">
                    BOWLER
                  </SvgText>

                  {/* Tappable pie-slice sectors (each 45°) */}
                  {regions.map((region) => {
                    const halfSector = 22.5;
                    const startAngle = region.angle - halfSector;
                    const endAngle = region.angle + halfSector;
                    const p1 = toXY(startAngle, boundaryR);
                    const p2 = toXY(endAngle, boundaryR);
                    const d = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${boundaryR} ${boundaryR} 0 0 1 ${p2.x} ${p2.y} Z`;
                    return (
                      <G key={`sector-${region.id}`} onPress={() => onSelect(region.name)}>
                        <Path
                          d={d}
                          fill="transparent"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth={0.8}
                        />
                      </G>
                    );
                  })}

                  {/* Fielder dots */}
                  {regions.map((region) => {
                    const pt = toXY(region.angle, boundaryR * 0.8);
                    return <Circle key={`dot-${region.id}`} cx={pt.x} cy={pt.y} r={4} fill="#fff" opacity={0.85} />;
                  })}

                  {/* Field position labels */}
                  {regions.map((region) => {
                    const pt = toXY(region.angle, boundaryR * 0.65);
                    return (
                      <G key={`label-g-${region.id}`} onPress={() => onSelect(region.name)}>
                        <SvgText
                          key={`label-${region.id}`}
                          x={pt.x}
                          y={pt.y}
                          fill="rgba(255,255,255,0.7)"
                          fontSize={7}
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {region.name}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </View>


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
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.large,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 7.5,
    color: '#ccc',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  quickSelect: {
    marginTop: 16,
  },
  quickBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default FieldMapModal;
