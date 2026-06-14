import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

type Group = { id: string; name: string };
type Props = { visible: boolean; benchId: string | null; onClose: () => void };

export default function ShareToGroup({ visible, benchId, onClose }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (!visible) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('group_members')
        .select('groups(id, name)')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setGroups(data.map((row: any) => row.groups).filter(Boolean) as Group[]);
        });
    });
  }, [visible]);

  async function deel(groupId: string, groupName: string) {
    if (!benchId) return;
    setBezig(true);
    const { error } = await supabase
      .from('bench_shares')
      .insert({ bench_id: benchId, group_id: groupId });
    setBezig(false);
    if (error) {
      if (error.message.includes('duplicate')) alert('Dit bankje is al gedeeld met die groep.');
      else alert('Delen mislukt: ' + error.message);
      return;
    }
    alert('Gedeeld met "' + groupName + '"! 🎉');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <ScrollView>
            <View style={styles.grip} />
            <Text style={styles.title}>Deel met een groep</Text>
            {groups.length === 0 && (
              <Text style={styles.empty}>Je zit nog in geen enkele groep.</Text>
            )}
            {groups.map((g) => (
              <Pressable key={g.id} style={styles.groupBtn} onPress={() => deel(g.id, g.name)} disabled={bezig}>
                <Text style={styles.groupText}>👥 {g.name}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.cancel} onPress={onClose} disabled={bezig}>
              <Text style={styles.cancelText}>Annuleren</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(20,18,14,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f3f1e9', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  grip: { width: 38, height: 5, backgroundColor: '#cdd2c4', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '800', color: '#3f4c2c', marginBottom: 14 },
  empty: { fontSize: 14, color: '#8a8f7e', marginBottom: 8 },
  groupBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8 },
  groupText: { fontSize: 16, fontWeight: '700', color: '#3f4c2c' },
  cancel: { padding: 14, alignItems: 'center', marginTop: 10 },
  cancelText: { color: '#8a8f7e', fontSize: 14, fontWeight: '700' },
});