import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  ChevronRight, 
  Check, 
  Award, 
  Zap, 
  Trophy, 
  Activity,
  ShieldCheck,
  Target,
  Hash,
  Camera
} from 'lucide-react-native';
import { colors, shadows } from './theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { saveUserProfile, uploadProfilePicture } from '../services/userService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RoleType = 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper' | null;
type HandType = 'right' | 'left' | null;
type BowlType = 'fast' | 'medium' | 'off_spin' | 'leg_spin' | null;

export default function ProfileSetup() {
  const { user, updateProfile } = useAuthStore();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [loading, setLoading] = useState(false);
  
  // Refs for auto-scrolling
  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);

  // Internal state - Initialize as NULL for new users to ensure "Clean Slate"
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [role, setRole] = useState<RoleType>(null);
  const [battingHand, setBattingHand] = useState<HandType>(null);
  const [bowlingHand, setBowlingHand] = useState<HandType>(null);
  const [bowlingType, setBowlingType] = useState<BowlType>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isInitialized = useRef(false);

  // Initialize state ONLY for returning users
  useEffect(() => {
    if (user && !isInitialized.current) {
      if (user.hasProfile) {
        setName(user.name || '');
        setProfileImage(user.photoURL || null);
        setRole(user.role || null);
        setBattingHand(user.battingHand || null);
        setBowlingHand(user.bowlingHand || null);
        setBowlingType(user.bowlingType || null);
      }
      isInitialized.current = true;
    }
  }, [user]);

  // Handle auto-focus/scrolling based on URL params
  useEffect(() => {
    if (focus && isInitialized.current) {
      setTimeout(() => {
        if (focus === 'name') {
          nameRef.current?.focus();
        } else if (focus === 'role') {
          scrollRef.current?.scrollTo({ y: 350, animated: true });
        } else if (focus === 'batting' || focus === 'bowling') {
          scrollRef.current?.scrollTo({ y: 550, animated: true });
        } else if (focus === 'spec') {
          scrollRef.current?.scrollTo({ y: 750, animated: true });
        }
      }, 500);
    }
  }, [focus, isInitialized.current]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your gallery to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Details Missing', 'Please provide your full name.');
      return;
    }
    if (!role || !battingHand || !bowlingHand || !bowlingType) {
      Alert.alert('Selection Missing', 'Please select all technical attributes to complete your professional profile.');
      return;
    }

    setLoading(true);
    try {
      let photoURL = user?.photoURL || '';
      if (profileImage && !profileImage.startsWith('http')) {
        try {
          const uploadedUrl = await uploadProfilePicture(user!.id, profileImage);
          if (uploadedUrl) photoURL = uploadedUrl;
        } catch (e) {
          console.error('Image upload failed', e);
        }
      }

      const profileData = {
        id: user!.id,
        email: user!.email,
        name: name.trim(),
        photoURL,
        role,
        battingHand,
        bowlingHand,
        bowlingType,
        hasProfile: true
      };

      const success = await saveUserProfile(profileData as any);
      if (success) {
        updateProfile(profileData as any);
        router.replace('/entryPage');
      } else {
        throw new Error('Database sync failed.');
      }
    } catch (error: any) {
      Alert.alert('Update Error', error.message || 'Couldn\'t save changes.');
    } finally {
      setLoading(false);
    }
  };

  const renderCardOption = (label: string, value: any, current: any, setter: (v: any) => void, icon?: any) => {
    const isActive = current === value;
    const IconComp = icon;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.cardOption, isActive && styles.cardOptionActive]}
        onPress={() => setter(value)}
      >
        <View style={[styles.cardIconBox, isActive && styles.cardIconBoxActive]}>
          {IconComp ? <IconComp size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.3)'} /> : <Check size={16} color={isActive ? '#fff' : 'transparent'} />}
        </View>
        <Text style={[styles.cardOptionText, isActive && styles.cardOptionTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#040508', '#0F172A', '#080A0F']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.header}>
              <View style={styles.badgeContainer}>
                <LinearGradient colors={[colors.accent, '#B45309']} style={styles.proBadge}>
                  <Award size={12} color="#fff" />
                  <Text style={styles.proText}>PLAYER IDENTITY SYSTEM</Text>
                </LinearGradient>
              </View>
              <Text style={styles.title}>{user?.hasProfile ? 'Edit Profile' : 'Official Registration'}</Text>
            </View>

            <View style={[styles.profileHero, focus === 'name' && styles.highlightedSection]}>
              <LinearGradient colors={['rgba(249, 205, 5, 0.15)', 'rgba(0,0,0,0)']} style={styles.heroOverlay} />
              <TouchableOpacity activeOpacity={0.9} onPress={pickImage} style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatarImage} /> : <User size={48} color={colors.accent} />}
                </View>
                <View style={styles.editBadge}><Camera size={12} color="#fff" /></View>
              </TouchableOpacity>
              <View style={styles.heroTextGroup}>
                <Text style={styles.heroEmail}>{user?.email}</Text>
                <Text style={styles.heroStatus}>VERIFIED ACCOUNT</Text>
                <TouchableOpacity onPress={pickImage} style={{ paddingVertical: 5 }}>
                  <Text style={styles.changePhotoText}>Change Photo (Optional)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={[styles.inputGroup, focus === 'name' && styles.highlightedSection]}>
                <Text style={styles.label}>PLAYER NAME</Text>
                <View style={styles.textInputWrapper}>
                  <Hash size={18} color="rgba(255,255,255,0.2)" />
                  <TextInput ref={nameRef} style={styles.input} placeholder="Enter your full name" placeholderTextColor="rgba(255,255,255,0.2)" value={name} onChangeText={setName} selectionColor={colors.accent} />
                </View>
              </View>

              <View style={[styles.inputGroup, focus === 'role' && styles.highlightedSection]}>
                <Text style={styles.label}>PRIMARY ROLE</Text>
                <View style={styles.gridOptions}>
                  {renderCardOption('Batsman', 'batsman', role, setRole, Target)}
                  {renderCardOption('Bowler', 'bowler', role, setRole, Activity)}
                  {renderCardOption('All-Rounder', 'allrounder', role, setRole, Trophy)}
                  {renderCardOption('Keeper', 'wicketkeeper', role, setRole, ShieldCheck)}
                </View>
              </View>

              <View style={[styles.dualColumn, (focus === 'batting' || focus === 'bowling') && styles.highlightedSection]}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>BATTING</Text>
                  <View style={styles.columnOptions}>
                    {renderCardOption('Right Hand', 'right', battingHand, setBattingHand)}
                    {renderCardOption('Left Hand', 'left', battingHand, setBattingHand)}
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>BOWLING ARM</Text>
                  <View style={styles.columnOptions}>
                    {renderCardOption('Right Arm', 'right', bowlingHand, setBowlingHand)}
                    {renderCardOption('Left Arm', 'left', bowlingHand, setBowlingHand)}
                  </View>
                </View>
              </View>

              <View style={[styles.inputGroup, focus === 'spec' && styles.highlightedSection]}>
                <Text style={styles.label}>BOWLING SPECIALIZATION</Text>
                <View style={styles.gridOptions}>
                  {renderCardOption('Fast', 'fast', bowlingType, setBowlingType)}
                  {renderCardOption('Medium', 'medium', bowlingType, setBowlingType)}
                  {renderCardOption('Off Spin', 'off_spin', bowlingType, setBowlingType)}
                  {renderCardOption('Leg Spin', 'leg_spin', bowlingType, setBowlingType)}
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={loading}>
                <LinearGradient colors={[colors.accent, colors.accentAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.saveBtnText}>{user?.hasProfile ? 'SAVE CHANGES' : 'COMPLETE REGISTRATION'}</Text>
                      <View style={styles.btnIconCircle}><ChevronRight size={20} color={colors.accent} /></View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040508' },
  scrollContent: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 30, marginBottom: 32 },
  badgeContainer: { marginBottom: 16 },
  proBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  proText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, textAlign: 'center' },
  highlightedSection: { backgroundColor: 'rgba(249, 205, 5, 0.05)', borderRadius: 20, padding: 10, borderWidth: 1, borderColor: 'rgba(249, 205, 5, 0.2)' },
  profileHero: { marginHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 30, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 32 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  avatarContainer: { width: 84, height: 84, position: 'relative' },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(249, 205, 5, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(249, 205, 5, 0.2)', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  editBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, position: 'absolute', top: 0, right: 0, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0F172A', zIndex: 10 },
  heroTextGroup: { flex: 1 },
  heroEmail: { fontSize: 16, fontWeight: '700', color: '#fff' },
  heroStatus: { fontSize: 9, fontWeight: '900', color: colors.accent, letterSpacing: 1, marginTop: 4 },
  changePhotoText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, textDecorationLine: 'underline' },
  formSection: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 28, padding: 5 },
  label: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 12 },
  textInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, paddingVertical: 18, paddingHorizontal: 12, color: '#fff', fontSize: 16, fontWeight: '600' },
  gridOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardOption: { flex: 1, minWidth: (SCREEN_WIDTH - 72) / 2, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardOptionActive: { backgroundColor: 'rgba(249, 205, 5, 0.08)', borderColor: colors.accent, ...shadows.small },
  cardIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  cardIconBoxActive: { backgroundColor: colors.accent },
  cardOptionText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  cardOptionTextActive: { color: '#fff' },
  dualColumn: { flexDirection: 'row', gap: 20, padding: 5 },
  columnOptions: { gap: 10 },
  saveBtn: { marginTop: 20, borderRadius: 24, overflow: 'hidden', ...shadows.large, shadowColor: colors.accent },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 30, paddingRight: 10, paddingVertical: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  btnIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
});
