import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ShieldCheck, ArrowRight, RefreshCw, Smartphone } from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { getUserProfile, saveUserProfile } from '../services/userService';
import { Timestamp } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [timer, setTimer] = useState(0);

  const { login, updateProfile } = useAuthStore();

  const EMAILJS_SERVICE_ID = 'service_8ooqxmm';
  const EMAILJS_TEMPLATE_ID = 'template_tco72rk';
  const EMAILJS_PUBLIC_KEY = 'adJ1b4BI1rEtkPDlY';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, [step]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const validateEmail = (email: string) => {
    return String(email).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const handleSendOTP = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            email: email,
            name: 'User',
            OTP: newOtp,
            reply_to: 'mohanofficials18@gmail.com'
          },
        }),
      });

      const responseText = await response.text();

      if (response.ok) {
        setStep('otp');
        setTimer(30);
      } else {
        console.error('EmailJS Error:', responseText);
        throw new Error(`Email Delivery Failed: ${responseText || 'Service Unavailable'}`);
      }
    } catch (error: any) {
      Alert.alert('Delivery Error', error.message || 'OTP Delivery Failed. Check your EmailJS configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp !== generatedOtp) {
      Alert.alert('Invalid OTP', 'Incorrect code.');
      return;
    }

    setLoading(true);
    try {
      const userId = `user_${email.split('@')[0]}`;

      // Check if user already exists
      let profile = await getUserProfile(userId);

      if (!profile) {
        // CREATE INITIAL RECORD IMMEDIATELY
        profile = {
          id: userId,
          email: email.toLowerCase(),
          qrCode: `${userId}_${Math.random().toString(36).substr(2, 9)}`,
          hasProfile: false,
          lastUpdated: Timestamp.now()
        };
        await saveUserProfile(profile);
      }

      // Atomic login and sync
      login(email, profile);

      if (profile && profile.hasProfile === true) {
        router.replace('/entryPage');
      } else {
        router.replace('/profile-setup');
      }
    } catch (error) {
      console.error('Login error:', error);
      router.replace('/profile-setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.background, '#0F172A', '#1E293B']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoContainer}>
              <LinearGradient colors={[colors.accent, colors.accentAlt]} style={styles.logoGradient}>
                <Smartphone color="#fff" size={40} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>ONE SCORER</Text>
            <Text style={styles.subtitle}>{step === 'email' ? 'Professional Cricket Network' : `Verify ${email}`}</Text>
          </Animated.View>

          <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {step === 'email' ? (
              <View style={styles.inputWrapper}>
                <View style={styles.inputLabelContainer}>
                  <Mail size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                </View>
                <TextInput style={styles.input} placeholder="name@example.com" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOTP} disabled={loading}>
                  <LinearGradient colors={[colors.accent, colors.accentAlt]} style={styles.btnGradient}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Text style={styles.btnText}>Send Code</Text>
                        <ArrowRight size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputWrapper}>
                <View style={styles.inputLabelContainer}>
                  <ShieldCheck size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.inputLabel}>ENTER OTP</Text>
                </View>
                <TextInput style={[styles.input, styles.otpInput]} placeholder="----" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="number-pad" maxLength={4} value={otp} onChangeText={setOtp} autoFocus />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOTP} disabled={loading}>
                  <LinearGradient colors={[colors.accent, colors.accentAlt]} style={styles.btnGradient}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Text style={styles.btnText}>Verify & Login</Text>
                        <ShieldCheck size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <View style={styles.resendContainer}>
                  {timer > 0 ? <Text style={styles.resendText}>Resend in {timer}s</Text> : <TouchableOpacity onPress={handleSendOTP}><Text style={styles.resendActionText}>Resend Code</Text></TouchableOpacity>}
                  <TouchableOpacity onPress={() => setStep('email')}><Text style={styles.changeEmailText}>Change Email</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: height * 0.1, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 50 },
  logoContainer: { width: 100, height: 100, borderRadius: 30, overflow: 'hidden', ...shadows.large, marginBottom: 24, transform: [{ rotate: '-10deg' }] },
  logoGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  formContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 30, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...shadows.medium },
  inputWrapper: { gap: 16 },
  inputLabelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: colors.accent, letterSpacing: 1.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, color: '#fff', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  otpInput: { fontSize: 32, textAlign: 'center', letterSpacing: 20, paddingLeft: 40 },
  primaryBtn: { marginTop: 10, borderRadius: 18, overflow: 'hidden', ...shadows.medium },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resendContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  resendText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  resendActionText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  changeEmailText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }
});
