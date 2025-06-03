import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Dimensions, Easing } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';

const { width } = Dimensions.get('window');

export default function BroadcastTicker() {
  const ballHistory = useGameStore(state => state.ballHistory);
  const battingTeam = useGameStore(state => state.battingTeam);
  const bowlingTeam = useGameStore(state => state.bowlingTeam);
  const totalOvers = useGameStore(state => state.totalOvers);
  const target = useGameStore(state => state.target);
  const currentInningsNumber = useGameStore(state => state.currentInningsNumber);

  // Ticker animation
  const translateX = useRef(new Animated.Value(0)).current;
  const textWidth = useRef(0);
  const [measured, setMeasured] = React.useState(false);

  // Build ticker text
  const totalScore = ballHistory.reduce(
    (sum, ball) => sum + ball.runs + (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball') ? 1 : 0),
    0
  );
  const totalWickets = ballHistory.filter(ball => ball.isWicket).length;
  const legalBalls = ballHistory.filter(ball => !ball.isExtra || (ball.extraType === 'bye' || ball.extraType === 'lb')).length;
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;

  let ticker = `${battingTeam || ''} ${totalScore}/${totalWickets}  (${overs}.${balls} overs)`;

  // Only show target/runs needed in second innings
  if (currentInningsNumber === 2 && target) {
    const runsNeeded = target - totalScore;
    const ballsBowled = ballHistory.filter(ball => !ball.isExtra || (ball.extraType === 'bye' || ball.extraType === 'lb')).length;
    const ballsRemaining = totalOvers * 6 - ballsBowled;
    ticker += `  |  Target: ${target}`;
    ticker += `  |  Runs Needed: ${runsNeeded > 0 ? runsNeeded : 0} from ${ballsRemaining > 0 ? ballsRemaining : 0} balls`;
  }
  ticker += `  |  vs ${bowlingTeam || ''}`;


  // Last 6 balls summary
  // const last6 = ballHistory.slice(-6).map(ball => {
  //   if (ball.isWicket) return 'W';
  //   if (ball.isExtra) return ball.extraType?.toUpperCase()[0] || 'E';
  //   if (ball.runs === 4) return '4';
  //   if (ball.runs === 6) return '6';
  //   return String(ball.runs);
  // });
  // ticker += `  |  Last 6: ${last6.join(' ')}`;

  useEffect(() => {
    if (!measured || textWidth.current === 0) return;
    translateX.setValue(width);
    const animate = () => {
      Animated.timing(translateX, {
        toValue: -textWidth.current,
        duration: Math.max(5000, (textWidth.current + width) * 10), // Speed: 100px/sec
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(({ finished }) => {
        if (finished) {
          translateX.setValue(width);
          animate();
        }
      });
    };
    animate();
    return () => translateX.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured, ticker, ballHistory]);

  return (
    <View style={styles.tickerWrap}>
      <View style={{ flexDirection: 'row', width: '100%', overflow: 'hidden' }}>
        <Animated.View
          style={{
            flexDirection: 'row',
            transform: [{ translateX }],
          }}
        >
          <Text
            style={styles.tickerText}
            onLayout={e => {
              if (!measured) {
                textWidth.current = e.nativeEvent.layout.width;
                setMeasured(true);
              }
            }}
            numberOfLines={1}
          >
            {ticker + '   '}
          </Text>
          {/* Duplicate text for seamless loop */}
          <Text style={styles.tickerText} numberOfLines={1}>
            {ticker + '   '}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  tickerWrap: {
    height: 38,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: colors.accentAlt,
    elevation: 4,
    zIndex: 10,
  },
  tickerText: {
    color: colors.textDark,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.2,
    paddingHorizontal: 10,
  },
});
