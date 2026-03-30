import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import { X, Play, RotateCcw, Check, ChevronRight, Info, Save, Cpu, Layers, CheckCircle2, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { colors } from './theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Point = { x: number; y: number };

export default function LbwTracking() {
  const { videoUri } = useLocalSearchParams<{ videoUri: string }>();
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const videoRef = useRef<Video>(null);
  
  const [step, setStep] = useState<'calibrate' | 'processing' | 'tracking' | 'decision'>('calibrate');
  const [points, setPoints] = useState<Point[]>([]);
  const [currentCalibrationStep, setCurrentCalibrationStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0: None, 1: Pitching, 2: Impact, 3: Wickets
  
  const calibrationLabels = [
    'Tap where the ball PITCHED',
    'Tap where the ball hit PIN (IMPACT)',
    'Tap where the ball would hit WICKETS',
  ];

  // Animation values
  const ballOpacity = useSharedValue(0);
  const ballX = useSharedValue(0);
  const ballY = useSharedValue(0);
  const ballScale = useSharedValue(1);
  const pathProgress = useSharedValue(0);
  const scanLineY = useSharedValue(0);
  
  const [drsStatus, setDrsStatus] = useState({
    pitching: '',
    impact: '',
    wickets: '',
    decision: ''
  });

  const handleTouch = (event: any) => {
    if (step !== 'calibrate') return;
    
    const { locationX, locationY } = event.nativeEvent;
    const newPoint = { x: locationX, y: locationY };
    
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    
    if (currentCalibrationStep < 2) {
      setCurrentCalibrationStep(currentCalibrationStep + 1);
    } else {
      setStep('processing');
      scanLineY.value = withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
        withTiming(1, { duration: 500 })
      );
      // Simulate trajectory calculation
      setTimeout(() => {
        setStep('tracking');
        processDecision(newPoints);
      }, 2500);
    }
  };

  const processDecision = (p: Point[]) => {
    // Realistic DRS logic simulation
    // 1. Pitching detection
    const isPitchingInLine = Math.abs(p[0].x - SCREEN_WIDTH / 2) < 40;
    
    // 2. Impact detection (simulated)
    const isImpactInLine = Math.abs(p[1].x - SCREEN_WIDTH / 2) < 30;
    
    // 3. Wickets prediction (simulated hitting stumps)
    const isHittingWickets = p[2].y < SCREEN_HEIGHT / 2 + 100 && Math.abs(p[2].x - SCREEN_WIDTH / 2) < 25;
    
    // 4. Decision logic
    const isOut = isPitchingInLine && isImpactInLine && isHittingWickets;

    setDrsStatus({
      pitching: isPitchingInLine ? 'IN LINE' : 'OUTSIDE LEG',
      impact: isImpactInLine ? 'IN LINE' : 'OUTSIDE OFF',
      wickets: isHittingWickets ? 'HITTING' : 'MISSING',
      decision: isOut ? 'OUT' : 'NOT OUT'
    });
  };

  const startTrackingAnimation = () => {
    if (points.length < 3) return;
    
    setRevealStep(0);
    videoRef.current?.setPositionAsync(0);
    videoRef.current?.playAsync();

    ballOpacity.value = 0;
    ballX.value = points[0].x;
    ballY.value = points[0].y;
    ballScale.value = 1.4;
    
    // 1. Reveal Pitching
    ballOpacity.value = withTiming(1, { duration: 200 });
    
    // Sequential Ball Path
    ballX.value = withSequence(
      // Pitch -> Impact
      withTiming(points[1].x, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }, (finished) => {
        if (finished) runOnJS(setRevealStep)(2);
      }),
      // Impact -> Wickets
      withDelay(800, withTiming(points[2].x, { duration: 1000, easing: Easing.out(Easing.exp) }, (finished) => {
        if (finished) runOnJS(setRevealStep)(3);
      }))
    );
    
    ballY.value = withSequence(
      withTiming(points[1].y, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }, (finished) => {
        if (finished) runOnJS(setRevealStep)(1);
      }),
      withDelay(800, withTiming(points[2].y, { duration: 1000, easing: Easing.out(Easing.exp) }))
    );

    ballScale.value = withSequence(
      withTiming(1, { duration: 1200 }),
      withDelay(800, withTiming(0.7, { duration: 1000 }))
    );

    pathProgress.value = withSequence(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      withDelay(800, withTiming(2, { duration: 1000, easing: Easing.linear }))
    );

    setTimeout(() => {
        setStep('decision');
    }, 4500);
  };

  const animatedBallStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: ballX.value - 10 },
      { translateY: ballY.value - 10 },
      { scale: ballScale.value }
    ],
  }));

  const getTrialStyle = (offset: number) => useAnimatedStyle(() => {
    const progress = Math.max(0, pathProgress.value - offset);
    if (progress <= 0 || progress >= 2) return { opacity: 0 };
    
    let tx, ty;
    if (progress < 1) {
      tx = points[0].x + (points[1].x - points[0].x) * progress;
      ty = points[0].y + (points[1].y - points[0].y) * progress;
    } else {
      const p2 = progress - 1;
      tx = points[1].x + (points[2].x - points[1].x) * p2;
      ty = points[1].y + (points[2].y - points[1].y) * p2;
    }

    return {
      opacity: (1 - offset * 5) * ballOpacity.value * 0.4,
      transform: [
        { translateX: tx - 10 },
        { translateY: ty - 10 },
        { scale: ballScale.value * 0.8 }
      ],
    };
  });

  const resetCalibration = () => {
    setPoints([]);
    setCurrentCalibrationStep(0);
    setStep('calibrate');
    ballOpacity.value = 0;
    setIsSaved(false);
  };

  const handleSaveVideo = async () => {
    if (!videoUri) return;
    
    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need gallery permissions to save the video.');
        setIsSaving(false);
        return;
      }

      await MediaLibrary.saveToLibraryAsync(videoUri);
      setIsSaved(true);
      Alert.alert('Success', 'Delivery recording saved to your gallery!');
    } catch (error) {
      console.error('Error saving video:', error);
      Alert.alert('Error', 'Failed to save video to gallery.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {videoUri ? (
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUri }}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER}
          isLooping={false}
          onPlaybackStatusUpdate={status => setStatus(status)}
        />
      ) : (
        <View style={[styles.video, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
            <Info size={48} color={colors.textMuted} />
            <Text style={{ color: '#fff', marginTop: 12 }}>No video source found</Text>
        </View>
      )}

      {/* Overlay for Tapping */}
      {step === 'calibrate' && (
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={handleTouch} 
          style={styles.touchOverlay}
        >
          <View style={styles.calibrationHeader}>
            <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                style={styles.headerGradient}
            />
            <View style={styles.instructionCard}>
                <Text style={styles.instructionTitle}>Step {currentCalibrationStep + 1} of 3</Text>
                <Text style={styles.instructionText}>{calibrationLabels[currentCalibrationStep]}</Text>
            </View>
          </View>
          
          {points.map((p, i) => (
            <View key={i} style={[styles.pointMarker, { left: p.x - 10, top: p.y - 10 }]}>
                <Text style={styles.pointLabel}>{i === 0 ? 'P' : i === 1 ? 'I' : 'W'}</Text>
            </View>
          ))}
        </TouchableOpacity>
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <View style={styles.processingOverlay}>
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.processingContent}>
            <View style={styles.scanLineContainer}>
              <Animated.View style={[styles.scanLine, useAnimatedStyle(() => ({
                transform: [{ translateY: scanLineY.value * 300 }]
              }))]} />
            </View>
            <View style={styles.processingIconBadge}>
              <Cpu size={40} color={colors.accentAlt} />
            </View>
            <Text style={styles.processingTitle}>ANALYZING DELIVERY</Text>
            <Text style={styles.processingSubtitle}>Running Hawk-Eye Predictive Simulation...</Text>
            
            <View style={styles.dataProcessingList}>
              <View style={styles.dataItem}>
                <TrendingUp size={14} color={colors.textMuted} />
                <Text style={styles.dataText}>Calculating trajectory curvature...</Text>
              </View>
              <View style={styles.dataItem}>
                <Layers size={14} color={colors.textMuted} />
                <Text style={styles.dataText}>Triangulating impact point...</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tracking Animation and Dashboard */}
      {step === 'tracking' && revealStep > 0 && (
        <View style={styles.drsDashboard}>
          <View style={styles.dashboardRow}>
            <View style={[styles.dashboardItem, revealStep < 1 && styles.dimmed]}>
              <Text style={styles.dashboardLabel}>PITCHING</Text>
              <View style={[styles.dashboardValue, { borderColor: drsStatus.pitching.includes('IN') ? '#22c55e' : '#ef4444' }]}>
                {revealStep >= 1 ? (
                  <Text style={[styles.dashboardValueText, { color: drsStatus.pitching.includes('IN') ? '#22c55e' : '#ef4444' }]}>{drsStatus.pitching}</Text>
                ) : (
                  <View style={styles.dotLoader} />
                )}
              </View>
            </View>

            <View style={[styles.dashboardItem, revealStep < 2 && styles.dimmed]}>
              <Text style={styles.dashboardLabel}>IMPACT</Text>
              <View style={[styles.dashboardValue, { borderColor: drsStatus.impact.includes('IN') ? '#22c55e' : '#ef4444' }]}>
                {revealStep >= 2 ? (
                  <Text style={[styles.dashboardValueText, { color: drsStatus.impact.includes('IN') ? '#22c55e' : '#ef4444' }]}>{drsStatus.impact}</Text>
                ) : (
                  <View style={styles.dotLoader} />
                )}
              </View>
            </View>

            <View style={[styles.dashboardItem, revealStep < 3 && styles.dimmed]}>
              <Text style={styles.dashboardLabel}>WICKETS</Text>
              <View style={[styles.dashboardValue, { borderColor: drsStatus.wickets.includes('HITTING') ? '#22c55e' : '#ef4444' }]}>
                {revealStep >= 3 ? (
                  <Text style={[styles.dashboardValueText, { color: drsStatus.wickets.includes('HITTING') ? '#22c55e' : '#ef4444' }]}>{drsStatus.wickets}</Text>
                ) : (
                  <View style={styles.dotLoader} />
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tracking Animation */}
      {[0.05, 0.1, 0.15].map((offset, i) => (
        <Animated.View key={`trail-${i}`} style={[styles.ball, { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'rgba(239, 68, 68, 0.3)' }, getTrialStyle(offset)]} />
      ))}
      <Animated.View style={[styles.ball, animatedBallStyle]} />

      {/* Control UI */}
      <View style={styles.bottomControls}>
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.95)']}
            style={styles.bottomGradient}
        />
        
        {step === 'tracking' && (
            <View style={styles.trackingPanel}>
              {revealStep === 0 ? (
                <TouchableOpacity style={styles.mainActionBtn} onPress={startTrackingAnimation}>
                    <TrendingUp size={24} color="#fff" />
                    <Text style={styles.mainActionText}>START DRS SEQUENCE</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.trackingProgressContainer}>
                   <View style={[styles.progressBar, { width: `${(revealStep / 3) * 100}%` }]} />
                   <Text style={styles.trackingProgressText}>
                     {revealStep === 1 ? 'Ball Pitching...' : revealStep === 2 ? 'Impact Analysis...' : 'Projecting Path...'}
                   </Text>
                </View>
              )}
              <TouchableOpacity style={styles.resetBtn} onPress={resetCalibration}>
                  <RotateCcw size={18} color="#fff" />
                  <Text style={styles.resetBtnText}>Recalibrate</Text>
              </TouchableOpacity>
            </View>
        )}

        {step === 'decision' && (
            <View style={styles.decisionPanel}>
                <View style={styles.drsRow}>
                    <View style={styles.drsItem}>
                        <Text style={styles.drsLabel}>PITCHING</Text>
                        <View style={[styles.drsValue, { backgroundColor: '#22c55e' }]}>
                            <Text style={styles.drsValueText}>{drsStatus.pitching}</Text>
                        </View>
                    </View>
                    <View style={styles.drsItem}>
                        <Text style={styles.drsLabel}>IMPACT</Text>
                        <View style={[styles.drsValue, { backgroundColor: '#22c55e' }]}>
                            <Text style={styles.drsValueText}>{drsStatus.impact}</Text>
                        </View>
                    </View>
                    <View style={styles.drsItem}>
                        <Text style={styles.drsLabel}>WICKETS</Text>
                        <View style={[styles.drsValue, { backgroundColor: '#ef4444' }]}>
                            <Text style={styles.drsValueText}>{drsStatus.wickets}</Text>
                        </View>
                    </View>
                </View>
                
                <View style={styles.finalDecision}>
                    <Text style={styles.finalDecisionLabel}>DECISION</Text>
                    <Text style={[styles.finalDecisionValue, { color: drsStatus.decision === 'OUT' ? '#ef4444' : '#22c55e' }]}>
                        {drsStatus.decision}
                    </Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.mainActionBtn, { flex: 1, backgroundColor: isSaved ? '#059669' : '#7C3AED' }]} 
                    onPress={isSaved ? undefined : handleSaveVideo}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Text style={styles.mainActionText}>Saving...</Text>
                    ) : (
                      <>
                        <Save size={20} color="#fff" />
                        <Text style={styles.mainActionText}>{isSaved ? 'Saved' : 'Save delivery'}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.mainActionBtn, { flex: 1, backgroundColor: colors.accent }]} 
                    onPress={() => router.back()}
                  >
                    <Check size={20} color="#fff" />
                    <Text style={styles.mainActionText}>Done</Text>
                  </TouchableOpacity>
                </View>
            </View>
        )}
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <X size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  calibrationHeader: {
    paddingTop: 60,
    alignItems: 'center',
    width: '100%',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 200,
  },
  instructionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 16,
    padding: 16,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  instructionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pointMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  pointLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ball: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 300,
  },
  trackingPanel: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  decisionPanel: {
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mainActionBtn: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mainActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  drsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  drsItem: {
    alignItems: 'center',
    flex: 1,
  },
  drsLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
  },
  drsValue: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    width: '90%',
    alignItems: 'center',
  },
  drsValueText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  finalDecision: {
    alignItems: 'center',
    marginBottom: 24,
  },
  finalDecisionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  finalDecisionValue: {
    fontSize: 48,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingContent: {
    alignItems: 'center',
    width: '100%',
    padding: 40,
  },
  scanLineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0.2,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: colors.accentAlt,
    shadowColor: colors.accentAlt,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    position: 'absolute',
    top: '50%',
  },
  processingIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  processingTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  processingSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 32,
  },
  dataProcessingList: {
    width: '100%',
    gap: 12,
    maxWidth: 240,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.7,
  },
  dataText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  drsDashboard: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  dashboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dashboardItem: {
    flex: 1,
    alignItems: 'center',
  },
  dimmed: {
    opacity: 0.3,
  },
  dashboardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1,
  },
  dashboardValue: {
    width: '100%',
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardValueText: {
    fontSize: 11,
    fontWeight: '900',
  },
  dotLoader: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  trackingProgressContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 4,
    backgroundColor: colors.accentAlt,
    borderRadius: 2,
  },
  trackingProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
