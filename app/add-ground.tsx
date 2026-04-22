import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, User, Store, Plus, X, Save, Navigation, Building2, MapPin, Phone, Crosshair } from 'lucide-react-native';
import { useGroundStore } from '../store/groundStore';
import * as Location from 'expo-location';
import { groundService } from '../services/groundService';
import OSMMapView from '../components/OSMMapView';

// Fallback for icons that might be missing in this version of lucide-react-native
const SafeStore = Store || Building2 || Plus;
const SafeMapPin = MapPin || Plus;
const SafeNavigation = Navigation || Plus;
const SafePhone = Phone || Plus;
const SafeUser = User || Plus;

export default function AddGround() {
  const { addGround } = useGroundStore();

  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    ownerPhone: '',
    address: '',
    city: '',
    latitude: 12.9716, // Default (e.g. Bengaluru)
    longitude: 77.5946,
    pricePerMatch: '',
    amenities: ['Pavilion']
  });

  const [loadingLocation, setLoadingLocation] = useState(false);

  const [newAmenity, setNewAmenity] = useState('');

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setForm(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index: number) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setForm(prev => ({ ...prev, latitude, longitude }));

      // Reverse geocode to get city/address
      let reverseResult = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseResult.length > 0) {
        const addr = reverseResult[0];
        setForm(prev => ({
          ...prev,
          city: addr.city || addr.district || '',
          address: `${addr.name || ''} ${addr.street || ''} ${addr.subregion || ''}`.trim()
        }));
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not get your current location');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.ownerPhone || !form.city || !form.address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const firebaseId = await groundService.saveGround({
        name: form.name,
        ownerName: form.ownerName || 'Owner',
        ownerPhone: form.ownerPhone,
        address: form.address,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        amenities: form.amenities,
        pricePerMatch: form.pricePerMatch ? `${form.pricePerMatch}` : undefined,
        rating: 5.0
      });

      // Also add to local store for immediate UI update (though we'll fetch from Firebase in dash)
      addGround({
        name: form.name,
        ownerName: form.ownerName || 'Owner',
        ownerPhone: form.ownerPhone,
        address: form.address,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        amenities: form.amenities,
        pricePerMatch: form.pricePerMatch ? `${form.pricePerMatch}` : undefined,
        rating: 5.0
      });

      Alert.alert('Success', 'Ground registered globally!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Firebase Error', 'Failed to save to global database. Check your internet.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Venue</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>New Registration</Text>
            <Text style={styles.introText}>Provide your ground details to join the global network.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ground Name *</Text>
              <View style={styles.inputWrapper}>
                <SafeStore size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Green Park Stadium"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={form.name}
                  onChangeText={(val) => setForm({ ...form, name: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner/Manager Name</Text>
              <View style={styles.inputWrapper}>
                <SafeUser size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={form.ownerName}
                  onChangeText={(val) => setForm({ ...form, ownerName: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone *</Text>
              <View style={styles.inputWrapper}>
                <SafePhone size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="phone-pad"
                  value={form.ownerPhone}
                  onChangeText={(val) => setForm({ ...form, ownerPhone: val })}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Location & Pricing</Text>
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={getCurrentLocation}
                disabled={loadingLocation}
              >
                <SafeNavigation size={14} color={colors.accent} />
                <Text style={styles.gpsText}>{loadingLocation ? 'Detecting...' : 'Detect GPS'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
              <OSMMapView
                latitude={form.latitude}
                longitude={form.longitude}
                zoom={15}
                height={200}
                markerColor={colors.accent}
                onLocationSelect={(lat, lng) => {
                  setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                }}
              />
            </View>

            <View style={styles.coordRow}>
              <View style={styles.coordChip}>
                <Text style={styles.coordChipLabel}>LAT</Text>
                <Text style={styles.coordChipValue}>{form.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordChip}>
                <Text style={styles.coordChipLabel}>LNG</Text>
                <Text style={styles.coordChipValue}>{form.longitude.toFixed(6)}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <View style={styles.inputWrapper}>
                <SafeMapPin size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mumbai"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={form.city}
                  onChangeText={(val) => setForm({ ...form, city: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Complete address of the ground"
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                numberOfLines={3}
                value={form.address}
                onChangeText={(val) => setForm({ ...form, address: val })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price per Match (Optional)</Text>
              <View style={styles.inputWrapper}>
                {/* <DollarSign size={18} color={colors.textMuted} /> */}
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5000"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  value={form.pricePerMatch}
                  onChangeText={(val) => setForm({ ...form, pricePerMatch: val })}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenityInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, height: 48 }]}
                placeholder="Add amenity (e.g. Floodlights)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newAmenity}
                onChangeText={setNewAmenity}
              />
              <TouchableOpacity onPress={handleAddAmenity} style={styles.addBtn}>
                <Plus size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.chipContainer}>
              {form.amenities.map((item, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeAmenity(idx)}>
                    <X size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Save size={20} color="#fff" />
              <Text style={styles.saveText}>Save Ground Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  introBox: {
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  introText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    opacity: 0.7,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 4,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  gpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  mapContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  coordChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  coordChipLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  coordChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  amenityInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  saveBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 20,
    ...shadows.medium,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
