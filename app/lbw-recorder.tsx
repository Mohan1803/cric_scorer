import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Dimensions, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router } from 'expo-router';
import { X, Video, Circle, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './theme';

export default function LbwRecorder() {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!permission || !micPermission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted || !micPermission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera and record audio</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => {
            requestPermission();
            requestMicPermission();
        }}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      // For web demonstration purposes: navigate to tracking with a dummy URI
      router.push({
          pathname: '/lbw-tracking' as any,
          params: { videoUri: 'demo' }
      });
      return;
    }

    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        const video = await cameraRef.current.recordAsync({
            maxDuration: 15, // Limit to 15 seconds
        });

        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);

        if (video) {
            router.push({
                pathname: '/lbw-tracking' as any,
                params: { videoUri: video.uri }
            });
        }
      } catch (error) {
        console.error('Recording error:', error);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        Alert.alert('Error', 'Failed to record video');
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        style={styles.camera} 
        ref={cameraRef}
        mode="video"
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            {isRecording && (
              <View style={styles.timerContainer}>
                <View style={styles.redDot} />
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
              </View>
            )}
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.guideContainer}>
            <View style={styles.guideBox}>
                <Text style={styles.guideText}>Record the full delivery</Text>
                <Text style={styles.guideSubtext}>Keep the pitch and stumps in frame. The app will extract frames for ball tracking.</Text>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.sideButtonContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <RotateCcw size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>RETRY</Text>
            </View>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={isRecording ? stopRecording : startRecording}
              style={styles.recordButtonContainer}
            >
              <View style={[styles.recordButtonOuter, isRecording && styles.recordingOuter]}>
                <View style={[styles.recordButtonInner, isRecording && styles.recordingInner]} />
              </View>
              <Text style={[styles.recordLabel, isRecording && { color: '#ef4444' }]}>
                {isRecording ? 'STOP' : 'RECORD'}
              </Text>
            </TouchableOpacity>

            <View style={styles.sideButtonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1 }]}
                onPress={() => router.push({ pathname: '/lbw-tracking' as any, params: { videoUri: 'demo_out' } })}
              >
                <Video size={24} color="#818cf8" />
              </TouchableOpacity>
              <Text style={[styles.actionLabel, { color: '#818cf8' }]}>TRY DEMO</Text>
            </View>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBox: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  guideSubtext: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideButtonContainer: {
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  recordLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1,
  },
  recordButtonContainer: {
    width: 80,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingOuter: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  recordButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ef4444',
  },
  recordingInner: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
