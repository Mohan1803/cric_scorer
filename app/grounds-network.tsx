import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Search, MapPin, SlidersHorizontal, Plus, Globe, Zap, Navigation } from 'lucide-react-native';
import { useGroundStore } from '../store/groundStore';
import GroundCard from '../components/GroundCard';
import { groundService, FirebaseGround } from '../services/groundService';
import * as Location from 'expo-location';
import { Ground } from '../store/groundStore';

export default function GroundsNetwork() {
  const [grounds, setGrounds] = useState<(Ground | FirebaseGround)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');

  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Try to get current location (non-blocking)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation(loc);
        }
      } catch (locError) {
        console.warn("Location unavailable:", locError);
      }

      // 2. Fetch from Firebase
      const fbGrounds = await groundService.getGrounds();
      setGrounds(fbGrounds);
    } catch (error) {
      console.error("Error loading grounds:", error);
    } finally {
      setLoading(false);
    }
  };

  const cities = useMemo(() => {
    const list = Array.from(new Set(grounds.map(g => g.city)));
    return ['All Cities', ...list];
  }, [grounds]);

  // Haversine formula to calculate distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredGrounds = useMemo(() => {
    let result = grounds.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = selectedCity === 'All Cities' || g.city === selectedCity;
      return matchesSearch && matchesCity;
    });

    // Add distance if location available
    if (userLocation) {
      result = result.map(g => ({
        ...g,
        distance: getDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          g.latitude,
          g.longitude
        )
      }));
      // Sort by distance
      result.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
    }

    return result;
  }, [grounds, searchQuery, selectedCity, userLocation]);

  const nearbyGrounds = useMemo(() => {
    return filteredGrounds.slice(0, 3);
  }, [filteredGrounds]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surfaceDeeper]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Ground Network</Text>
            <View style={styles.statusRow}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>{grounds.length} LIVE VENUES</Text>
            </View>
          </View>

          <View style={styles.headerActions} />
        </View>

        <View style={styles.searchBarContainer}>
          <View style={styles.searchWrapper}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues..."
              placeholderTextColor="rgba(255,255,255,0.15)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={loadData}>
            <Navigation size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cityFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
            {cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                onPress={() => setSelectedCity(city)}
              >
                <Text style={[styles.cityText, selectedCity === city && styles.cityTextActive]}>{city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {searchQuery === '' && selectedCity === 'All Cities' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Navigation size={18} color={colors.accent} />
                <Text style={styles.sectionTitle}>Nearest To You</Text>
              </View>
            </View>
            {nearbyGrounds.map((ground: any) => (
              <GroundCard
                key={ground.id}
                ground={ground}
                isNearby={true}
                distance={ground.distance}
                onDelete={loadData}
              />
            ))}
          </View>
        )}

        <View style={[styles.section, { marginTop: 10 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Globe size={18} color={colors.accentSecondary} />
              <Text style={styles.sectionTitle}>
                {selectedCity === 'All Cities' ? 'World Network' : `Venues in ${selectedCity}`}
              </Text>
            </View>
            <Text style={styles.countText}>{filteredGrounds.length} found</Text>
          </View>

          {filteredGrounds.length > 0 ? (
            filteredGrounds.map((ground: any) => (
              <GroundCard
                key={ground.id}
                ground={ground}
                distance={ground.distance}
                onDelete={loadData}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MapPin size={48} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Text style={styles.emptyText}>No grounds found in this area</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.registerFab}
        onPress={() => router.push('/add-ground' as any)}
      >
        <LinearGradient
          colors={[colors.accent, colors.accentAlt]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Store size={24} color="#fff" />
          <Text style={styles.fabText}>Register Yours</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const Store = Plus; // Fallback if Store icon not imported properly from lucide

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    backgroundColor: 'rgba(11, 14, 20, 0.5)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    opacity: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  viewToggleActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  cityFilterContainer: {
    paddingVertical: 12,
  },
  cityScroll: {
    paddingHorizontal: 16,
  },
  cityChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  cityChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cityText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  cityTextActive: {
    color: colors.background,
    opacity: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
  countText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
  },
  registerFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.medium,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mapViewContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webMapPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webMapText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  webMapSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  switchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  switchBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
});
