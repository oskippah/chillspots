import type { Session } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AuthScreen from '../../components/AuthScreen';
import BenchMap from '../../components/BenchMap';
import type { Bench } from '../../types/bench';
import GroupsModal from '../../components/GroupsModal';
import ShareToGroup from '../../components/ShareToGroup';
import TrashToggle from '../../components/TrashToggle';
import { useBenches } from '../../hooks/useBenches';
import { supabase } from '../../lib/supabase';

// Design tokens
const C = {
  bg: '#F7F8F5',
  surface: '#FFFFFF',
  primary: '#2F5D50',
  primaryDark: '#1F433A',
  accent: '#A8C5B1',
  textPrimary: '#17211C',
  textSecondary: '#647067',
  danger: '#D65B5B',
  like: '#FF5F7A',
  border: '#E8ECE9',
};

const BENCH_TYPES = [
  { key: 'stadsbankje', label: 'Stadsbankje', emoji: '🏙️' },
  { key: 'leuning', label: 'Met leuning', emoji: '🪑' },
  { key: 'afdak', label: 'Met afdak', emoji: '⛺' },
  { key: 'picknicktafel', label: 'Picknicktafel', emoji: '🌿' },
];

const TYPE_MAP: Record<string, { emoji: string; label: string }> = Object.fromEntries(
  BENCH_TYPES.map(t => [t.key, { emoji: t.emoji, label: t.label }])
);

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number) {
  return m < 1000 ? Math.round(m) + 'm' : (m / 1000).toFixed(1) + 'km';
}

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'profile'>('discover');
  const [selected, setSelected] = useState<Bench | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBenchId, setShareBenchId] = useState<string | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Profile
  const [myUsername, setMyUsername] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [profileStats, setProfileStats] = useState({ spots: 0, likes: 0, since: '' });

  const {
    benches, benchName, setBenchName, fotoBench, fotoView, hasTrash, bezig, likedIds,
    uploadVisibility, setUploadVisibility, uploadGroupId, setUploadGroupId, uploadGroups,
    benchType, setBenchType,
    laadBenches, laadUploadGroepen, maakFoto, slaBankjeOp, geefHartje, rapporteerBankje,
    setHasTrash,
  } = useBenches();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    laadBenches();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyEmail(user.email ?? '');
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      setMyUsername(profile?.username ?? '');
    })();
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({}).then(l =>
          setUserLoc({ lat: l.coords.latitude, lng: l.coords.longitude })
        );
      }
    });
  }, [session]);

  useEffect(() => {
    if (activeTab !== 'profile') return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = new Date(user.created_at).getFullYear().toString();
      const { data: spots } = await supabase.from('benches').select('heart_count').eq('user_id', user.id);
      setProfileStats({
        spots: spots?.length ?? 0,
        likes: spots?.reduce((acc, b) => acc + (b.heart_count ?? 0), 0) ?? 0,
        since,
      });
    })();
  }, [activeTab]);

  if (!session) return <AuthScreen />;

  return (
    <SafeAreaView style={styles.app}>

      {/* ── DISCOVER TAB ── */}
      {activeTab === 'discover' && (
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.h1}>Chillspots</Text>
              <Text style={styles.sub}>{benches.length} spots in jouw buurt</Text>
            </View>
            <Pressable style={styles.avatarBtn} onPress={() => { Haptics.selectionAsync(); setActiveTab('profile'); }}>
              <Text style={styles.avatarBtnText}>{myUsername?.[0]?.toUpperCase() ?? '?'}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
            <BenchMap benches={benches} onSelect={setSelected} onExpand={() => setMapFullscreen(true)} />

            <View style={styles.listSection}>
              <Text style={styles.listHeader}>Spots in de buurt</Text>
              {benches.length === 0 && (
                <Text style={styles.listEmpty}>Nog geen spots. Voeg het eerste bankje toe!</Text>
              )}
              {benches.map(b => {
                const dist = userLoc ? haversine(userLoc.lat, userLoc.lng, b.lat, b.lng) : null;
                const typeInfo = TYPE_MAP[b.benchType] ?? { emoji: '🪑', label: b.benchType };
                return (
                  <Pressable key={b.id} style={styles.card} onPress={() => { Haptics.selectionAsync(); setSelected(b); }}>
                    {b.photoBench
                      ? <Image source={{ uri: b.photoBench }} style={styles.cardThumb} contentFit="cover" />
                      : <View style={[styles.cardThumb, styles.cardThumbEmpty]}><Text style={{ fontSize: 28 }}>🪑</Text></View>
                    }
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{b.title}</Text>
                      <View style={styles.cardRow}>
                        {dist !== null && <Text style={styles.cardMeta}>📍 {fmtDist(dist)}</Text>}
                        <Text style={styles.cardMeta}>{typeInfo.emoji} {typeInfo.label}</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardMeta}>{b.hasTrash ? '🗑️ Ja' : '🚫 Nee'}</Text>
                        <Text style={[styles.cardMeta, { color: C.like }]}>❤️ {b.hearts}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardChevron}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{myUsername?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={styles.profileName}>{myUsername}</Text>
            <Text style={styles.profileEmail}>{myEmail}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profileStats.spots}</Text>
                <Text style={styles.statLabel}>Spots</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profileStats.likes}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profileStats.since}</Text>
                <Text style={styles.statLabel}>Lid sinds</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileSections}>
            <Text style={styles.sectionLabel}>COMMUNITY</Text>
            <View style={styles.sectionCard}>
              <Pressable style={styles.settingRow} onPress={() => setGroupsOpen(true)}>
                <View style={[styles.settingIcon, { backgroundColor: '#EBF2EF' }]}>
                  <Text>👥</Text>
                </View>
                <Text style={styles.settingLabel}>Mijn groepen</Text>
                <Text style={styles.settingChevron}>›</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.sectionCard}>
              <Pressable style={styles.settingRow} onPress={() => {
                Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
                  { text: 'Annuleren', style: 'cancel' },
                  { text: 'Uitloggen', style: 'destructive', onPress: () => supabase.auth.signOut() },
                ]);
              }}>
                <View style={[styles.settingIcon, { backgroundColor: '#FDECEA' }]}>
                  <Text>🚪</Text>
                </View>
                <Text style={[styles.settingLabel, { color: C.danger }]}>Uitloggen</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── FULLSCREEN MAP ── */}
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
            {benches.map(b => (
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

      {/* ── BENCH DETAIL ── */}
      <Modal visible={!!selected} transparent animationType="slide">
        <Pressable style={styles.scrim} onPress={() => setSelected(null)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.grip} />
            {selected?.photoBench && (
              <Image source={{ uri: selected.photoBench }} style={styles.detailPhoto} contentFit="cover" />
            )}
            {selected?.photoView && (
              <Image source={{ uri: selected.photoView }} style={styles.detailPhotoView} contentFit="cover" />
            )}
            <View style={styles.sheetPad}>
              <Text style={styles.sheetTitle}>{selected?.title}</Text>
              {selected?.benchType && (
                <Text style={styles.sheetMeta}>
                  {TYPE_MAP[selected.benchType]?.emoji ?? '🪑'} {TYPE_MAP[selected.benchType]?.label ?? selected.benchType}
                </Text>
              )}
              <Text style={styles.sheetMeta}>{selected?.hasTrash ? '🗑️ Vuilnisbak aanwezig' : '🚫 Geen vuilnisbak'}</Text>
              {selected && !selected.isPublic && selected.uploaderUsername && (
                <Text style={styles.sheetMeta}>👤 {selected.uploaderUsername}</Text>
              )}

              <Pressable
                style={[styles.likeBtn, selected && likedIds.has(selected.id) && styles.likeBtnActive]}
                onPress={() => {
                  if (selected) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    geefHartje(selected.id);
                  }
                }}
              >
                <Text style={styles.likeBtnText}>
                  {selected && likedIds.has(selected.id) ? '❤️ Geliked' : '🤍 Geef een hartje'}
                </Text>
                <Text style={styles.likeBtnCount}>{selected?.hearts}</Text>
              </Pressable>

              <View style={styles.sheetActions}>
                <Pressable style={styles.actionBtn} onPress={() => {
                  setShareBenchId(selected?.id ?? null);
                  setSelected(null);
                  setShareOpen(true);
                }}>
                  <Text style={styles.actionBtnText}>👥 Deel</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: '#FEF0F0' }]} onPress={() => {
                  const id = selected?.id;
                  Alert.alert('Bankje rapporteren', 'Weet je zeker dat je dit bankje wilt rapporteren?', [
                    { text: 'Annuleren', style: 'cancel' },
                    { text: 'Rapporteer', style: 'destructive', onPress: () => { setSelected(null); rapporteerBankje(id!); } },
                  ]);
                }}>
                  <Text style={[styles.actionBtnText, { color: C.danger }]}>⚠️ Rapporteer</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── UPLOAD MODAL ── */}
      <Modal visible={uploadOpen} transparent animationType="slide">
        <Pressable style={styles.scrim} onPress={() => !bezig && setUploadOpen(false)}>
          <Pressable onPress={() => {}} style={styles.uploadSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.grip} />
              <Text style={styles.uploadTitle}>Spot toevoegen</Text>

              {userLoc && (
                <View style={styles.uploadMapWrap}>
                  <MapView
                    style={{ flex: 1 }}
                    pointerEvents="none"
                    region={{ latitude: userLoc.lat, longitude: userLoc.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
                    showsUserLocation
                  />
                  <View style={styles.uploadMapPin}>
                    <Text style={{ fontSize: 28 }}>📍</Text>
                  </View>
                </View>
              )}

              <Text style={styles.uploadLabel}>TYPE BANKJE</Text>
              <View style={styles.typeGrid}>
                {BENCH_TYPES.map(t => (
                  <Pressable
                    key={t.key}
                    style={[styles.typeCard, benchType === t.key && styles.typeCardActive]}
                    onPress={() => setBenchType(t.key)}
                  >
                    <Text style={styles.typeEmoji}>{t.emoji}</Text>
                    <Text style={[styles.typeLabel, benchType === t.key && styles.typeLabelActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.uploadLabel}>FOTO'S</Text>
              <Pressable style={styles.photoCard} onPress={() => maakFoto('bench')}>
                {fotoBench
                  ? <Image source={{ uri: fotoBench }} style={styles.photoPreview} contentFit="cover" />
                  : (
                    <View style={styles.photoCardInner}>
                      <Text style={styles.photoCardIcon}>📷</Text>
                      <Text style={styles.photoCardLabel}>Foto van het bankje</Text>
                      <Text style={styles.photoCardSub}>Verplicht</Text>
                    </View>
                  )
                }
              </Pressable>
              <Pressable style={styles.photoCard} onPress={() => maakFoto('view')}>
                {fotoView
                  ? <Image source={{ uri: fotoView }} style={styles.photoPreview} contentFit="cover" />
                  : (
                    <View style={styles.photoCardInner}>
                      <Text style={styles.photoCardIcon}>🌅</Text>
                      <Text style={styles.photoCardLabel}>Foto van het uitzicht</Text>
                      <Text style={styles.photoCardSub}>Optioneel</Text>
                    </View>
                  )
                }
              </Pressable>

              <Text style={styles.uploadLabel}>DETAILS</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Naam van de spot"
                placeholderTextColor={C.textSecondary}
                value={benchName}
                onChangeText={setBenchName}
                maxLength={40}
                autoCapitalize="none"
              />
              <TrashToggle value={hasTrash} onChange={setHasTrash} />

              <Text style={styles.uploadLabel}>ZICHTBAARHEID</Text>
              <View style={styles.segControl}>
                <Pressable
                  style={[styles.seg, uploadVisibility === 'public' && styles.segActive]}
                  onPress={() => { setUploadVisibility('public'); setUploadGroupId(null); }}
                >
                  <Text style={[styles.segText, uploadVisibility === 'public' && styles.segTextActive]}>🌍 Openbaar</Text>
                </Pressable>
                <Pressable
                  style={[styles.seg, uploadVisibility === 'group' && styles.segActive]}
                  onPress={() => setUploadVisibility('group')}
                >
                  <Text style={[styles.segText, uploadVisibility === 'group' && styles.segTextActive]}>👥 Alleen groep</Text>
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
                      <Text style={[styles.groupPickerText, uploadGroupId === g.id && { color: C.primaryDark, fontWeight: '700' }]}>
                        {g.name}
                      </Text>
                    </Pressable>
                  ))
              )}

              <Pressable
                style={[styles.ctaBtn, bezig && { opacity: 0.5 }]}
                onPress={async () => { const ok = await slaBankjeOp(); if (ok) setUploadOpen(false); }}
                disabled={bezig}
              >
                <Text style={styles.ctaBtnText}>{bezig ? 'Bezig...' : 'Spot delen'}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setUploadOpen(false)} disabled={bezig}>
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ShareToGroup visible={shareOpen} benchId={shareBenchId} onClose={() => setShareOpen(false)} />
      <GroupsModal visible={groupsOpen} onClose={() => setGroupsOpen(false)} />

      {/* ── BOTTOM TAB BAR ── */}
      <View style={styles.tabBar}>
        <Pressable style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setActiveTab('discover'); }}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'discover' && styles.tabLabelActive]}>Ontdekken</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          laadUploadGroepen();
          setUploadOpen(true);
        }}>
          <View style={styles.tabAddBtn}>
            <Text style={styles.tabAddText}>+</Text>
          </View>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setGroupsOpen(true); }}>
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={styles.tabLabel}>Groepen</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setActiveTab('profile'); }}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profiel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  h1: { fontSize: 28, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: C.textSecondary, marginTop: 1 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Spot cards
  listSection: { paddingHorizontal: 16, paddingTop: 4 },
  listHeader: { fontSize: 12, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' },
  listEmpty: { fontSize: 14, color: C.textSecondary, textAlign: 'center', paddingVertical: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 20, padding: 12, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardThumb: { width: 72, height: 72, borderRadius: 14 },
  cardThumbEmpty: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardMeta: { fontSize: 12, color: C.textSecondary },
  cardChevron: { fontSize: 24, color: C.border, fontWeight: '200' },

  // Profile
  profileCard: { margin: 16, backgroundColor: C.surface, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  profileAvatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  profileEmail: { fontSize: 13, color: C.textSecondary, marginTop: 4, marginBottom: 22 },
  statsRow: { flexDirection: 'row', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  statLabel: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: C.border, alignSelf: 'center' },
  profileSections: { paddingHorizontal: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  sectionCard: { backgroundColor: C.surface, borderRadius: 20, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  settingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: C.textPrimary },
  settingChevron: { fontSize: 22, color: C.accent },

  // Map
  mapCloseBtn: { position: 'absolute', top: 60, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  mapCloseBtnText: { fontSize: 16, color: C.textPrimary, fontWeight: '700' },

  // Modals
  scrim: { flex: 1, backgroundColor: 'rgba(10,25,20,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, overflow: 'hidden' },
  uploadSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, maxHeight: '92%' },
  grip: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  // Detail
  detailPhoto: { width: '100%', height: 220 },
  detailPhotoView: { width: '100%', height: 160, marginTop: 2 },
  sheetPad: { padding: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  sheetMeta: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.like, borderRadius: 18, padding: 17, marginTop: 20 },
  likeBtnActive: { backgroundColor: '#C0392B' },
  likeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  likeBtnCount: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: C.bg, borderRadius: 16, padding: 14, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Upload
  uploadTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 18 },
  uploadMapWrap: { height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  uploadMapPin: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  uploadLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  photoCard: { borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 18, marginBottom: 12, overflow: 'hidden', height: 140 },
  photoCardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoCardIcon: { fontSize: 32 },
  photoCardLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  photoCardSub: { fontSize: 12, color: C.textSecondary },
  photoPreview: { width: '100%', height: 140 },
  nameInput: { backgroundColor: C.bg, borderRadius: 16, padding: 16, fontSize: 15, marginBottom: 10, color: C.textPrimary },
  segControl: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 16, padding: 4, marginBottom: 12 },
  seg: { flex: 1, borderRadius: 13, padding: 12, alignItems: 'center' },
  segActive: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  segTextActive: { color: C.primary, fontWeight: '700' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  typeCard: { width: '47%', backgroundColor: C.bg, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  typeCardActive: { borderColor: C.primary, backgroundColor: '#EBF2EF' },
  typeEmoji: { fontSize: 34, marginBottom: 8 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  typeLabelActive: { color: C.primary },
  groupPickerItem: { backgroundColor: C.bg, borderRadius: 14, padding: 14, marginBottom: 8 },
  groupPickerItemActive: { backgroundColor: C.accent },
  groupPickerText: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  noGroupsText: { fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 12 },
  ctaBtn: { backgroundColor: C.primary, borderRadius: 18, padding: 17, alignItems: 'center', marginTop: 20 },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },

  // Bottom tab bar
  tabBar: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 30, paddingVertical: 8, paddingHorizontal: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabLabel: { fontSize: 10, color: C.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: C.primary },
  tabAddBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: -20,
    shadowColor: C.primary, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  tabAddText: { color: '#fff', fontSize: 32, fontWeight: '200', lineHeight: 38 },
});
