import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Globe } from 'lucide-react-native';
import { colors } from '../app/theme';

// Safe placeholders for Web
export const PROVIDER_GOOGLE = 'google';

export const Marker = ({ children }: any) => {
  return <View>{children}</View>;
};

const MapView = ({ style, children }: any) => {
  return (
    <View style={[style, styles.placeholder]}>
      <Globe size={48} color={colors.accent} style={{ marginBottom: 16 }} />
      <Text style={styles.text}>Maps are optimized for Mobile</Text>
      <Text style={styles.subtext}>Switch to mobile to see interactive markers</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  }
});

export default MapView;
