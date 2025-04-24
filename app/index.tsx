import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';


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
                source={require('../assets/videos/splash1.mp4')}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                isMuted
                shouldPlay
                isLooping
                onLoadStart={() => console.log('Video loading...')}
                onLoad={() => console.log('Video loaded!')}
                onError={(e) => console.log('Video error:', e)}
            />
        </View>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        width: width,
        height: height,
        position: 'relative', // Makes sure video fills the whole screen
        top: 0,
        left: 0,
    },
});
