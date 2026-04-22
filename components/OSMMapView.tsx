import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../app/theme';

interface OSMMapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  markerColor?: string;
  style?: any;
}

function getMapHTML(latitude: number, longitude: number, zoom: number, markerColor: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { 
      background: rgba(15, 23, 42, 0.8) !important; 
      color: #94A3B8 !important;
      font-size: 8px !important;
    }
    .leaflet-control-attribution a {
      color: #38BDF8 !important;
    }
    .custom-pin {
      width: 24px; height: 24px;
      background: ${markerColor};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 20px ${markerColor}44;
      position: relative;
    }
    .custom-pin::after {
      content: '';
      position: absolute;
      bottom: -8px; left: 50%;
      transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid ${markerColor};
    }
    .pulse {
      position: absolute;
      width: 50px; height: 50px;
      top: -13px; left: -13px;
      border: 2px solid ${markerColor};
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 0.7; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .loading {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      background: #1a1a2e; color: #94A3B8; font-family: sans-serif;
      font-size: 13px; z-index: 9999;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">Loading map...</div>
  <div id="map"></div>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    onload="loadLeaflet()" />
  <script>
    function loadLeaflet() {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = initMap;
      s.onerror = function() {
        document.getElementById('loading').innerHTML = 'Map failed to load. Check internet.';
      };
      document.head.appendChild(s);
    }

    function initMap() {
      try {
        document.getElementById('loading').style.display = 'none';

        var map = L.map('map', {
          zoomControl: false,
        }).setView([${latitude}, ${longitude}], ${zoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        var icon = L.divIcon({
          className: '',
          html: '<div class="custom-pin"><div class="pulse"></div></div>',
          iconSize: [24, 32],
          iconAnchor: [12, 32],
        });

        var marker = L.marker([${latitude}, ${longitude}], {
          icon: icon,
          draggable: true
        }).addTo(map);

        window._map = map;
        window._marker = marker;

        function post(msg) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg));
          } else {
            window.parent.postMessage(JSON.stringify(msg), "*");
          }
        }

        marker.on('dragend', function(e) {
          var p = e.target.getLatLng();
          post({ type: 'loc', lat: p.lat, lng: p.lng });
        });

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          post({ type: 'loc', lat: e.latlng.lat, lng: e.latlng.lng });
        });

        // Force a resize after render to fix tile loading
        setTimeout(function() { map.invalidateSize(); }, 300);
      } catch(err) {
        document.getElementById('loading').innerHTML = 'Map error: ' + err.message;
        document.getElementById('loading').style.display = 'flex';
      }
    }
  </script>
</body>
</html>`;
}

export default function OSMMapView({
  latitude,
  longitude,
  zoom = 15,
  height = 200,
  onLocationSelect,
  markerColor = '#E11A22',
  style,
}: OSMMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Update marker when coordinates change (after initial load)
  useEffect(() => {
    if (webViewRef.current && !isLoading) {
      webViewRef.current.injectJavaScript(`
        if (window._marker && window._map) {
          window._marker.setLatLng([${latitude}, ${longitude}]);
          window._map.setView([${latitude}, ${longitude}], ${zoom});
        }
        true;
      `);
    }
  }, [latitude, longitude, isLoading]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'loc' && onLocationSelect) {
        onLocationSelect(data.lat, data.lng);
      }
    } catch (e) { /* ignore */ }
  };

  // Web platform implementation using iframe
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'loc' && onLocationSelect) {
            onLocationSelect(data.lat, data.lng);
          }
        } catch (err) { /* ignore */ }
      };
      window.addEventListener('message', handleWebMessage);
      setIsLoading(false);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [onLocationSelect]);

  if (Platform.OS === 'web') {
    const htmlContent = getMapHTML(latitude, longitude, zoom, markerColor);
    return (
      <View style={[styles.container, { height }, style]}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="OSM Map"
        />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.fallback, { height }, style]}>
        <Text style={styles.fallbackText}>Map unavailable</Text>
        <Text style={styles.fallbackSub}>Check your internet connection</Text>
      </View>
    );
  }

  const htmlContent = getMapHTML(latitude, longitude, zoom, markerColor);

  return (
    <View style={[styles.container, { height }, style]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ 
          html: htmlContent, 
          baseUrl: 'https://www.openstreetmap.org' 
        }}
        userAgent="OneScorer/1.0 (com.ededin.cricket; Mobile; contact: support@ededin.com)"
        style={[styles.webview, isLoading && { opacity: 0 }]}
        scrollEnabled={false}
        bounces={false}
        onMessage={handleMessage}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        startInLoadingState={false}
        cacheEnabled={true}
        setSupportMultipleWindows={false}
        overScrollMode="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    zIndex: 10,
    gap: 8,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  fallback: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  fallbackText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  fallbackSub: {
    color: '#64748B',
    fontSize: 11,
  },
});
