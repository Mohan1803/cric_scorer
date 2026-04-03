import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Platform, Alert, Image, Pressable, FlatList, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import {
  X, RotateCcw, Save, ChevronRight, ChevronLeft,
  Target, Crosshair, Eye, Cpu, Check, Circle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as MediaLibrary from 'expo-media-library';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from './theme';

const { width: SW, height: SH } = Dimensions.get('window');

type Point = { x: number; y: number };

// ─── Frame data ─────────────────────────────────
type FrameData = {
  uri: string;
  timestamp: number; // ms
};

// ─── Stump zone definition (center of screen) ───
const STUMP_ZONE = {
  left: SW * 0.38,
  right: SW * 0.62,
  top: SH * 0.30,
  bottom: SH * 0.55,
};

// ─── Marking steps ──────────────────────────────
const MARKING_STEPS = [
  {
    key: 'release',
    title: 'RELEASE POINT',
    desc: 'Scrub to find when the bowler releases the ball, then tap the ball',
    icon: Circle,
    color: '#a78bfa',
  },
  {
    key: 'pitch',
    title: 'PITCHING POINT',
    desc: 'Scrub to where the ball pitches on the surface, then tap it',
    icon: Target,
    color: '#3b82f6',
  },
  {
    key: 'impact',
    title: 'IMPACT POINT',
    desc: 'Scrub to where the ball hits the pad, then tap it',
    icon: Crosshair,
    color: '#f59e0b',
  },
];

// ═══════════════════════════════════════════════════
//  BEZIER INTERPOLATION HELPERS
// ═══════════════════════════════════════════════════
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

function projectBeyondImpact(
  pitch: Point, impact: Point, factor = 0.65
): Point {
  return {
    x: impact.x + (impact.x - pitch.x) * factor,
    y: impact.y + (impact.y - pitch.y) * 0.4,
  };
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function LbwTracking() {
  const { videoUri } = useLocalSearchParams<{ videoUri: string }>();
  const videoRef = useRef<Video>(null);

  // ── Frame extraction ──
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [extracting, setExtracting] = useState(true);
  const [extractProgress, setExtractProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Current frame & scrubbing ──
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const filmstripRef = useRef<FlatList>(null);

  // ── Marking flow ──
  const [markingStep, setMarkingStep] = useState(0); // 0=release, 1=pitch, 2=impact
  const [markedPoints, setMarkedPoints] = useState<(Point | null)[]>([null, null, null]);
  const [markedFrameIdx, setMarkedFrameIdx] = useState<(number | null)[]>([null, null, null]);

  // ── Step flow ──
  type FlowStep = 'extracting' | 'marking' | 'analyzing' | 'pitching' | 'impact' | 'wickets' | 'decision';
  const [step, setStep] = useState<FlowStep>('extracting');

  // ── DRS result ──
  const [drsResult, setDrsResult] = useState({
    pitching: '', impact: '', wickets: '', decision: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // ── Animation values ──
  const ballOpacity = useSharedValue(0);
  const ballX = useSharedValue(SW / 2);
  const ballY = useSharedValue(SH * 0.85);
  const ballScale = useSharedValue(1.5);
  const glowPulse = useSharedValue(0);
  const scanProgress = useSharedValue(0);
  const trajectoryOpacity = useSharedValue(0);

  const isDemo = !videoUri || videoUri === 'demo';

  // ═══════════════════════════════════════════════
  //  FRAME EXTRACTION
  // ═══════════════════════════════════════════════
  useEffect(() => {
    extractFrames();
  }, []);

  const extractFrames = async () => {
    setStep('extracting');
    setExtracting(true);

    if (isDemo) {
      // For demo mode: simulate frame extraction
      await new Promise(r => setTimeout(r, 1500));
      const demoFrames: FrameData[] = Array.from({ length: 30 }, (_, i) => ({
        uri: '', // empty for demo
        timestamp: i * 100,
      }));
      setFrames(demoFrames);
      setVideoDuration(3000);
      setExtracting(false);
      setStep('marking');
      return;
    }

    try {
      // First, get video duration by loading a status
      const statusUpdate = (s: AVPlaybackStatus) => {
        if (s.isLoaded && s.durationMillis) {
          setVideoDuration(s.durationMillis);
        }
      };

      // Load the video to get duration
      if (videoRef.current) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setVideoDuration(status.durationMillis);
          await extractFramesFromDuration(status.durationMillis);
        } else {
          // Wait a bit and retry
          await new Promise(r => setTimeout(r, 1000));
          const retryStatus = await videoRef.current.getStatusAsync();
          if (retryStatus.isLoaded && retryStatus.durationMillis) {
            setVideoDuration(retryStatus.durationMillis);
            await extractFramesFromDuration(retryStatus.durationMillis);
          } else {
            // Fallback: assume 5 seconds
            setVideoDuration(5000);
            await extractFramesFromDuration(5000);
          }
        }
      }
    } catch (err) {
      console.error('Frame extraction error:', err);
      // Fallback
      setVideoDuration(5000);
      await extractFramesFromDuration(5000);
    }
  };

  const extractFramesFromDuration = async (duration: number) => {
    const FRAME_COUNT = 30;
    const interval = Math.max(duration / FRAME_COUNT, 50);
    const extracted: FrameData[] = [];

    for (let i = 0; i < FRAME_COUNT; i++) {
      const time = Math.floor(i * interval);
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.5,
        });
        extracted.push({ uri: thumb.uri, timestamp: time });
      } catch (e) {
        // Skip failed frames
        console.warn(`Frame ${i} failed:`, e);
      }
      setExtractProgress((i + 1) / FRAME_COUNT);
    }

    setFrames(extracted);
    setExtracting(false);
    setStep('marking');
  };

  // ═══════════════════════════════════════════════
  //  VIDEO SEEKING (when user scrubs filmstrip)
  // ═══════════════════════════════════════════════
  const seekToFrame = useCallback(async (idx: number) => {
    setCurrentFrameIdx(idx);
    if (!isDemo && videoRef.current && frames[idx]) {
      try {
        await videoRef.current.setPositionAsync(frames[idx].timestamp);
      } catch (e) { /* ignore seek errors */ }
    }
  }, [frames, isDemo]);

  // ═══════════════════════════════════════════════
  //  TAP TO MARK BALL POSITION
  // ═══════════════════════════════════════════════
  const handleVideoTap = (evt: any) => {
    if (step !== 'marking') return;
    if (markingStep >= 3) return;

    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;

    const newPoints = [...markedPoints];
    newPoints[markingStep] = { x, y };
    setMarkedPoints(newPoints);

    const newFrameIdx = [...markedFrameIdx];
    newFrameIdx[markingStep] = currentFrameIdx;
    setMarkedFrameIdx(newFrameIdx);

    if (markingStep < 2) {
      setMarkingStep(markingStep + 1);
    } else {
      // All 3 points marked! Compute trajectory
      videoRef.current?.pauseAsync();
      computeDecision(newPoints as Point[]);
    }
  };

  // ═══════════════════════════════════════════════
  //  COMPUTE DRS DECISION FROM 3 POINTS
  // ═══════════════════════════════════════════════
  const computeDecision = (pts: Point[]) => {
    const [releasePt, pitchPt, impactPt] = pts;

    // Pitching: Is pitch point within stump line (left-right)?
    const pitchInLine =
      pitchPt.x >= STUMP_ZONE.left && pitchPt.x <= STUMP_ZONE.right;

    // Impact: Is it within stump line?
    const impactInLine =
      impactPt.x >= STUMP_ZONE.left && impactPt.x <= STUMP_ZONE.right;

    // Project trajectory beyond impact to predict wicket hit
    const projected = projectBeyondImpact(pitchPt, impactPt);
    const hittingWickets =
      projected.x >= STUMP_ZONE.left - 15 &&
      projected.x <= STUMP_ZONE.right + 15 &&
      projected.y <= STUMP_ZONE.bottom + 20;

    const isOut = pitchInLine && impactInLine && hittingWickets;

    setDrsResult({
      pitching: pitchInLine ? 'IN LINE' : 'OUTSIDE',
      impact: impactInLine ? 'IN LINE' : 'OUTSIDE',
      wickets: hittingWickets ? 'HITTING' : 'MISSING',
      decision: isOut ? 'OUT' : 'NOT OUT',
    });

    // Start DRS animation
    setStep('analyzing');
    beginAnalysisPhase();
  };

  // ═══════════════════════════════════════════════
  //  DRS ANIMATION SEQUENCE
  // ═══════════════════════════════════════════════
  const beginAnalysisPhase = () => {
    scanProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ), -1, false
    );
    setTimeout(() => {
      setStep('pitching');
      startPitchingAnimation();
    }, 2500);
  };

  const startPitchingAnimation = () => {
    const pts = markedPoints as Point[];
    if (!pts[0] || !pts[1]) return;

    ballOpacity.value = 0;
    ballX.value = pts[0].x; // Start from release point
    ballY.value = pts[0].y;
    ballScale.value = 0.6;
    glowPulse.value = 0;
    trajectoryOpacity.value = 0;

    // Ball flies from release to pitch point
    ballOpacity.value = withTiming(1, { duration: 200 });
    trajectoryOpacity.value = withDelay(300, withTiming(0.7, { duration: 500 }));

    ballX.value = withTiming(pts[1].x, {
      duration: 1500, easing: Easing.bezier(0.2, 0, 0.4, 1),
    });
    ballY.value = withTiming(pts[1].y, {
      duration: 1500, easing: Easing.bezier(0.2, 0, 0.4, 1),
    });
    ballScale.value = withTiming(1.3, { duration: 1500 });

    // Flash at pitch point
    glowPulse.value = withDelay(1500,
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400 })
      )
    );

    setTimeout(() => {
      setStep('impact');
      startImpactAnimation();
    }, 2800);
  };

  const startImpactAnimation = () => {
    const pts = markedPoints as Point[];
    if (!pts[2]) return;

    glowPulse.value = 0;

    // Ball moves from pitch to impact
    ballX.value = withTiming(pts[2].x, {
      duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    ballY.value = withTiming(pts[2].y, {
      duration: 1200, easing: Easing.out(Easing.quad),
    });
    ballScale.value = withTiming(1.5, { duration: 1200 });

    // Impact glow
    glowPulse.value = withDelay(1200,
      withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0.3, { duration: 500 })
      )
    );

    setTimeout(() => {
      setStep('wickets');
      startWicketsAnimation();
    }, 2500);
  };

  const startWicketsAnimation = () => {
    const pts = markedPoints as Point[];
    if (!pts[1] || !pts[2]) return;

    const projected = projectBeyondImpact(pts[1], pts[2]);

    glowPulse.value = 0;
    ballOpacity.value = withTiming(0.6, { duration: 200 }); // translucent = predicted

    ballX.value = withTiming(projected.x, {
      duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    ballY.value = withTiming(projected.y, {
      duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    ballScale.value = withTiming(1, { duration: 1400 });

    if (drsResult.wickets === 'HITTING') {
      glowPulse.value = withDelay(1400,
        withSequence(
          withTiming(1, { duration: 50 }),
          withTiming(0.5, { duration: 150 }),
          withTiming(1, { duration: 80 }),
          withTiming(0.6, { duration: 600 })
        )
      );
    }

    setTimeout(() => setStep('decision'), 3000);
  };

  // ── Reset ──
  const resetAll = useCallback(() => {
    setMarkedPoints([null, null, null]);
    setMarkedFrameIdx([null, null, null]);
    setMarkingStep(0);
    setStep('marking');
    setCurrentFrameIdx(0);
    ballOpacity.value = 0;
    glowPulse.value = 0;
    trajectoryOpacity.value = 0;
    videoRef.current?.setPositionAsync(0);
    videoRef.current?.playAsync();
  }, []);

  // ── Undo last mark ──
  const undoLastMark = useCallback(() => {
    if (markingStep === 0) return;
    const newStep = markingStep - 1;
    const newPoints = [...markedPoints];
    newPoints[newStep] = null;
    setMarkedPoints(newPoints);
    const newFrameIdxs = [...markedFrameIdx];
    newFrameIdxs[newStep] = null;
    setMarkedFrameIdx(newFrameIdxs);
    setMarkingStep(newStep);
  }, [markingStep, markedPoints, markedFrameIdx]);

  // ── Save video ──
  const handleSave = async () => {
    if (!videoUri || videoUri === 'demo') return;
    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Gallery access needed.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(videoUri);
      Alert.alert('Saved', 'Delivery video saved to gallery!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save video.');
    } finally {
      setIsSaving(false);
    }
  };

  // ═══════════════════════════════════════════════
  //  TRAJECTORY POINTS (for drawing the path)
  // ═══════════════════════════════════════════════
  const trajectoryPoints = useMemo(() => {
    const pts = markedPoints as (Point | null)[];
    if (!pts[0] || !pts[1] || !pts[2]) return [];
    return generateTrajectoryPoints(pts[0], pts[1], pts[2], 40);
  }, [markedPoints]);

  const projectedPoint = useMemo(() => {
    const pts = markedPoints as (Point | null)[];
    if (!pts[1] || !pts[2]) return null;
    return projectBeyondImpact(pts[1], pts[2]);
  }, [markedPoints]);

  // ═══════════════════════════════════════════════
  //  ANIMATED STYLES
  // ═══════════════════════════════════════════════
  const isTracking = ['pitching', 'impact', 'wickets'].includes(step);
  const ballColor = step === 'wickets'
    ? (drsResult.wickets === 'HITTING' ? '#ef4444' : '#3b82f6')
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

  // ═══════════════════════════════════════════════
  //  RENDER HELPERS
  // ═══════════════════════════════════════════════
  const renderFrameThumb = useCallback(({ item, index }: { item: FrameData; index: number }) => {
    const isActive = index === currentFrameIdx;
    const isMarked = markedFrameIdx.includes(index);
    const markIdx = markedFrameIdx.indexOf(index);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => seekToFrame(index)}
        style={[
          styles.frameThumb,
          isActive && styles.frameThumbActive,
          isMarked && styles.frameThumbMarked,
        ]}
      >
        {item.uri ? (
          <Image source={{ uri: item.uri }} style={styles.frameImage} resizeMode="cover" />
        ) : (
          <View style={styles.framePlaceholder}>
            <Text style={styles.framePlaceholderText}>{index + 1}</Text>
          </View>
        )}
        {isMarked && (
          <View style={[styles.frameMarkBadge, {
            backgroundColor: MARKING_STEPS[markIdx]?.color || '#fff',
          }]}>
            <Check size={8} color="#fff" />
          </View>
        )}
        {isActive && <View style={styles.frameActiveLine} />}
      </TouchableOpacity>
    );
  }, [currentFrameIdx, markedFrameIdx, seekToFrame]);

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════

  return (
    <View style={styles.container}>
      {/* ── Video / Demo Background ── */}
      {!isDemo ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoTap}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: videoUri }}
            useNativeControls={false}
            resizeMode={ResizeMode.COVER}
            isLooping={step === 'marking'}
            shouldPlay={false}
            onPlaybackStatusUpdate={s => {
              if (s.isLoaded && s.durationMillis && videoDuration === 0) {
                setVideoDuration(s.durationMillis);
              }
            }}
          />
        </Pressable>
      ) : (
        <Pressable style={[styles.video, styles.demoBackground]} onPress={handleVideoTap}>
          <Image
            source={require('../assets/images/drs_bg.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFill}
          />
        </Pressable>
      )}

      {/* ══════════ EXTRACTION LOADING ══════════ */}
      {step === 'extracting' && (
        <View style={styles.extractingOverlay}>
          <LinearGradient
            colors={['rgba(11,14,20,0.97)', 'rgba(11,14,20,0.99)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.extractingContent}>
            <View style={styles.extractingIconWrap}>
              <Cpu size={44} color="#818cf8" />
            </View>
            <Text style={styles.extractingTitle}>EXTRACTING FRAMES</Text>
            <Text style={styles.extractingSub}>
              Analyzing video footage...
            </Text>
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${extractProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(extractProgress * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* ══════════ MARKED POINT INDICATORS ══════════ */}
      {step === 'marking' && markedPoints.map((pt, idx) => {
        if (!pt) return null;
        return (
          <View key={idx} style={[styles.marker, { left: pt.x - 18, top: pt.y - 18 }]}>
            <View style={[styles.markerInner, {
              backgroundColor: `${MARKING_STEPS[idx].color}30`,
              borderColor: `${MARKING_STEPS[idx].color}60`,
            }]}>
              <View style={[styles.markerDot, {
                backgroundColor: MARKING_STEPS[idx].color,
              }]} />
            </View>
            <Text style={[styles.markerLabel, { color: MARKING_STEPS[idx].color }]}>
              {MARKING_STEPS[idx].key.toUpperCase()}
            </Text>
          </View>
        );
      })}

      {/* ── Trajectory path (drawn after all 3 points) ── */}
      {step === 'marking' && trajectoryPoints.length > 0 && (
        <>
          {trajectoryPoints.map((pt, idx) => {
            if (idx === 0) return null;
            return (
              <View
                key={`traj-${idx}`}
                style={[styles.trajectoryDot, {
                  left: pt.x - 2,
                  top: pt.y - 2,
                  opacity: 0.3 + (idx / trajectoryPoints.length) * 0.5,
                  backgroundColor: '#3b82f6',
                }]}
              />
            );
          })}
          {/* Projected path to stumps */}
          {projectedPoint && markedPoints[2] && (
            <>
              {Array.from({ length: 10 }, (_, i) => {
                const t = (i + 1) / 11;
                const ix = markedPoints[2]!.x + (projectedPoint.x - markedPoints[2]!.x) * t;
                const iy = markedPoints[2]!.y + (projectedPoint.y - markedPoints[2]!.y) * t;
                return (
                  <View
                    key={`proj-${i}`}
                    style={[styles.trajectoryDot, {
                      left: ix - 2,
                      top: iy - 2,
                      opacity: 0.5 - (i * 0.04),
                      backgroundColor: '#ef4444',
                      width: 3,
                      height: 3,
                      borderRadius: 1.5,
                    }]}
                  />
                );
              })}
            </>
          )}
        </>
      )}

      {/* ── Stump zone indicator (during marking) ── */}
      {step === 'marking' && (
        <View style={[styles.stumpZone, {
          left: STUMP_ZONE.left,
          top: STUMP_ZONE.top,
          width: STUMP_ZONE.right - STUMP_ZONE.left,
          height: STUMP_ZONE.bottom - STUMP_ZONE.top,
        }]}>
          <Text style={styles.stumpZoneLabel}>STUMP LINE</Text>
        </View>
      )}

      {/* ══════════ MARKING UI (Header Card) ══════════ */}
      {step === 'marking' && markingStep < 3 && (
        <View style={styles.markingHeader}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.4)', 'transparent']}
            style={styles.markingHeaderGrad}
          />
          <View style={styles.markingCard}>
            <View style={styles.markingCardTop}>
              <View style={styles.markingIconRow}>
                {React.createElement(MARKING_STEPS[markingStep].icon, {
                  size: 20,
                  color: MARKING_STEPS[markingStep].color,
                })}
                <Text style={[styles.markingStepTitle, { color: MARKING_STEPS[markingStep].color }]}>
                  {MARKING_STEPS[markingStep].title}
                </Text>
              </View>
              <View style={styles.stepCounter}>
                <Text style={styles.stepCounterText}>{markingStep + 1}/3</Text>
              </View>
            </View>
            <Text style={styles.markingDesc}>
              {MARKING_STEPS[markingStep].desc}
            </Text>

            {/* Step indicator dots */}
            <View style={styles.stepDots}>
              {MARKING_STEPS.map((s, idx) => (
                <View key={idx} style={[
                  styles.stepDot,
                  idx < markingStep && { backgroundColor: s.color },
                  idx === markingStep && { backgroundColor: s.color, width: 20 },
                  idx > markingStep && { backgroundColor: 'rgba(255,255,255,0.15)' },
                ]} />
              ))}
            </View>
          </View>

          {/* Undo button */}
          {markingStep > 0 && (
            <TouchableOpacity style={styles.undoBtn} onPress={undoLastMark}>
              <RotateCcw size={14} color="#fff" />
              <Text style={styles.undoBtnText}>UNDO</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ══════════ FILMSTRIP SCRUBBER ══════════ */}
      {step === 'marking' && frames.length > 0 && (
        <View style={styles.filmstripContainer}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.95)']}
            style={styles.filmstripGrad}
          />
          <View style={styles.filmstripInner}>
            {/* Time indicator */}
            <View style={styles.timeIndicator}>
              <Text style={styles.timeText}>
                {frames[currentFrameIdx]
                  ? `${(frames[currentFrameIdx].timestamp / 1000).toFixed(1)}s`
                  : '0.0s'}
              </Text>
              <Text style={styles.frameCountText}>
                Frame {currentFrameIdx + 1}/{frames.length}
              </Text>
            </View>

            {/* Filmstrip */}
            <FlatList
              ref={filmstripRef}
              data={frames}
              renderItem={renderFrameThumb}
              keyExtractor={(_, i) => `frame-${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filmstripList}
              getItemLayout={(_, idx) => ({ length: 52, offset: 52 * idx, index: idx })}
            />

            {/* Scrub buttons */}
            <View style={styles.scrubRow}>
              <TouchableOpacity
                style={styles.scrubBtn}
                onPress={() => seekToFrame(Math.max(0, currentFrameIdx - 1))}
                disabled={currentFrameIdx === 0}
              >
                <ChevronLeft size={18} color={currentFrameIdx === 0 ? 'rgba(255,255,255,0.2)' : '#fff'} />
              </TouchableOpacity>
              <Text style={styles.scrubLabel}>SCRUB FRAMES</Text>
              <TouchableOpacity
                style={styles.scrubBtn}
                onPress={() => seekToFrame(Math.min(frames.length - 1, currentFrameIdx + 1))}
                disabled={currentFrameIdx === frames.length - 1}
              >
                <ChevronRight
                  size={18}
                  color={currentFrameIdx === frames.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ══════════ ANALYZING OVERLAY ══════════ */}
      {step === 'analyzing' && (
        <View style={styles.analyzingOverlay}>
          <LinearGradient
            colors={['rgba(15,23,42,0.95)', 'rgba(15,23,42,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.analyzingContent}>
            <View style={styles.scanArea}>
              <Animated.View style={[styles.scanLine, animScan]} />
            </View>
            <View style={styles.analyzingIcon}>
              <Cpu size={40} color="#818cf8" />
            </View>
            <Text style={styles.analyzingTitle}>TRACKING BALL</Text>
            <Text style={styles.analyzingSub}>
              Computing trajectory prediction...
            </Text>
            <View style={styles.analysisDataList}>
              <Text style={styles.analysisDataItem}>▸ Release → Pitch: analyzing</Text>
              <Text style={styles.analysisDataItem}>▸ Pitch → Impact: computing</Text>
              <Text style={styles.analysisDataItem}>▸ Impact → Stumps: projecting</Text>
            </View>
          </View>
        </View>
      )}

      {/* ══════════ DRS DASHBOARD (during tracking phases) ══════════ */}
      {isTracking && (
        <View style={styles.drsHeader}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'transparent']}
            style={styles.drsHeaderGrad}
          />
          <View style={styles.drsRow}>
            <View style={[styles.drsBox, step === 'pitching' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>PITCHING</Text>
              <Text style={[styles.drsValue,
                drsResult.pitching === 'IN LINE' ? { color: '#22c55e' } : { color: '#ef4444' }
              ]}>
                {['pitching', 'impact', 'wickets'].includes(step) ? drsResult.pitching : '—'}
              </Text>
            </View>
            <View style={[styles.drsBox, step === 'impact' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>IMPACT</Text>
              <Text style={[styles.drsValue,
                drsResult.impact === 'IN LINE' ? { color: '#22c55e' } : { color: '#ef4444' }
              ]}>
                {['impact', 'wickets'].includes(step) ? drsResult.impact : '—'}
              </Text>
            </View>
            <View style={[styles.drsBox, step === 'wickets' && styles.drsBoxActive]}>
              <Text style={styles.drsLabel}>WICKETS</Text>
              <Text style={[styles.drsValue,
                drsResult.wickets === 'HITTING' ? { color: '#ef4444' } : { color: '#22c55e' }
              ]}>
                {step === 'wickets' ? drsResult.wickets : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.phaseBadge}>
            <View style={[styles.phaseDot, { backgroundColor: ballColor }]} />
            <Text style={styles.phaseText}>
              {step === 'pitching' ? 'PITCHING' : step === 'impact' ? 'IMPACT' : 'WICKETS'}
            </Text>
          </View>
        </View>
      )}

      {/* ══════════ TRAJECTORY OVERLAY (during tracking) ══════════ */}
      {isTracking && trajectoryPoints.length > 0 && (
        <>
          {trajectoryPoints.map((pt, idx) => {
            if (idx === 0 || idx % 2 !== 0) return null;
            return (
              <View
                key={`track-traj-${idx}`}
                style={[styles.trajectoryDot, {
                  left: pt.x - 2.5,
                  top: pt.y - 2.5,
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  opacity: 0.4,
                  backgroundColor: '#3b82f6',
                }]}
              />
            );
          })}
          {/* Projected path dots */}
          {projectedPoint && markedPoints[2] && (
            <>
              {Array.from({ length: 8 }, (_, i) => {
                const t = (i + 1) / 9;
                const ix = markedPoints[2]!.x + (projectedPoint.x - markedPoints[2]!.x) * t;
                const iy = markedPoints[2]!.y + (projectedPoint.y - markedPoints[2]!.y) * t;
                return (
                  <View
                    key={`track-proj-${i}`}
                    style={[styles.trajectoryDot, {
                      left: ix - 2,
                      top: iy - 2,
                      opacity: 0.3,
                      backgroundColor: '#ef4444',
                    }]}
                  />
                );
              })}
            </>
          )}
        </>
      )}

      {/* ══════════ BALL + EFFECTS ══════════ */}
      {isTracking && (
        <>
          <Animated.View style={[
            styles.impactGlow,
            { backgroundColor: step === 'wickets' ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.3)' },
            animGlow,
          ]} />
          <Animated.View style={[
            styles.ball,
            { borderColor: ballColor, shadowColor: ballColor },
            animBall,
          ]}>
            <View style={[styles.ballInner, {
              backgroundColor: step === 'wickets' && drsResult.wickets === 'HITTING'
                ? '#fee2e2' : '#dbeafe'
            }]} />
          </Animated.View>
        </>
      )}

      {/* ══════════ DECISION PANEL ══════════ */}
      {step === 'decision' && (
        <View style={styles.decisionOverlay}>
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(15,23,42,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.decisionContent}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>PITCHING</Text>
                <View style={[styles.summaryPill, {
                  borderColor: drsResult.pitching === 'IN LINE' ? '#22c55e' : '#ef4444',
                  backgroundColor: drsResult.pitching === 'IN LINE'
                    ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                }]}>
                  <Text style={[styles.summaryValue, {
                    color: drsResult.pitching === 'IN LINE' ? '#22c55e' : '#ef4444'
                  }]}>{drsResult.pitching}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>IMPACT</Text>
                <View style={[styles.summaryPill, {
                  borderColor: drsResult.impact === 'IN LINE' ? '#22c55e' : '#ef4444',
                  backgroundColor: drsResult.impact === 'IN LINE'
                    ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                }]}>
                  <Text style={[styles.summaryValue, {
                    color: drsResult.impact === 'IN LINE' ? '#22c55e' : '#ef4444'
                  }]}>{drsResult.impact}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>WICKETS</Text>
                <View style={[styles.summaryPill, {
                  borderColor: drsResult.wickets === 'HITTING' ? '#ef4444' : '#22c55e',
                  backgroundColor: drsResult.wickets === 'HITTING'
                    ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                }]}>
                  <Text style={[styles.summaryValue, {
                    color: drsResult.wickets === 'HITTING' ? '#ef4444' : '#22c55e'
                  }]}>{drsResult.wickets}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.decisionLabel}>UMPIRE'S CALL</Text>
            <Text style={[styles.decisionValue, {
              color: drsResult.decision === 'OUT' ? '#ef4444' : '#22c55e',
              textShadowColor: drsResult.decision === 'OUT'
                ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)',
            }]}>
              {drsResult.decision}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.replayBtn} onPress={resetAll}>
                <RotateCcw size={16} color="#fff" />
                <Text style={styles.replayText}>RETRY</Text>
              </TouchableOpacity>
              {!isDemo && (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Save size={16} color="#fff" />
                  <Text style={styles.saveText}>{isSaving ? 'SAVING...' : 'SAVE'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneText}>DONE</Text>
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

  // ── Extraction loading ──
  extractingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  extractingContent: { alignItems: 'center', padding: 40, width: '80%' },
  extractingIconWrap: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(99,102,241,0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  extractingTitle: {
    color: '#fff', fontSize: 20, fontWeight: '900',
    letterSpacing: 5, marginBottom: 8,
  },
  extractingSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 13,
    fontWeight: '500', marginBottom: 32,
  },
  progressBar: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 12,
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    backgroundColor: '#818cf8',
  },
  progressText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    fontWeight: '700', letterSpacing: 1,
  },

  // ── Marking Header ──
  markingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 16, zIndex: 30,
  },
  markingHeaderGrad: {
    ...StyleSheet.absoluteFillObject, height: 240,
  },
  markingCard: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  markingCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  markingIconRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  markingStepTitle: {
    fontSize: 16, fontWeight: '900', letterSpacing: 2,
  },
  stepCounter: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  stepCounterText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700',
  },
  markingDesc: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    fontWeight: '500', marginBottom: 12, lineHeight: 18,
  },
  stepDots: {
    flexDirection: 'row', gap: 6, alignSelf: 'center',
  },
  stepDot: {
    height: 4, width: 12, borderRadius: 2,
  },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  undoBtnText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1,
  },

  // ── Stump zone ──
  stumpZone: {
    position: 'absolute', borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.2)', borderStyle: 'dashed',
    borderRadius: 4, justifyContent: 'flex-end', alignItems: 'center',
    paddingBottom: 4,
  },
  stumpZoneLabel: {
    color: 'rgba(239,68,68,0.35)', fontSize: 8,
    fontWeight: '800', letterSpacing: 2,
  },

  // ── Markers ──
  marker: {
    position: 'absolute', alignItems: 'center', zIndex: 25,
  },
  markerInner: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  markerDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  markerLabel: {
    fontSize: 8, fontWeight: '900',
    letterSpacing: 1.5, marginTop: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },

  // ── Trajectory dots ──
  trajectoryDot: {
    position: 'absolute', width: 4, height: 4,
    borderRadius: 2, zIndex: 20,
  },

  // ── Filmstrip ──
  filmstripContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    zIndex: 30,
  },
  filmstripGrad: {
    ...StyleSheet.absoluteFillObject, height: 200,
    bottom: 0,
  },
  filmstripInner: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 12,
  },
  timeIndicator: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
    paddingHorizontal: 4,
  },
  timeText: {
    color: '#818cf8', fontSize: 14, fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  frameCountText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600',
  },
  filmstripList: {
    gap: 4, paddingVertical: 4,
  },
  frameThumb: {
    width: 48, height: 36, borderRadius: 6,
    overflow: 'hidden', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  frameThumbActive: {
    borderColor: '#818cf8', borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  frameThumbMarked: {
    borderColor: '#22c55e',
  },
  frameImage: {
    width: '100%', height: '100%',
  },
  framePlaceholder: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center', alignItems: 'center',
  },
  framePlaceholderText: {
    color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '700',
  },
  frameMarkBadge: {
    position: 'absolute', top: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  frameActiveLine: {
    position: 'absolute', bottom: -4, left: '25%', right: '25%',
    height: 2, backgroundColor: '#818cf8', borderRadius: 1,
  },
  scrubRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginTop: 10,
  },
  scrubBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scrubLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10,
    fontWeight: '700', letterSpacing: 2,
  },

  // ── Analyzing ──
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  analyzingContent: { alignItems: 'center', padding: 40 },
  scanArea: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden', opacity: 0.15,
  },
  scanLine: {
    width: '100%', height: 3, backgroundColor: '#818cf8',
    shadowColor: '#818cf8', shadowOpacity: 1, shadowRadius: 12,
    position: 'absolute', top: '30%',
  },
  analyzingIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(99,102,241,0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  analyzingTitle: {
    color: '#fff', fontSize: 20, fontWeight: '900',
    letterSpacing: 5, marginBottom: 8,
  },
  analyzingSub: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    fontWeight: '500', marginBottom: 24,
  },
  analysisDataList: { gap: 8, alignItems: 'flex-start' },
  analysisDataItem: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },

  // ── DRS Header ──
  drsHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 55, paddingHorizontal: 14, zIndex: 20,
  },
  drsHeaderGrad: { ...StyleSheet.absoluteFillObject, height: 200 },
  drsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
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
