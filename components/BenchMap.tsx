import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Bench } from '../types/bench';

export type { Bench };

// === BENCHMAP: alle kaart-logica zit HIER en nergens anders. ===
// Swap naar MapLibre later? Vervang alleen de binnenkant van dit bestand.

type Props = {
  benches: Bench[];
  onSelect: (bench: Bench) => void;
};

const BenchMap = React.memo(function BenchMap({ benches, onSelect }: Props) {
  const mapRef = useRef<MapView>(null);

  function focusBench(bench: Bench) {
    mapRef.current?.animateToRegion(
      { latitude: bench.lat, longitude: bench.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      400
    );
    onSelect(bench);
  }

  return (
    <View style={styles.container}>
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
  map: { height: 280, margin: 16, borderRadius: 20, overflow: 'hidden' },
  markerEmoji: { fontSize: 28 },
  list: { flex: 1, paddingHorizontal: 16 },
  pin: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10, gap: 12,
  },
  pinIcon: { fontSize: 26 },
  pinTitle: { fontSize: 16, fontWeight: '700', color: '#2a2620' },
  pinSub: { fontSize: 13, color: '#8a8f7e', marginTop: 2 },
});
