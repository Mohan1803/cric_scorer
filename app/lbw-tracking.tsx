import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, router } from 'expo-router';
import { X, Play, RotateCcw, Check, ChevronRight, Info, Save } from 'lucide-react-native';
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
  
  const [step, setStep] = useState<'calibrate' | 'tracking' | 'decision'>('calibrate');
  const [points, setPoints] = useState<Point[]>([]);
  const [currentCalibrationStep, setCurrentCalibrationStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
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
      setStep('tracking');
      processDecision(newPoints);
    }
  };

  const processDecision = (p: Point[]) => {
    // Basic logic for simulation:
    // In a real app, you'd compare X coords to pitch center
    // Here we'll simulate some professional feedback
    setDrsStatus({
      pitching: 'IN LINE',
      impact: 'IN LINE',
      wickets: 'HITTING',
      decision: 'OUT'
    });
  };

  const startTrackingAnimation = () => {
    if (points.length < 3) return;
    
    // Reset video and play
    videoRef.current?.setPositionAsync(0);
    videoRef.current?.playAsync();

    // Reset ball
    ballOpacity.value = 0;
    ballX.value = points[0].x;
    ballY.value = points[0].y;
    ballScale.value = 1.2;
    
    // Animation Sequence
    ballOpacity.value = withTiming(1, { duration: 300 });
    
    // Pitch to Impact
    ballX.value = withSequence(
      withTiming(points[1].x, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(points[2].x, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    
    ballY.value = withSequence(
      withTiming(points[1].y, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(points[2].y, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );

    ballScale.value = withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.8, { duration: 600 })
    );

    setTimeout(() => {
        setStep('decision');
    }, 1500);
  };

  const animatedBallStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: ballX.value - 10 },
      { translateY: ballY.value - 10 },
      { scale: ballScale.value }
    ],
  }));

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

      {/* Tracking Animation */}
      <Animated.View style={[styles.ball, animatedBallStyle]} />

      {/* Control UI */}
      <View style={styles.bottomControls}>
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.bottomGradient}
        />
        
        {step === 'tracking' && (
            <View style={styles.trackingPanel}>
                <TouchableOpacity style={styles.mainActionBtn} onPress={startTrackingAnimation}>
                    <Play size={24} color="#fff" />
                    <Text style={styles.mainActionText}>Start Decision Tracking</Text>
                </TouchableOpacity>
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
  }
});
