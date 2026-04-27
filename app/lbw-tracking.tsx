import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Platform, Alert, Image, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import {
  X, RotateCcw, Save, Cpu, Eye, Crosshair, Target, Circle as LucideCircle, ChevronLeft
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Rect, Polygon, Circle, Text as SvgText, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  withSequence, withDelay, withRepeat, Easing, runOnJS, interpolate,
  cancelAnimation, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
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
  release: Point, pitch: Point, impact: Point, segments = 40,
  pathPoints?: Point[]
): Point[] {
  if (pathPoints && pathPoints.length >= 3) return pathPoints;
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(quadraticBezier(release, pitch, impact, i / segments));
  }
  return pts;
}

// ─── Project ball trajectory beyond impact to stump plane ───
// Uses proper geometry: extends the pitch→impact line to where it
// reaches the stump's vertical midpoint (center between bails and base).
// This matches how professional DRS hawk-eye projects the ball path.
function projectBeyondImpact(
  pitch: Point, impact: Point,
  stumpCenterY?: number
): Point {
  const dx = impact.x - pitch.x;
  const dy = impact.y - pitch.y;

  // If we have a stump center Y, project to that exact y-level
  if (stumpCenterY !== undefined && Math.abs(dy) > 0.5) {
    // Calculate how far along the pitch→impact vector we need to go
    // to reach the stump center Y
    const t = (stumpCenterY - pitch.y) / dy;
    // Clamp t to a reasonable range (at least to impact, at most 3x the distance)
    const tClamped = Math.max(1, Math.min(t, 3));
    return {
      x: pitch.x + dx * tClamped,
      y: pitch.y + dy * tClamped,
    };
  }

  // Fallback: extend by a reasonable factor
  return {
    x: impact.x + dx * 0.5,
    y: impact.y + dy * 0.5,
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const addTimeout = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeouts.current.push(t);
    return t;
  };

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Safe back navigation — cancel animations, clear timeouts, then navigate
  const goBack = useCallback(async () => {
    isMounted.current = false;

    // 1. Unload video immediately to free up native resources
    if (videoRef.current) {
      try {
        await videoRef.current.unloadAsync();
      } catch (e) { /* ignore */ }
    }

    // 2. Clear all pending timeouts
    timeouts.current.forEach(t => clearTimeout(t));
    timeouts.current = [];

    // 3. Explicitly cancel all Reanimated animations
    try {
      cancelAnimation(ballOpacity);
      cancelAnimation(ballX);
      cancelAnimation(ballY);
      cancelAnimation(ballScale);
      cancelAnimation(glowPulse);
      cancelAnimation(scanProgress);
      cancelAnimation(virtualOpacity);
      cancelAnimation(stumpReveal);

      // Reset to safe defaults
      ballOpacity.value = 0;
      glowPulse.value = 0;
      scanProgress.value = 0;
      virtualOpacity.value = 0;
      stumpReveal.value = 0;
    } catch (e) { /* ignore */ }

    // 4. Navigate back with a small delay
    setTimeout(() => {
      router.replace('/entryPage');
    }, 100);
  }, []);

  // ── Flow state ──
  type FlowStep = 'extracting' | 'detecting' | 'manual' | 'analyzing' | 'pitching' | 'impact' | 'wickets' | 'decision';
  const [step, setStep] = useState<FlowStep>('extracting');
  const [manualPoints, setManualPoints] = useState<{ pitch: Point | null, impact: Point | null, stumps: Point | null }>({ pitch: null, impact: null, stumps: null });
  const [manualStep, setManualStep] = useState<'pitch' | 'impact' | 'stumps' | 'done'>('pitch');

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
  const [allScaledPositions, setAllScaledPositions] = useState<{x: number; y: number; frame: number}[]>([]);

  // ── DRS result ──
  const [drsResult, setDrsResult] = useState({
    pitching: '', impact: '', wickets: '', decision: '',
    pitchDistInches: '', impactHeightInches: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [handedness, setHandedness] = useState<'RH' | 'LH'>('RH');
  const [shotOffered, setShotOffered] = useState(true);
  const [verdictBanner, setVerdictBanner] = useState<{
    label: string;
    status: string;
    color: string;
  } | null>(null);

  // ── Sync Handedness with Store ──
  useEffect(() => {
    if (striker?.battingHand) {
      const hand = striker.battingHand.toLowerCase() === 'left' ? 'LH' : 'RH';
      setHandedness(hand);
      console.log(`[DRS] Auto-identified Batsman: ${striker.name} (${hand})`);
    }
  }, [striker?.id]);

  // ── Animation values ──
  const ballOpacity = useSharedValue(0);
  const ballX = useSharedValue(SW / 2);
  const ballY = useSharedValue(SH * 0.85);
  const ballScale = useSharedValue(1.5);
  const glowPulse = useSharedValue(0);
  const scanProgress = useSharedValue(0);
  const virtualOpacity = useSharedValue(0); // For video-to-virtual fade
  const stumpReveal = useSharedValue(0);   // For 3D stump animation
  const pathProgress = useSharedValue(0);   // For growing trail
  const cameraScale = useSharedValue(1);
  const cameraY = useSharedValue(0);

  const [ghostPitch, setGhostPitch] = useState<null | Point>(null);
  const [ghostImpact, setGhostImpact] = useState<null | Point>(null);


  // ── src dimensions for coordinate scaling ──
  const srcW = useRef(200);
  const srcH = useRef(150);

  const DEMO_OUT_URL = 'https://raw.githubusercontent.com/guurav18/LBW-DRS-IN-CRICKET/main/lbw.mp4';
  const DEMO_NOT_OUT_URL = 'https://raw.githubusercontent.com/guurav18/LBW-DRS-IN-CRICKET/main/none.mp4';

  const isDemo = !videoUri || videoUri === 'demo' || videoUri === 'demo_out' || videoUri === 'demo_not_out';
  const activeVideoUri = videoUri === 'demo_not_out' ? DEMO_NOT_OUT_URL : (isDemo ? DEMO_OUT_URL : videoUri);

  // ═══════════════════════════════════════════════
  //  FRAME EXTRACTION + AUTO DETECTION
  // ═══════════════════════════════════════════════
  useEffect(() => { startAutoFlow(); }, []);

  const startAutoFlow = async () => {
    setStep('extracting');

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      if (!isMounted.current) return;
      // Modify detection based on demo type
      let pitchInfo = { x: 95, y: 95, frame: 7 };
      let impactInfo = { x: 97, y: 80, frame: 10 };

      if (videoUri === 'demo_not_out') {
        // Pitch outside leg (assuming right hander, leg is > 115)
        pitchInfo = { x: 130, y: 95, frame: 7 };
        impactInfo = { x: 125, y: 80, frame: 10 };
      }

      const demoDetection: DetectionResult = {
        stumps: {
          offBase: { x: 85, y: 120 }, legBase: { x: 115, y: 120 },
          bailTop: { x: 100, y: 55 }, widthPx: 30, heightPx: 65, centerX: 100,
        },
        ballPositions: [
          { x: 100, y: 15, frame: 0 }, { x: 98, y: 40, frame: 3 },
          pitchInfo, impactInfo,
          { x: 99, y: 70, frame: 13 },
        ],
        releasePoint: { x: 100, y: 15, frame: 0 },
        pitchPoint: pitchInfo,
        impactPoint: impactInfo,
        detectedHand: 'RH',
      };
      srcW.current = 320; srcH.current = 240;
      processDetectionResult(demoDetection);
      return;
    }

    try {
      // 1. Get video duration
      let duration = 6000;
      const targetUri = activeVideoUri;

      if (!isDemo && videoRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (!isMounted.current) return;
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
            quality: 0.6,
          });
          // Convert to base64 using new Expo File API
          const b64 = await FileSystem.readAsStringAsync(thumb.uri, { encoding: 'base64' });
          base64Frames.push(b64);
        } catch (e) {
          console.warn(`Frame ${i} extraction failed`);
        }
        setExtractProgress((i + 1) / FRAME_COUNT);
        if (!isMounted.current) return;
      }

      if (base64Frames.length < 5) {
        Alert.alert('Error', 'Could not extract enough frames from video.');
        goBack();
        return;
      }

      // 3. Auto-detect ball and stumps
      setStep('detecting');
      setDetectProgress(0);

      const result = await detectorRef.current?.processFrames(
        base64Frames, 320, 240
      );
      if (!isMounted.current) return;

      if (result) {
        processDetectionResult(result);
      } else {
        setStep('manual');
      }
    } catch (err) {
      console.error('Auto-detection error:', err);
      setStep('manual');
    }
  };

  const handleManualSelection = (e: any) => {
    if (step !== 'manual') return;
    const { locationX, locationY } = e.nativeEvent;
    const pt = { x: locationX, y: locationY };

    if (manualStep === 'pitch') {
      setManualPoints(prev => ({ ...prev, pitch: pt }));
      setManualStep('impact');
    } else if (manualStep === 'impact') {
      setManualPoints(prev => ({ ...prev, impact: pt }));
      setManualStep('stumps');
    } else if (manualStep === 'stumps') {
      setManualPoints(prev => ({ ...prev, stumps: pt }));
      setManualStep('done');
      addTimeout(() => {
        startAnalysis();
      }, 500);
    }
  };

  const startAnalysis = () => {
    let pit: Point, imp: Point, rel: Point, stp: any;

    if (step === 'manual' || manualPoints.pitch) {
      pit = manualPoints.pitch!;
      imp = manualPoints.impact!;
      stp = { 
        left: manualPoints.stumps!.x - 20, 
        right: manualPoints.stumps!.x + 20, 
        top: manualPoints.stumps!.y - 40, 
        bottom: manualPoints.stumps!.y 
      };
      rel = { x: pit.x, y: SH * 0.2 };
    } else if (detection) {
      pit = scalePoint(detection.pitchPoint!, srcW.current, srcH.current);
      imp = scalePoint(detection.impactPoint!, srcW.current, srcH.current);
      rel = scalePoint(detection.releasePoint!, srcW.current, srcH.current);
      stp = detection.stumps;
    } else {
      pit = { x: SW * 0.48, y: SH * 0.62 };
      imp = { x: SW * 0.52, y: SH * 0.48 };
      rel = { x: SW / 2, y: SH * 0.15 };
      stp = { left: SW * 0.44, right: SW * 0.56, top: SH * 0.38, bottom: SH * 0.52 };
    }
    
    // Convert to expected types and continue logic
    setScaledPitch(pit);
    setScaledImpact(imp);
    setScaledRelease(rel);
    
    let stump = {
      left: stp.left, right: stp.right,
      top: stp.top, bottom: stp.bottom,
      widthPx: Math.abs(stp.right - stp.left),
      heightPx: Math.abs(stp.bottom - stp.top),
      widthInches: 9, heightInches: 28,
    };
    setStumpRect(stump);
    
    computeDecision(rel, pit, imp, stump);
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
        left: Math.min(sOff.x, sLeg.x),
        right: Math.max(sOff.x, sLeg.x),
        top: sBail.y,
        bottom: Math.max(sOff.y, sLeg.y),
        widthPx: wPx,
        heightPx: hPx,
        widthInches: 9,
        heightInches: Math.round(hPx / pxPerInch),
      };
    }
    setStumpRect(stump);

    // Only use video-detected hand as fallback when store doesn't have it
    if (result.detectedHand && !striker?.battingHand) {
      setHandedness(result.detectedHand);
      console.log(`[DRS] Video-detected Stance (fallback): ${result.detectedHand}`);
    } else if (striker?.battingHand) {
      console.log(`[DRS] Using store batting hand: ${handedness}`);
    }

    // Scale ALL detected ball positions for trajectory animation
    const validBallPos = result.ballPositions.filter(
      (p: any) => typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x)
    );
    const scaledAll = validBallPos.map((p: any) => ({
      ...scalePoint(p, sw, sh),
      frame: p.frame,
    }));
    setAllScaledPositions(scaledAll);
    console.log(`[DRS] Detected ${scaledAll.length} ball positions for trajectory`);

    // Compute DRS decision
    computeDecision(release, pitch, impact, stump);
  };

  // ═══════════════════════════════════════════════
  //  COMPUTE DRS DECISION — ICC Professional Rules
  //
  //  ICC LBW Law 36 Decision Tree:
  //  1. PITCHING: Where did the ball land?
  //     - Outside Leg → NOT OUT (always, game over)
  //     - In Line or Outside Off → proceed
  //
  //  2. IMPACT: Where did the ball hit the batsman?
  //     - In Line with stumps → proceed
  //     - Outside Off AND shot offered → NOT OUT
  //     - Outside Off AND no shot → proceed (can be out)
  //     - Marginal (within half-ball of stump edge) → UMPIRE'S CALL
  //
  //  3. WICKETS: Would the ball go on to hit the stumps?
  //     - Ball center inside stump zone → HITTING
  //     - Ball center outside but edge clips (within half-ball) → UMPIRE'S CALL
  //     - Missing entirely → MISSING
  //
  //  4. FINAL: OUT only if Pitching legal, Impact legal, Wickets hitting.
  //     Any element at UMPIRE'S CALL → original decision stands.
  // ═══════════════════════════════════════════════
  const computeDecision = (
    release: Point, pitch: Point, impact: Point,
    stump: typeof stumpRect extends infer T ? NonNullable<T> : never
  ) => {
    if (!stump) return;

    const pxPerInch = stump.widthPx / 9;
    // ICC ball diameter: 2.86 inches (men's), half = radius
    const ballDiameterPx = pxPerInch * 2.86;
    const halfBallPx = ballDiameterPx / 2;

    // Stump boundaries (exact, no padding)
    const sLeft = stump.left;
    const sRight = stump.right;
    const sTop = stump.top;     // bail top (lower y = higher on screen)
    const sBottom = stump.bottom; // stump base (higher y = lower on screen)
    const sCenterX = (sLeft + sRight) / 2;
    const sCenterY = (sTop + sBottom) / 2;

    // For RH batsman (behind bowler view):
    //   Off side = LEFT of stumps (lower x)
    //   Leg side = RIGHT of stumps (higher x)
    // For LH batsman: reversed
    const offEdge = handedness === 'RH' ? sLeft : sRight;
    const legEdge = handedness === 'RH' ? sRight : sLeft;

    // ──────────────────────────────────────────────
    // 1. PITCHING — Where did the ball bounce?
    // ──────────────────────────────────────────────
    let pitchingStatus = 'IN LINE';
    const pitchDistFromOff = handedness === 'RH'
      ? sLeft - pitch.x   // positive = outside off
      : pitch.x - sRight; // positive = outside off (LH)
    const pitchDistFromLeg = handedness === 'RH'
      ? pitch.x - sRight  // positive = outside leg
      : sLeft - pitch.x;  // positive = outside leg (LH)

    if (pitchDistFromLeg > 0) {
      pitchingStatus = 'OUTSIDE LEG';
    } else if (pitchDistFromOff > 0) {
      pitchingStatus = 'OUTSIDE OFF';
    }

    // ──────────────────────────────────────────────
    // 2. IMPACT — Where did the ball hit the pad?
    // ──────────────────────────────────────────────
    const impactDistFromOff = handedness === 'RH'
      ? sLeft - impact.x
      : impact.x - sRight;
    const impactDistFromLeg = handedness === 'RH'
      ? impact.x - sRight
      : sLeft - impact.x;

    let impactStatus = 'IN LINE';
    let impactSide = ''; // 'OFF' or 'LEG' for outside impacts

    if (impactDistFromOff > 0) {
      // Ball center is outside off
      if (impactDistFromOff < halfBallPx) {
        // Less than 50% outside → UMPIRE'S CALL
        impactStatus = "UMPIRE'S CALL";
      } else {
        impactStatus = 'OUTSIDE OFF';
      }
      impactSide = 'OFF';
    } else if (impactDistFromLeg > 0) {
      // Ball center is outside leg
      if (impactDistFromLeg < halfBallPx) {
        impactStatus = "UMPIRE'S CALL";
      } else {
        impactStatus = 'OUTSIDE LEG';
      }
      impactSide = 'LEG';
    }
    // else: ball center between stumps → IN LINE

    // ──────────────────────────────────────────────
    // 3. WICKETS — Would the ball hit the stumps?
    //    Project trajectory from pitch→impact to the stump plane
    // ──────────────────────────────────────────────
    const projected = projectBeyondImpact(pitch, impact, sCenterY);

    // Check if projected point is within the stump rectangle
    const projDistFromLeftEdge = projected.x - sLeft;
    const projDistFromRightEdge = sRight - projected.x;
    const projDistFromTop = projected.y - sTop;
    const projDistFromBottom = sBottom - projected.y;

    const projInsideX = projDistFromLeftEdge >= 0 && projDistFromRightEdge >= 0;
    const projInsideY = projDistFromTop >= 0 && projDistFromBottom >= 0;

    // Distance from nearest stump edge (for clipping check)
    const projDistX = projInsideX
      ? Math.min(projDistFromLeftEdge, projDistFromRightEdge)
      : Math.min(Math.abs(projDistFromLeftEdge), Math.abs(projDistFromRightEdge));
    const projDistY = projInsideY
      ? Math.min(projDistFromTop, projDistFromBottom)
      : Math.min(Math.abs(projDistFromTop), Math.abs(projDistFromBottom));

    let wicketsStatus = 'MISSING';

    if (projInsideX && projInsideY) {
      // Ball center is inside the stump rectangle
      if (projDistX >= halfBallPx && projDistY >= halfBallPx) {
        // More than half the ball inside → clearly HITTING
        wicketsStatus = 'HITTING';
      } else {
        // Ball center inside but very close to edge → marginal
        // In ICC DRS, if ball center is inside stumps, it's HITTING
        // Umpire's Call is only when center is OUTSIDE but edge clips
        wicketsStatus = 'HITTING';
      }
    } else {
      // Ball center is outside the stump rectangle
      // Check if the ball's edge would still clip the stumps
      const clipsX = projInsideX || projDistX < halfBallPx;
      const clipsY = projInsideY || projDistY < halfBallPx;

      if (clipsX && clipsY) {
        // Ball edge clips the stumps → UMPIRE'S CALL
        wicketsStatus = "UMPIRE'S CALL";
      }
      // else: completely missing → stays MISSING
    }

    // ──────────────────────────────────────────────
    // 4. FINAL DECISION — ICC Decision Tree
    // ──────────────────────────────────────────────
    let finalDecision = 'NOT OUT';

    // Gate 1: Pitching outside leg → always NOT OUT
    if (pitchingStatus === 'OUTSIDE LEG') {
      finalDecision = 'NOT OUT';
    }
    // Gate 2: Check impact + wickets
    else {
      // Determine if impact allows LBW
      let impactAllowsLBW = false;

      if (impactStatus === 'IN LINE') {
        impactAllowsLBW = true;
      } else if (impactStatus === "UMPIRE'S CALL") {
        impactAllowsLBW = true; // proceed, but final may be Umpire's Call
      } else if (impactStatus === 'OUTSIDE OFF' && !shotOffered) {
        // ICC Rule: If no shot offered, impact outside off can still be out
        impactAllowsLBW = true;
      } else if (impactStatus === 'OUTSIDE OFF' && shotOffered) {
        impactAllowsLBW = false; // NOT OUT
      } else if (impactStatus === 'OUTSIDE LEG') {
        impactAllowsLBW = false; // NOT OUT
      }

      if (impactAllowsLBW && wicketsStatus !== 'MISSING') {
        // Check for Umpire's Call elements
        const hasUmpiresCall =
          impactStatus === "UMPIRE'S CALL" ||
          wicketsStatus === "UMPIRE'S CALL";

        if (hasUmpiresCall) {
          finalDecision = "UMPIRE'S CALL";
        } else {
          finalDecision = 'OUT';
        }
      }
    }

    // ── Measurements for display ──
    const pitchDist = Math.abs(pitch.x - sCenterX) / pxPerInch;
    const impactH = Math.abs(sBottom - impact.y) / pxPerInch;

    setDrsResult({
      pitching: pitchingStatus,
      impact: impactStatus,
      wickets: wicketsStatus,
      decision: finalDecision,
      pitchDistInches: pitchDist.toFixed(1),
      impactHeightInches: impactH.toFixed(1),
    });

    console.log(`[DRS] ── ICC Decision ──`);
    console.log(`[DRS] Pitching: ${pitchingStatus}`);
    console.log(`[DRS] Impact: ${impactStatus}`);
    console.log(`[DRS] Wickets: ${wicketsStatus} (projected: ${projected.x.toFixed(1)}, ${projected.y.toFixed(1)})`);
    console.log(`[DRS] Stumps: L=${sLeft.toFixed(0)} R=${sRight.toFixed(0)} T=${sTop.toFixed(0)} B=${sBottom.toFixed(0)}`);
    console.log(`[DRS] Final: ${finalDecision}`);

    // Begin DRS animation sequence
    setStep('analyzing');
    beginAnalysisPhase();
  };

  // ═══════════════════════════════════════════════
  //  DRS ANIMATION SEQUENCE — BROADCAST STYLE
  //  Each phase: animate ball → freeze → verdict banner → pause → next
  //  Matches international cricket TV broadcast pacing
  // ═══════════════════════════════════════════════

  // Helper: show verdict banner with dramatic freeze, then proceed
  const showVerdictAndProceed = (
    label: string,
    status: string,
    phase: string,
    nextFn: () => void,
    holdMs: number = 2500
  ) => {
    const color = getPhaseStatusColor(phase, status);
    addTimeout(() => {
      setVerdictBanner({ label, status, color });
    }, 500); // slight delay after ball arrives for dramatic beat
    addTimeout(() => {
      setVerdictBanner(null);
      nextFn();
    }, 500 + holdMs);
  };

  const beginAnalysisPhase = () => {
    // Start scan animation
    scanProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ), -1, false
    );

    // Subtle dim — keep video visible behind trajectory overlay
    virtualOpacity.value = withDelay(1000, withTiming(0.5, { duration: 1500 }));
    stumpReveal.value = withDelay(1500, withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1)) }));

    cameraScale.value = withDelay(1000, withTiming(1.08, { duration: 3000 }));
    cameraY.value = withDelay(1000, withTiming(-15, { duration: 3000 }));

    addTimeout(() => {
      setStep('pitching');
      startPitchingAnimation();
    }, 2800);
  };

  // ── Helper: animate ball along a series of detected positions ──
  const animateAlongPath = (
    points: {x: number; y: number}[],
    totalMs: number,
    scaleStart: number,
    scaleEnd: number,
  ) => {
    if (points.length < 2) return;
    const segMs = totalMs / (points.length - 1);
    for (let i = 1; i < points.length; i++) {
      const delay = segMs * (i - 1);
      const progress = i / (points.length - 1);
      const sc = scaleStart + (scaleEnd - scaleStart) * progress;
      addTimeout(() => {
        ballX.value = withTiming(points[i].x, { duration: segMs * 1.05, easing: Easing.linear });
        ballY.value = withTiming(points[i].y, { duration: segMs * 1.05, easing: Easing.linear });
        ballScale.value = withTiming(sc, { duration: segMs * 1.05 });
      }, delay);
    }
  };

  // ── Get ball positions for a phase segment ──
  const getPathSegment = (fromFrame: number, toFrame: number) => {
    if (allScaledPositions.length < 3) return [];
    return allScaledPositions.filter(p => p.frame >= fromFrame && p.frame <= toFrame);
  };

  const startPitchingAnimation = () => {
    const rel = scaledRelease || { x: SW / 2, y: SH * 0.15 };
    const pit = scaledPitch || { x: SW * 0.48, y: SH * 0.62 };

    // Get detected positions from release to pitch
    const pitchFrame = detection?.pitchPoint?.frame ?? -1;
    const releaseFrame = detection?.releasePoint?.frame ?? 0;
    const pathPoints = getPathSegment(releaseFrame, pitchFrame);
    const usePathAnim = pathPoints.length >= 3;

    ballOpacity.value = 0;
    ballX.value = usePathAnim ? pathPoints[0].x : rel.x;
    ballY.value = usePathAnim ? pathPoints[0].y : rel.y;
    ballScale.value = 0.5;
    glowPulse.value = 0;

    ballOpacity.value = withTiming(1, { duration: 250 });

    const animDuration = 1800;
    pathProgress.value = withTiming(0.4, { duration: animDuration });

    if (usePathAnim) {
      // Follow actual detected ball positions
      animateAlongPath(pathPoints, animDuration, 0.5, 1.4);
    } else {
      // Fallback: simple 2-point animation
      ballX.value = withTiming(pit.x, { duration: animDuration, easing: Easing.bezier(0.2, 0, 0.4, 1) });
      ballY.value = withTiming(pit.y, { duration: animDuration, easing: Easing.bezier(0.2, 0, 0.4, 1) });
      ballScale.value = withTiming(1.4, { duration: animDuration });
    }

    // Impact glow when ball pitches
    glowPulse.value = withDelay(animDuration,
      withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 400 }))
    );

    // FREEZE → verdict → proceed
    addTimeout(() => {
      if (scaledPitch) setGhostPitch(scaledPitch);
      if (drsResult.pitching === 'OUTSIDE LEG') {
        showVerdictAndProceed('PITCHING', drsResult.pitching, 'pitching', () => {
          setVerdictBanner(null);
          setStep('decision');
        }, 3000);
      } else {
        showVerdictAndProceed('PITCHING', drsResult.pitching, 'pitching', () => {
          setStep('impact');
          startImpactAnimation();
        });
      }
    }, animDuration + 300);
  };

  const startImpactAnimation = () => {
    const imp = scaledImpact || { x: SW * 0.5, y: SH * 0.52 };

    // Get detected positions from pitch to impact
    const pitchFrame = detection?.pitchPoint?.frame ?? -1;
    const impactFrame = detection?.impactPoint?.frame ?? -1;
    const pathPoints = getPathSegment(pitchFrame, impactFrame);
    const usePathAnim = pathPoints.length >= 2;

    glowPulse.value = 0;

    const animDuration = 1200;
    pathProgress.value = withTiming(0.7, { duration: animDuration });

    if (usePathAnim) {
      animateAlongPath(pathPoints, animDuration, 1.4, 1.5);
    } else {
      ballX.value = withTiming(imp.x, { duration: animDuration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      ballY.value = withTiming(imp.y, { duration: animDuration, easing: Easing.out(Easing.quad) });
      ballScale.value = withTiming(1.5, { duration: animDuration });
    }

    // Impact glow
    glowPulse.value = withDelay(animDuration,
      withSequence(withTiming(1, { duration: 60 }), withTiming(0.3, { duration: 500 }))
    );

    // FREEZE → verdict → proceed
    addTimeout(() => {
      if (scaledImpact) setGhostImpact(scaledImpact);
      const shouldTerminate =
        (drsResult.impact === 'OUTSIDE OFF' && shotOffered) ||
        drsResult.impact === 'OUTSIDE LEG';

      if (shouldTerminate) {
        showVerdictAndProceed('IMPACT', drsResult.impact, 'impact', () => {
          setVerdictBanner(null);
          setStep('decision');
        }, 3000);
      } else {
        showVerdictAndProceed('IMPACT', drsResult.impact, 'impact', () => {
          setStep('wickets');
          startWicketsAnimation();
        });
      }
    }, animDuration + 300);
  };

  const startWicketsAnimation = () => {
    const pit = scaledPitch || { x: SW * 0.48, y: SH * 0.62 };
    const imp = scaledImpact || { x: SW * 0.5, y: SH * 0.52 };
    const sCenterY = stumpRect ? (stumpRect.top + stumpRect.bottom) / 2 : undefined;
    const projected = projectBeyondImpact(pit, imp, sCenterY);

    glowPulse.value = 0;
    ballOpacity.value = withTiming(0.65, { duration: 200 });

    // Predicted path: animate from impact to projected stump position
    ballX.value = withTiming(projected.x, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballY.value = withTiming(projected.y, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    ballScale.value = withTiming(1, { duration: 1400 });
    pathProgress.value = withTiming(1, { duration: 1400 });

    // Stump hit glow (only when HITTING)
    if (drsResult.wickets === 'HITTING') {
      glowPulse.value = withDelay(1400,
        withSequence(
          withTiming(1, { duration: 50 }), withTiming(0.5, { duration: 150 }),
          withTiming(1, { duration: 80 }), withTiming(0.6, { duration: 600 })
        )
      );
    }

    // FREEZE → verdict → decision
    addTimeout(() => {
      showVerdictAndProceed('WICKETS', drsResult.wickets, 'wickets', () => {
        setVerdictBanner(null);
        setStep('decision');
      }, 3000);
    }, 1700);
  };

  // ── Reset ──
  const resetAll = useCallback(() => {
    ballOpacity.value = 0;
    glowPulse.value = 0;
    setVerdictBanner(null);
    setStep('extracting');
    setDetection(null);
    setGhostPitch(null);
    setGhostImpact(null);
    pathProgress.value = 0;
    cameraScale.value = 1;
    cameraY.value = 0;
    setExtractProgress(0);
    setDetectProgress(0);
    addTimeout(() => startAutoFlow(), 300);
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
    if (allScaledPositions.length >= 3) return allScaledPositions;
    if (!scaledRelease || !scaledPitch || !scaledImpact) return [];
    return generateTrajectoryPoints(scaledRelease, scaledPitch, scaledImpact, 40);
  }, [allScaledPositions, scaledRelease, scaledPitch, scaledImpact]);

  const projectedPoint = useMemo(() => {
    if (!scaledPitch || !scaledImpact) return null;
    const sCenterY = stumpRect ? (stumpRect.top + stumpRect.bottom) / 2 : undefined;
    return projectBeyondImpact(scaledPitch, scaledImpact, sCenterY);
  }, [scaledPitch, scaledImpact, stumpRect]);

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

  // Context-aware: "OUTSIDE OFF" is legal at pitching (green), illegal at impact (red)
  const getPhaseStatusColor = (phase: string, status: string) => {
    if (phase === 'pitching' && status === 'OUTSIDE OFF') return '#22c55e';
    return getStatusColor(status);
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
    const pitchWidthTop = width * 1.8;
    const pitchWidthBottom = SW * 1.2;
    const pitchTop = top - 120;
    const pitchBottom = SH;

    // 3D Stump reconstruction
    const render3DStump = (x: number, isHit: boolean) => {
      const sWidth = width / 5.5;
      const sHeight = bottom - top;
      return (
        <G key={`stump-${x}`}>
          <Defs>
            <SvgGradient id={`stumpGrad-${x}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#1e293b" />
              <Stop offset="50%" stopColor="#475569" />
              <Stop offset="100%" stopColor="#1e293b" />
            </SvgGradient>
          </Defs>
          {/* Main Stump Cylinder */}
          <Rect
            x={x - sWidth / 2}
            y={top}
            width={sWidth}
            height={sHeight}
            rx={sWidth / 2}
            fill={`url(#stumpGrad-${x})`}
            stroke={isHit ? "#EF4444" : "rgba(255,255,255,0.05)"}
            strokeWidth={1}
          />
          {/* Reflection Highlight */}
          <Rect
            x={x - sWidth / 4}
            y={top + 10}
            width={2}
            height={sHeight - 20}
            rx={1}
            fill="rgba(255,255,255,0.15)"
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
            strokeDasharray="2000"
            strokeDashoffset={interpolate(pathProgress.value, [0, 1], [2000, 0])}
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
            opacity={0.6}
          />

          {/* In-Line Mat */}
          <Polygon
            points={`${left},${top} ${right},${top} ${right + 80},${SH} ${left - 80},${SH}`}
            fill={drsResult.pitching === 'IN LINE' ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.15)"}
            opacity={0.4}
          />

          {/* Ball Shadow */}
          {isTracking && (
            <Circle
              cx={ballX.value}
              cy={SH * 0.65}
              r={12}
              fill="rgba(0,0,0,0.4)"
              transform={`scale(${interpolate(ballY.value, [SH * 0.2, SH * 0.65], [0.5, 1.2])}, 0.3)`}
            />
          )}

          {/* Ghost Balls */}
          {ghostPitch && (
            <Circle cx={ghostPitch.x} cy={ghostPitch.y} r={10} fill="rgba(255,255,255,0.1)" stroke="#38BDF8" strokeWidth={1.5} opacity={0.6} />
          )}
          {ghostImpact && (
            <Circle cx={ghostImpact.x} cy={ghostImpact.y} r={10} fill="rgba(255,255,255,0.1)" stroke="#EF4444" strokeWidth={1.5} opacity={0.6} />
          )}

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



          {/* International Broadcast Labels & Markers */}
          {scaledPitch && (step === 'pitching' || step === 'impact' || step === 'wickets') && (
            <G>
              <Circle cx={scaledPitch.x} cy={scaledPitch.y} r={6} fill="none" stroke="#38BDF8" strokeWidth={2} />
              <G transform={`translate(${scaledPitch.x}, ${scaledPitch.y - 30})`}>
                <Rect x={-40} y={-15} width={80} height={20} rx={4} fill="rgba(0,0,0,0.85)" stroke="#38BDF8" strokeWidth={1} />
                <SvgText fill="#38BDF8" fontSize="10" fontWeight="bold" fontStyle="italic" x={0} y={0} textAnchor="middle">PITCHING</SvgText>
              </G>
            </G>
          )}

          {scaledImpact && (step === 'impact' || step === 'wickets') && (
            <G>
              <Circle cx={scaledImpact.x} cy={scaledImpact.y} r={6} fill="none" stroke="#EF4444" strokeWidth={2} />
              <G transform={`translate(${scaledImpact.x}, ${scaledImpact.y - 40})`}>
                <Rect x={-35} y={-15} width={70} height={20} rx={4} fill="rgba(0,0,0,0.85)" stroke="#EF4444" strokeWidth={1} />
                <SvgText fill="#EF4444" fontSize="10" fontWeight="bold" fontStyle="italic" x={0} y={0} textAnchor="middle">IMPACT</SvgText>
              </G>
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
    opacity: 1 - (virtualOpacity.value * 0.4), // Keep video visible in background (dims to 60%)
    transform: [
      { scale: cameraScale.value },
      { translateY: cameraY.value },
    ],
  }));

  const virtualAnimStyle = useAnimatedStyle(() => ({
    opacity: virtualOpacity.value,
    transform: [
      { scale: cameraScale.value },
      { translateY: cameraY.value },
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
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
          shouldPlay={true}
          isLooping={true}
        />

        {/* ── Broadcast Watermarks ── */}
        <View style={styles.broadcastOverlay} pointerEvents="none">
          <View style={styles.replayBadge}>
            <Text style={styles.replayText}>● REPLAY</Text>
          </View>
          <View style={styles.drsBadge}>
            <Text style={styles.drsText}>DRS TECHNOLOGY</Text>
          </View>
        </View>

        {/* ── Manual Selection Overlay ── */}
        {step === 'manual' && (
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={handleManualSelection} 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
          >
            <View style={styles.manualHeader}>
              <Text style={styles.manualStepText}>
                {manualStep === 'pitch' ? 'TAP WHERE BALL PITCHED' :
                 manualStep === 'impact' ? 'TAP WHERE BALL HIT PAD' :
                 'TAP CENTER OF STUMPS'}
              </Text>
              <Text style={styles.manualSubText}>Manual Tracking Mode</Text>
            </View>

            {/* Selection Markers */}
            {manualPoints.pitch && <View style={[styles.manualMarker, { left: manualPoints.pitch.x - 15, top: manualPoints.pitch.y - 15, borderColor: '#38BDF8' }]} />}
            {manualPoints.impact && <View style={[styles.manualMarker, { left: manualPoints.impact.x - 15, top: manualPoints.impact.y - 15, borderColor: '#EF4444' }]} />}
            {manualPoints.stumps && <View style={[styles.manualMarker, { left: manualPoints.stumps.x - 15, top: manualPoints.stumps.y - 15, borderColor: '#fff' }]} />}
          </TouchableOpacity>
        )}

        {step === 'extracting' && (
          <View style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.extractionOverlay}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.extractionText}>Extracting High-Def Frames...</Text>
              <Text style={styles.extractionSubText}>{Math.round(extractProgress * 100)}% Complete</Text>
              
              <TouchableOpacity 
                style={styles.manualShortcutBtn} 
                onPress={() => setStep('manual')}
              >
                <Text style={styles.manualShortcutText}>SKIP TO MANUAL TRACKING</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* ── Hawk-Eye Overlay ── */}
      <Animated.View style={[StyleSheet.absoluteFill, virtualAnimStyle]} pointerEvents="none">
        <HawkEyeVisuals />
      </Animated.View>

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
        <View style={[styles.drsHeader, { paddingTop: Math.max(insets.top, 14) }]}>
          <LinearGradient colors={['rgba(15,23,42,0.9)', 'rgba(15,23,42,0.4)']} style={styles.drsHeaderGrad} />

          {striker && (
            <View style={styles.trackingInfoBar}>
              <Text style={styles.trackingInfoLabel}>TRACKING BATSMAN</Text>
              <View style={styles.trackingInfoRow}>
                <Text style={styles.trackingInfoName}>{striker.name.toUpperCase()}</Text>
                {detection?.detectedHand && (
                  <View style={styles.aiBadge}>
                    <Cpu size={8} color="#22c55e" />
                    <Text style={styles.aiBadgeText}>VIDEO IDENTIFIED</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.proSettingsBar}>
            <View style={styles.proSetting}>
              <Text style={styles.proSettingLabel}>BATSMAN</Text>
              <TouchableOpacity
                style={styles.proSettingToggle}
                onPress={() => { setHandedness(handedness === 'RH' ? 'LH' : 'RH'); resetAll(); }}
              >
                <Text style={styles.proSettingValue}>{handedness === 'RH' ? 'RIGHT HANDED' : 'LEFT HANDED'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.proSetting}>
              <Text style={styles.proSettingLabel}>SHOT OFFERED</Text>
              <TouchableOpacity
                style={styles.proSettingToggle}
                onPress={() => { setShotOffered(!shotOffered); resetAll(); }}
              >
                <Text style={styles.proSettingValue}>{shotOffered ? 'YES' : 'NO'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.drsRow}>
            <View style={[styles.drsBox, step === 'pitching' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>PITCHING</Text>
              <Text style={[styles.drsValue, { color: getPhaseStatusColor('pitching', drsResult.pitching) }]}>
                {['pitching', 'impact', 'wickets'].includes(step) ? drsResult.pitching : 'WAITING...'}
              </Text>
            </View>
            <View style={[styles.drsBox, step === 'impact' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>IMPACT</Text>
              <Text style={[styles.drsValue, { color: getPhaseStatusColor('impact', drsResult.impact) }]}>
                {['impact', 'wickets'].includes(step) ? drsResult.impact : 'WAITING...'}
              </Text>
            </View>
            <View style={[styles.drsBox, step === 'wickets' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>WICKETS</Text>
              <Text style={[styles.drsValue, { color: getPhaseStatusColor('wickets', drsResult.wickets) }]}>
                {step === 'wickets' ? drsResult.wickets : 'WAITING...'}
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

      {/* ══════════ DECISION PANEL ══════════ */}
      {step === 'decision' && (
        <View style={styles.decisionOverlay}>
          <LinearGradient
            colors={['rgba(15,23,42,0.6)', 'rgba(2,6,23,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.decisionContent}>
            <View style={styles.professionalMatrix}>
              <View style={styles.matrixRow}>
                <Text style={styles.matrixLabel}>PITCHING</Text>
                <View style={[styles.matrixPill, { backgroundColor: getPhaseStatusColor('pitching', drsResult.pitching) + '20', borderColor: getPhaseStatusColor('pitching', drsResult.pitching) }]}>
                  <Text style={[styles.matrixValue, { color: getPhaseStatusColor('pitching', drsResult.pitching) }]}>{drsResult.pitching}</Text>
                </View>
              </View>
              {drsResult.impact ? (
              <View style={styles.matrixRow}>
                <Text style={styles.matrixLabel}>IMPACT</Text>
                <View style={[styles.matrixPill, { backgroundColor: getPhaseStatusColor('impact', drsResult.impact) + '20', borderColor: getPhaseStatusColor('impact', drsResult.impact) }]}>
                  <Text style={[styles.matrixValue, { color: getPhaseStatusColor('impact', drsResult.impact) }]}>{drsResult.impact}</Text>
                </View>
              </View>
              ) : null}
              {drsResult.wickets ? (
              <View style={styles.matrixRow}>
                <Text style={styles.matrixLabel}>WICKETS</Text>
                <View style={[styles.matrixPill, { backgroundColor: getPhaseStatusColor('wickets', drsResult.wickets) + '20', borderColor: getPhaseStatusColor('wickets', drsResult.wickets) }]}>
                  <Text style={[styles.matrixValue, { color: getPhaseStatusColor('wickets', drsResult.wickets) }]}>{drsResult.wickets}</Text>
                </View>
              </View>
              ) : null}
              <View style={styles.matrixRow}>
                <Text style={styles.matrixLabel}>BATSMAN STANCE</Text>
                <View style={[styles.matrixPill, { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
                  <Text style={[styles.matrixValue, { color: '#818cf8' }]}>
                    {handedness === 'LH' ? 'LEFT HANDED' : 'RIGHT HANDED'}
                  </Text>
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
              <TouchableOpacity style={styles.doneBtn} onPress={() => goBack()}>
                <Text style={styles.doneText}>COMMIT RECORD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.backBtn, { top: Math.max(insets.top, 10) }]}
        onPress={() => goBack()}
      >
        <ChevronLeft size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
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
    paddingHorizontal: 14, zIndex: 20,
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
    color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '900',
    letterSpacing: 1,
  },

  proSettingsBar: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  proSetting: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  proSettingLabel: {
    color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 1, marginBottom: 4,
  },
  proSettingToggle: {
    paddingVertical: 2,
  },
  proSettingValue: {
    color: colors.accent, fontSize: 10, fontWeight: '900',
  },

  trackingInfoBar: {
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center',
  },
  trackingInfoLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2,
  },
  trackingInfoName: {
    color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1,
  },
  trackingInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  aiBadgeText: {
    color: '#22c55e', fontSize: 7, fontWeight: '900', letterSpacing: 0.5,
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
  // ── Decision Professional Matrix ──
  professionalMatrix: {
    marginBottom: 24, paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  matrixRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  matrixLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2,
  },
  matrixPill: {
    width: 140, paddingVertical: 5, borderRadius: 5, alignItems: 'center', borderWidth: 1,
  },
  matrixValue: {
    fontSize: 12, fontWeight: '900', letterSpacing: 1,
  },

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
  backBtn: {
    position: 'absolute', top: 18, left: 18,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 200,
  },

  // ── Manual Mode ──
  manualHeader: {
    position: 'absolute', top: 120, left: 0, right: 0,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 20,
  },
  manualStepText: {
    color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1,
    textAlign: 'center', marginBottom: 4,
  },
  manualSubText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 2,
  },
  manualMarker: {
    position: 'absolute', width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  broadcastOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'space-between',
  },
  replayBadge: {
    position: 'absolute', top: 60, left: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 4,
  },
  replayText: {
    color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2,
  },
  drsBadge: {
    position: 'absolute', top: 60, right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  drsText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5,
  },
  extractionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  extractionText: {
    color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 20,
  },
  extractionSubText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4,
  },
  manualShortcutBtn: {
    marginTop: 40,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  manualShortcutText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5,
  },
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
});
