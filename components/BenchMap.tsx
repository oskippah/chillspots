import * as Location from 'expo-location';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Bench } from '../types/bench';

export type { Bench };

// === BENCHMAP: alle kaart-logica zit HIER en nergens anders. ===
// Swap naar MapLibre later? Vervang alleen de binnenkant van dit bestand.

type Props = {
  benches: Bench[];
  onSelect: (bench: Bench) => void;
  onExpand?: () => void;
};

const BenchMap = React.memo(function BenchMap({ benches, onSelect, onExpand }: Props) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800
      );
    })();
  }, []);

  function focusBench(bench: Bench) {
    mapRef.current?.animateToRegion(
      { latitude: bench.lat, longitude: bench.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      400
    );
    onSelect(bench);
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: benches[0]?.lat ?? 52.3676,
          longitude: benches[0]?.lng ?? 4.9041,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {benches.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            onPress={() => onSelect(b)}
          >
            <Text style={styles.markerEmoji}>🪑</Text>
          </Marker>
        ))}
      </MapView>
      {onExpand && (
        <TouchableOpacity style={styles.expandBtn} onPress={onExpand}>
          <Text style={styles.expandIcon}>⛶</Text>
        </TouchableOpacity>
      )}
      </View>

      <ScrollView style={styles.list}>
        {benches.map((b) => (
          <Pressable key={b.id} style={styles.pin} onPress={() => focusBench(b)}>
            <Text style={styles.pinIcon}>🪑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinTitle}>{b.title}</Text>
              <Text style={styles.pinSub}>
                {b.hasTrash ? '🗑️ Vuilnisbak' : '🚫 Geen vuilnisbak'} · ❤️ {b.hearts}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

export default BenchMap;

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrapper: { margin: 16, borderRadius: 22, overflow: 'hidden', position: 'relative' },
  map: { height: 280 },
  expandBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  expandIcon: { fontSize: 18, color: '#2f855a' },
  markerEmoji: { fontSize: 28 },
  list: { flex: 1, paddingHorizontal: 16 },
  pin: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pinIcon: { fontSize: 26 },
  pinTitle: { fontSize: 16, fontWeight: '700', color: '#1a3a2d' },
  pinSub: { fontSize: 13, color: '#68908a', marginTop: 2 },
});
