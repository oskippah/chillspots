import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { value: boolean; onChange: (v: boolean) => void };

export default function TrashToggle({ value, onChange }: Props) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 6,
      tension: 80,
    }).start();
  }, [value]);

  const knobLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [4, 34] });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E8ECE9', '#2F5D50'],
  });
  const knobScale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });

  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row}>
      <View style={styles.labelWrap}>
        <Text style={styles.icon}>🗑️</Text>
        <Text style={styles.label}>Is er een vuilnisbak?</Text>
      </View>
      <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
        <Animated.View
          style={[styles.knob, { left: knobLeft, transform: [{ scale: knobScale }] }]}
        >
          <Text style={styles.knobText}>{value ? '✓' : ''}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F7F8F5', borderRadius: 16, padding: 16, marginVertical: 6,
  },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 18 },
  label: { fontSize: 15, fontWeight: '600', color: '#17211C' },
  track: { width: 64, height: 34, borderRadius: 17, justifyContent: 'center' },
  knob: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  knobText: { color: '#2F5D50', fontSize: 14, fontWeight: '900' },
});