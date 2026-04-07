import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, RotateCcw, Trophy, CircleDot, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const COIN_SIZE = Math.min(width * 0.45, 180);

type TossPhase = 'ready' | 'flipping' | 'result' | 'choose';

export default function TossScreen() {
  const teams = useGameStore((state) => state.teams);
  const setTossWinner = useGameStore((state) => state.setTossWinner);

  const [phase, setPhase] = useState<TossPhase>('ready');
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS'>('HEADS');

  // Animation values
  const coinRotateY = useSharedValue(0);
  const coinRotateX = useSharedValue(0);
  const coinScale = useSharedValue(1);
  const coinTranslateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);
  const shimmer = useSharedValue(-1); // For the light glint
  const impactScale = useSharedValue(0); // For landing shockwave
  const impactOpacity = useSharedValue(0);
  const cameraScale = useSharedValue(1); // For cinematic zoom
  const containerShake = useSharedValue(0); // For web fallback vibration

  const onFlipComplete = useCallback((result: 'HEADS' | 'TAILS') => {
    // Heavy haptic on land (Native only)
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Visual feedback for web: a small screen shake
      containerShake.value = withSequence(
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
    setCoinResult(result);
    setPhase('result');

    // After showing result briefly, transition to choose phase
    setTimeout(() => {
      setPhase('choose');
    }, 1800);
  }, []);

  const startFlip = useCallback(() => {
    // 1. Haptic start (Native only)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // 2. Set state and prepare physics
    setPhase('flipping');

    // Advanced randomization: combining Math.random with high-precision timestamp
    const seed = Math.random() * Date.now();
    const result = ((seed ^ (seed >> 11)) % 2) === 0 ? 'HEADS' : 'TAILS';

    // Randomize physics parameters
    const peakHeightMultiplier = 0.22 + (Math.random() * 0.18);
    const totalDuration = 2200 + (Math.random() * 800);
    const rotations = 12 + Math.floor(Math.random() * 8);
    const finalRotation = (360 * rotations) + (result === 'TAILS' ? 180 : 0);
    const wobbleIntensity = 15 + (Math.random() * 25);
    const horizontalDrift = (Math.random() - 0.5) * 40;

    // Reset animations
    coinRotateY.value = 0;
    coinRotateX.value = 0;
    coinScale.value = 1;
    coinTranslateY.value = 0;
    glowOpacity.value = 0;
    resultOpacity.value = 0;
    shimmer.value = -1;
    impactScale.value = 0;
    impactOpacity.value = 0;
    cameraScale.value = 1;

    // 1. Cinematic Camera Zoom-in then out
    cameraScale.value = withSequence(
      withTiming(1.05, { duration: totalDuration * 0.4 }),
      withTiming(1.0, { duration: totalDuration * 0.6 })
    );

    // 2. Coin goes up with variable peak and "Cinematic Hang Time"
    coinTranslateY.value = withSequence(
      // Launch
      withTiming(-height * peakHeightMultiplier, {
        duration: totalDuration * 0.35,
        easing: Easing.out(Easing.exp)
      }),
      // Slow-mo Hang Time
      withTiming(-height * (peakHeightMultiplier - 0.02), {
        duration: totalDuration * 0.2,
        easing: Easing.inOut(Easing.linear)
      }),
      // Dramatic Fall
      withTiming(0, {
        duration: totalDuration * 0.45,
        easing: Easing.bezier(0.3, 0, 1, 0.5)
      })
    );

    // 3. Ultra-fast spin that slows down for the reveal
    coinRotateY.value = withSequence(
      // Initial Burst
      withTiming(finalRotation * 0.7, { duration: totalDuration * 0.4, easing: Easing.out(Easing.quad) }),
      // Slow-mo rotation at peak
      withTiming(finalRotation * 0.85, { duration: totalDuration * 0.3, easing: Easing.linear }),
      // Final settle
      withTiming(finalRotation, { duration: totalDuration * 0.3, easing: Easing.out(Easing.back(1.2)) })
    );

    // Shimmer effect during rotation - more frequent for "glamour"
    shimmer.value = withRepeat(
      withTiming(1, { duration: 400, easing: Easing.linear }),
      Math.floor(totalDuration / 400),
      false
    );

    // Scale pulse
    coinScale.value = withSequence(
      withTiming(1.5, { duration: totalDuration * 0.35 }),
      withTiming(1.2, { duration: totalDuration * 0.2 }),
      withTiming(1.1, { duration: totalDuration * 0.45 })
    );

    // 4. Landing Impact (Shockwaves)
    const triggerImpact = () => {
      impactScale.value = withTiming(2.5, { duration: 600, easing: Easing.out(Easing.quad) });
      impactOpacity.value = withSequence(
        withTiming(0.6, { duration: 100 }),
        withTiming(0, { duration: 500 })
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    // Trigger impact exactly when coinTranslateY hits 0 (approx)
    setTimeout(() => {
      runOnJS(triggerImpact)();
    }, totalDuration * 0.95);

    // Glow builds up at the end
    glowOpacity.value = withDelay(
      totalDuration * 0.9,
      withTiming(1, { duration: 300 })
    );

    // Result text fades in
    resultOpacity.value = withDelay(
      totalDuration * 1.1,
      withTiming(1, { duration: 400 })
    );

    // Trigger phase change after animation
    setTimeout(() => {
      runOnJS(onFlipComplete)(result);
    }, totalDuration * 1.2);
  }, [onFlipComplete]);

  const handleTossWinner = (teamName: string) => {
    setTossWinner(teamName);
    router.push('/select-choice');
  };

  const handleReflip = () => {
    setPhase('ready');
    coinRotateY.value = 0;
    coinScale.value = 1;
    coinTranslateY.value = 0;
    glowOpacity.value = 0;
    resultOpacity.value = 0;
  };

  // Coin front face style
  const coinFrontStyle = useAnimatedStyle(() => {
    const rotateY = coinRotateY.value % 360;
    // Show front when rotation is 0-90 or 270-360
    const isVisible = (rotateY >= 0 && rotateY < 90) || (rotateY >= 270 && rotateY <= 360);
    return {
      transform: [
        { translateY: coinTranslateY.value },
        { scale: coinScale.value },
        { perspective: 800 },
        { rotateY: `${coinRotateY.value}deg` },
        { rotateX: `${coinRotateX.value}deg` },
      ],
      opacity: isVisible ? 1 : 0,
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Coin back face style
  const coinBackStyle = useAnimatedStyle(() => {
    const rotateY = coinRotateY.value % 360;
    const isVisible = rotateY >= 90 && rotateY < 270;
    return {
      transform: [
        { translateY: coinTranslateY.value },
        { scale: coinScale.value },
        { perspective: 800 },
        { rotateY: `${coinRotateY.value + 180}deg` },
        { rotateX: `${coinRotateX.value}deg` },
      ],
      opacity: isVisible ? 1 : 0,
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Glow effect style
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      { translateY: coinTranslateY.value },
      { scale: interpolate(glowOpacity.value, [0, 1], [0.8, 1.3]) },
    ],
  }));

  // Result text style
  const resultTextStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [
      { translateY: interpolate(resultOpacity.value, [0, 1], [20, 0]) },
    ],
  }));

  // Shimmer (glint) style
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [-1, 1], [-COIN_SIZE, COIN_SIZE * 1.5]) },
      { rotate: '45deg' }
    ],
  }));

  // Floor shadow style
  const shadowStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(coinTranslateY.value, [-height * 0.4, 0], [0.05, 0.4]),
      transform: [
        { scale: interpolate(coinTranslateY.value, [-height * 0.4, 0], [0.4, 1.1]) },
        { translateY: 20 }
      ],
    };
  });

  // Impact Shockwave style
  const impactStyle = useAnimatedStyle(() => ({
    opacity: impactOpacity.value,
    transform: [
      { scale: impactScale.value },
      { translateY: 20 }
    ],
  }));

  // Cinematic Camera Style (with shake fallback)
  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cameraScale.value },
      { translateX: containerShake.value }
    ],
    flex: 1,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/role-selection');
            }
          }}
        >
          <ChevronLeft color={colors.accent} size={28} />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>

        <View style={{ width: 60 }} />
      </View>

      <Animated.View style={cameraStyle}>
        <View style={styles.container}>
            <View style={styles.contentContainer}>
              {/* Top Section: Coin Flip */}
              <View style={styles.coinSection}>
                <View style={styles.textOverlay}>
                  <Text style={styles.title}>
                    {phase === 'ready' ? 'THE TOSS' : phase === 'flipping' ? 'FLIPPING...' : 'IT\'S ' + coinResult + '!'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {phase === 'ready' ? 'Tap the coin to flip' : 'May the odds be in your favor'}
                  </Text>
                </View>

                <View style={styles.coinContainer}>
                  <TouchableOpacity
                    activeOpacity={phase !== 'flipping' ? 0.8 : 1}
                    onPress={phase !== 'flipping' ? startFlip : undefined}
                    style={styles.coinTouchArea}
                  >
                    {/* Coin Front - HEADS (Navy Enamel + Gold 'H') */}
                    <Animated.View style={[styles.coin, styles.coinFront, coinFrontStyle]}>
                      <LinearGradient
                        colors={['#FFD700', '#FDE047', '#B45309', '#F59E0B', '#B45309', '#FFD700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.coinGradientPremium}
                      >
                        <View style={styles.milledEdgeSeam} />
                        <View style={styles.coinEnamelNavy}>
                          <LinearGradient
                            colors={['#1E293B', '#0F172A', '#1E293B']}
                            style={styles.coinCenterCircleEnamel}
                          >
                            <Text style={styles.coinLetterGold}>H</Text>
                          </LinearGradient>
                          <Text style={styles.coinLabelGold}>HEADS</Text>
                        </View>
                        
                        <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                          <LinearGradient
                            colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                          />
                        </Animated.View>
                      </LinearGradient>
                    </Animated.View>

                    {/* Coin Back - TAILS (Red Enamel + Silver 'T') */}
                    <Animated.View style={[styles.coin, styles.coinBack, coinBackStyle]}>
                      <LinearGradient
                        colors={['#E2E8F0', '#F8FAFC', '#94A3B8', '#F1F5F9', '#475569', '#E2E8F0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.coinGradientSilverPremium}
                      >
                        <View style={styles.milledEdgeSeamSilver} />
                        <View style={styles.coinEnamelRed}>
                          <LinearGradient
                            colors={['#991B1B', '#7F1D1D', '#991B1B']}
                            style={styles.coinCenterCircleEnamel}
                          >
                            <Text style={styles.coinLetterSilver}>T</Text>
                          </LinearGradient>
                          <Text style={styles.coinLabelSilver}>TAILS</Text>
                        </View>
                        
                        <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                          <LinearGradient
                            colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                          />
                        </Animated.View>
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Section: Winner Selection (Merged) */}
              <View style={styles.chooseSection}>
                <View style={styles.chooseHeader}>
                   <Text style={styles.chooseTitle}>Who won the toss?</Text>
                   <Text style={styles.chooseSubtitle}>Select the team that called it right</Text>
                </View>

                <View style={styles.teamCardsContainer}>
                  {teams.map((team, index) => (
                    <Animated.View
                      key={index}
                      entering={FadeInUp.delay(200 + index * 150).duration(500).springify()}
                      style={{ flex: 1 }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleTossWinner(team.name)}
                        style={styles.teamCardWrapper}
                      >
                        <LinearGradient
                          colors={index === 0 ? [colors.accent, colors.accentAlt] : [colors.accentPurple, '#6D28D9']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.teamCard}
                        >
                          <View style={styles.teamInitialContainer}>
                            <Text style={styles.teamInitial}>{team.name.charAt(0)}</Text>
                          </View>
                          <Text style={styles.teamName}>{team.name}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </View>
            </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  coinSection: {
    height: height * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  coinContainer: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  chooseSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  reflipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.25)',
  },
  reflipText: {
    color: colors.accentSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Coin Phase
  coinPhaseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textOverlay: {
    position: 'absolute',
    top: 20,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  coinTouchArea: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // coinGlow removed

  // Coin Shared
  coin: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    position: 'absolute',
    ...shadows.goldGlow,
  },
  coinFront: {},
  coinBack: {},
  coinGradientPremium: {
    flex: 1,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#B45309',
    padding: 8,
  },
  coinGradientSilverPremium: {
    flex: 1,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#475569',
    padding: 8,
  },
  milledEdgeSeam: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 6,
    borderColor: 'rgba(180, 83, 9, 0.4)',
    borderStyle: 'dotted',
  },
  milledEdgeSeamSilver: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 6,
    borderColor: 'rgba(71, 85, 105, 0.4)',
    borderStyle: 'dotted',
  },
  coinEnamelNavy: {
    flex: 1,
    width: '100%',
    borderRadius: COIN_SIZE / 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    overflow: 'hidden',
    padding: 12,
  },
  coinEnamelRed: {
    flex: 1,
    width: '100%',
    borderRadius: COIN_SIZE / 2,
    backgroundColor: '#7F1D1D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    padding: 12,
  },
  coinCenterCircleEnamel: {
    width: COIN_SIZE * 0.65,
    height: COIN_SIZE * 0.65,
    borderRadius: (COIN_SIZE * 0.65) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLetterGold: {
    fontSize: COIN_SIZE * 0.4,
    fontWeight: '900',
    color: '#F59E0B',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif',
  },
  coinLetterSilver: {
    fontSize: COIN_SIZE * 0.4,
    fontWeight: '900',
    color: '#E2E8F0',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif',
  },
  coinLabelGold: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 4,
    marginTop: 2,
    opacity: 0.9,
  },
  coinLabelSilver: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 4,
    marginTop: 2,
    opacity: 0.9,
  },


  // Result text
  resultContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  floorShadow: {
    position: 'absolute',
    width: COIN_SIZE,
    height: 10,
    borderRadius: 100,
    backgroundColor: '#000',
    bottom: 0,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    opacity: 0.8,
  },
  impactRing: {
    position: 'absolute',
    width: COIN_SIZE,
    height: 40,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.accentSecondary,
    bottom: -15,
  },
  resultSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Tap hint
  tapHint: {
    marginTop: 40,
    alignItems: 'center',
    gap: 10,
  },
  tapCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(249, 205, 5, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapIcon: {
    fontSize: 22,
  },
  tapText: {
    fontSize: 12,
    color: colors.accentSecondary,
    letterSpacing: 3,
    fontWeight: '700',
  },

  // Choose Phase
  chooseContainer: {
    flex: 1,
    paddingHorizontal: 24,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  chooseHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chooseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  chooseSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  teamCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  teamCardWrapper: {
    borderRadius: 18,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  teamCard: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    height: 110,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  teamInitialContainer: {
    position: 'absolute',
    right: -10,
    top: -15,
  },
  teamInitial: {
    fontSize: 80,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.12)',
  },
  teamName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  selectBadge: {
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
});