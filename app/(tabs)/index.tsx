import type { Session } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import AuthScreen from '../../components/AuthScreen';
import BenchMap from '../../components/BenchMap';
import type { Bench } from '../../types/bench';
import GroupsModal from '../../components/GroupsModal';
import ShareToGroup from '../../components/ShareToGroup';
import TrashToggle from '../../components/TrashToggle';
import { useBenches } from '../../hooks/useBenches';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<Bench | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBenchId, setShareBenchId] = useState<string | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const {
    benches, fotoBench, fotoView, hasTrash, bezig, likedIds,
    laadBenches, maakFoto, slaBankjeOp, geefHartje, rapporteerBankje,
    setHasTrash,
  } = useBenches();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) laadBenches();
  }, [session]);

  if (!session) return <AuthScreen />;

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.header}>
        <Text style={styles.h1}>Chillspots</Text>
        <Text style={styles.sub}>{benches.length} bankjes in de buurt</Text>
      </View>

      <BenchMap benches={benches} onSelect={setSelected} />

      <Pressable style={styles.fab} onPress={() => setUploadOpen(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <Pressable style={styles.groupsBtn} onPress={() => setGroupsOpen(true)}>
        <Text style={styles.groupsText}>👥 Groepen</Text>
      </Pressable>
      <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Uitloggen</Text>
      </Pressable>

      {/* detail-popup */}
      <Modal visible={!!selected} transparent animationType="slide">
        <Pressable style={styles.scrim} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <View style={[styles.grip, { marginTop: 12 }]} />
            {selected?.photoBench && (
              <Image source={{ uri: selected.photoBench }} style={styles.detailPhoto} contentFit="cover" />
            )}
            {selected?.photoView && (
              <Image source={{ uri: selected.photoView }} style={styles.detailPhotoView} contentFit="cover" />
            )}
            <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>{selected?.title}</Text>
            <Text style={styles.sheetMeta}>
              {selected?.hasTrash ? '🗑️ Vuilnisbak aanwezig' : '🚫 Geen vuilnisbak'}
            </Text>
            <Text style={styles.sheetMeta}>❤️ {selected?.hearts} hartjes</Text>
            <Pressable
              style={[styles.heartBtn, selected && likedIds.has(selected.id) && styles.heartBtnLiked]}
              onPress={() => selected && geefHartje(selected.id)}
            >
              <Text style={styles.heartBtnText}>
                {selected && likedIds.has(selected.id) ? '❤️ Geliked' : '🤍 Geef een hartje'}
              </Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={() => {
              setShareBenchId(selected?.id ?? null);
              setSelected(null);
              setShareOpen(true);
            }}>
              <Text style={styles.shareBtnText}>👥 Deel met groep</Text>
            </Pressable>
            <Pressable style={styles.reportBtn} onPress={() => {
              const id = selected?.id;
              Alert.alert('Bankje rapporteren', 'Weet je zeker dat je dit bankje wilt rapporteren?', [
                { text: 'Annuleren', style: 'cancel' },
                { text: 'Rapporteer', style: 'destructive', onPress: () => { setSelected(null); rapporteerBankje(id!); } },
              ]);
            }}>
              <Text style={styles.reportBtnText}>⚠️ Rapporteer</Text>
            </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* upload-scherm */}
      <Modal visible={uploadOpen} transparent animationType="slide">
        <View style={styles.scrim}>
          <View style={styles.uploadSheet}>
            <ScrollView>
              <View style={styles.grip} />
              <Text style={styles.sheetTitle}>Nieuw bankje</Text>

              <Pressable style={styles.fotoBtn} onPress={() => maakFoto('bench')}>
                {fotoBench
                  ? <Image source={{ uri: fotoBench }} style={styles.fotoPreview} />
                  : <Text style={styles.fotoBtnText}>📷 Foto van het bankje</Text>}
              </Pressable>

              <Pressable style={styles.fotoBtn} onPress={() => maakFoto('view')}>
                {fotoView
                  ? <Image source={{ uri: fotoView }} style={styles.fotoPreview} />
                  : <Text style={styles.fotoBtnText}>🌄 Foto van het uitzicht</Text>}
              </Pressable>

              <TrashToggle value={hasTrash} onChange={setHasTrash} />

              <Pressable
                style={[styles.saveBtn, bezig && { opacity: 0.5 }]}
                onPress={async () => { const ok = await slaBankjeOp(); if (ok) setUploadOpen(false); }}
                disabled={bezig}
              >
                <Text style={styles.saveBtnText}>{bezig ? 'Bezig...' : 'Bankje opslaan'}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setUploadOpen(false)} disabled={bezig}>
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ShareToGroup
        visible={shareOpen}
        benchId={shareBenchId}
        onClose={() => setShareOpen(false)}
      />

      <GroupsModal visible={groupsOpen} onClose={() => setGroupsOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#dfe7df' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  h1: { fontSize: 26, fontWeight: '800', color: '#3f4c2c' },
  sub: { fontSize: 13, color: '#6f7567', marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 30, right: 20, width: 58, height: 58,
    borderRadius: 29, backgroundColor: '#3f4c2c', alignItems: 'center',
    justifyContent: 'center', elevation: 6, shadowColor: '#000',
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
  groupsBtn: {
    position: 'absolute', top: 50, left: 20, backgroundColor: '#fff',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  groupsText: { color: '#5a6b3f', fontSize: 13, fontWeight: '700' },
  logout: {
    position: 'absolute', top: 50, right: 20, backgroundColor: '#fff',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  logoutText: { color: '#5a6b3f', fontSize: 13, fontWeight: '700' },
  scrim: { flex: 1, backgroundColor: 'rgba(20,18,14,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f3f1e9', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 40, overflow: 'hidden' },
  detailPhoto: { width: '100%', height: 200 },
  detailPhotoView: { width: '100%', height: 140, marginTop: 2 },
  sheetContent: { padding: 24 },
  uploadSheet: { backgroundColor: '#f3f1e9', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  grip: { width: 38, height: 5, backgroundColor: '#cdd2c4', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 21, fontWeight: '800', color: '#3f4c2c', marginBottom: 16 },
  sheetMeta: { fontSize: 14, color: '#56603f', marginBottom: 6 },
  heartBtn: { backgroundColor: '#e8645a', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 16 },
  heartBtnLiked: { backgroundColor: '#b84038' },
  heartBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  shareBtn: { backgroundColor: '#5a6b3f', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10 },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reportBtn: { backgroundColor: '#f1e2e0', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10 },
  reportBtnText: { color: '#a85048', fontSize: 15, fontWeight: '700' },
  fotoBtn: { backgroundColor: '#e6e9df', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  fotoBtnText: { fontSize: 15, fontWeight: '700', color: '#56603f' },
  fotoPreview: { width: '100%', height: 160, borderRadius: 10 },
  saveBtn: { backgroundColor: '#3f4c2c', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#8a8f7e', fontSize: 14, fontWeight: '700' },
});
