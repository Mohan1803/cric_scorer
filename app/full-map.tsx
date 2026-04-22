import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Check, MapPin, Layers } from 'lucide-react-native';
import { colors, shadows } from './theme';
import OSMMapView from '../components/OSMMapView';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SH } = Dimensions.get('window');

const SafeLayers = Layers || MapPin;

export default function FullMap() {
  const params = useLocalSearchParams<{ lat: string; lng: string; name?: string }>();
  
  const [coords, setCoords] = useState({
    latitude: parseFloat(params.lat || '12.9716'),
    longitude: parseFloat(params.lng || '77.5946')
  });

  const [isSatellite, setIsSatellite] = useState(true);

  const handleConfirm = () => {
    // Navigate back with the selected coordinates
    router.replace({
        pathname: '/add-ground',
        params: { 
            selectedLat: coords.latitude.toString(), 
            selectedLng: coords.longitude.toString() 
        }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{params.name || 'Select Location'}</Text>
            <Text style={styles.headerSub}>Drag the marker to the center of the pitch</Text>
        </View>
        <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
          <Check size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
        <OSMMapView
          latitude={coords.latitude}
          longitude={coords.longitude}
          zoom={18}
          height={SH - 100}
          isSatellite={isSatellite}
          markerColor={colors.accent}
          onLocationSelect={(lat, lng) => setCoords({ latitude: lat, longitude: lng })}
        />

        {/* Floating Controls */}
        <View style={styles.controls}>
            <TouchableOpacity 
                style={styles.controlBtn}
                onPress={() => setIsSatellite(!isSatellite)}
            >
                <SafeLayers size={20} color={isSatellite ? colors.accent : colors.textPrimary} />
                <Text style={[styles.controlText, isSatellite && { color: colors.accent }]}>
                    {isSatellite ? 'SATELLITE' : 'STREET'}
                </Text>
            </TouchableOpacity>
            
            <View style={styles.coordDisplay}>
                <MapPin size={14} color={colors.accent} />
                <Text style={styles.coordText}>
                    {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
            </View>
        </View>
      </View>

      <View style={styles.footer}>
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.9)']}
            style={styles.footerGrad}
          />
          <TouchableOpacity style={styles.bottomConfirm} onPress={handleConfirm}>
              <Text style={styles.bottomConfirmText}>CONFIRM PITCH LOCATION</Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
      flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  mapWrapper: {
    flex: 1,
  },
  controls: {
      position: 'absolute',
      top: 20,
      right: 20,
      gap: 12,
      alignItems: 'flex-end',
  },
  controlBtn: {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...shadows.medium,
  },
  controlText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
  },
  coordDisplay: {
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
  },
  coordText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontFamily: 'monospace',
  },
  footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 120,
      justifyContent: 'center',
      paddingHorizontal: 24,
  },
  footerGrad: {
      ...StyleSheet.absoluteFillObject,
  },
  bottomConfirm: {
      backgroundColor: colors.accent,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.medium,
  },
  bottomConfirmText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 1.5,
  }
});
