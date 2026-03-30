import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, ChevronLeft, Timer } from 'lucide-react-native';
import { colors } from './theme';

export default function ComingSoon() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper, '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.illustrationContainer}>
          <LinearGradient
            colors={[colors.accentAlt, '#7C3AED']}
            style={styles.iconBadge}
          >
            <Timer size={48} color="#fff" />
          </LinearGradient>
          <View style={styles.pulseContainer}>
            <View style={styles.pulse} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.subtitle}>
            Our AI-powered LBW Visual Tracking is currently under development.
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Zap size={16} color={colors.accentAlt} />
              <Text style={styles.featureText}>DRS-Style Ball Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Zap size={16} color={colors.accentAlt} />
              <Text style={styles.featureText}>Ultra-Edge Detection</Text>
            </View>
            <View style={styles.featureItem}>
              <Zap size={16} color={colors.accentAlt} />
              <Text style={styles.featureText}>Frame-by-Frame Review</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.button}
          onPress={() => router.back()}
        >
          <LinearGradient
            colors={[colors.accentAlt, '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconBadge: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: colors.accentAlt,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    zIndex: 2,
  },
  pulseContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentAlt,
    opacity: 0.2,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featureList: {
    marginTop: 30,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.accentAlt,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
