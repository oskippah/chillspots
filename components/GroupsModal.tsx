import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

type Group = { id: string; name: string; invite_code: string };
type Props = { visible: boolean; onClose: () => void };

export default function GroupsModal({ visible, onClose }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [naam, setNaam] = useState('');
  const [code, setCode] = useState('');
  const [bezig, setBezig] = useState(false);

  async function laadGroepen() {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from('group_members')
      .select('groups(*)')
      .eq('user_id', uid);
    if (data) setGroups(data.map((row: any) => row.groups).filter(Boolean) as Group[]);
  }

  useEffect(() => {
    if (visible) laadGroepen();
  }, [visible]);

 async function maakGroep() {
    if (!naam.trim()) { alert('Geef je groep een naam.'); return; }
    setBezig(true);
    const { data, error } = await supabase.rpc('create_group', { group_name: naam.trim() });
    setBezig(false);
    if (error) {
      alert('Aanmaken mislukt: ' + error.message);
      return;
    }
    setNaam('');
    alert('Groep gemaakt! 🎉\nDeel deze code met je vrienden:\n\n' + data);
    laadGroepen();
  }
  async function joinGroep() {
    if (!code.trim()) { alert('Vul een code in.'); return; }
    setBezig(true);
    // groep zoeken op code
    const { data: g, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', code.trim().toLowerCase())
      .single();
    if (error || !g) {
      alert('Geen groep gevonden met die code.');
      setBezig(false);
      return;
    }
    // jezelf toevoegen
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { error: e2 } = await supabase
      .from('group_members')
      .insert({ group_id: g.id, user_id: uid });
    setBezig(false);
    if (e2) {
      if (e2.message.includes('duplicate')) alert('Je zit al in deze groep.');
      else alert('Joinen mislukt: ' + e2.message);
      return;
    }
    setCode('');
    alert('Je bent lid van "' + g.name + '"! 🎉');
    laadGroepen();
  }

  async function verlaatGroep(id: string, name: string) {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    if ((count ?? 0) === 1) {
      await supabase.from('bench_shares').delete().eq('group_id', id);
      await supabase.from('group_members').delete().eq('group_id', id);
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) { alert('Verlaten mislukt: ' + error.message); return; }
      alert(`Groep "${name}" is verwijderd omdat jij het laatste lid was.`);
    } else {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', uid);
      if (error) { alert('Verlaten mislukt: ' + error.message); return; }
      alert(`Je hebt "${name}" verlaten.`);
    }

    laadGroepen();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <ScrollView>
            <View style={styles.grip} />
            <Text style={styles.title}>Mijn groepen</Text>

            {groups.length === 0 && <Text style={styles.empty}>Je zit nog in geen enkele groep.</Text>}
            {groups.map((g) => (
              <View key={g.id} style={styles.groupRow}>
                <Text style={styles.groupName}>👥 {g.name}</Text>
                <Text style={styles.groupCode}>Code: {g.invite_code}</Text>
                <Pressable style={styles.leaveBtn} onPress={() => verlaatGroep(g.id, g.name)}>
                  <Text style={styles.leaveText}>Verlaten</Text>
                </Pressable>
              </View>
            ))}

            <Text style={styles.section}>Nieuwe groep maken</Text>
            <TextInput style={styles.input} placeholder="Groepsnaam" value={naam} onChangeText={setNaam} />
            <Pressable style={styles.btn} onPress={maakGroep} disabled={bezig}>
              <Text style={styles.btnText}>Groep maken</Text>
            </Pressable>

            <Text style={styles.section}>Groep joinen</Text>
            <TextInput style={styles.input} placeholder="Uitnodigingscode" autoCapitalize="none" value={code} onChangeText={setCode} />
            <Pressable style={styles.btnGreen} onPress={joinGroep} disabled={bezig}>
              <Text style={styles.btnText}>Joinen</Text>
            </Pressable>

            {bezig && <ActivityIndicator style={{ marginTop: 14 }} />}

            <Pressable style={styles.cancel} onPress={onClose} disabled={bezig}>
              <Text style={styles.cancelText}>Sluiten</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(20,18,14,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f3f1e9', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40, maxHeight: '88%' },
  grip: { width: 38, height: 5, backgroundColor: '#cdd2c4', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '800', color: '#3f4c2c', marginBottom: 14 },
  empty: { fontSize: 14, color: '#8a8f7e', marginBottom: 8 },
  groupRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8 },
  groupName: { fontSize: 16, fontWeight: '700', color: '#3f4c2c' },
  groupCode: { fontSize: 13, color: '#8a8f7e', marginTop: 2 },
  leaveBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#f1e2e0', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  leaveText: { color: '#a85048', fontSize: 12, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '800', color: '#56603f', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#fff', borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 10, color: '#2a2620' },
  btn: { backgroundColor: '#3f4c2c', borderRadius: 14, padding: 15, alignItems: 'center' },
  btnGreen: { backgroundColor: '#5a6b3f', borderRadius: 14, padding: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancel: { padding: 14, alignItems: 'center', marginTop: 10 },
  cancelText: { color: '#8a8f7e', fontSize: 14, fontWeight: '700' },
});