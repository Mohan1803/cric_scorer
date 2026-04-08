import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Circle, Rect, Line, G, Text as SvgText } from 'react-native-svg';
import { colors } from '../app/theme';

const { width } = Dimensions.get('window');

const FIELD_REGIONS = [
  { id: 'third_man',         name: 'Third Man',         angle: -22.5 }, 
  { id: 'deep_point',        name: 'Deep Point',        angle: -67.5 },
  { id: 'deep_cover',        name: 'Deep Cover',        angle: -112.5 },
  { id: 'long_off',          name: 'Long Off',          angle: -157.5 },
  { id: 'long_on',           name: 'Long On',           angle: 157.5 },
  { id: 'deep_mid_wicket',   name: 'Deep Mid-Wicket',   angle: 112.5 },
  { id: 'deep_square_leg',   name: 'Deep Square Leg',   angle: 67.5 },
  { id: 'fine_leg',          name: 'Fine Leg',          angle: 22.5 },
];

const RUN_COLORS: { [key: number]: string } = {
  1: '#94A3B8', // Greyish
  2: '#3B82F6', // Blue
  3: '#10B981', // Green
  4: '#EF4444', // Red
  6: '#F59E0B', // Gold
};

interface Ball {
  runs: number;
  fieldPosition?: string;
}

interface Props {
  balls: Ball[];
  size?: number;
  isLeftHanded?: boolean;
}

const WagonWheel: React.FC<Props> = ({ balls, size = width * 0.85, isLeftHanded = false }) => {
  const cx = size / 2;
  const cy = size / 2;
  const boundaryR = size / 2 - 10;
  const pitchW = size * 0.04;
  const pitchH = size * 0.18;
  const batsmanY = cy - pitchH / 2 + 10;

  const toXY = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    };
  };

  const getAngle = (position?: string) => {
    if (!position) return 0;
    const region = FIELD_REGIONS.find(r => r.name.toLowerCase() === position.toLowerCase());
    let angle = region ? region.angle : 0;
    return isLeftHanded ? -angle : angle;
  };

  const scoringBalls = balls.filter(b => b.runs > 0);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Outfield */}
        <Circle cx={cx} cy={cy} r={boundaryR} fill="#1B5E3A" />
        <Circle cx={cx} cy={cy} r={boundaryR} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
        
        {/* 30-yard circle */}
        <Circle cx={cx} cy={cy} r={boundaryR * 0.45} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="5,5" />

        {/* Pitch */}
        <Rect x={cx - pitchW / 2} y={cy - pitchH / 2} width={pitchW} height={pitchH} fill="#C8B87A" rx={1} />
        
        {/* Scoring Lines */}
        <G>
          {scoringBalls.map((ball, idx) => {
            const angle = getAngle(ball.fieldPosition);
            // Non-boundary shots stay inside, boundaries touch the edge
            const length = (ball.runs === 4 || ball.runs === 6) ? boundaryR : boundaryR * (0.4 + (ball.runs * 0.1));
            const end = toXY(angle, length);
            
            return (
              <Line
                key={idx}
                x1={cx}
                y1={batsmanY}
                x2={end.x}
                y2={end.y}
                stroke={RUN_COLORS[ball.runs] || '#fff'}
                strokeWidth={ball.runs >= 4 ? 2 : 1.5}
                opacity={0.8}
              />
            );
          })}
        </G>

        {/* Legend/Labels */}
        <SvgText x={cx} y={cy - boundaryR - 15} fill="#fff" fontSize={10} fontWeight="700" textAnchor="middle">SIGHTSCREEN</SvgText>
        <SvgText x={cx} y={cy + boundaryR + 25} fill="#fff" fontSize={10} fontWeight="700" textAnchor="middle">WICKET-KEEPER END</SvgText>
      </Svg>
      
      <View style={styles.legend}>
        {[1, 2, 4, 6].map(run => (
          <View key={run} style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: RUN_COLORS[run] }]} />
            <View><View style={{ height: 1, width: 20, backgroundColor: RUN_COLORS[run], marginBottom: 2 }} /><View style={{ height: 1, width: 20, backgroundColor: RUN_COLORS[run] }} /></View>
            <Text style={styles.legendText}>{run}s</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    flexWrap: 'wrap',
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WagonWheel;
