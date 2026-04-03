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
const COIN_SIZE = Math.min(width * 0.5, 200);

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
        
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {(phase === 'result' || phase === 'choose') && (
            <TouchableOpacity
              style={styles.reflipButton}
              onPress={handleReflip}
            >
              <RotateCcw color={colors.accentSecondary} size={20} />
              <Text style={styles.reflipText}>Reflip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Animated.View style={cameraStyle}>
        <View style={styles.container}>
          {/* Main Toss Phase */}
          {phase !== 'choose' && (
            <View style={styles.coinPhaseContainer}>
              <View style={styles.textOverlay}>
                <Text style={styles.title}>
                  {phase === 'ready' ? 'THE TOSS' : phase === 'flipping' ? 'FLIPPING...' : 'IT\'S ' + coinResult + '!'}
                </Text>
                <Text style={styles.subtitle}>
                  {phase === 'ready'
                    ? 'Tap the coin to flip'
                    : phase === 'flipping'
                    ? 'May the odds be in your favor'
                    : 'Now choose the toss winner'}
                </Text>
              </View>

              <View style={styles.coinTouchArea}>
                <TouchableOpacity
                  activeOpacity={phase === 'ready' ? 0.8 : 1}
                  onPress={phase === 'ready' ? startFlip : undefined}
                  style={StyleSheet.absoluteFill}
                >
                  {/* Coin Front - HEADS (Trophy Side) */}
                  <Animated.View style={[styles.coin, styles.coinFront, coinFrontStyle]}>
                    <LinearGradient
                      colors={['#F59E0B', '#FDE047', '#B45309', '#F59E0B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.coinGradient}
                    >
                      <View style={styles.milledEdge} />
                      <View style={styles.coinInnerRing}>
                        <LinearGradient
                          colors={['rgba(251, 191, 36, 0.4)', 'rgba(180, 83, 9, 0.2)']}
                          style={styles.coinCenterCircle}
                        >
                          <Trophy size={COIN_SIZE * 0.45} color="#78350F" strokeWidth={1.5} />
                        </LinearGradient>
                        <Text style={styles.coinLabel}>HEADS</Text>
                      </View>
                      
                      <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                        <LinearGradient
                          colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </Animated.View>
                    </LinearGradient>
                  </Animated.View>

                  {/* Coin Back - TAILS (Ball Side) */}
                  <Animated.View style={[styles.coin, styles.coinBack, coinBackStyle]}>
                    <LinearGradient
                      colors={['#94A3B8', '#F1F5F9', '#475569', '#94A3B8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.coinGradientSilver}
                    >
                      <View style={styles.milledEdgeSilver} />
                      <View style={styles.coinInnerRingSilver}>
                        <LinearGradient
                          colors={['rgba(203, 213, 225, 0.4)', 'rgba(71, 85, 105, 0.2)']}
                          style={styles.coinCenterCircleSilver}
                        >
                          <CircleDot size={COIN_SIZE * 0.45} color="#334155" strokeWidth={1.5} />
                        </LinearGradient>
                        <Text style={styles.coinLabelSilver}>TAILS</Text>
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
                </TouchableOpacity>
              </View>

              {phase === 'ready' && (
                <View style={styles.tapHint}>
                  <Text style={styles.tapText}>TAP TO FLIP</Text>
                </View>
              )}
            </View>
          )}

          {/* Choose Winner Phase */}
          {phase === 'choose' && (
            <View style={styles.chooseContainer}>
              <Animated.View entering={FadeInDown.duration(400)} style={styles.chooseHeader}>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>{coinResult}</Text>
                </View>
                <Text style={styles.chooseTitle}>Who won the toss?</Text>
                <Text style={styles.chooseSubtitle}>Select the team that called it right</Text>
              </Animated.View>

              <View style={styles.teamCardsContainer}>
                {teams.map((team, index) => (
                  <Animated.View
                    key={index}
                    entering={FadeInUp.delay(200 + index * 150).duration(500).springify()}
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
                        <View style={styles.selectBadge}>
                          <Text style={styles.selectBadgeText}>TOSS WINNER</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}
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
    top: 40,
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
  coinGradient: {
    flex: 1,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    padding: 6,
  },
  coinGradientSilver: {
    flex: 1,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(203, 213, 225, 0.5)',
    padding: 6,
  },
  milledEdge: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 8,
    borderColor: 'rgba(180, 83, 9, 0.3)',
    borderStyle: 'dotted',
  },
  milledEdgeSilver: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 8,
    borderColor: 'rgba(71, 85, 105, 0.3)',
    borderStyle: 'dotted',
  },
  coinInnerRing: {
    flex: 1,
    width: '100%',
    borderRadius: COIN_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    padding: 10,
  },
  coinInnerRingSilver: {
    flex: 1,
    width: '100%',
    borderRadius: COIN_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(203, 213, 225, 0.05)',
    padding: 10,
  },
  coinCenterCircle: {
    width: COIN_SIZE * 0.65,
    height: COIN_SIZE * 0.65,
    borderRadius: (COIN_SIZE * 0.65) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.2)',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  coinCenterCircleSilver: {
    width: COIN_SIZE * 0.65,
    height: COIN_SIZE * 0.65,
    borderRadius: (COIN_SIZE * 0.65) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.2)',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  coinLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#713F12',
    letterSpacing: 2,
    marginTop: 8,
    opacity: 0.8,
  },
  coinLabelSilver: {
    fontSize: 10,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 2,
    marginTop: 8,
    opacity: 0.8,
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
    justifyContent: 'center',
  },
  chooseHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultBadge: {
    backgroundColor: 'rgba(249, 205, 5, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 205, 5, 0.3)',
    marginBottom: 16,
  },
  resultBadgeText: {
    color: colors.accentSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  chooseTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  chooseSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  teamCardsContainer: {
    gap: 16,
  },
  teamCardWrapper: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  teamCard: {
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
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