import React, { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenGroups: () => void;
};

export default function SettingsModal({ visible, onClose, onOpenGroups }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      setEmail(data.user?.email ?? null);
      if (uid) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', uid).single();
        setUsername(profile?.username ?? null);
      }
    })();
  }, [visible]);

  async function uitloggen() {
    onClose();
    await supabase.auth.signOut();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.grip} />

          <Text style={styles.title}>Instellingen</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{username?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{username ?? '—'}</Text>
              <Text style={styles.profileEmail}>{email ?? ''}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>SOCIAAL</Text>

          <Pressable style={styles.row} onPress={() => { onClose(); setTimeout(onOpenGroups, 300); }}>
            <Text style={styles.rowIcon}>👥</Text>
            <Text style={styles.rowLabel}>Groepen</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>ACCOUNT</Text>

          <Pressable style={[styles.row, styles.rowDanger]} onPress={uitloggen}>
            <Text style={styles.rowIcon}>🚪</Text>
            <Text style={styles.rowLabelDanger}>Uitloggen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(10,30,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
  },
  grip: { width: 38, height: 5, backgroundColor: '#c6f6d5', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a3a2d', marginBottom: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f0faf5', borderRadius: 18, padding: 16, marginBottom: 24,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2f855a',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileName: { fontSize: 17, fontWeight: '700', color: '#1a3a2d' },
  profileEmail: { fontSize: 13, color: '#68908a', marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#68908a', letterSpacing: 1,
    marginBottom: 8, marginTop: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fdf9',
    borderRadius: 16, padding: 16, marginBottom: 8, gap: 12,
  },
  rowDanger: { backgroundColor: '#fff0f0' },
  rowIcon: { fontSize: 20 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a3a2d' },
  rowLabelDanger: { flex: 1, fontSize: 16, fontWeight: '600', color: '#c0392b' },
  rowChevron: { fontSize: 22, color: '#a0c4b0', fontWeight: '300' },
});
