import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Bench } from '../types/bench';

export type { Bench };

// === BENCHMAP: alle kaart-logica zit HIER en nergens anders. ===
// Nu een placeholder. Later vervangen we alleen de binnenkant van
// dit bestand door de echte Apple Maps, zonder de rest aan te raken.

type Props = {
  benches: Bench[];
  onSelect: (bench: Bench) => void;
};

const BenchMap = React.memo(function BenchMap({ benches, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.fakeMap}>
        <Text style={styles.mapLabel}>🗺️ Kaart-placeholder</Text>
        <Text style={styles.mapHint}>
          Hier komt later Apple Maps. Tik op een bankje hieronder.
        </Text>
      </View>

      <ScrollView style={styles.list}>
        {benches.map((b) => (
          <Pressable key={b.id} style={styles.pin} onPress={() => onSelect(b)}>
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
  fakeMap: {
    height: 200, backgroundColor: '#c3cdbd', alignItems: 'center',
    justifyContent: 'center', margin: 16, borderRadius: 20,
  },
  mapLabel: { fontSize: 18, fontWeight: '800', color: '#3f4c2c' },
  mapHint: { fontSize: 13, color: '#5a6b3f', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  list: { flex: 1, paddingHorizontal: 16 },
  pin: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10, gap: 12,
  },
  pinIcon: { fontSize: 26 },
  pinTitle: { fontSize: 16, fontWeight: '700', color: '#2a2620' },
  pinSub: { fontSize: 13, color: '#8a8f7e', marginTop: 2 },
});
