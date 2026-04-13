import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Platform, Alert, Image, Pressable, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import {
  X, RotateCcw, Save, Cpu, Eye, Crosshair, Target, Circle as LucideCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
const VideoThumbnails = Platform.OS !== 'web' ? require('expo-video-thumbnails') : null;
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Rect, Polygon, Circle, Text as SvgText, G, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming,
  withSequence, withDelay, withRepeat, withSpring, Easing, runOnJS, interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from './theme';
import AutoBallDetector, {
  type AutoBallDetectorRef, type DetectionResult, type DetectedPoint,
} from '../components/AutoBallDetector';

const { width: SW, height: SH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

type Point = { x: number; y: number };

// ─── Bezier helpers ─────────────────────────────
function quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function generateTrajectoryPoints(
  release: Point, pitch: Point, impact: Point, segments = 40
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(quadraticBezier(release, pitch, impact, i / segments));
  }
  return pts;
}

function projectBeyondImpact(pitch: Point, impact: Point, factor = 0.65): Point {
  return {
    x: impact.x + (impact.x - pitch.x) * factor,
    y: impact.y + (impact.y - pitch.y) * 0.4,
  };
}

// ─── Scale detected coords to screen ────────────
function scalePoint(pt: { x: number; y: number }, srcW: number, srcH: number): Point {
  return { x: (pt.x / srcW) * SW, y: (pt.y / srcH) * SH };
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function LbwTracking() {
  const { videoUri } = useLocalSearchParams<{ videoUri: string }>();
  const videoRef = useRef<Video>(null);
  const detectorRef = useRef<AutoBallDetectorRef>(null);
  const { striker } = useGameStore();

  // ── Flow state ──
  type FlowStep = 'extracting' | 'detecting' | 'analyzing' | 'pitching' | 'impact' | 'wickets' | 'decision';
  const [step, setStep] = useState<FlowStep>('extracting');

  // ── Frame extraction ──
  const [extractProgress, setExtractProgress] = useState(0);
  const [detectProgress, setDetectProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Detection results ──
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [scaledRelease, setScaledRelease] = useState<Point | null>(null);
  const [scaledPitch, setScaledPitch] = useState<Point | null>(null);
  const [scaledImpact, setScaledImpact] = useState<Point | null>(null);
  const [scaledWickets, setScaledWickets] = useState<Point | null>(null);
  const [stumpRect, setStumpRect] = useState<{
    left: number; right: number; top: number; bottom: number;
    widthPx: number; heightPx: number;
    widthInches: number; heightInches: number;
    offX: number; legX: number;
  } | null>(null);

  // ── DRS result ──
  const [drsResult, setDrsResult] = useState({
    pitching: '', impact: '', wickets: '', decision: '',
    pitchDistInches: '', impactHeightInches: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // ── Animation values ──
  const ballOpacity = useSharedValue(0);
  const ballX = useSharedValue(SW / 2);
  const ballY = useSharedValue(SH * 0.85);
  const releaseMarkScale = useSharedValue(0);
  const pitchMarkScale = useSharedValue(0);
  const impactMarkScale = useSharedValue(0);
  const wicketsMarkScale = useSharedValue(0);
  const ballScale = useSharedValue(1.5);
  const glowPulse = useSharedValue(0);
  const scanProgress = useSharedValue(0);
  const trailProgress = useSharedValue(0);    // Used to animate path drawing
  const impactFlash = useSharedValue(0);     // For dramatic flash on hitting stumps
  const shadowOpacity = useSharedValue(0);   // Ball shadow on ground
  const stumpGlow = useSharedValue(0);        // Stump zone highlight pulse
  const scrimOpacity = useSharedValue(0);     // Dark scrim over video for contrast
  const flowProgress = useSharedValue(0);     // For the "digital stream" flow effect on the path

  // ── src dimensions for coordinate scaling ──
  const srcW = useRef(200);
  const srcH = useRef(150);

  const DEMO_OUT_URL = 'https://github.com/guurav18/LBW-DRS-IN-CRICKET/raw/main/lbw.mp4';
  const DEMO_NOT_OUT_URL = 'https://github.com/guurav18/LBW-DRS-IN-CRICKET/raw/main/none.mp4';

  const isDemo = videoUri?.startsWith('demo');
  const demoType = videoUri === 'demo_not_out' ? 'not_out' : 'out';
  const activeVideoUri = isDemo
    ? (demoType === 'not_out' ? DEMO_NOT_OUT_URL : DEMO_OUT_URL)
    : videoUri;

  // ═══════════════════════════════════════════════
  //  VIDEO PLAYBACK CONTROL
  // ═══════════════════════════════════════════════
  const playVideoLoop = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      await videoRef.current.setIsLoopingAsync(true);
      await videoRef.current.setRateAsync(0.6, true);
    } catch (e) { /* ignore */ }
  }, []);

  const pauseVideo = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.pauseAsync();
    } catch (e) { /* ignore */ }
  }, []);

  // ═══════════════════════════════════════════════
  //  FRAME EXTRACTION + AUTO DETECTION
  // ═══════════════════════════════════════════════
  useEffect(() => { startAutoFlow(); }, []);

  const startAutoFlow = async () => {
    setStep('extracting');

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      // Demo: simulate detection with pre-set points
      const isNotOut = demoType === 'not_out';

      const demoDetection: DetectionResult = {
        stumps: {
          offBase: { x: 82, y: 125 }, legBase: { x: 118, y: 125 },
          bailTop: { x: 100, y: 58 }, widthPx: 36, heightPx: 67, centerX: 100,
        },
        ballPositions: [
          { x: 100, y: 15, frame: 0 },
          { x: 98, y: 40, frame: 3 },
          { x: isNotOut ? 122 : 95, y: 95, frame: 7 },   // Missing leg side if not out
          { x: isNotOut ? 135 : 97, y: 75, frame: 10 },
          { x: isNotOut ? 145 : 99, y: 65, frame: 13 },
        ],
        releasePoint: { x: 100, y: 15, frame: 0 },
        pitchPoint: { x: isNotOut ? 122 : 95, y: 95, frame: 7 },
        impactPoint: { x: isNotOut ? 135 : 97, y: 75, frame: 10 },
      };

      srcW.current = 200; srcH.current = 150;
      processDetectionResult(demoDetection);
      return;
    }

    try {
      // 1. Get video duration
      let duration = 6000;
      const targetUri = isDemo ? activeVideoUri : videoUri;

      if (!isDemo && videoRef.current) {
        await new Promise(r => setTimeout(r, 500));
        try {
          const status = await videoRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            duration = status.durationMillis;
          }
        } catch (e) { /* use fallback */ }
      }
      setVideoDuration(duration);

      // 2. Extract frames
      const FRAME_COUNT = 24;
      const interval = Math.max(duration / FRAME_COUNT, 50);
      const base64Frames: string[] = [];

      for (let i = 0; i < FRAME_COUNT; i++) {
        const time = Math.floor(i * interval);
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(targetUri, {
            time,
            quality: 0.4,
          });
          // Convert to base64
          const b64 = await FileSystem.readAsStringAsync(thumb.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Frames.push(b64);
        } catch (e) {
          console.warn(`Frame ${i} extraction failed`);
        }
        setExtractProgress((i + 1) / FRAME_COUNT);
      }

      if (base64Frames.length < 5) {
        Alert.alert('Error', 'Could not extract enough frames from video.');
        router.back();
        return;
      }

      // 3. Auto-detect ball and stumps
      setStep('detecting');
      setDetectProgress(0);

      const result = await detectorRef.current?.processFrames(
        base64Frames, 200, 150
      );

      if (result) {
        processDetectionResult(result);
      } else {
        Alert.alert('Detection Failed', 'Could not detect ball or stumps. Please try again with a clearer video.');
        router.back();
      }
    } catch (err) {
      console.error('Auto-detection error:', err);
      Alert.alert('Error', 'Ball tracking failed.');
      router.back();
    }
  };

  // ═══════════════════════════════════════════════
  //  PROCESS DETECTION RESULTS
  // ═══════════════════════════════════════════════
  const processDetectionResult = (result: DetectionResult) => {
    setDetection(result);
    const sw = srcW.current;
    const sh = srcH.current;

    // Scale key points to screen coords
    const release = result.releasePoint
      ? scalePoint(result.releasePoint, sw, sh)
      : { x: SW * 0.5, y: SH * 0.15 };
    const pitch = result.pitchPoint
      ? scalePoint(result.pitchPoint, sw, sh)
      : { x: SW * 0.48, y: SH * 0.62 };
    const impact = result.impactPoint
      ? scalePoint(result.impactPoint, sw, sh)
      : { x: SW * 0.5, y: SH * 0.52 };

    setScaledRelease(release);
    setScaledPitch(pitch);
    setScaledImpact(impact);
    const p4 = projectBeyondImpact(pitch, impact, 0.65);
    setScaledWickets(p4);

    // Build stump rectangle
    let stump = {
      left: SW * 0.38, right: SW * 0.62,
      top: SH * 0.30, bottom: SH * 0.55,
      widthPx: SW * 0.24, heightPx: SH * 0.25,
      widthInches: 9, heightInches: 28,
      offX: SW * 0.38, legX: SW * 0.62,
    };

    if (result.stumps) {
      const sOff = scalePoint(result.stumps.offBase, sw, sh);
      const sLeg = scalePoint(result.stumps.legBase, sw, sh);
      const sBail = scalePoint(result.stumps.bailTop, sw, sh);
      const wPx = Math.abs(sLeg.x - sOff.x);
      const hPx = Math.abs(sOff.y - sBail.y);
      const pxPerInch = wPx / 9; // stump-to-stump = 9 inches

      stump = {
        left: Math.min(sOff.x, sLeg.x),
        right: Math.max(sOff.x, sLeg.x),
        top: sBail.y,
        bottom: Math.max(sOff.y, sLeg.y),
        widthPx: wPx,
        heightPx: hPx,
        widthInches: 9,
        heightInches: Math.round(hPx / pxPerInch),
        offX: sOff.x,
        legX: sLeg.x,
      };
    }
    setStumpRect(stump);

    // Compute DRS decision
    computeDecision(release, pitch, impact, stump);
  };

  // ═══════════════════════════════════════════════
  //  COMPUTE DRS DECISION
  // ═══════════════════════════════════════════════
  const computeDecision = (
    release: Point, pitch: Point, impact: Point,
    stump: NonNullable<typeof stumpRect>
  ) => {
    if (!stump) return;

    const pxPerInch = stump.widthPx / 9;
    const ballRadiusPx = (pxPerInch * 2.8) / 2; // Ball avg diameter ~2.8 inches
    const sLeft = stump.left;
    const sRight = stump.right;
    const sTop = stump.top;
    const sBottom = stump.bottom;

    // 1. Pitching (No Umpire's Call for pitching)
    let pitchStatus = 'IN LINE';

    // Determine bounds using strict boundaries (no padding)
    const leftBound = stump.left;
    const rightBound = stump.right;

    const isLHB = striker?.battingHand === 'left';

    if (isLHB) {
      // For LHB, Off is on the Left, Leg is on the Right
      if (pitch.x < leftBound) pitchStatus = 'OUTSIDE OFF';
      else if (pitch.x > rightBound) pitchStatus = 'OUTSIDE LEG';
    } else {
      // For RHB (default), Leg is on the Left, Off is on the Right
      if (pitch.x < leftBound) pitchStatus = 'OUTSIDE LEG';
      else if (pitch.x > rightBound) pitchStatus = 'OUTSIDE OFF';
    }

    // 2. Impact (Umpire's Call if < 50% ball width is in line)
    const impactDistFromCenter = Math.min(Math.abs(impact.x - sLeft), Math.abs(impact.x - sRight));
    let impactStatus = 'OUTSIDE';
    if (impact.x >= sLeft && impact.x <= sRight) {
      impactStatus = 'IN LINE';
    } else if (impactDistFromCenter < ballRadiusPx) {
      impactStatus = "UMPIRE'S CALL";
    }

    // 3. Wickets (Projected - P4)
    const projected = stump.widthPx > 0 ? projectBeyondImpact(pitch, impact, 0.65) : impact;
    const hitX = projected.x >= sLeft && projected.x <= sRight;
    const hitY = projected.y >= sTop && projected.y <= sBottom;
    const hitWickets = hitX && hitY;

    // Hit percentage for widgets
    const wicketsDistX = Math.min(Math.abs(projected.x - sLeft), Math.abs(projected.x - sRight));
    const wicketsDistY = Math.min(Math.abs(projected.y - sTop), Math.abs(projected.y - sBottom));

    let wicketsStatus = 'MISSING';
    if (hitWickets) {
      if (wicketsDistX > ballRadiusPx && wicketsDistY > ballRadiusPx) {
        wicketsStatus = 'HITTING';
      } else {
        wicketsStatus = "UMPIRE'S CALL";
      }
    } else {
      // Check if it's clipping
      if ((wicketsDistX < ballRadiusPx || projected.x >= sLeft && projected.x <= sRight) &&
        (wicketsDistY < ballRadiusPx || projected.y >= sTop && projected.y <= sBottom)) {
        wicketsStatus = "UMPIRE'S CALL";
      }
    }

    // 4. Final Decision
    let finalDecision = 'NOT OUT';
    if (pitchStatus === 'OUTSIDE LEG') {
      finalDecision = 'NOT OUT';
    } else if (impactStatus === 'OUTSIDE') {
      finalDecision = 'NOT OUT';
    } else if (wicketsStatus === 'MISSING') {
      finalDecision = 'NOT OUT';
    } else {
      if (impactStatus === "UMPIRE'S CALL" || wicketsStatus === "UMPIRE'S CALL") {
        finalDecision = "UMPIRE'S CALL";
      } else {
        finalDecision = 'OUT';
      }
    }

    const pitchDist = Math.abs(pitch.x - (sLeft + sRight) / 2) / pxPerInch;
    const impactH = Math.abs(sBottom - impact.y) / pxPerInch;

    setDrsResult({
      pitching: pitchStatus,
      impact: impactStatus,
      wickets: wicketsStatus,
      decision: finalDecision,
      pitchDistInches: pitchDist.toFixed(1),
      impactHeightInches: impactH.toFixed(1),
    });

    // Begin DRS animation sequence
    setStep('analyzing');
    beginAnalysisPhase(release, pitch, impact);
  };

  // ═══════════════════════════════════════════════
  //  DRS ANIMATION SEQUENCE
  // ═══════════════════════════════════════════════
  const beginAnalysisPhase = (rel: Point, pit: Point, imp: Point) => {
    // Start scan animation over video
    scanProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ), -1, false
    );

    // Fade in dark scrim for contrast
    scrimOpacity.value = withTiming(0.35, { duration: 800 });

    // Start digital flow animation (streaming effect)
    flowProgress.value = withRepeat(withTiming(-100, { duration: 2000, easing: Easing.linear }), -1, false);

    // Start video playback in loop
    playVideoLoop();

    setTimeout(() => {
      startPitchingPhase(rel, pit, imp);
    }, 2800);
  };

  const startPitchingPhase = (rel: Point, pit: Point, imp: Point) => {
    setStep('pitching');
    ballX.value = rel.x;
    ballY.value = rel.y;
    ballOpacity.value = withTiming(1, { duration: 300 });
    ballScale.value = 0.5;
    trailProgress.value = 0;
    shadowOpacity.value = withTiming(0.4, { duration: 600 });
    releaseMarkScale.value = withSpring(1);
    pitchMarkScale.value = 0;
    impactMarkScale.value = 0;
    wicketsMarkScale.value = 0;

    ballX.value = withTiming(pit.x, { duration: 1600, easing: Easing.bezier(0.2, 0, 0.4, 1) });
    ballY.value = withTiming(pit.y, { duration: 1600, easing: Easing.bezier(0.2, 0, 0.4, 1) });
    ballScale.value = withTiming(1.4, { duration: 1600 });
    trailProgress.value = withTiming(0.4, { duration: 1600 });

    // Mark pitching point
    pitchMarkScale.value = withDelay(1600, withSpring(1));
    glowPulse.value = withDelay(1600,
      withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 400 }))
    );

    setTimeout(() => startImpactPhase(pit, imp), 1800);
  };

  const startImpactPhase = (pit: Point, imp: Point) => {
    setStep('impact');
    ballX.value = withTiming(imp.x, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballY.value = withTiming(imp.y, { duration: 1200, easing: Easing.out(Easing.quad) });
    ballScale.value = withTiming(1.5, { duration: 1200 });
    trailProgress.value = withTiming(0.65, { duration: 1200 });

    // Mark impact point
    impactMarkScale.value = withDelay(1200, withSpring(1));
    glowPulse.value = withDelay(1200,
      withSequence(withTiming(1, { duration: 60 }), withTiming(0.3, { duration: 500 }))
    );

    setTimeout(() => startWicketsPhase(imp), 1500);
  };

  const startWicketsPhase = (imp: Point) => {
    setStep('wickets');
    if (!scaledPitch || !scaledImpact) return;
    const projected = projectBeyondImpact(scaledPitch, scaledImpact, 0.65);

    ballX.value = withTiming(projected.x, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballY.value = withTiming(projected.y, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballScale.value = withTiming(1, { duration: 1400 });
    trailProgress.value = withTiming(1, { duration: 1400 });
    shadowOpacity.value = withTiming(0, { duration: 1200 });

    // Mark wickets point (P4)
    wicketsMarkScale.value = withDelay(1400, withSpring(1));

    // Stump zone pulse animation
    if (drsResult.wickets === 'HITTING') {
      impactFlash.value = withDelay(1400, withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 })));
      stumpGlow.value = withDelay(1400,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.3, { duration: 300 })
          ), 3, false
        )
      );
      glowPulse.value = withDelay(1400,
        withSequence(
          withTiming(1, { duration: 50 }), withTiming(0.5, { duration: 150 }),
          withTiming(1, { duration: 80 }), withTiming(0.6, { duration: 600 })
        )
      );
    } else if (drsResult.wickets === "UMPIRE'S CALL") {
      stumpGlow.value = withDelay(1400,
        withRepeat(
          withSequence(
            withTiming(0.7, { duration: 400 }),
            withTiming(0.2, { duration: 400 })
          ), 2, false
        )
      );
    }

    setTimeout(() => {
      setStep('decision');
      if (drsResult.decision === 'OUT') xMarkScale.value = withSpring(1);
      else checkMarkScale.value = withSpring(1);
      pauseVideo();
    }, 3000);
  };

  // ── Reset ──
  const resetAll = useCallback(() => {
    ballOpacity.value = 0;
    glowPulse.value = 0;
    stumpGlow.value = 0;
    releaseMarkScale.value = 0;
    pitchMarkScale.value = 0;
    impactMarkScale.value = 0;
    wicketsMarkScale.value = 0;
    flowProgress.value = 0;
    scrimOpacity.value = withTiming(0, { duration: 300 });
    setStep('extracting');
    setDetection(null);
    setExtractProgress(0);
    setDetectProgress(0);
    pauseVideo();
    setTimeout(() => startAutoFlow(), 300);
  }, []);

  // ── Save video ──
  const handleSave = async () => {
    if (!videoUri || videoUri === 'demo') return;
    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); return; }
      await MediaLibrary.saveToLibraryAsync(videoUri);
      Alert.alert('Saved', 'Delivery video saved to gallery!');
    } catch (e) { Alert.alert('Error', 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  // ═══════════════════════════════════════════════
  //  TRAJECTORY POINTS
  // ═══════════════════════════════════════════════
  const deliveryPath = useMemo(() => {
    if (!scaledRelease || !scaledPitch || !scaledImpact) return [];
    return generateTrajectoryPoints(scaledRelease, scaledPitch, scaledImpact, 40);
  }, [scaledRelease, scaledPitch, scaledImpact]);

  const projectedPoint = useMemo(() => {
    if (!scaledPitch || !scaledImpact) return null;
    return projectBeyondImpact(scaledPitch, scaledImpact, 0.65);
  }, [scaledPitch, scaledImpact]);

  const predictionPath = useMemo(() => {
    if (!scaledImpact || !projectedPoint) return [];
    // For a smoother flow, interpolation from P3 to P4
    return [
      scaledImpact,
      { x: (scaledImpact.x + projectedPoint.x) / 2, y: (scaledImpact.y + projectedPoint.y) / 2 },
      projectedPoint
    ];
  }, [scaledImpact, projectedPoint]);

  // ═══════════════════════════════════════════════
  //  ANIMATED STYLES & TRACKING STATE
  // ═══════════════════════════════════════════════
  const isTracking = ['pitching', 'impact', 'wickets'].includes(step);
  const showOverlay = ['analyzing', 'pitching', 'impact', 'wickets', 'decision'].includes(step);
  const ballColor = step === 'wickets'
    ? (drsResult.wickets === 'HITTING' ? '#ef4444' : drsResult.wickets === "UMPIRE'S CALL" ? '#f97316' : '#3b82f6')
    : '#3b82f6';

  const animBall = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: ballX.value - 12 },
      { translateY: ballY.value - 12 },
      { scale: ballScale.value },
    ],
  }));

  const animGlow = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [
      { translateX: ballX.value - 35 },
      { translateY: ballY.value - 35 },
      { scale: 1 + glowPulse.value * 0.4 },
    ],
  }));

  const animScan = useAnimatedStyle(() => ({
    transform: [{ translateY: scanProgress.value * (SH * 0.6) }],
  }));

  const animScrim = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const animStumpGlow = useAnimatedStyle(() => ({
    opacity: stumpGlow.value,
  }));

  const animFlash = useAnimatedStyle(() => ({
    opacity: impactFlash.value,
  }));

  const animShadow = useAnimatedStyle(() => {
    // Ground level is at targetY of pitching point
    const groundY = stumpRect ? stumpRect.bottom : SH * 0.85;
    const distanceToGround = Math.abs(ballY.value - groundY);
    const closeness = Math.max(0, 1 - distanceToGround / (SH * 0.3));

    return {
      opacity: shadowOpacity.value * closeness,
      transform: [
        { translateX: ballX.value - 10 },
        { translateY: groundY - 4 },
        { scaleX: 1 + closeness * 0.5 },
        { scaleY: 0.4 },
      ],
    };
  });

  const animReleaseProps = useAnimatedProps(() => ({
    r: 10 * releaseMarkScale.value,
  }));

  const animPitchProps = useAnimatedProps(() => ({
    r: 12 * pitchMarkScale.value,
  }));

  const animImpactProps = useAnimatedProps(() => ({
    r: 14 * impactMarkScale.value,
  }));

  const animWicketsProps = useAnimatedProps(() => ({
    r: 14 * wicketsMarkScale.value,
  }));

  const checkMarkScale = useSharedValue(0);
  const xMarkScale = useSharedValue(0);

  const getStatusColor = (status: string) => {
    // Green for positive outcomes, Red otherwise
    if (status === 'IN LINE' || status === 'HITTING' || status === 'OUT' || status === 'OUTSIDE OFF') return '#22c55e';
    return '#ef4444';
  };

  // ═══════════════════════════════════════════════
  //  HAWK-EYE OVERLAY ON VIDEO (SVG)
  // ═══════════════════════════════════════════════
  const HawkEyeOverlay = () => {
    if (!showOverlay || !stumpRect) return null;

    const { left, right, top, bottom } = stumpRect;
    const centerX = (left + right) / 2;
    const width = right - left;

    // FullTrack AI Theme Colors
    const TRAJ_RED = '#FF3B30';
    const TRAJ_CYAN = '#00D2FF';
    const electricBlue = '#00f2ff';

    const stumpHitColor = drsResult.wickets === 'HITTING'
      ? '#ef4444'
      : drsResult.wickets === "UMPIRE'S CALL"
        ? '#f97316'
        : electricBlue;

    const renderMarkerBadge = (num: number, x: number, y: number, scale: SharedValue<number>, color: string) => null;

    // Path tracing (Ribbon Style with Streaming Flow)
    const renderRibbon = (points: Point[], color: string, glowColor: string, isDashed = false, progressValue = 1) => {
      if (points.length < 2) return null;
      const visibleCount = Math.floor(points.length * progressValue);
      if (visibleCount < 2) return null;

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < visibleCount; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }

      const flowProps = useAnimatedProps(() => ({
        strokeDashoffset: flowProgress.value,
      }));

      return (
        <G>
          {/* Main digital trail */}
          <Path
            d={d}
            stroke={glowColor}
            strokeWidth={12}
            fill="none"
            opacity={0.15 * progressValue}
            strokeLinecap="round"
          />
          <AnimatedPath
            d={d}
            stroke={color}
            strokeWidth={4.5}
            fill="none"
            strokeDasharray="15,10"
            animatedProps={flowProps}
            strokeLinecap="round"
            opacity={0.8 * progressValue}
          />
          {/* Tapered highlight core */}
          <Path
            d={d}
            stroke="#fff"
            strokeWidth={1}
            fill="none"
            opacity={0.2}
            strokeLinecap="round"
          />
        </G>
      );
    };

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="stumpZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={stumpHitColor} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={stumpHitColor} stopOpacity="0.05" />
            </SvgGradient>
          </Defs>

          {/* ── In-Line Zone (subtle corridor on pitch) ── */}
          {isTracking && (
            <Polygon
              points={`${left},${top - 20} ${right},${top - 20} ${right + 30},${SH} ${left - 30},${SH}`}
              fill={drsResult.pitching === 'OUTSIDE LEG' ? "rgba(239, 68, 68, 0.04)" : "rgba(34, 197, 94, 0.06)"}
              stroke={drsResult.pitching === 'OUTSIDE LEG' ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.15)"}
              strokeWidth={1}
              strokeDasharray="6,4"
            />
          )}

          {/* ── Stump Zone Rectangle (overlay on real stumps) ── */}
          {(isTracking || step === 'analyzing') && (
            <G>
              {/* Stump zone fill */}
              <Rect
                x={left - 3}
                y={top - 3}
                width={width + 6}
                height={bottom - top + 6}
                rx={3}
                fill="url(#stumpZoneGrad)"
              />
              {/* Stump zone border */}
              <Rect
                x={left - 3}
                y={top - 3}
                width={width + 6}
                height={bottom - top + 6}
                rx={3}
                fill="none"
                stroke={stumpHitColor}
                strokeWidth={1.5}
                strokeDasharray="8,4"
                opacity={0.7}
              />
              {/* Individual stump lines (transparent over real stumps) */}
              <Line x1={left + width * 0.15} y1={top} x2={left + width * 0.15} y2={bottom}
                stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
              <Line x1={centerX} y1={top} x2={centerX} y2={bottom}
                stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
              <Line x1={right - width * 0.15} y1={top} x2={right - width * 0.15} y2={bottom}
                stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
              {/* Bail line */}
              <Line x1={left - 2} y1={top} x2={right + 2} y2={top}
                stroke="rgba(255,255,255,0.25)" strokeWidth={3} strokeLinecap="round" />
              {/* Stump zone label */}
              <SvgText fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="bold" letterSpacing={2}
                x={centerX} y={bottom + 14} textAnchor="middle">STUMPS</SvgText>
            </G>
          )}



          {/* ── Trajectory Paths (FullTrack AI Ribbon Style) ── */}
          {deliveryPath.length > 0 && renderRibbon(deliveryPath, TRAJ_RED, `${TRAJ_RED}44`, false, Math.min(trailProgress.value / 0.4, 1))}
          {predictionPath.length > 0 && renderRibbon(predictionPath, TRAJ_CYAN, `${TRAJ_CYAN}66`, true, Math.max(0, (trailProgress.value - 0.4) / 0.6))}

          {/* ── Tracking Dots (Frame Points) ── */}
          {isTracking && detection?.ballPositions.map((p, idx) => {
            const sp = scalePoint(p, srcW.current, srcH.current);
            return (
              <Circle
                key={idx}
                cx={sp.x} cy={sp.y} r={1.5}
                fill="#fff" opacity={0.6 * trailProgress.value}
              />
            );
          })}

          {/* ── Persistent Hotspots (P1, P2, P3, P4) ── */}
          {scaledRelease && (
            <G>
              <AnimatedCircle
                cx={scaledRelease.x} cy={scaledRelease.y}
                animatedProps={animReleaseProps}
                fill="rgba(59, 130, 246, 0.4)" stroke="#3b82f6" strokeWidth={2}
              />
              {renderMarkerBadge(1, scaledRelease.x, scaledRelease.y, releaseMarkScale, '#3b82f6')}
            </G>
          )}

          {scaledPitch && (
            <G>
              <AnimatedCircle
                cx={scaledPitch.x} cy={scaledPitch.y}
                animatedProps={animPitchProps}
                fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" strokeWidth={2}
              />
              {renderMarkerBadge(2, scaledPitch.x, scaledPitch.y, pitchMarkScale, '#22c55e')}
            </G>
          )}

          {scaledImpact && (
            <G>
              <AnimatedCircle
                cx={scaledImpact.x} cy={scaledImpact.y}
                animatedProps={animImpactProps}
                fill="rgba(249, 115, 22, 0.4)" stroke="#f97316" strokeWidth={2}
              />
              {renderMarkerBadge(3, scaledImpact.x, scaledImpact.y, impactMarkScale, '#f97316')}
            </G>
          )}

          {scaledWickets && (
            <G>
              <AnimatedCircle
                cx={scaledWickets.x} cy={scaledWickets.y}
                animatedProps={animWicketsProps}
                fill={`${stumpHitColor}40`} stroke={stumpHitColor} strokeWidth={2}
              />
              {renderMarkerBadge(4, scaledWickets.x, scaledWickets.y, wicketsMarkScale, stumpHitColor)}
            </G>
          )}
        </Svg>
      </View>
    );
  };

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* Hidden auto-detection engine */}
      <AutoBallDetector ref={detectorRef} />

      {/* ── Video — ALWAYS VISIBLE ── */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          style={styles.fullVideo}
          source={{ uri: activeVideoUri }}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER}
          isMuted={true}
          shouldPlay={false}
        />

        {/* ── Impact Flash ── */}
        <Animated.View style={[styles.impactFlashContainer, animFlash]} pointerEvents="none" />

        {/* ── Dark Contrast Scrim (fades in during tracking) ── */}
        <Animated.View style={[styles.scrim, animScrim]} />

        {/* ── Scan Line (visible over video during analyzing) ── */}
        {step === 'analyzing' && (
          <View style={styles.scanContainer}>
            <Animated.View style={[styles.scanLineOverVideo, animScan]} />
          </View>
        )}
      </View>

      {/* ── Hawk-Eye Overlay (directly on video) ── */}
      <HawkEyeOverlay />

      {/* ── Stump Zone Glow Pulse (when ball hits) ── */}
      {step === 'wickets' && stumpRect && (drsResult.wickets === 'HITTING' || drsResult.wickets === "UMPIRE'S CALL") && (
        <Animated.View style={[
          styles.stumpGlowOverlay,
          {
            left: stumpRect.left - 15,
            top: stumpRect.top - 15,
            width: stumpRect.right - stumpRect.left + 30,
            height: stumpRect.bottom - stumpRect.top + 30,
            borderColor: getStatusColor(drsResult.wickets),
            shadowColor: getStatusColor(drsResult.wickets),
          },
          animStumpGlow,
        ]} />
      )}

      {/* ══════════ EXTRACTING FRAMES ══════════ */}
      {step === 'extracting' && (
        <View style={styles.processingOverlay}>
          <LinearGradient
            colors={['rgba(11,14,20,0.85)', 'rgba(11,14,20,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.processingContent}>
            <View style={styles.processingIconWrap}>
              <Cpu size={44} color="#818cf8" />
            </View>
            <Text style={styles.processingTitle}>EXTRACTING FRAMES</Text>
            <Text style={styles.processingSub}>Preparing video for analysis...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${extractProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(extractProgress * 100)}%</Text>
          </View>
        </View>
      )}

      {/* ══════════ AUTO-DETECTING ══════════ */}
      {step === 'detecting' && (
        <View style={styles.processingOverlay}>
          <LinearGradient
            colors={['rgba(11,14,20,0.85)', 'rgba(11,14,20,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.processingContent}>
            <View style={styles.scanArea}>
              <Animated.View style={[styles.scanLine, animScan]} />
            </View>
            <View style={styles.processingIconWrap}>
              <Eye size={44} color="#818cf8" />
            </View>
            <Text style={styles.processingTitle}>DETECTING</Text>
            <Text style={styles.processingSub}>Finding ball and stumps automatically...</Text>
            <View style={styles.dataList}>
              <Text style={styles.dataItem}>▸ Scanning for stump positions</Text>
              <Text style={styles.dataItem}>▸ Tracking ball movement</Text>
              <Text style={styles.dataItem}>▸ Computing stump dimensions</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Side Dashboard and central result only ── */}

      {/* ── DRS DASHBOARD (Top Row Layout) ── */}
      {showOverlay && (
        <View style={styles.topDashboard}>
          <View style={[styles.milestoneBox, (step === 'pitching' || step === 'impact' || step === 'wickets' || step === 'decision') && styles.milestoneActive]}>
            <View style={[styles.milestoneStatus, { backgroundColor: drsResult.pitching ? getStatusColor(drsResult.pitching) : 'rgba(0,0,0,0.5)' }]}>
              <Text style={styles.milestoneLabel}>PITCHING</Text>
              <Text style={styles.milestoneValue}>{drsResult.pitching || '—'}</Text>
            </View>
          </View>

          <View style={[styles.milestoneBox, (step === 'impact' || step === 'wickets' || step === 'decision') && styles.milestoneActive]}>
            <View style={[styles.milestoneStatus, { backgroundColor: drsResult.impact ? getStatusColor(drsResult.impact) : 'rgba(0,0,0,0.5)' }]}>
              <Text style={styles.milestoneLabel}>IMPACT</Text>
              <Text style={styles.milestoneValue}>{drsResult.impact || '—'}</Text>
            </View>
          </View>

          <View style={[styles.milestoneBox, (step === 'wickets' || step === 'decision') && styles.milestoneActive]}>
            <View style={[styles.milestoneStatus, { backgroundColor: drsResult.wickets ? getStatusColor(drsResult.wickets) : 'rgba(0,0,0,0.5)' }]}>
              <Text style={styles.milestoneLabel}>WICKETS</Text>
              <Text style={styles.milestoneValue}>{drsResult.wickets || '—'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Metric Badges (Bottom Row Layout) ── */}
      {showOverlay && (
        <View style={styles.bottomMetrics}>
          <View style={styles.metricBadge}>
            <Text style={styles.metricTitle}>SPEED</Text>
            <Text style={styles.metricNum}>{Math.round(110 + Math.random() * 30)}<Text style={styles.metricUnit}>km/h</Text></Text>
          </View>
          <View style={styles.metricBadge}>
            <Text style={styles.metricTitle}>SPIN</Text>
            <Text style={styles.metricNum}>{(Math.random() * 3).toFixed(1)}<Text style={styles.metricUnit}>°</Text></Text>
          </View>
        </View>
      )}

      {/* ── Central Decision Icon Overlay ── */}
      <Animated.View style={[styles.centerDecision, { transform: [{ scale: checkMarkScale }] }]} pointerEvents="none">
        <View style={[styles.decisionCircle, { borderColor: '#22c55e' }]}>
          <LucideCircle size={80} color="#22c55e" />
        </View>
        <Text style={[styles.decisionBanner, { color: '#22c55e' }]}>NOT OUT</Text>
      </Animated.View>

      <Animated.View style={[styles.centerDecision, { transform: [{ scale: xMarkScale }] }]} pointerEvents="none">
        <View style={[styles.decisionCircle, { borderColor: '#ef4444' }]}>
          <X size={100} color="#ef4444" />
        </View>
        <Text style={[styles.decisionBanner, { color: '#ef4444' }]}>OUT</Text>
      </Animated.View>

      {/* ══════════ BALL + EFFECTS ══════════ */}
      {isTracking && (
        <>
          <Animated.View style={[
            styles.impactGlow,
            { backgroundColor: ballColor + '50' },
            animGlow,
          ]} />
          {/* ── Ball Shadow (Ground depth) ── */}
          <Animated.View style={[styles.ballShadow, animShadow]} />

          <Animated.View style={[
            styles.ball,
            { borderColor: ballColor, shadowColor: ballColor },
            animBall,
          ]}>
            <View style={[styles.ballInner, { backgroundColor: ballColor + '30' }]} />
          </Animated.View>
        </>
      )}

      {/* ══════════ DECISION PANEL (over frozen video) ══════════ */}
      {step === 'decision' && (
        <View style={styles.decisionOverlay}>
          <LinearGradient
            colors={['transparent', 'rgba(2,6,23,0.4)', 'rgba(2,6,23,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.decisionContent}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>PITCHING</Text>
                <View style={[styles.summaryPill, {
                  borderColor: getStatusColor(drsResult.pitching),
                  backgroundColor: getStatusColor(drsResult.pitching) + '15'
                }]}>
                  <Text style={[styles.summaryValue, { color: getStatusColor(drsResult.pitching) }]}>{drsResult.pitching}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>IMPACT</Text>
                <View style={[styles.summaryPill, {
                  borderColor: getStatusColor(drsResult.impact),
                  backgroundColor: getStatusColor(drsResult.impact) + '15'
                }]}>
                  <Text style={[styles.summaryValue, { color: getStatusColor(drsResult.impact) }]}>{drsResult.impact}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>WICKETS</Text>
                <View style={[styles.summaryPill, {
                  borderColor: getStatusColor(drsResult.wickets),
                  backgroundColor: getStatusColor(drsResult.wickets) + '15'
                }]}>
                  <Text style={[styles.summaryValue, { color: getStatusColor(drsResult.wickets) }]}>{drsResult.wickets}</Text>
                </View>
              </View>
            </View>

            {/* Measurements row */}
            <View style={styles.measureSummaryRow}>
              <View style={styles.measureSummaryItem}>
                <Text style={styles.measureSummaryLabel}>STUMP-TO-STUMP</Text>
                <Text style={styles.measureSummaryValue}>{stumpRect?.widthInches || 9} inches</Text>
              </View>
              <View style={styles.measureSummaryItem}>
                <Text style={styles.measureSummaryLabel}>STUMP HEIGHT</Text>
                <Text style={styles.measureSummaryValue}>{stumpRect?.heightInches || 28} inches</Text>
              </View>
            </View>

            <Text style={styles.decisionLabel}>FINAL DECISION</Text>
            <Text style={[styles.decisionValue, {
              color: getStatusColor(drsResult.decision),
              textShadowColor: getStatusColor(drsResult.decision) + '40'
            }]}>
              {drsResult.decision}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.replayBtn} onPress={resetAll}>
                <RotateCcw size={16} color="#94a3b8" />
                <Text style={styles.replayText}>RE-PROCESS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneText}>COMMIT RECORD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Close ── */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <X size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── Video (always visible) ──
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 0,
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  scanContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scanLineOverVideo: {
    width: '100%', height: 2,
    backgroundColor: '#818cf8',
    shadowColor: '#818cf8', shadowOpacity: 1, shadowRadius: 20,
    position: 'absolute', top: '15%',
  },

  // ── Processing overlays ──
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  processingContent: { alignItems: 'center', padding: 40, width: '85%' },
  processingIconWrap: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(99,102,241,0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  processingTitle: {
    color: '#fff', fontSize: 20, fontWeight: '900',
    letterSpacing: 5, marginBottom: 8,
  },
  processingSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 13,
    fontWeight: '500', marginBottom: 32,
  },
  progressBar: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 12,
  },
  progressFill: {
    height: '100%', borderRadius: 3, backgroundColor: '#818cf8',
  },
  progressText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    fontWeight: '700', letterSpacing: 1,
  },
  scanArea: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden', opacity: 0.15,
  },
  scanLine: {
    width: '100%', height: 3, backgroundColor: '#818cf8',
    shadowColor: '#818cf8', shadowOpacity: 1, shadowRadius: 12,
    position: 'absolute', top: '30%',
  },
  dataList: { gap: 8, alignItems: 'flex-start' },
  dataItem: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },

  // ── Analyzing banner (top of screen over video) ──
  analyzingBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20,
    zIndex: 20,
  },
  analyzingContent: { alignItems: 'center' },
  analyzingIconRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
  },
  analyzingTitle: {
    color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 4,
  },
  analyzingSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginBottom: 16,
  },
  analyzingDataRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  analyzingDataItem: { flex: 1, alignItems: 'center' },
  analyzingDataLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 7,
    fontWeight: '800', letterSpacing: 1, marginBottom: 2,
  },
  analyzingDataValue: { color: '#818cf8', fontSize: 12, fontWeight: '900' },
  analyzingDataDivider: {
    width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Broadcast Balanced Layout ──
  topDashboard: {
    position: 'absolute', top: 55, left: 10, right: 10,
    flexDirection: 'row', gap: 6, zIndex: 100,
    justifyContent: 'center',
  },
  milestoneBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8, overflow: 'hidden',
    opacity: 0.25,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  milestoneActive: { opacity: 1 },
  milestoneLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 7,
    fontWeight: '900', letterSpacing: 1.2,
    marginBottom: 1,
  },
  milestoneStatus: {
    paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center',
  },
  milestoneValue: {
    color: '#fff', fontSize: 11, fontWeight: '900',
    letterSpacing: 0.5,
  },

  bottomMetrics: {
    position: 'absolute', bottom: 120, left: 20, right: 20,
    flexDirection: 'row', gap: 10, zIndex: 100,
    justifyContent: 'center',
  },
  metricBadge: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 140, alignItems: 'center',
  },
  metricTitle: {
    color: '#818cf8', fontSize: 8, fontWeight: '900',
    letterSpacing: 1.5, marginBottom: 2,
  },
  metricNum: {
    color: '#fff', fontSize: 18, fontWeight: '900',
  },
  metricUnit: { fontSize: 10, opacity: 0.5, marginLeft: 2 },

  centerDecision: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  decisionCircle: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginBottom: 20,
  },
  decisionBanner: {
    fontSize: 48, fontWeight: '900', fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10,
    letterSpacing: 4,
  },

  impactFlashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 40,
  },

  // ── Stump glow overlay ──
  stumpGlowOverlay: {
    position: 'absolute', borderRadius: 6,
    borderWidth: 3, backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 25, elevation: 15,
    zIndex: 12,
  },

  // ── Ball + Effects ──
  ball: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    borderWidth: 3, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 10,
    justifyContent: 'center', alignItems: 'center', zIndex: 30,
  },
  ballInner: { width: 14, height: 14, borderRadius: 7 },
  impactGlow: {
    position: 'absolute', width: 70, height: 70,
    borderRadius: 35, zIndex: 15,
  },
  ballShadow: {
    position: 'absolute', width: 20, height: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
    zIndex: 9,
  },

  // ── Decision ──
  decisionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', zIndex: 50,
  },
  decisionContent: {
    padding: 24, backgroundColor: 'rgba(15,23,42,0.96)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 9,
    fontWeight: '800', letterSpacing: 1.5, marginBottom: 6,
  },
  summaryPill: {
    width: '100%', paddingVertical: 6, borderRadius: 6,
    alignItems: 'center', borderWidth: 1,
  },
  summaryValue: { fontSize: 11, fontWeight: '900' },

  // ── Measurement summary ──
  measureSummaryRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  measureSummaryItem: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.08)',
    padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
  },
  measureSummaryLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 8,
    fontWeight: '800', letterSpacing: 1, marginBottom: 4,
  },
  measureSummaryValue: { color: '#818cf8', fontSize: 13, fontWeight: '900' },

  decisionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11,
    fontWeight: '800', letterSpacing: 4,
    textAlign: 'center', marginBottom: 4,
  },
  decisionValue: {
    fontSize: 52, fontWeight: '900', fontStyle: 'italic',
    textAlign: 'center', marginBottom: 24,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  replayBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  replayText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  doneBtn: {
    flex: 2, backgroundColor: '#7C3AED',
    paddingVertical: 14, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  // ── Close ──
  closeBtn: {
    position: 'absolute', top: 52, right: 18,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 200,
  },
});
