import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { X, TrendingUp, Cpu, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'react-native-reanimated';
import { colors } from './theme';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── CAMERA ANGLES ──────────────────────────────
// Each "phase" is a distinct camera angle with its own background
type Phase =
  | 'processing'    // AI analysis overlay
  | 'pitching'      // Behind-bowler view: ball pitches
  | 'impact'        // Side-on view: ball hits pad
  | 'wickets'       // Front-on view: ball hits stumps
  | 'decision';     // Final OUT / NOT OUT

// ─── COMPONENT ──────────────────────────────────
export default function LbwDemo() {
  const [phase, setPhase] = useState<Phase>('processing');

  // DRS status data
  const drsStatus = {
    pitching: 'IN LINE',
    impact: 'IN LINE',
    wickets: 'HITTING',
    decision: 'OUT',
  };

  // ── Ball animation shared values ──
  const ballOpacity = useSharedValue(0);
  const ballX = useSharedValue(SW / 2);
  const ballY = useSharedValue(SH * 0.85);
  const ballScale = useSharedValue(1.6);
  const trailOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const scanProgress = useSharedValue(0);

  // ── Processing scan animation ──
  useEffect(() => {
    scanProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1, false
    );

    // Auto-start the DRS sequence after 3s
    const t = setTimeout(() => setPhase('pitching'), 3000);
    return () => clearTimeout(t);
  }, []);

  // ── Phase transition controller ──
  useEffect(() => {
    if (phase === 'pitching') startPitchingPhase();
    if (phase === 'impact') startImpactPhase();
    if (phase === 'wickets') startWicketsPhase();
  }, [phase]);

  // ═══════════════════════════════════════════════
  //  PHASE 1 — PITCHING (Behind-bowler camera)
  // ═══════════════════════════════════════════════
  const startPitchingPhase = () => {
    // Reset
    ballOpacity.value = 0;
    ballX.value = SW / 2;
    ballY.value = SH * 0.15; // Start from top (bowler's end)
    ballScale.value = 0.5;
    trailOpacity.value = 0;

    // Ball flies down the pitch
    ballOpacity.value = withTiming(1, { duration: 300 });
    trailOpacity.value = withDelay(200, withTiming(0.8, { duration: 400 }));

    ballY.value = withTiming(SH * 0.62, {
      duration: 1800,
      easing: Easing.bezier(0.2, 0, 0.4, 1),
    });

    // Perspective: ball gets bigger as it comes closer
    ballScale.value = withTiming(1.5, {
      duration: 1800,
      easing: Easing.bezier(0.2, 0, 0.4, 1),
    });

    // Impact flash when ball pitches
    glowPulse.value = withDelay(1800,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 })
      )
    );

    // Transition to next phase
    setTimeout(() => setPhase('impact'), 3200);
  };

  // ═══════════════════════════════════════════════
  //  PHASE 2 — IMPACT (Side-on camera)
  // ═══════════════════════════════════════════════
  const startImpactPhase = () => {
    ballOpacity.value = 0;
    ballX.value = SW * 0.35;
    ballY.value = SH * 0.55;
    ballScale.value = 1.2;
    trailOpacity.value = 0;
    glowPulse.value = 0;

    // Ball appears and moves to impact
    ballOpacity.value = withTiming(1, { duration: 200 });
    trailOpacity.value = withDelay(200, withTiming(0.6, { duration: 300 }));

    ballX.value = withTiming(SW * 0.52, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    ballY.value = withTiming(SH * 0.48, {
      duration: 1200,
      easing: Easing.out(Easing.quad),
    });

    // Impact glow
    glowPulse.value = withDelay(1200,
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0.3, { duration: 600 })
      )
    );

    // Transition
    setTimeout(() => setPhase('wickets'), 3000);
  };

  // ═══════════════════════════════════════════════
  //  PHASE 3 — WICKETS (Front-on camera)
  // ═══════════════════════════════════════════════
  const startWicketsPhase = () => {
    ballOpacity.value = 0;
    ballX.value = SW / 2;
    ballY.value = SH * 0.65;
    ballScale.value = 1.3;
    trailOpacity.value = 0;
    glowPulse.value = 0;

    // Ball moves toward stumps
    ballOpacity.value = withTiming(0.7, { duration: 200 }); // semi-transparent predicted path
    trailOpacity.value = withDelay(200, withTiming(0.5, { duration: 300 }));

    ballY.value = withTiming(SH * 0.42, {
      duration: 1400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    ballScale.value = withTiming(1, {
      duration: 1400,
      easing: Easing.out(Easing.quad),
    });

    // Red stump impact glow
    glowPulse.value = withDelay(1400,
      withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0.5, { duration: 200 }),
        withTiming(1, { duration: 100 }),
        withTiming(0.6, { duration: 800 })
      )
    );

    // Decision
    setTimeout(() => setPhase('decision'), 3500);
  };

  // ─── Restart ──
  const restart = useCallback(() => {
    setPhase('processing');
    ballOpacity.value = 0;
    trailOpacity.value = 0;
    glowPulse.value = 0;
    const t = setTimeout(() => setPhase('pitching'), 3000);
    return () => clearTimeout(t);
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

  const animScan = useAnimatedStyle(() => ({
    transform: [{ translateY: scanProgress.value * (SH * 0.4) }],
  }));

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  const getBgSource = () => {
    switch (phase) {
      case 'pitching': return require('../assets/images/lbw_pitching.png');
      case 'impact': return require('../assets/images/lbw_impact.png');
      case 'wickets':
      case 'decision': return require('../assets/images/lbw_wickets.png');
      default: return require('../assets/images/drs_bg.png');
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'pitching': return 'PITCHING';
      case 'impact': return 'IMPACT';
      case 'wickets': return 'WICKETS';
      default: return '';
    }
  };

  const getPhaseStatus = () => {
    switch (phase) {
      case 'pitching': return drsStatus.pitching;
      case 'impact': return drsStatus.impact;
      case 'wickets': return drsStatus.wickets;
      default: return '';
    }
  };

  const isTrackingPhase = phase === 'pitching' || phase === 'impact' || phase === 'wickets';
  const glowColor = phase === 'wickets' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.5)';
  const ballColor = phase === 'wickets' ? '#ef4444' : '#3b82f6';

  return (
    <View style={styles.container}>
      {/* ── Background Image (camera angle) ── */}
      <Image
        key={phase}
        source={getBgSource()}
        style={styles.bgImage}
        resizeMode="cover"
      />
      {/* Darken overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFill}
      />

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
              <Cpu size={44} color="#818cf8" />
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
        <View style={styles.headerDashboard}>
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'transparent']}
            style={styles.headerGrad}
          />
          <View style={styles.drsRow}>
            {/* Pitching */}
            <View style={[styles.drsBox, phase === 'pitching' && styles.drsBoxActive]}>
              <Text style={styles.drsBoxLabel}>PITCHING</Text>
              <Text style={[
                styles.drsBoxValue,
                { color: '#22c55e' }
              ]}>
                {drsStatus.pitching}
              </Text>
            </View>
            {/* Impact */}
            <View style={[styles.drsBox, phase === 'impact' && styles.drsBoxActive]}>
              <Text style={styles.drsBoxLabel}>IMPACT</Text>
              <Text style={[
                styles.drsBoxValue,
                (phase === 'impact' || phase === 'wickets') && { color: '#22c55e' }
              ]}>
                {phase === 'impact' || phase === 'wickets'
                  ? drsStatus.impact : '—'}
              </Text>
            </View>
            {/* Wickets */}
            <View style={[styles.drsBox, phase === 'wickets' && styles.drsBoxActive]}>
              <Text style={styles.drsBoxLabel}>WICKETS</Text>
              <Text style={[
                styles.drsBoxValue,
                phase === 'wickets' && { color: '#ef4444' }
              ]}>
                {phase === 'wickets' ? drsStatus.wickets : '—'}
              </Text>
            </View>
          </View>

          {/* Current Phase Label */}
          <View style={styles.phaseBadge}>
            <View style={[styles.phaseDot, { backgroundColor: ballColor }]} />
            <Text style={styles.phaseText}>{getPhaseLabel()}: {getPhaseStatus()}</Text>
          </View>
        </View>
      )}

      {/* ══════════ BALL + EFFECTS ══════════ */}
      {isTrackingPhase && (
        <>
          {/* Glow ring at impact point */}
          <Animated.View style={[styles.impactGlow, { backgroundColor: glowColor }, animGlow]} />

          {/* Trail dot */}
          <Animated.View style={[styles.trailDot, { backgroundColor: ballColor }, animTrail]} />

          {/* Main ball */}
          <Animated.View style={[styles.ball, { borderColor: ballColor, shadowColor: ballColor }, animBall]}>
            <View style={[styles.ballInner, { backgroundColor: phase === 'wickets' ? '#fee2e2' : '#dbeafe' }]} />
          </Animated.View>
        </>
      )}

      {/* ══════════ BOTTOM CONTROLS ══════════ */}
      <View style={styles.bottomBar}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.bottomGrad}
        />

        {/* Camera angle indicator */}
        {isTrackingPhase && (
          <View style={styles.cameraTag}>
            <Text style={styles.cameraTagText}>
              {phase === 'pitching' ? '📹 BEHIND BOWLER' :
                phase === 'impact' ? '📹 SIDE ON' : '📹 FRONT ON'}
            </Text>
          </View>
        )}
      </View>

      {/* ══════════ DECISION PANEL ══════════ */}
      {phase === 'decision' && (
        <View style={styles.decisionOverlay}>
          <LinearGradient
            colors={['rgba(15,23,42,0.5)', 'rgba(15,23,42,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.decisionContent}>
            {/* DRS Summary Row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>PITCHING</Text>
                <View style={[styles.summaryPill, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e' }]}>
                  <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{drsStatus.pitching}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>IMPACT</Text>
                <View style={[styles.summaryPill, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e' }]}>
                  <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{drsStatus.impact}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>WICKETS</Text>
                <View style={[styles.summaryPill, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }]}>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{drsStatus.wickets}</Text>
                </View>
              </View>
            </View>

            {/* Big Decision */}
            <Text style={styles.decisionLabel}>UMPIRE'S CALL</Text>
            <Text style={styles.decisionValue}>OUT</Text>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.replayBtn} onPress={restart}>
                <RotateCcw size={18} color="#fff" />
                <Text style={styles.replayText}>REPLAY</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneText}>DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Close button ── */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <X size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 15,
    elevation: 10,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 30,
  },
  ballInner: {
    width: 14, height: 14, borderRadius: 7,
  },
  trailDot: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    opacity: 0.5, zIndex: 25,
  },
  impactGlow: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    zIndex: 15,
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
    justifyContent: 'flex-end', zIndex: 50,
  },
  decisionContent: {
    padding: 28,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryRow: {
    flexDirection: 'row', gap: 8, marginBottom: 28,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 9,
    fontWeight: '800', letterSpacing: 1.5, marginBottom: 6,
  },
  summaryPill: {
    width: '100%', paddingVertical: 6,
    borderRadius: 6, alignItems: 'center',
    borderWidth: 1,
  },
  summaryValue: { fontSize: 11, fontWeight: '900' },
  decisionLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    fontWeight: '800', letterSpacing: 4,
    textAlign: 'center', marginBottom: 4,
  },
  decisionValue: {
    color: '#ef4444', fontSize: 56, fontWeight: '900',
    fontStyle: 'italic', textAlign: 'center', marginBottom: 28,
    textShadowColor: 'rgba(239,68,68,0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  actionRow: { flexDirection: 'row', gap: 12 },
  replayBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  replayText: {
    color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1,
  },
  doneBtn: {
    flex: 2, backgroundColor: '#7C3AED',
    paddingVertical: 16, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: {
    color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1,
  },

  // ── Close ──
  closeBtn: {
    position: 'absolute', top: 52, right: 18,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 200,
  },
});
