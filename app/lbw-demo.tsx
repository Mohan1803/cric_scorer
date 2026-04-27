import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, TrendingUp, Cpu, RotateCcw, Plus, ChevronLeft, Play, Pause, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  FadeIn,
  FadeOut,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Polygon, Path, Circle } from 'react-native-svg';
import { colors } from './theme';

const { width: DEVICE_W, height: DEVICE_H } = Dimensions.get('window');
const SW = Math.min(DEVICE_W, DEVICE_H * (9 / 16));
const SH = SW * (16 / 9);

// ─── CAMERA ANGLES ──────────────────────────────
// Each "phase" is a distinct camera angle with its own background
type Phase =
  | 'processing'        // AI analysis overlay
  | 'video_play_raw'    // Phase 1: Play raw video first time
  | 'video_play_track'  // Phase 2: Replay video with tracking trails
  | 'simulation'        // Phase 3: 3D ball-tracker prediction
  | 'height_check'      // Phase 4: Side-on Virtual Height graphic
  | 'decision';         // Final verdict

// ─── COMPONENT ──────────────────────────────────
export default function LbwDemo() {
  const [phase, setPhase] = useState<Phase>('processing');
  const [verdictBanner, setVerdictBanner] = useState<{
    label: string;
    status: string;
    color: string;
  } | null>(null);
  const insets = useSafeAreaInsets();
  const timeouts = useRef<NodeJS.Timeout[]>([]);
  const isMounted = useRef(true);

  // Safe icon fallbacks
  const SafeX = X || Plus;
  const SafeChevronLeft = ChevronLeft || Plus;
  const SafeTrendingUp = TrendingUp || Plus;
  const SafeCpu = Cpu || Plus;
  const SafeRotateCcw = RotateCcw || Plus;

  // Cleanup timeouts on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      timeouts.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const addTimeout = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      if (isMounted.current) {
        fn();
      }
    }, ms);
    timeouts.current.push(t);
    return t;
  };

  const goBack = () => {
    isMounted.current = false;
    // Clear all pending timeouts first
    timeouts.current.forEach(t => clearTimeout(t));
    timeouts.current = [];

    // Explicitly cancel all Reanimated animations
    try {
      cancelAnimation(ballOpacity);
      cancelAnimation(ballX);
      cancelAnimation(ballY);
      cancelAnimation(ballScale);
      cancelAnimation(trailOpacity);
      cancelAnimation(glowPulse);
      cancelAnimation(scanProgress);

      // Reset values to safe defaults
      ballOpacity.value = 0;
      trailOpacity.value = 0;
      glowPulse.value = 0;
      scanProgress.value = 0;
    } catch (e) {
      console.warn('Animation cleanup error:', e);
    }

    // Small delay to ensure bridge cleanup before navigation
    setTimeout(() => {
      router.replace('/entryPage');
    }, 100);
  };

  // DRS status data (Calibrated for the YouTube Reference video)
  const [ballSpeed, setBallSpeed] = useState(142.8);
  const [movementInfo, setMovementInfo] = useState({ swing: '0.8° OUT', spin: '1.2° IN' });
  const [drsStatus, setDrsStatus] = useState({
    pitching: 'IN LINE',
    impact: 'IN LINE',
    wickets: 'HITTING',
  });

  const PITCHING_TIME_MS = 3466;
  const IMPACT_TIME_MS = 7800;

  const containerWidth = Math.min(SW, SH * (16 / 9));
  const containerHeight = containerWidth * (16 / 9);

  const [calibrationPoints, setCalibrationPoints] = useState({
    bowlingCrease: { y: containerHeight * 0.25 },
    battingCrease: { y: containerHeight * 0.78 },
    stumps: { x: containerWidth * 0.5, y: containerHeight * 0.38 }
  });

  // ── ICC Status Colors ──
  const getStatusColor = (status: string) => {
    if (status === 'IN LINE' || status === 'HITTING' || status === 'OUT') return '#22c55e';
    if (status === "UMPIRE'S CALL") return '#f97316';
    if (status === 'OUTSIDE OFF') return '#38bdf8'; // Blue
    if (status === 'OUTSIDE LEG') return '#f472b6'; // Pink
    return '#ef4444'; // Red (Missing)
  };

  const getPitchColor = (pitching: string) => {
    if (pitching === 'IN LINE') return 'rgba(34, 197, 94, 0.4)';
    if (pitching === 'OUTSIDE OFF') return 'rgba(56, 189, 248, 0.4)'; // Blue
    if (pitching === 'OUTSIDE LEG') return 'rgba(244, 114, 182, 0.4)'; // Pink
    return 'rgba(255, 255, 255, 0.1)';
  };

  // ── Broadcast-style verdict helper ──
  const showVerdictAndProceed = (
    label: string, status: string, phaseName: string,
    nextFn: () => void, holdMs: number = 2500
  ) => {
    const color = getStatusColor(status);
    addTimeout(() => setVerdictBanner({ label, status, color }), 500);
    addTimeout(() => { setVerdictBanner(null); nextFn(); }, 500 + holdMs);
  };

  // ── Ball animation shared values ──
  const videoProgress = useSharedValue(0); // Progress of the live video (0-1)
  const pathProgress = useSharedValue(0);  // For the predictive ghost trail
  const ballOpacity = useSharedValue(0);
  const ballX = useSharedValue(SW / 2);
  const ballY = useSharedValue(SH * 0.85);
  const ballScale = useSharedValue(1.6);
  const trailOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const scanProgress = useSharedValue(0);
  const cameraScale = useSharedValue(1);
  const cameraY = useSharedValue(0);
  const evidencePulse = useSharedValue(0);

  // Background Opacities for Cross-fading
  const bgOpacityPitching = useSharedValue(1);
  const bgOpacityImpact = useSharedValue(0);
  const bgOpacityWickets = useSharedValue(0);

  const [ghostPitch, setGhostPitch] = useState<null | { x: number, y: number }>(null);
  const [ghostImpact, setGhostImpact] = useState<null | { x: number, y: number }>(null);
  const videoRef = useRef<Video>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const playTriggered = useRef(false);
  const impactTriggered = useRef(false);

  // ── Processing & Calibration sequence ──
  useEffect(() => {
    scanProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1, false
    );

    // Sequence: Processing -> Raw Play
    addTimeout(() => {
      setPhase('video_play_raw');
    }, 2000);
  }, []);

  // Sync video play with state
  useEffect(() => {
    if (isVideoReady && (phase === 'video_play_raw' || phase === 'video_play_track') && !playTriggered.current) {
      playTriggered.current = true;
      videoRef.current?.playFromPositionAsync(0);
    }
  }, [isVideoReady, phase]);

  // ── Video Playback Controller ──
  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;
    const pos = status.positionMillis;

    // Sync 3D overlay with video time (only during tracked phase)
    if (phase === 'video_play_track') {
      videoProgress.value = pos / IMPACT_TIME_MS;
    }

    // Sequence Control
    if (pos >= IMPACT_TIME_MS) {
      if (phase === 'video_play_raw' && !impactTriggered.current) {
        impactTriggered.current = true;

        // Reset for tracked play
        addTimeout(() => {
          impactTriggered.current = false;
          playTriggered.current = false;
          setPhase('video_play_track');
        }, 800);
      }
      else if (phase === 'video_play_track' && !impactTriggered.current) {
        impactTriggered.current = true;

        // Dynamic Slow-Motion (0.4x speed for impact clarity)
        videoRef.current?.setRateAsync(0.4, true);

        // Trigger Slow-Motion Zoom (0.5s zoom-in)
        cameraScale.value = withTiming(1.6, { duration: 600 });
        cameraY.value = withTiming(-SH * 0.12, { duration: 600 });

        setTimeout(() => {
          videoRef.current?.pauseAsync();
          setPhase('simulation');
        }, 600);
      }
    }
  };

  // ── Phase transition controller ──
  useEffect(() => {
    if (phase === 'simulation') startSimulationSequence();
  }, [phase]);

  const startSimulationSequence = () => {
    setGhostPitch({ x: containerWidth * 0.1887, y: containerHeight * 0.6574 });
    setGhostImpact({ x: containerWidth * 0.7215, y: containerHeight * 0.4156 });

    // Transition seamlessly to predictive ghost trail
    pathProgress.value = 0;
    pathProgress.value = withTiming(1, { duration: 1800 }, (finished) => {
      if (finished) {
        runOnJS(setPhase)('height_check');
      }
    });
  };

  // ═══════════════════════════════════════════════
  //  PHASE 1 — PITCHING (Behind-bowler camera)
  //  Broadcast style: animate → freeze → verdict banner → next
  // ═══════════════════════════════════════════════
  // ─── Restart ──
  const restart = useCallback(() => {
    setPhase('processing');
    ballOpacity.value = 0;
    trailOpacity.value = 0;
    glowPulse.value = 0;
    pathProgress.value = 0;
    setGhostPitch(null);
    setGhostImpact(null);
    setVerdictBanner(null);

    addTimeout(() => {
      impactTriggered.current = false;
      playTriggered.current = false;
      setPhase('video_play_raw');
    }, 1000);
  }, []);

  // ═══════════════════════════════════════════════
  //  ANIMATED STYLES
  // ═══════════════════════════════════════════════
  const animBall = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: ballX.value - 12 },
      { translateY: ballY.value - 12 },
      { scale: ballScale.value },
    ],
  }));

  const animTrail = useAnimatedStyle(() => ({
    opacity: trailOpacity.value,
    transform: [
      { translateX: ballX.value - 6 },
      { translateY: ballY.value + 20 },
      { scale: ballScale.value * 0.4 },
    ],
  }));

  const animGlow = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [
      { translateX: ballX.value - 40 },
      { translateY: ballY.value - 40 },
      { scale: 1 + glowPulse.value * 0.5 },
    ],
  }));

  const animShadow = useAnimatedStyle(() => ({
    opacity: interpolate(ballOpacity.value, [0, 1], [0, 0.4]),
    transform: [
      { translateX: ballX.value - 15 },
      { translateY: SH * 0.62 }, // On the pitch floor
      { scaleX: interpolate(ballY.value, [SH * 0.15, SH * 0.62], [0.4, 1.2]) },
      { scaleY: 0.3 },
    ],
  }));

  const animCamera = useAnimatedStyle(() => ({
    transform: [
      { scale: cameraScale.value },
      { translateY: cameraY.value },
    ],
  }));

  const animScan = useAnimatedStyle(() => ({
    transform: [{ translateY: scanProgress.value * (SH * 0.4) }],
  }));

  const animCameraZoom = useAnimatedStyle(() => ({
    transform: [
      { scale: cameraScale.value },
      { translateY: cameraY.value },
    ],
  }));

  const animEvidence = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(evidencePulse.value, [0, 1], [1, 1.4]) }],
    opacity: interpolate(evidencePulse.value, [0, 1], [0.8, 0.4]),
  }));

  // ─── 3D Stump Renderer ───
  const renderStump3D = (x: number, isHit: boolean = false) => {
    const sWidth = 12;
    const sHeight = 120;
    const sTop = SH * 0.38;
    return (
      <View key={`stump-${x}`} style={{ position: 'absolute', left: x - sWidth / 2, top: sTop }}>
        {/* Wireframe Cylinder */}
        <View style={{
          width: sWidth, height: sHeight, borderRadius: sWidth / 2,
          borderWidth: 1.5, borderColor: isHit ? '#ef4444' : 'rgba(56, 189, 248, 0.6)',
          backgroundColor: isHit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.4)',
        }} />
        {/* Holographic Pulse */}
        {isHit && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[StyleSheet.absoluteFill, {
              backgroundColor: '#ef4444', opacity: 0.4, borderRadius: sWidth / 2,
              shadowColor: '#ef4444', shadowOpacity: 1, shadowRadius: 15
            }]}
          />
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════

  const getPhaseLabel = () => {
    switch (phase) {
      case 'video_play_raw': return 'LIVE FOOTAGE';
      case 'video_play_track': return 'TRACKING REPLAY';
      case 'simulation': return 'TRAJECTORY';
      case 'height_check': return 'HEIGHT ANALYSIS';
      default: return 'ANALYSIS';
    }
  };

  const getPhaseStatus = () => {
    switch (phase) {
      case 'video_play_raw': return 'SOURCE';
      case 'video_play_track': return 'TRACKING';
      case 'simulation': return 'PREDICTING';
      case 'height_check': return 'ANALYZING';
      default: return 'PROCESSING';
    }
  };

  const isTrackingPhase = phase === 'video_play_track' || phase === 'simulation' || phase === 'height_check';
  const glowColor = (phase === 'simulation' || phase === 'height_check') ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.5)';
  const ballColor = (phase === 'simulation' || phase === 'height_check') ? '#ef4444' : '#3b82f6';

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <View style={styles.videoContainer}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          animCameraZoom,
          { opacity: 1 }
        ]}>
          {/* Actual Video Footage (YouTube Reference) - Non-zoomed */}
          <Video
            ref={videoRef}
            source={require('../assets/videos/lbw_out_demo.mp4')}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            progressUpdateIntervalMillis={50}
            onLoad={() => {
              setIsVideoReady(true);
            }}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />
        </Animated.View>

        {/* All analytical overlays now live inside this same aspect-ratio box */}
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Speed Gauge Overlay (Visible during raw playback and all tracking phases) */}
        {(phase === 'video_play_raw' || isTrackingPhase) && (
          <Animated.View entering={FadeIn} style={styles.speedGauge}>
            <Text style={styles.speedValue}>{ballSpeed}</Text>
            <Text style={styles.speedUnit}>KM/H</Text>
            <View style={styles.movementRow}>
              <Text style={styles.movementTag}>SWING: {movementInfo.swing}</Text>
              <Text style={styles.movementTag}>SPIN: {movementInfo.spin}</Text>
            </View>
          </Animated.View>
        )}

        {/* ══════════ PROCESSING OVERLAY ══════════ */}
        {phase === 'processing' && (
          <View style={styles.processingOverlay}>
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.97)', 'rgba(30, 41, 59, 0.99)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.processingContent}>
              <View style={styles.scanArea}>
                <Animated.View style={[styles.scanLine, animScan]} />
              </View>
              <View style={styles.processingIcon}>
                <SafeCpu size={44} color="#818cf8" />
              </View>
              <Text style={styles.processingTitle}>BALL TRACKING</Text>
              <Text style={styles.processingSubtitle}>
                Analyzing delivery trajectory...
              </Text>
              <View style={styles.dataList}>
                <Text style={styles.dataItem}>▸ Calculating pitching point</Text>
                <Text style={styles.dataItem}>▸ Measuring impact height</Text>
                <Text style={styles.dataItem}>▸ Predicting path to stumps</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════ DRS HEADER DASHBOARD ══════════ */}
        {isTrackingPhase && (
          <View style={[styles.headerDashboard, { paddingTop: Math.max(insets.top, 14) }]}>
            <LinearGradient
              colors={['rgba(0,0,0,0.85)', 'transparent']}
              style={styles.headerGrad}
            />
            <View style={styles.drsRow}>
              {/* Pitching */}
              <View style={[styles.drsBox, (phase === 'simulation' || phase === 'height_check') && styles.drsBoxActive]}>
                <Text style={styles.drsBoxLabel}>PITCHING</Text>
                <Text style={[
                  styles.drsBoxValue,
                  (phase === 'simulation' || phase === 'height_check') && { color: '#22c55e' }
                ]}>
                  {(phase === 'simulation' || phase === 'height_check') ? drsStatus.pitching : '—'}
                </Text>
              </View>
              {/* Impact */}
              <View style={[styles.drsBox, (phase === 'simulation' || phase === 'height_check') && styles.drsBoxActive]}>
                <Text style={styles.drsBoxLabel}>IMPACT</Text>
                <Text style={[
                  styles.drsBoxValue,
                  (phase === 'simulation' || phase === 'height_check') && { color: '#22c55e' }
                ]}>
                  {(phase === 'simulation' || phase === 'height_check') ? drsStatus.impact : '—'}
                </Text>
              </View>
              {/* Wickets */}
              <View style={[styles.drsBox, (phase === 'simulation' || phase === 'height_check') && styles.drsBoxActive]}>
                <Text style={styles.drsBoxLabel}>WICKETS</Text>
                <Text style={[
                  styles.drsBoxValue,
                  (phase === 'simulation' || phase === 'height_check') && { color: '#22c55e' }
                ]}>
                  {(phase === 'simulation' || phase === 'height_check') ? drsStatus.wickets : '—'}
                </Text>
              </View>
            </View>

            {/* Current Phase Label */}
            <View style={styles.phaseBadge}>
              <View style={[styles.phaseDot, { backgroundColor: ballColor }]} />
              <Text style={styles.phaseText}>{getPhaseLabel()}: {getPhaseStatus()}</Text>
            </View>

            <View style={styles.scenarioLabel}>
              <Text style={styles.scenarioText}>SCENARIO: PLUMB OUT (YOUTUBE REFERENCE)</Text>
            </View>

            {/* Broadcast Watermarks */}
            <View style={styles.broadcastOverlay} pointerEvents="none">
              <View style={styles.replayBadge}>
                <View style={styles.replayDot} />
                <Text style={styles.replayText}>REPLAY</Text>
              </View>
              <Text style={styles.techText}>DRS TECHNOLOGY</Text>
            </View>
          </View>
        )}

        {/* ══════════ BALL + EFFECTS ══════════ */}
        {isTrackingPhase && (
          <>
            {/* Pitch Mat (In-Line zone) */}
            <View style={styles.matContainer} pointerEvents="none">
              <Svg height={SH} width={SW} viewBox={`0 0 ${SW} ${SH}`}>
                <Polygon
                  points={`${SW * 0.4},${SH * 0.4} ${SW * 0.6},${SH * 0.4} ${SW * 0.75},${SH * 0.8} ${SW * 0.25},${SH * 0.8}`}
                  fill={(phase === 'simulation' || phase === 'height_check') ? getPitchColor(drsStatus.pitching) : "rgba(255, 255, 255, 0.08)"}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.5"
                />

                {/* Pitch Point Marker (Circular Red Pulse) */}
                {(phase === 'simulation' || phase === 'height_check') && ghostPitch && (
                  <>
                    <Animated.View style={{
                      position: 'absolute', left: ghostPitch.x - 20, top: ghostPitch.y - 20,
                      width: 40, height: 40, borderRadius: 20,
                      borderWidth: 2, borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    }} />
                    <Circle
                      cx={ghostPitch.x}
                      cy={ghostPitch.y}
                      r="6"
                      fill="#EF4444"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  </>
                )}

                {/* Stump-to-Stump Corridor */}
                {(phase === 'simulation' || phase === 'height_check') && (
                  <Polygon
                    points={`${SW * 0.44},${SH * 0.38} ${SW * 0.56},${SH * 0.38} ${SW * 0.7},${SH * 0.8} ${SW * 0.3},${SH * 0.8}`}
                    fill="rgba(56, 189, 248, 0.1)"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeWidth="1"
                  />
                )}
                {/* 3D Coordinate Grid Lines */}
                <Path
                  d={`M ${SW * 0.32} ${SH * 0.6} L ${SW * 0.68} ${SH * 0.6} M ${SW * 0.36} ${SH * 0.5} L ${SW * 0.64} ${SH * 0.5}`}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
                <Path
                  d={`M ${SW * 0.5} ${SH * 0.4} L ${SW * 0.5} ${SH * 0.8}`}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />

                {/* Landing Corridor (High-Fidelity Blue Ribbon) */}
                {isTrackingPhase && (
                  <Path
                    d={`M ${SW * 0.5118} ${SH * 0.25} Q ${SW * 0.4} ${SH * 0.3} ${SW * 0.1887} ${SH * 0.6574}`}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.25)"
                    strokeWidth="80"
                    strokeDasharray="1000"
                    strokeDashoffset={interpolate(videoProgress.value, [0, 0.44], [1000, 0], 'clamp')}
                  />
                )}

                {/* Phase 1: Release to Pitch (Triple-Layer Neon Glow) */}
                {isTrackingPhase && (
                  <>
                    <Path
                      d={`M ${SW * 0.5118} ${SH * 0.1941} Q ${SW * 0.4} ${SH * 0.25} ${SW * 0.1887} ${SH * 0.6574}`}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="18"
                      strokeDasharray="1000"
                      strokeDashoffset={interpolate(videoProgress.value, [0, 0.44], [1000, 0], 'clamp')}
                      opacity={0.15}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M ${SW * 0.5118} ${SH * 0.1941} Q ${SW * 0.4} ${SH * 0.25} ${SW * 0.1887} ${SH * 0.6574}`}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="8"
                      strokeDasharray="1000"
                      strokeDashoffset={interpolate(videoProgress.value, [0, 0.44], [1000, 0], 'clamp')}
                      opacity={0.4}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M ${SW * 0.5118} ${SH * 0.1941} Q ${SW * 0.4} ${SH * 0.25} ${SW * 0.1887} ${SH * 0.6574}`}
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeDasharray="1000"
                      strokeDashoffset={interpolate(videoProgress.value, [0, 0.44], [1000, 0], 'clamp')}
                      opacity={1}
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Phase 2: Post-Bounce (High-Intensity Red Glow) */}
                {isTrackingPhase && (
                  <>
                    <Path
                      d={`M ${SW * 0.1887} ${SH * 0.6574} Q ${SW * 0.45} ${SH * 0.4} ${SW * 0.7215} ${SH * 0.4156}`}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="20"
                      strokeDasharray="1000"
                      strokeDashoffset={interpolate(videoProgress.value, [0.44, 1], [1000, 0], 'clamp')}
                      opacity={0.2}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M ${SW * 0.1887} ${SH * 0.6574} Q ${SW * 0.45} ${SH * 0.4} ${SW * 0.7215} ${SH * 0.4156}`}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="8"
                      strokeDasharray="1000"
                      strokeDashoffset={interpolate(videoProgress.value, [0.44, 1], [1000, 0], 'clamp')}
                      opacity={0.6}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M ${SW * 0.1887} ${SH * 0.6574} Q ${SW * 0.45} ${SH * 0.4} ${SW * 0.7215} ${SH * 0.4156}`}
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeDasharray="1000"
                      strokeDashoffset={interpolate(videoProgress.value, [0.44, 1], [1000, 0], 'clamp')}
                      opacity={1}
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Phase 3: Impact to Stumps (Extended Virtual Path through Stumps) */}
                {(phase === 'simulation' || phase === 'height_check') && (
                  <>
                    <Path
                      d={`M ${SW * 0.7215} ${SH * 0.4156} Q ${SW * 0.58} ${SH * 0.39} ${SW * 0.3} ${SH * 0.37}`} // Extended through stumps
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="10"
                      strokeDasharray="12,8"
                      strokeDashoffset={interpolate(pathProgress.value, [0, 1], [1000, 0], 'clamp')}
                      opacity={0.3}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M ${SW * 0.7215} ${SH * 0.4156} Q ${SW * 0.58} ${SH * 0.39} ${SW * 0.3} ${SH * 0.37}`}
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeDasharray="12,8"
                      strokeDashoffset={interpolate(pathProgress.value, [0, 1], [1000, 0], 'clamp')}
                      opacity={0.9}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </Svg>
            </View>

            {/* Ghost Balls / Evidence Markers */}
            {ghostPitch && (phase === 'simulation' || phase === 'height_check') && (
              <View style={[styles.ghostBall, { left: ghostPitch.x - 12, top: ghostPitch.y - 12, borderColor: '#38BDF8' }]}>
                <Animated.View style={[styles.pulseRing, { borderColor: '#38BDF8' }, animEvidence]} />
              </View>
            )}
            {ghostImpact && (phase === 'simulation' || phase === 'height_check') && (
              <View style={[styles.ghostBall, { left: ghostImpact.x - 12, top: ghostImpact.y - 12, borderColor: '#EF4444' }]}>
                <Animated.View style={[styles.pulseRing, { borderColor: '#EF4444' }, animEvidence]} />
              </View>
            )}

            {/* Ball Shadow */}
            <Animated.View style={[styles.ballShadow, animShadow]} />

            {/* 3D Stumps (if wickets/decision) */}
            {(phase === 'simulation' || phase === 'height_check') && (
              <View style={styles.stumpContainer}>
                {renderStump3D(SW * 0.44, drsStatus.wickets === 'HITTING')}
                {renderStump3D(SW * 0.5, drsStatus.wickets === 'HITTING')}
                {renderStump3D(SW * 0.56, drsStatus.wickets === 'HITTING')}
              </View>
            )}

            {/* Glow ring at impact point */}
            <Animated.View style={[styles.impactGlow, { backgroundColor: glowPulse.value > 0.5 ? '#fff' : glowColor }, animGlow]} />

            {/* Trail dot */}
            <Animated.View style={[styles.trailDot, { backgroundColor: ballColor }, animTrail]} />

            {/* Main ball */}
            <Animated.View style={[styles.ball, { borderColor: ballColor, shadowColor: ballColor }, animBall]}>
              <View style={[styles.ballInner, { backgroundColor: (phase === 'simulation' || phase === 'height_check') ? '#fee2e2' : '#dbeafe' }]} />
            </Animated.View>
          </>
        )}

        {/* ══════════ ENVIRONMENTAL CALIBRATION (Creases/Stumps) ══════════ */}
        {(phase === 'video_play_raw' || phase === 'video_play_track') && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Bowling Crease */}
            <View style={[styles.calibrationLine, { top: calibrationPoints.bowlingCrease.y }]}>
              <Text style={styles.calibrationTag}>BOWLING CREASE</Text>
            </View>
            {/* Batting Crease */}
            <View style={[styles.calibrationLine, { top: calibrationPoints.battingCrease.y }]}>
              <Text style={styles.calibrationTag}>BATTING CREASE</Text>
            </View>
            {/* Stump Marker */}
            <View style={[styles.stumpMarker, { left: calibrationPoints.stumps.x - 25, top: calibrationPoints.stumps.y - 10 }]}>
              <Target size={16} color="#38BDF8" />
              <Text style={styles.calibrationTag}>STUMP CALIBRATION</Text>
            </View>
          </Animated.View>
        )}

        {/* Side-on Virtual Height Graphic */}
        {phase === 'height_check' && (
          <Animated.View entering={FadeIn.delay(500)} style={styles.heightGraphicContainer}>
            <LinearGradient colors={['rgba(15,23,42,0.9)', 'rgba(2,6,23,0.98)']} style={styles.heightGraphicContent}>
              <Text style={styles.heightGraphicTitle}>VIRTUAL HEIGHT ANALYSIS</Text>
              <View style={styles.heightRow}>
                {/* Stumps side profile */}
                <View style={styles.stumpProfile}>
                  <View style={styles.stumpProfileBar} />
                  <View style={styles.bailProfile} />
                </View>
                {/* Ball trajectory side profile */}
                <View style={styles.trajectoryProfile}>
                  <Svg height="120" width="160">
                    <Path
                      d="M 10 100 Q 80 20 150 60"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="4"
                      opacity={0.8}
                    />
                    <Circle cx="150" cy="60" r="6" fill="#ef4444" />
                  </Svg>
                </View>
              </View>
              <View style={[styles.verdictPillLarge, { backgroundColor: getStatusColor(drsStatus.wickets), marginTop: 20 }]}>
                <Text style={styles.verdictTextLarge}>
                  {drsStatus.wickets === 'HITTING' ? 'OUT - HITTING' :
                    drsStatus.wickets === "UMPIRE'S CALL" ? "UMPIRE'S CALL - CLIPPING" : 'NOT OUT - MISSING'}
                </Text>
              </View>
              <TouchableOpacity style={[styles.restartBtn, { marginTop: 20 }]} onPress={() => setPhase('decision')}>
                <Text style={styles.restartBtnText}>VIEW FINAL DECISION</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}
      </View>


      {/* ══════════ BOTTOM CONTROLS ══════════ */}
      <View style={styles.bottomBar}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.bottomGrad}
        />

        {/* Camera angle indicator */}
        {(isTrackingPhase || phase === 'video_play_raw') && (
          <View style={styles.cameraTag}>
            <Text style={styles.cameraTagText}>
              {(phase === 'simulation' || phase === 'height_check') ? '📹 BROADCAST CAMERA' :
                phase === 'video_play_track' ? '📹 TRACKING VIEW' : '📹 LIVE FOOTAGE'}
            </Text>
          </View>
        )}
      </View>

      {/* ══════════ DECISION PANEL (Broadcast Matrix) ══════════ */}
      {phase === 'decision' && (
        <Animated.View entering={FadeIn.duration(800)} style={styles.decisionOverlay}>
          <LinearGradient
            colors={['rgba(15,23,42,0.85)', 'rgba(2,6,23,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.decisionContent}>
            <Text style={styles.broadcastTitle}>DRS TRACKING COMPLETE</Text>

            <View style={styles.professionalMatrix}>
              {/* Row 1: Pitching */}
              <View style={styles.matrixRow}>
                <View style={styles.matrixLabelWrap}>
                  <Text style={styles.matrixLabel}>PITCHING</Text>
                </View>
                <View style={[styles.matrixPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
                  <Text style={[styles.matrixValue, { color: '#ef4444' }]}>{drsStatus.pitching}</Text>
                </View>
              </View>

              {/* Row 2: Impact */}
              <View style={styles.matrixRow}>
                <View style={styles.matrixLabelWrap}>
                  <Text style={styles.matrixLabel}>IMPACT</Text>
                </View>
                <View style={[styles.matrixPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
                  <Text style={[styles.matrixValue, { color: '#ef4444' }]}>{drsStatus.impact}</Text>
                </View>
              </View>

              {/* Row 3: Wickets */}
              <View style={styles.matrixRow}>
                <View style={styles.matrixLabelWrap}>
                  <Text style={styles.matrixLabel}>WICKETS</Text>
                </View>
                <View style={[styles.matrixPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
                  <Text style={[styles.matrixValue, { color: '#ef4444' }]}>{drsStatus.wickets}</Text>
                </View>
              </View>
            </View>

            <View style={styles.finalVerdictWrap}>
              <Text style={styles.finalVerdictLabel}>FINAL DECISION</Text>
              <Animated.View entering={FadeIn.delay(500)} style={[styles.verdictPillLarge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.verdictTextLarge}>OUT</Text>
              </Animated.View>
            </View>

            <View style={styles.decisionActions}>
              <TouchableOpacity style={styles.restartBtn} onPress={restart}>
                <RotateCcw size={18} color="#fff" />
                <Text style={styles.restartBtnText}>REPLAY</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backToMainBtn} onPress={goBack}>
                <Text style={styles.backToMainText}>CLOSE DEMO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ══════════ VERDICT BANNER (broadcast-style freeze-frame) ══════════ */}
      {verdictBanner && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.verdictBannerOverlay}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.verdictBannerContent}>
            <Text style={styles.verdictBannerLabel}>{verdictBanner.label}</Text>
            <View style={[
              styles.verdictBannerPill,
              { backgroundColor: verdictBanner.color + '20', borderColor: verdictBanner.color }
            ]}>
              <Text style={[styles.verdictBannerStatus, { color: verdictBanner.color }]}>
                {verdictBanner.status}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Back button ── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: Math.max(insets.top, 10) }]}
        onPress={goBack}
      >
        <SafeChevronLeft size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoContainer: {
    width: SW,
    height: SH,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },

  // ── Processing ──
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingContent: { alignItems: 'center', padding: 40 },
  scanArea: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden', opacity: 0.15,
  },
  scanLine: {
    width: '100%', height: 3,
    backgroundColor: '#818cf8',
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 15,
    position: 'absolute', top: '30%',
  },
  processingIcon: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(99,102,241,0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  processingTitle: {
    color: '#fff', fontSize: 22, fontWeight: '900',
    letterSpacing: 6, marginBottom: 10,
  },
  processingSubtitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    fontWeight: '500', marginBottom: 36,
  },
  dataList: { gap: 10, alignItems: 'flex-start' },
  dataItem: {
    color: 'rgba(255,255,255,0.35)', fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },

  // ── DRS Header Dashboard ──
  headerDashboard: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 55, paddingHorizontal: 16, zIndex: 20,
  },
  headerGrad: {
    ...StyleSheet.absoluteFillObject, height: 200,
  },
  drsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  drsBox: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  drsBoxActive: {
    borderColor: 'rgba(99,102,241,0.5)',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  drsBoxLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    fontWeight: '800', letterSpacing: 1.5, marginBottom: 4,
  },
  drsBoxValue: {
    color: 'rgba(255,255,255,0.3)', fontSize: 12,
    fontWeight: '900',
  },
  phaseBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  phaseDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  phaseText: {
    color: '#fff', fontSize: 12, fontWeight: '800',
    letterSpacing: 2,
  },

  // ── Ball & Effects ──
  ball: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 20,
    elevation: 15,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 30,
    backgroundColor: '#fff', // White core like the video
  },
  ballInner: {
    width: 18, height: 18, borderRadius: 9,
    opacity: 0.8,
  },
  trailDot: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    opacity: 0.5, zIndex: 25,
  },
  impactGlow: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    zIndex: 35,
  },
  matContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  stumpContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  ballShadow: {
    position: 'absolute',
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#000',
    zIndex: 12,
  },
  ghostBall: {
    position: 'absolute',
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 25,
    opacity: 0.6,
  },
  pulseRing: {
    position: 'absolute',
    width: 44, height: 44,
    borderRadius: 22,
    borderWidth: 2,
    left: -13.5, top: -13.5,
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 100,
  },
  bottomGrad: { ...StyleSheet.absoluteFillObject },
  cameraTag: {
    position: 'absolute', bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cameraTagText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 10,
    fontWeight: '700', letterSpacing: 2,
  },

  // ── Decision Panel ──
  decisionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 100,
  },
  decisionContent: {
    width: '90%',
    padding: 30,
    borderRadius: 32,
    backgroundColor: 'rgba(30,41,59,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  broadcastTitle: {
    color: '#94a3b8', fontSize: 10, fontWeight: '900',
    letterSpacing: 4, textAlign: 'center', marginBottom: 28,
  },
  professionalMatrix: {
    gap: 12, marginBottom: 32,
  },
  matrixRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  matrixLabelWrap: { flex: 1, paddingLeft: 8 },
  matrixLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  matrixPill: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1.5,
    minWidth: 120, alignItems: 'center',
  },
  matrixValue: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  finalVerdictWrap: { alignItems: 'center', marginBottom: 36 },
  finalVerdictLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 5, marginBottom: 12 },
  verdictPillLarge: {
    paddingHorizontal: 50, paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#ef4444', shadowOpacity: 0.6, shadowRadius: 20,
    elevation: 10,
  },
  verdictTextLarge: { color: '#fff', fontSize: 42, fontWeight: '900', fontStyle: 'italic', letterSpacing: 6 },

  decisionActions: { flexDirection: 'row', gap: 12 },
  restartBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  restartBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  backToMainBtn: {
    flex: 1, backgroundColor: '#7C3AED',
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  backToMainText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  // ── Close ──
  backBtn: {
    position: 'absolute', top: 52, left: 18,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 200,
  },

  // ── Verdict Banner (broadcast freeze-frame) ──
  verdictBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 45,
  },
  verdictBannerContent: {
    alignItems: 'center', gap: 12,
    paddingVertical: 28, paddingHorizontal: 40,
  },
  verdictBannerLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    fontWeight: '900', letterSpacing: 6,
  },
  verdictBannerPill: {
    paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 12, borderWidth: 2,
    minWidth: 180, alignItems: 'center',
  },
  verdictBannerStatus: {
    fontSize: 22, fontWeight: '900', letterSpacing: 3,
  },
  // ── Broadcast Overlays ──
  broadcastOverlay: {
    position: 'absolute', top: 120, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, alignItems: 'center',
  },
  replayBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.8)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 4,
  },
  replayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  replayText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  techText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10,
    fontWeight: '800', letterSpacing: 2,
  },
  scenarioLabel: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  scenarioText: {
    color: '#3b82f6', fontSize: 8, fontWeight: '900', letterSpacing: 1,
  },
  // ── Calibration ──
  calibrationLine: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'flex-end', paddingRight: 20,
  },
  calibrationTag: {
    color: '#38BDF8', fontSize: 8, fontWeight: '900',
    letterSpacing: 1, marginTop: 4,
  },
  stumpMarker: {
    position: 'absolute', width: 50, height: 20,
    alignItems: 'center',
  },
  // ── Height Graphic ──
  heightGraphicContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 110,
  },
  heightGraphicContent: {
    width: '85%', padding: 24, borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heightGraphicTitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 10,
    fontWeight: '900', letterSpacing: 3, marginBottom: 24,
  },
  heightRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 30,
    height: 150,
  },
  stumpProfile: {
    width: 20, height: 120, justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stumpProfileBar: {
    width: 8, height: 100, backgroundColor: '#334155', borderRadius: 4,
  },
  bailProfile: {
    width: 12, height: 4, backgroundColor: '#475569', borderRadius: 2,
    position: 'absolute', bottom: 100,
  },
  trajectoryProfile: {
    width: 160, height: 120,
  },
  // ── Speed Gauge (AI Matrix Style) ──
  speedGauge: {
    position: 'absolute', top: 160, left: 20,
    backgroundColor: 'rgba(15,23,42,0.92)',
    padding: 18, borderRadius: 20,
    borderWidth: 2, borderColor: '#38BDF8',
    alignItems: 'flex-start', minWidth: 140,
    shadowColor: '#38BDF8', shadowOpacity: 0.5, shadowRadius: 20,
    elevation: 20,
  },
  speedValue: { color: '#fff', fontSize: 32, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 },
  speedUnit: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  movementRow: { marginTop: 8, gap: 4 },
  movementTag: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700' },
});
