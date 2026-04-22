import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

let RealMapView: any = null;
let RealMarker: any = null;
let REAL_PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  RealMapView = maps.default;
  RealMarker = maps.Marker;
  REAL_PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch (e) {
  console.warn('react-native-maps failed to load:', e);
}

// Fallback component when Maps is unavailable
function FallbackMapView(props: any) {
  return (
    <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }, props.style]}>
      <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Map view unavailable</Text>
      <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4, textAlign: 'center' }}>Google Maps is not configured</Text>
    </View>
  );
}

// Safe wrapper that catches runtime crashes
class SafeMapView extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.warn('MapView crashed:', error);
  }

  render() {
    if (this.state.hasError || !RealMapView) {
      return <FallbackMapView {...this.props} />;
    }
    return <RealMapView {...this.props} />;
  }
}

// Fallback Marker that renders nothing if Maps isn't available
function SafeMarker(props: any) {
  if (!RealMarker) return null;
  return <RealMarker {...props} />;
}

export const Marker = SafeMarker;
export const PROVIDER_GOOGLE = REAL_PROVIDER_GOOGLE;
export default SafeMapView;
