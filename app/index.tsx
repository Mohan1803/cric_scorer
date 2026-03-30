import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image, Text } from 'react-native';
import { router } from 'expo-router';
import { colors } from './theme';
import * as SplashScreenNative from 'expo-splash-screen';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withDelay,
    Easing,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SplashScreen() {
    const logoOpacity = useSharedValue(0);
    const logoScale = useSharedValue(0.5);
    const textOpacity = useSharedValue(0);
    const textY = useSharedValue(20);
    const bgOpacity = useSharedValue(1);

    useEffect(() => {
        // Handover: Dismiss native splash specifically when this JS screen is fully mounted
        SplashScreenNative.hideAsync().catch(() => { });

        // Start Animations
        logoOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) });
        logoScale.value = withSequence(
            withTiming(1.2, { duration: 1500, easing: Easing.out(Easing.back(1.5)) }),
            withTiming(1, { duration: 800 })
        );

        textOpacity.value = withDelay(1800, withTiming(1, { duration: 800 }));
        textY.value = withDelay(1800, withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }));

        // Navigate after sequence
        const timer = setTimeout(() => {
            bgOpacity.value = withTiming(0, { duration: 500 });
            setTimeout(() => {
                router.replace('/entryPage');
            }, 500);
        }, 4000); // Shorter, punchier duration (4s total)

        return () => clearTimeout(timer);
    }, []);

    const animatedLogoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }]
    }));

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textY.value }]
    }));

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value
    }));

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            <LinearGradient
                colors={['#0B0E14', '#081126', '#000000']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
                    <Image
                        source={require('../assets/images/one_scorer_icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Animated.View style={[styles.textContainer, animatedTextStyle]}>
                    <Text style={styles.appName}>ONE SCORER</Text>
                    <View style={styles.underline}>
                        <LinearGradient
                            colors={[colors.accentAlt, colors.accentGold, colors.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                    <Text style={styles.tagline}>PRECISION CRICKET SCORING</Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>POWERED BY ONE SCORER</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0E14',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: '100%',
        height: '100%',
        zIndex: 2,
    },
    textContainer: {
        alignItems: 'center',
    },
    appName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 6,
        fontStyle: 'italic',
    },
    underline: {
        width: 160,
        height: 3,
        marginVertical: 12,
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    tagline: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 2,
    },
});

