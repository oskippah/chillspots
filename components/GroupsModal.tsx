import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import GroupChat from './GroupChat';

type Group = { id: string; name: string; invite_code: string; member_count?: number };
type Props = { visible: boolean; onClose: () => void };

export default function GroupsModal({ visible, onClose }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [naam, setNaam] = useState('');
  const [code, setCode] = useState('');
  const [bezig, setBezig] = useState(false);
  const [chatGroup, setChatGroup] = useState<{ id: string; name: string } | null>(null);

  async function laadGroepen() {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from('group_members')
      .select('groups(*)')
      .eq('user_id', uid);
    if (!data) return;
    const groupList = data.map((row: any) => row.groups).filter(Boolean) as Group[];
    // fetch member counts
    const withCounts = await Promise.all(
      groupList.map(async (g) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id);
        return { ...g, member_count: count ?? 0 };
      })
    );
    setGroups(withCounts);
  }

  useEffect(() => {
    if (visible) laadGroepen();
  }, [visible]);

  async function maakGroep() {
    if (!naam.trim()) { alert('Geef je groep een naam.'); return; }
    setBezig(true);
    const { data, error } = await supabase.rpc('create_group', { group_name: naam.trim() });
    setBezig(false);
    if (error) { alert('Aanmaken mislukt: ' + error.message); return; }
    setNaam('');
    alert('Groep gemaakt! 🎉\nDeel deze code:\n\n' + data);
    laadGroepen();
  }

  async function joinGroep() {
    if (!code.trim()) { alert('Vul een code in.'); return; }
    setBezig(true);
    const { data: g, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', code.trim().toLowerCase())
      .single();
    if (error || !g) { alert('Geen groep gevonden met die code.'); setBezig(false); return; }
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { error: e2 } = await supabase.from('group_members').insert({ group_id: g.id, user_id: uid });
    setBezig(false);
    if (e2) {
      alert(e2.message.includes('duplicate') ? 'Je zit al in deze groep.' : 'Joinen mislukt: ' + e2.message);
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
      alert(`Groep "${name}" is verwijderd (jij was het laatste lid).`);
    } else {
      const { error } = await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', uid);
      if (error) { alert('Verlaten mislukt: ' + error.message); return; }
      alert(`Je hebt "${name}" verlaten.`);
    }
    laadGroepen();
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.scrim} onPress={onClose}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.grip} />
              <Text style={styles.title}>Mijn groepen</Text>

              {groups.length === 0 && <Text style={styles.empty}>Je zit nog in geen enkele groep.</Text>}
              {groups.map((g) => (
                <View key={g.id} style={styles.groupRow}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupName}>👥 {g.name}</Text>
                    <Text style={styles.memberCount}>{g.member_count} {g.member_count === 1 ? 'lid' : 'leden'}</Text>
                  </View>
                  <Text style={styles.groupCode}>Code: {g.invite_code}</Text>
                  <View style={styles.groupActions}>
                    {(g.member_count ?? 0) > 1 && (
                      <Pressable style={styles.chatBtn} onPress={() => setChatGroup({ id: g.id, name: g.name })}>
                        <Text style={styles.chatBtnText}>💬 Chat</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.leaveBtn} onPress={() => verlaatGroep(g.id, g.name)}>
                      <Text style={styles.leaveText}>Verlaten</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <Text style={styles.section}>Nieuwe groep</Text>
              <TextInput style={styles.input} placeholder="Groepsnaam" value={naam} onChangeText={setNaam} />
              <Pressable style={styles.btn} onPress={maakGroep} disabled={bezig}>
                <Text style={styles.btnText}>Groep maken</Text>
              </Pressable>

              <Text style={styles.section}>Groep joinen</Text>
              <TextInput style={styles.input} placeholder="Uitnodigingscode" autoCapitalize="none" value={code} onChangeText={setCode} />
              <Pressable style={styles.btnSecondary} onPress={joinGroep} disabled={bezig}>
                <Text style={styles.btnText}>Joinen</Text>
              </Pressable>

              {bezig && <ActivityIndicator style={{ marginTop: 14 }} color="#2f855a" />}

              <Pressable style={styles.cancel} onPress={onClose} disabled={bezig}>
                <Text style={styles.cancelText}>Sluiten</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {chatGroup && (
        <GroupChat
          visible={!!chatGroup}
          groupId={chatGroup.id}
          groupName={chatGroup.name}
          onClose={() => setChatGroup(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(10,30,20,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, maxHeight: '88%' },
  grip: { width: 38, height: 5, backgroundColor: '#c6f6d5', borderRadius: 3, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a3a2d', marginBottom: 16 },
  empty: { fontSize: 14, color: '#68908a', marginBottom: 12 },
  groupRow: { backgroundColor: '#f0faf5', borderRadius: 18, padding: 14, marginBottom: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { fontSize: 16, fontWeight: '700', color: '#1a3a2d' },
  memberCount: { fontSize: 12, color: '#2f855a', fontWeight: '600', backgroundColor: '#c6f6d5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  groupCode: { fontSize: 13, color: '#68908a', marginTop: 4 },
  groupActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chatBtn: { backgroundColor: '#2f855a', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 14 },
  chatBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  leaveBtn: { backgroundColor: '#fff0f0', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 14 },
  leaveText: { color: '#c0392b', fontSize: 13, fontWeight: '700' },
  section: { fontSize: 11, fontWeight: '800', color: '#68908a', letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  input: { backgroundColor: '#f0faf5', borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 10, color: '#1a3a2d' },
  btn: { backgroundColor: '#2f855a', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 4 },
  btnSecondary: { backgroundColor: '#48bb78', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancel: { padding: 14, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#68908a', fontSize: 14, fontWeight: '700' },
});
