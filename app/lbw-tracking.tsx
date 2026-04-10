import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Platform, Alert, Image, Pressable, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import {
  X, RotateCcw, Save, Cpu, Eye, Crosshair, Target, Circle as LucideCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
const VideoThumbnails = Platform.OS !== 'web' ? require('expo-video-thumbnails') : null;
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Rect, Polygon, Circle, Text as SvgText, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  withSequence, withDelay, withRepeat, Easing, runOnJS, interpolate,
} from 'react-native-reanimated';
import { colors } from './theme';
import AutoBallDetector, {
  type AutoBallDetectorRef, type DetectionResult, type DetectedPoint,
} from '../components/AutoBallDetector';

const { width: SW, height: SH } = Dimensions.get('window');

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
  const [stumpRect, setStumpRect] = useState<{
    left: number; right: number; top: number; bottom: number;
    widthPx: number; heightPx: number;
    widthInches: number; heightInches: number;
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
  const ballScale = useSharedValue(1.5);
  const glowPulse = useSharedValue(0);
  const scanProgress = useSharedValue(0);
  const virtualOpacity = useSharedValue(0); // For video-to-virtual fade
  const stumpReveal = useSharedValue(0);   // For 3D stump animation

  // ── src dimensions for coordinate scaling ──
  const srcW = useRef(200);
  const srcH = useRef(150);

  const DEMO_VIDEO_URL = 'https://github.com/guurav18/LBW-DRS-IN-CRICKET/raw/main/lbw.mp4';
  const isDemo = !videoUri || videoUri === 'demo';
  const activeVideoUri = isDemo ? DEMO_VIDEO_URL : videoUri;

  // ═══════════════════════════════════════════════
  //  FRAME EXTRACTION + AUTO DETECTION
  // ═══════════════════════════════════════════════
  useEffect(() => { startAutoFlow(); }, []);

  const startAutoFlow = async () => {
    setStep('extracting');

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      // Demo: simulate detection with pre-set points
      const demoDetection: DetectionResult = {
        stumps: {
          offBase: { x: 85, y: 120 }, legBase: { x: 115, y: 120 },
          bailTop: { x: 100, y: 55 }, widthPx: 30, heightPx: 65, centerX: 100,
        },
        ballPositions: [
          { x: 100, y: 15, frame: 0 }, { x: 98, y: 40, frame: 3 },
          { x: 95, y: 95, frame: 7 }, { x: 97, y: 80, frame: 10 },
          { x: 99, y: 70, frame: 13 },
        ],
        releasePoint: { x: 100, y: 15, frame: 0 },
        pitchPoint: { x: 95, y: 95, frame: 7 },
        impactPoint: { x: 97, y: 80, frame: 10 },
      };
      srcW.current = 200; srcH.current = 150;
      processDetectionResult(demoDetection);
      return;
    }

    try {
      // 1. Get video duration
      let duration = 6000;
      const targetUri = isDemo ? DEMO_VIDEO_URL : videoUri;

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

    // Build stump rectangle
    let stump = {
      left: SW * 0.38, right: SW * 0.62,
      top: SH * 0.30, bottom: SH * 0.55,
      widthPx: SW * 0.24, heightPx: SH * 0.25,
      widthInches: 9, heightInches: 28,
    };

    if (result.stumps) {
      const sOff = scalePoint(result.stumps.offBase, sw, sh);
      const sLeg = scalePoint(result.stumps.legBase, sw, sh);
      const sBail = scalePoint(result.stumps.bailTop, sw, sh);
      const wPx = Math.abs(sLeg.x - sOff.x);
      const hPx = Math.abs(sOff.y - sBail.y);
      const pxPerInch = wPx / 9; // stump-to-stump = 9 inches

      stump = {
        left: Math.min(sOff.x, sLeg.x) - 5,
        right: Math.max(sOff.x, sLeg.x) + 5,
        top: sBail.y,
        bottom: Math.max(sOff.y, sLeg.y),
        widthPx: wPx,
        heightPx: hPx,
        widthInches: 9,
        heightInches: Math.round(hPx / pxPerInch),
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
    stump: typeof stumpRect extends infer T ? NonNullable<T> : never
  ) => {
    if (!stump) return;

    const pxPerInch = stump.widthPx / 9;
    const ballRadiusPx = (pxPerInch * 2.8) / 2; // Ball avg diameter ~2.8 inches
    const sLeft = stump.left;
    const sRight = stump.right;
    const sTop = stump.top;
    const sBottom = stump.bottom;

    // 1. Pitching (No Umpire's Call for pitching)
    const pitchInLine = pitch.x >= sLeft && pitch.x <= sRight;

    // 2. Impact (Umpire's Call if < 50% ball width is in line)
    // Distance from center of ball at impact to the edge of the stumps
    const impactDistFromCenter = Math.min(Math.abs(impact.x - sLeft), Math.abs(impact.x - sRight));
    let impactStatus = 'OUTSIDE';
    if (impact.x >= sLeft && impact.x <= sRight) {
       impactStatus = 'IN LINE';
    } else if (impactDistFromCenter < ballRadiusPx) {
       impactStatus = "UMPIRE'S CALL";
    }

    // 3. Wickets (Projected)
    const projected = projectBeyondImpact(pitch, impact);
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
    // In real DRS, it depends on the on-field call. Here we'll show the "Ideal" call.
    let finalDecision = 'NOT OUT';
    if (pitchInLine && impactStatus !== 'OUTSIDE' && wicketsStatus !== 'MISSING') {
      if (impactStatus === "UMPIRE'S CALL" || wicketsStatus === "UMPIRE'S CALL") {
        finalDecision = "UMPIRE'S CALL";
      } else {
        finalDecision = 'OUT';
      }
    }

    const pitchDist = Math.abs(pitch.x - (sLeft + sRight) / 2) / pxPerInch;
    const impactH = Math.abs(sBottom - impact.y) / pxPerInch;

    setDrsResult({
      pitching: pitchInLine ? 'IN LINE' : 'OUTSIDE',
      impact: impactStatus,
      wickets: wicketsStatus,
      decision: finalDecision,
      pitchDistInches: pitchDist.toFixed(1),
      impactHeightInches: impactH.toFixed(1),
    });

    // Begin DRS animation sequence
    setStep('analyzing');
    beginAnalysisPhase();
  };

  // ═══════════════════════════════════════════════
  //  DRS ANIMATION SEQUENCE
  // ═══════════════════════════════════════════════
  const beginAnalysisPhase = () => {
    // Start scan animation
    scanProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ), -1, false
    );

    // Cinematic fade to virtual reconstruction
    virtualOpacity.value = withDelay(1000, withTiming(1, { duration: 1500 }));
    stumpReveal.value = withDelay(1500, withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1)) }));

    setTimeout(() => {
      setStep('pitching');
      startPitchingAnimation();
    }, 2800);
  };

  const startPitchingAnimation = () => {
    const rel = scaledRelease || { x: SW / 2, y: SH * 0.15 };
    const pit = scaledPitch || { x: SW * 0.48, y: SH * 0.62 };

    ballOpacity.value = 0;
    ballX.value = rel.x;
    ballY.value = rel.y;
    ballScale.value = 0.5;
    glowPulse.value = 0;

    ballOpacity.value = withTiming(1, { duration: 250 });
    ballX.value = withTiming(pit.x, { duration: 1600, easing: Easing.bezier(0.2, 0, 0.4, 1) });
    ballY.value = withTiming(pit.y, { duration: 1600, easing: Easing.bezier(0.2, 0, 0.4, 1) });
    ballScale.value = withTiming(1.4, { duration: 1600 });

    glowPulse.value = withDelay(1600,
      withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 400 }))
    );

    setTimeout(() => { setStep('impact'); startImpactAnimation(); }, 2800);
  };

  const startImpactAnimation = () => {
    const imp = scaledImpact || { x: SW * 0.5, y: SH * 0.52 };
    glowPulse.value = 0;

    ballX.value = withTiming(imp.x, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballY.value = withTiming(imp.y, { duration: 1200, easing: Easing.out(Easing.quad) });
    ballScale.value = withTiming(1.5, { duration: 1200 });

    glowPulse.value = withDelay(1200,
      withSequence(withTiming(1, { duration: 60 }), withTiming(0.3, { duration: 500 }))
    );

    setTimeout(() => { setStep('wickets'); startWicketsAnimation(); }, 2500);
  };

  const startWicketsAnimation = () => {
    const pit = scaledPitch || { x: SW * 0.48, y: SH * 0.62 };
    const imp = scaledImpact || { x: SW * 0.5, y: SH * 0.52 };
    const projected = projectBeyondImpact(pit, imp);

    glowPulse.value = 0;
    ballOpacity.value = withTiming(0.65, { duration: 200 });

    ballX.value = withTiming(projected.x, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballY.value = withTiming(projected.y, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballScale.value = withTiming(1, { duration: 1400 });

    if (drsResult.wickets === 'HITTING') {
      glowPulse.value = withDelay(1400,
        withSequence(
          withTiming(1, { duration: 50 }), withTiming(0.5, { duration: 150 }),
          withTiming(1, { duration: 80 }), withTiming(0.6, { duration: 600 })
        )
      );
    }

    setTimeout(() => setStep('decision'), 3000);
  };

  // ── Reset ──
  const resetAll = useCallback(() => {
    ballOpacity.value = 0;
    glowPulse.value = 0;
    setStep('extracting');
    setDetection(null);
    setExtractProgress(0);
    setDetectProgress(0);
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
  const trajectoryPoints = useMemo(() => {
    if (!scaledRelease || !scaledPitch || !scaledImpact) return [];
    return generateTrajectoryPoints(scaledRelease, scaledPitch, scaledImpact, 40);
  }, [scaledRelease, scaledPitch, scaledImpact]);

  const projectedPoint = useMemo(() => {
    if (!scaledPitch || !scaledImpact) return null;
    return projectBeyondImpact(scaledPitch, scaledImpact);
  }, [scaledPitch, scaledImpact]);

  // ═══════════════════════════════════════════════
  //  ANIMATED STYLES & TRACKING STATE
  // ═══════════════════════════════════════════════
  const isTracking = ['pitching', 'impact', 'wickets'].includes(step);
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
    transform: [{ translateY: scanProgress.value * (SH * 0.35) }],
  }));

  const getStatusColor = (status: string) => {
    if (status === 'IN LINE' || status === 'HITTING' || status === 'OUT') return '#22c55e';
    if (status === "UMPIRE'S CALL") return '#f97316';
    return '#ef4444';
  };

  // ═══════════════════════════════════════════════
  //  CINEMATIC VISUALS (SVG)
  // ═══════════════════════════════════════════════
  const HawkEyeVisuals = () => {
    if (!isTracking || !stumpRect) return null;

    const { left, right, top, bottom } = stumpRect;
    const centerX = (left + right) / 2;
    const width = right - left;
    
    // Perspective Pitch calculation (Virtual)
    const pitchWidthTop = width * 2;
    const pitchWidthBottom = SW * 1.5;
    const pitchTop = top - 100;
    const pitchBottom = SH;

    // 3D Stump reconstruction
    const render3DStump = (x: number, isHit: boolean) => {
      const sWidth = width / 6;
      const sHeight = bottom - top;
      return (
        <G key={`stump-${x}`}>
          <Defs>
            <SvgGradient id={`stumpGrad-${x}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
              <Stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </SvgGradient>
          </Defs>
          {/* Main Stump Cylinder */}
          <Rect
            x={x - sWidth / 2}
            y={top}
            width={sWidth}
            height={sHeight}
            rx={2}
            fill="rgba(148, 163, 184, 0.4)"
            stroke={isHit ? "#EF4444" : "rgba(255,255,255,0.2)"}
            strokeWidth={1}
          />
          <Rect
            x={x - sWidth / 2}
            y={top}
            width={sWidth}
            height={sHeight}
            rx={2}
            fill={`url(#stumpGrad-${x})`}
          />
        </G>
      );
    };

    // Path tracing (Ribbon Style)
    const renderRibbon = (points: Point[], color: string, glowColor: string, isDashed = false) => {
      if (points.length < 2) return null;
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
      return (
        <G>
          <Path
            d={d}
            stroke={glowColor}
            strokeWidth={12}
            fill="none"
            opacity={0.15}
            strokeLinecap="round"
          />
          <Path
            d={d}
            stroke={color}
            strokeWidth={5}
            fill="none"
            strokeDasharray={isDashed ? "8,8" : "0"}
            strokeLinecap="round"
            opacity={0.9}
          />
        </G>
      );
    };

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="virtualPitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="rgba(15, 23, 42, 0)" />
              <Stop offset="50%" stopColor="rgba(30, 41, 59, 0.8)" />
              <Stop offset="100%" stopColor="rgba(15, 23, 42, 1)" />
            </SvgGradient>
            <SvgGradient id="trailBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#38BDF8" />
              <Stop offset="100%" stopColor="#818CF8" />
            </SvgGradient>
            <SvgGradient id="trailRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#EF4444" />
              <Stop offset="100%" stopColor="#F87171" />
            </SvgGradient>
          </Defs>

          {/* Virtual Stadium Perspective Grid */}
          <Polygon
            points={`${centerX - pitchWidthTop / 2},${pitchTop} ${centerX + pitchWidthTop / 2},${pitchTop} ${centerX + pitchWidthBottom / 2},${pitchBottom} ${centerX - pitchWidthBottom / 2},${pitchBottom}`}
            fill="url(#virtualPitchGrad)"
            opacity={0.8}
          />

          {/* In-Line Mat */}
          <Polygon
            points={`${left},${top} ${right},${top} ${right + 80},${SH} ${left - 80},${SH}`}
            fill={drsResult.pitching === 'IN LINE' ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.1)"}
            opacity={0.4}
          />

          {/* Trajectory Ribbons */}
          {renderRibbon(trajectoryPoints, '#38BDF8', '#818CF8')}
          
          {step === 'wickets' && projectedPoint && scaledImpact && (
            renderRibbon([scaledImpact, projectedPoint], '#EF4444', '#F87171', true)
          )}

          {/* 3D Stumps */}
          <G opacity={0.6}>
            {render3DStump(left + (right - left) * 0.15, step === 'wickets' && drsResult.wickets === 'HITTING')}
            {render3DStump(centerX, step === 'wickets' && drsResult.wickets === 'HITTING')}
            {render3DStump(right - (right - left) * 0.15, step === 'wickets' && drsResult.wickets === 'HITTING')}
          </G>

          {/* Event Markers (Glows) */}
          {scaledPitch && <Circle cx={scaledPitch.x} cy={scaledPitch.y} r={10} fill="#38BDF8" opacity={0.3} />}
          {scaledImpact && <Circle cx={scaledImpact.x} cy={scaledImpact.y} r={12} fill="#EF4444" opacity={0.4} />}

          {/* International Broadcast Labels */}
          {scaledPitch && (step === 'pitching' || step === 'impact' || step === 'wickets') && (
            <G transform={`translate(${scaledPitch.x}, ${scaledPitch.y - 30})`}>
              <Rect x={-40} y={-15} width={80} height={20} rx={4} fill="rgba(0,0,0,0.85)" stroke="#38BDF8" strokeWidth={1} />
              <SvgText fill="#38BDF8" fontSize="10" fontWeight="bold" fontStyle="italic" x={0} y={0} textAnchor="middle">PITCHING</SvgText>
            </G>
          )}

          {scaledImpact && (step === 'impact' || step === 'wickets') && (
            <G transform={`translate(${scaledImpact.x}, ${scaledImpact.y - 40})`}>
              <Rect x={-35} y={-15} width={70} height={20} rx={4} fill="rgba(0,0,0,0.85)" stroke="#EF4444" strokeWidth={1} />
              <SvgText fill="#EF4444" fontSize="10" fontWeight="bold" fontStyle="italic" x={0} y={0} textAnchor="middle">IMPACT</SvgText>
            </G>
          )}

          {step === 'wickets' && projectedPoint && (
            <G transform={`translate(${projectedPoint.x}, ${projectedPoint.y - 50})`}>
              <Rect x={-40} y={-15} width={80} height={20} rx={4} fill="rgba(0,0,0,0.85)" stroke={getStatusColor(drsResult.wickets)} strokeWidth={1} />
              <SvgText fill={getStatusColor(drsResult.wickets)} fontSize="10" fontWeight="bold" fontStyle="italic" x={0} y={0} textAnchor="middle">WICKETS</SvgText>
            </G>
          )}
        </Svg>
      </View>
    );
  };

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  const videoAnimStyle = useAnimatedStyle(() => ({
    opacity: 1 - virtualOpacity.value,
    transform: [{ scale: 1 + virtualOpacity.value * 0.1 }],
  }));

  return (
    <View style={styles.container}>
      {/* Hidden auto-detection engine */}
      <AutoBallDetector ref={detectorRef} />

      {/* ── Virtual stadium (Revealed during tracking) ── */}
      <View style={[StyleSheet.absoluteFill, styles.demoBackground]} />

      {/* ── Video / Demo Background ── */}
      <Animated.View style={[styles.video, videoAnimStyle]}>
        <Video
          ref={videoRef}
          style={StyleSheet.absoluteFill}
          source={{ uri: activeVideoUri }}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
        />
        
        {isDemo && step === 'extracting' && (
          <View style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
      </Animated.View>

      {/* ── Hawk-Eye Overlay ── */}
      <HawkEyeVisuals />

      {/* ══════════ EXTRACTING FRAMES ══════════ */}
      {step === 'extracting' && (
        <View style={styles.processingOverlay}>
          <LinearGradient
            colors={['rgba(11,14,20,0.97)', 'rgba(11,14,20,0.99)']}
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
            colors={['rgba(11,14,20,0.97)', 'rgba(11,14,20,0.99)']}
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

      {/* ══════════ ANALYZING OVERLAY ══════════ */}
      {step === 'analyzing' && (
        <View style={styles.processingOverlay}>
          <LinearGradient
            colors={['rgba(15,23,42,0.95)', 'rgba(15,23,42,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.processingContent}>
            <View style={styles.scanArea}>
              <Animated.View style={[styles.scanLine, animScan]} />
            </View>
            <View style={styles.processingIconWrap}>
              <Cpu size={40} color="#818cf8" />
            </View>
            <Text style={styles.processingTitle}>BALL TRACKING</Text>
            <Text style={styles.processingSub}>Computing trajectory prediction...</Text>
            <View style={styles.dataList}>
              <Text style={styles.dataItem}>▸ Stump-to-stump: {stumpRect ? `${stumpRect.widthInches}"` : '—'}</Text>
              <Text style={styles.dataItem}>▸ Stump height: {stumpRect ? `${stumpRect.heightInches}"` : '—'}</Text>
              <Text style={styles.dataItem}>▸ Ball pitch: {drsResult.pitchDistInches ? `${drsResult.pitchDistInches}" from center` : '—'}</Text>
              <Text style={styles.dataItem}>▸ Impact height: {drsResult.impactHeightInches ? `${drsResult.impactHeightInches}" above ground` : '—'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ══════════ DRS DASHBOARD (tracking phases) ══════════ */}
      {isTracking && (
        <View style={styles.drsHeader}>
          <LinearGradient colors={['rgba(15,23,42,0.9)', 'rgba(15,23,42,0.4)']} style={styles.drsHeaderGrad} />
          <View style={styles.drsRow}>
            <View style={[styles.drsBox, step === 'pitching' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>PITCHING</Text>
              <Text style={[styles.drsValue, { color: getStatusColor(drsResult.pitching) }]}>
                {['pitching', 'impact', 'wickets'].includes(step) ? drsResult.pitching : '—'}
              </Text>
            </View>
            <View style={[styles.drsBox, step === 'impact' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>IMPACT</Text>
              <Text style={[styles.drsValue, { color: getStatusColor(drsResult.impact) }]}>
                {['impact', 'wickets'].includes(step) ? drsResult.impact : '—'}
              </Text>
            </View>
            <View style={[styles.drsBox, step === 'wickets' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>WICKETS</Text>
              <Text style={[styles.drsValue, { color: getStatusColor(drsResult.wickets) }]}>
                {step === 'wickets' ? drsResult.wickets : '—'}
              </Text>
            </View>
          </View>

          {/* Measurements bar */}
          <View style={styles.measureBar}>
            <View style={styles.measureItem}>
              <Text style={styles.measureLabel}>STUMP WIDTH</Text>
              <Text style={styles.measureValue}>{stumpRect?.widthInches || 9}"</Text>
            </View>
            <View style={styles.measureDivider} />
            <View style={styles.measureItem}>
              <Text style={styles.measureLabel}>STUMP HEIGHT</Text>
              <Text style={styles.measureValue}>{stumpRect?.heightInches || 28}"</Text>
            </View>
            <View style={styles.measureDivider} />
            <View style={styles.measureItem}>
              <Text style={styles.measureLabel}>IMPACT HEIGHT</Text>
              <Text style={styles.measureValue}>{drsResult.impactHeightInches || '—'}"</Text>
            </View>
          </View>
        </View>
      )}

      {/* ══════════ BALL + EFFECTS ══════════ */}
      {isTracking && (
        <>
          <Animated.View style={[
            styles.impactGlow,
            { backgroundColor: ballColor + '50' },
            animGlow,
          ]} />
          <Animated.View style={[
            styles.ball,
            { borderColor: ballColor, shadowColor: ballColor },
            animBall,
          ]}>
            <View style={[styles.ballInner, { backgroundColor: ballColor + '30' }]} />
          </Animated.View>
        </>
      )}

      {/* ══════════ DECISION PANEL ══════════ */}
      {step === 'decision' && (
        <View style={styles.decisionOverlay}>
          <LinearGradient
            colors={['rgba(15,23,42,0.6)', 'rgba(2,6,23,0.98)']}
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
  video: { flex: 1, width: SW, height: SH },
  demoBackground: {
    backgroundColor: '#0F172A',
    justifyContent: 'center', alignItems: 'center',
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

  // ── DRS Header ──
  drsHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 55, paddingHorizontal: 14, zIndex: 20,
  },
  drsHeaderGrad: { ...StyleSheet.absoluteFillObject, height: 220 },
  drsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  drsBox: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  drsBoxActive: {
    borderColor: 'rgba(99,102,241,0.5)',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  drsLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 9,
    fontWeight: '800', letterSpacing: 1.5, marginBottom: 3,
  },
  drsValue: {
    color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '900',
  },

  // ── Measurements bar ──
  measureBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, padding: 8, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  measureItem: { flex: 1, alignItems: 'center' },
  measureLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 7,
    fontWeight: '800', letterSpacing: 1, marginBottom: 2,
  },
  measureValue: { color: '#818cf8', fontSize: 11, fontWeight: '900' },
  measureDivider: {
    width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.08)',
  },

  phaseBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
  },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseText: {
    color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 2,
  },

  // ── Stump zone ──
  stumpZone: {
    position: 'absolute', borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.25)', borderStyle: 'dashed',
    borderRadius: 4, justifyContent: 'flex-end', alignItems: 'center',
    paddingBottom: 4, zIndex: 10,
  },
  stumpsRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly',
    height: '100%', paddingHorizontal: 4,
  },
  stumpLine: {
    width: 2, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  bailLine: {
    position: 'absolute', top: 0, left: 2, right: 2,
    height: 3, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
  },
  stumpZoneLabel: {
    color: 'rgba(239,68,68,0.4)', fontSize: 8,
    fontWeight: '800', letterSpacing: 2,
    position: 'absolute', bottom: -14,
  },

  // ── Trajectory dots ──
  trajectoryDot: {
    position: 'absolute', width: 4, height: 4,
    borderRadius: 2, zIndex: 20,
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
  saveBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingVertical: 14, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  saveText: { color: '#22c55e', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
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
