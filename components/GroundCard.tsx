import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { MapPin, Phone, Star, Crown, ChevronRight, Zap } from 'lucide-react-native';
import { colors, shadows } from '../app/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ground } from '../store/groundStore';
import { Trash2 } from 'lucide-react-native';
import { getDeviceId } from '../services/deviceIdService';
import { groundService } from '../services/groundService';
import { Alert } from 'react-native';

interface GroundCardProps {
  ground: Ground;
  onPress?: () => void;
  isNearby?: boolean;
  distance?: number;
  onDelete?: () => void;
}

export default function GroundCard({ ground, onPress, isNearby, distance, onDelete }: GroundCardProps) {
  const [isOwner, setIsOwner] = React.useState(false);

  React.useEffect(() => {
    checkOwner();
  }, []);

  const checkOwner = async () => {
    const deviceId = await getDeviceId();
    if (ground.creatorId === deviceId) {
      setIsOwner(true);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Ground",
      "Are you sure you want to remove this ground from the global network?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await groundService.deleteGround(ground.id);
              onDelete?.();
            } catch (error) {
              Alert.alert("Error", "Failed to delete ground");
            }
          } 
        }
      ]
    );
  };
  const handleCall = () => {
    const phoneNumber = ground.ownerPhone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      style={styles.card} 
      onPress={onPress}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.name} numberOfLines={1}>{ground.name}</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {ground.city}, {ground.address.split(',')[0]}
              </Text>
            </View>
            {distance !== undefined && (
              <Text style={styles.distanceText}>
                {distance < 1 ? `${(distance * 1000).toFixed(0)}m away` : `${distance.toFixed(1)}km away`}
              </Text>
            )}
          </View>
          {ground.rating && (
            <View style={styles.ratingBadge}>
              <Star size={12} color={colors.accentGold} fill={colors.accentGold} />
              <Text style={styles.ratingText}>{ground.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.amenitiesContainer}>
          {ground.amenities.slice(0, 3).map((amenity, idx) => (
            <View key={idx} style={styles.amenityBadge}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
          {ground.amenities.length > 3 && (
            <Text style={styles.moreAmenityText}>+{ground.amenities.length - 3} more</Text>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceValue}>{ground.pricePerMatch || 'TBD'}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={handleCall}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentAlt]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.callGradient}
              >
                <Phone size={16} color="#fff" fill="#fff" />
                <Text style={styles.callText}>Call Owner</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.detailsBtn}>
                <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={handleDelete}
              >
                <Trash2 size={18} color={colors.accentWarn} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isNearby && (
          <View style={styles.nearbyTag}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.nearbyGradient}
            >
              <Zap size={10} color="#fff" fill="#fff" />
              <Text style={styles.nearbyText}>NEARBY</Text>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentGold,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  amenityBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  amenityText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  moreAmenityText: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  priceContainer: {
    gap: 2,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  callGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  callText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  nearbyTag: {
    position: 'absolute',
    top: 0,
    right: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  nearbyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  nearbyText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
