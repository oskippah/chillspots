import type { Session } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import AuthScreen from '../../components/AuthScreen';
import BenchMap from '../../components/BenchMap';
import type { Bench } from '../../types/bench';
import GroupsModal from '../../components/GroupsModal';
import SettingsModal from '../../components/SettingsModal';
import ShareToGroup from '../../components/ShareToGroup';
import TrashToggle from '../../components/TrashToggle';
import { useBenches } from '../../hooks/useBenches';
import { supabase } from '../../lib/supabase';
import MapView, { Marker } from 'react-native-maps';

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<Bench | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBenchId, setShareBenchId] = useState<string | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const {
    benches, benchName, setBenchName, fotoBench, fotoView, hasTrash, bezig, likedIds,
    uploadVisibility, setUploadVisibility, uploadGroupId, setUploadGroupId, uploadGroups,
    laadBenches, laadUploadGroepen, maakFoto, slaBankjeOp, geefHartje, rapporteerBankje,
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
        <View>
          <Text style={styles.h1}>Chillspots</Text>
          <Text style={styles.sub}>{benches.length} bankjes in de buurt</Text>
        </View>
        <Pressable style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </Pressable>
      </View>

      <BenchMap
        benches={benches}
        onSelect={setSelected}
        onExpand={() => setMapFullscreen(true)}
      />

      <Pressable style={styles.fab} onPress={() => { laadUploadGroepen(); setUploadOpen(true); }}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* fullscreen map */}
      <Modal visible={mapFullscreen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <MapView
            style={{ flex: 1 }}
            showsUserLocation
            initialRegion={{
              latitude: benches[0]?.lat ?? 52.3676,
              longitude: benches[0]?.lng ?? 4.9041,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {benches.map((b) => (
              <Marker
                key={b.id}
                coordinate={{ latitude: b.lat, longitude: b.lng }}
                onPress={() => { setMapFullscreen(false); setTimeout(() => setSelected(b), 300); }}
              >
                <Text style={{ fontSize: 28 }}>🪑</Text>
              </Marker>
            ))}
          </MapView>
          <Pressable style={styles.mapCloseBtn} onPress={() => setMapFullscreen(false)}>
            <Text style={styles.mapCloseBtnText}>✕</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      {/* detail-popup */}
      <Modal visible={!!selected} transparent animationType="slide">
        <Pressable style={styles.scrim} onPress={() => setSelected(null)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
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
              {selected && !selected.isPublic && selected.uploaderUsername && (
                <Text style={styles.sheetMeta}>👤 {selected.uploaderUsername}</Text>
              )}
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* upload-scherm */}
      <Modal visible={uploadOpen} transparent animationType="slide">
        <Pressable style={styles.scrim} onPress={() => !bezig && setUploadOpen(false)}>
          <Pressable onPress={() => {}} style={styles.uploadSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.grip} />
              <Text style={styles.sheetTitle}>Nieuw bankje</Text>

              <TextInput
                style={styles.nameInput}
                placeholder="Naam (max 40 tekens)"
                value={benchName}
                onChangeText={setBenchName}
                maxLength={40}
                autoCapitalize="none"
              />

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

              <View style={styles.visibilityRow}>
                <Pressable
                  style={[styles.visBtn, uploadVisibility === 'public' && styles.visBtnActive]}
                  onPress={() => { setUploadVisibility('public'); setUploadGroupId(null); }}
                >
                  <Text style={[styles.visBtnText, uploadVisibility === 'public' && styles.visBtnTextActive]}>🌍 Openbaar</Text>
                </Pressable>
                <Pressable
                  style={[styles.visBtn, uploadVisibility === 'group' && styles.visBtnActive]}
                  onPress={() => setUploadVisibility('group')}
                >
                  <Text style={[styles.visBtnText, uploadVisibility === 'group' && styles.visBtnTextActive]}>👥 Groep</Text>
                </Pressable>
              </View>

              {uploadVisibility === 'group' && (
                uploadGroups.length === 0
                  ? <Text style={styles.noGroupsText}>Je zit nog in geen groepen.</Text>
                  : uploadGroups.map(g => (
                    <Pressable
                      key={g.id}
                      style={[styles.groupPickerItem, uploadGroupId === g.id && styles.groupPickerItemActive]}
                      onPress={() => setUploadGroupId(g.id)}
                    >
                      <Text style={[styles.groupPickerText, uploadGroupId === g.id && styles.groupPickerTextActive]}>{g.name}</Text>
                    </Pressable>
                  ))
              )}

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
          </Pressable>
        </Pressable>
      </Modal>

      <ShareToGroup
        visible={shareOpen}
        benchId={shareBenchId}
        onClose={() => setShareOpen(false)}
      />

      <GroupsModal visible={groupsOpen} onClose={() => setGroupsOpen(false)} />

      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenGroups={() => { setSettingsOpen(false); setTimeout(() => setGroupsOpen(true), 300); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f0faf5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8,
  },
  h1: { fontSize: 26, fontWeight: '800', color: '#1a3a2d' },
  sub: { fontSize: 13, color: '#68908a', marginTop: 2 },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingsBtnText: { fontSize: 20 },
  fab: {
    position: 'absolute', bottom: 30, right: 20, width: 58, height: 58,
    borderRadius: 29, backgroundColor: '#2f855a', alignItems: 'center',
    justifyContent: 'center', elevation: 6, shadowColor: '#000',
    shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
  mapCloseBtn: {
    position: 'absolute', top: 60, right: 20, width: 42, height: 42,
    borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  mapCloseBtnText: { fontSize: 16, color: '#1a3a2d', fontWeight: '700' },
  scrim: { flex: 1, backgroundColor: 'rgba(10,30,20,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, overflow: 'hidden' },
  detailPhoto: { width: '100%', height: 200 },
  detailPhotoView: { width: '100%', height: 140, marginTop: 2 },
  sheetContent: { padding: 24 },
  uploadSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, maxHeight: '88%' },
  grip: { width: 38, height: 5, backgroundColor: '#c6f6d5', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#1a3a2d', marginBottom: 16 },
  sheetMeta: { fontSize: 14, color: '#276749', marginBottom: 6 },
  heartBtn: { backgroundColor: '#fc8181', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 16 },
  heartBtnLiked: { backgroundColor: '#e53e3e' },
  heartBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  shareBtn: { backgroundColor: '#2f855a', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10 },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reportBtn: { backgroundColor: '#fff0f0', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10 },
  reportBtnText: { color: '#c0392b', fontSize: 15, fontWeight: '700' },
  fotoBtn: { backgroundColor: '#f0faf5', borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  fotoBtnText: { fontSize: 15, fontWeight: '700', color: '#2f855a' },
  fotoPreview: { width: '100%', height: 160, borderRadius: 10 },
  saveBtn: { backgroundColor: '#2f855a', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#68908a', fontSize: 14, fontWeight: '700' },
  nameInput: { backgroundColor: '#f0faf5', borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 12, color: '#1a3a2d' },
  visibilityRow: { flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 4 },
  visBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: '#f0faf5' },
  visBtnActive: { backgroundColor: '#2f855a' },
  visBtnText: { fontSize: 14, fontWeight: '700', color: '#276749' },
  visBtnTextActive: { color: '#fff' },
  groupPickerItem: { backgroundColor: '#f0faf5', borderRadius: 12, padding: 12, marginBottom: 8 },
  groupPickerItemActive: { backgroundColor: '#48bb78' },
  groupPickerText: { fontSize: 14, fontWeight: '600', color: '#1a3a2d' },
  groupPickerTextActive: { color: '#fff' },
  noGroupsText: { fontSize: 13, color: '#68908a', textAlign: 'center', marginBottom: 12 },
});
