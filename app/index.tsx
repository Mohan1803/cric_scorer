import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { colors } from './theme';

export default function SplashScreen() {
    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/entryPage');
        }, 7000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Video
                source={require('../assets/videos/splash3.mp4')}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                isMuted
                shouldPlay
                isLooping
                onLoadStart={() => console.log('Video loading...')}
                onLoad={(data) => {
                    const successData = data as any;
                    // On web, this is a DOM Event with target.videoWidth
                    if (successData.target && typeof successData.target.videoWidth === 'number') {
                        console.log('Video dimensions (web onLoad):', {
                            width: successData.target.videoWidth,
                            height: successData.target.videoHeight
                        });
                    } else if (successData.isLoaded && successData.naturalSize) {
                        console.log('Video dimensions (onLoad):', successData.naturalSize);
                    }
                }} onError={(e) => console.log('Video error:', e)}
                onReadyForDisplay={(event) => {
                    const ev = event as any;
                    // On web, this is a DOM Event (canplay) with target.videoWidth
                    if (ev.target && typeof ev.target.videoWidth === 'number') {
                        console.log('Video Dimensions (web):', {
                            width: ev.target.videoWidth,
                            height: ev.target.videoHeight
                        });
                    } else if (ev.naturalSize) {
                        console.log('Video Dimensions (mobile):', ev.naturalSize);
                    } else if (ev.nativeEvent && ev.nativeEvent.naturalSize) {
                        console.log('Video Dimensions (nativeEvent.naturalSize):', ev.nativeEvent.naturalSize);
                    }
                }}

            />
        </View>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backgroundColor: '#000', // Matches video bars if they appear
    },
});
