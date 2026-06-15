import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import type { Bench } from '../types/bench';
import { supabase } from '../lib/supabase';

function afstandMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type UploadGroup = { id: string; name: string };

export function useBenches() {
  const [benches, setBenches] = useState<Bench[]>([]);
  const [benchName, setBenchName] = useState('');
  const [fotoBench, setFotoBench] = useState<string | null>(null);
  const [fotoView, setFotoView] = useState<string | null>(null);
  const [hasTrash, setHasTrash] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [uploadVisibility, setUploadVisibility] = useState<'public' | 'group'>('public');
  const [uploadGroupId, setUploadGroupId] = useState<string | null>(null);
  const [uploadGroups, setUploadGroups] = useState<UploadGroup[]>([]);

  async function laadUploadGroepen() {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from('group_members')
      .select('groups(id, name)')
      .eq('user_id', uid);
    if (data) {
      setUploadGroups(data.flatMap((r: any) => r.groups ? [{ id: r.groups.id, name: r.groups.name }] : []));
    }
  }

  async function laadGelikedIds() {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const { data } = await supabase.from('bench_likes').select('bench_id').eq('user_id', uid);
    if (data) setLikedIds(new Set(data.map((r: any) => r.bench_id)));
  }

  async function laadBenches() {
    const [{ data, error }] = await Promise.all([
      supabase
        .from('benches')
        .select('id, lat, lng, has_trash, heart_count, photo_bench, photo_view, name, is_public, uploader_username')
        .order('heart_count', { ascending: false }),
      laadGelikedIds(),
    ]);
    if (!error && data) {
      setBenches(
        data.map((b: any) => ({
          id: b.id,
          title: b.name ?? 'Bankje',
          lat: b.lat,
          lng: b.lng,
          hasTrash: b.has_trash,
          hearts: b.heart_count,
          photoBench: b.photo_bench ?? null,
          photoView: b.photo_view ?? null,
          isPublic: b.is_public ?? true,
          uploaderUsername: b.uploader_username ?? null,
        }))
      );
    }
  }

  async function maakFoto(welke: 'bench' | 'view') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { alert('Geen toestemming voor de camera.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;
    if (welke === 'bench') setFotoBench(result.assets[0].uri);
    else setFotoView(result.assets[0].uri);
  }

  async function uploadFoto(uri: string): Promise<string | null> {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const naam = `foto-${Date.now()}-${Math.round(Math.random() * 1000)}.jpg`;
    const { error } = await supabase.storage
      .from('bench-photos')
      .upload(naam, arrayBuffer, { contentType: 'image/jpeg' });
    if (error) { alert('Foto-upload mislukt: ' + error.message); return null; }
    const { data } = supabase.storage.from('bench-photos').getPublicUrl(naam);
    return data.publicUrl;
  }

  async function slaBankjeOp(): Promise<boolean> {
    if (!fotoBench) { alert('Maak eerst een foto van het bankje.'); return false; }
    const trimmedName = benchName.trim();
    if (!trimmedName.toLowerCase().includes('bankje')) {
      alert('De naam moet het woord "bankje" bevatten.');
      return false;
    }
    if (trimmedName.length > 40) {
      alert('Naam mag maximaal 40 tekens zijn.');
      return false;
    }
    setBezig(true);
    try {
      const { data: kanUploaden } = await supabase.rpc('can_upload_bench');
      if (!kanUploaden) {
        alert('Je hebt vandaag al 3 bankjes toegevoegd. Probeer morgen opnieuw.');
        setBezig(false);
        return false;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { alert('Geen toestemming voor locatie.'); setBezig(false); return false; }
      const loc = await Location.getCurrentPositionAsync({});
      const dichtbij = benches.find(
        (b) => afstandMeters(loc.coords.latitude, loc.coords.longitude, b.lat, b.lng) < 15
      );
      if (dichtbij) {
        alert('Er staat hier al een bankje (binnen 15 meter). Geen nieuw bankje toegevoegd.');
        setBezig(false);
        return false;
      }
      const benchUrl = await uploadFoto(fotoBench);
      const viewUrl = fotoView ? await uploadFoto(fotoView) : null;
      if (!benchUrl) { setBezig(false); return false; }
      const user = (await supabase.auth.getUser()).data.user;
      const uid = user?.id;
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', uid).single();
      const uploaderUsername = uploadVisibility === 'public' ? null : (profile?.username ?? null);
      const { data: insertedBench, error } = await supabase.from('benches').insert({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        has_trash: hasTrash,
        photo_bench: benchUrl,
        photo_view: viewUrl,
        user_id: uid,
        name: trimmedName,
        is_public: uploadVisibility === 'public',
        uploader_username: uploaderUsername,
      }).select('id').single();
      if (error) { alert('Opslaan mislukt: ' + error.message); setBezig(false); return false; }
      if (uploadVisibility === 'group' && uploadGroupId && insertedBench?.id) {
        await supabase.from('bench_shares').insert({ bench_id: insertedBench.id, group_id: uploadGroupId });
      }
      alert('Bankje toegevoegd! 🎉');
      setFotoBench(null);
      setFotoView(null);
      setHasTrash(false);
      setBenchName('');
      setUploadVisibility('public');
      setUploadGroupId(null);
      await laadBenches();
      setBezig(false);
      return true;
    } catch (e: any) {
      alert('Er ging iets mis: ' + e.message);
      setBezig(false);
      return false;
    }
  }

  async function geefHartje(benchId: string) {
    if (likedIds.has(benchId)) return;
    setLikedIds(prev => new Set(prev).add(benchId));
    setBenches(prev => prev.map(b => b.id === benchId ? { ...b, hearts: b.hearts + 1 } : b));
    const { data: gelukt, error } = await supabase.rpc('increment_heart', { bench_id_input: benchId });
    if (error || gelukt === false) {
      setLikedIds(prev => { const s = new Set(prev); s.delete(benchId); return s; });
      setBenches(prev => prev.map(b => b.id === benchId ? { ...b, hearts: b.hearts - 1 } : b));
      if (gelukt === false) alert('Je hebt dit bankje al geliked.');
      else alert('Hartje geven mislukt: ' + error?.message);
    }
  }

  async function rapporteerBankje(benchId: string) {
    const { error } = await supabase.rpc('report_bench', { bench_id_input: benchId });
    if (error) { alert('Rapporteren mislukt: ' + error.message); return; }
    alert('Bankje gerapporteerd. Na 5 rapportages wordt het automatisch verwijderd.');
    await laadBenches();
  }

  return {
    benches,
    benchName, setBenchName,
    fotoBench, setFotoBench,
    fotoView, setFotoView,
    hasTrash, setHasTrash,
    bezig,
    likedIds,
    uploadVisibility, setUploadVisibility,
    uploadGroupId, setUploadGroupId,
    uploadGroups,
    laadBenches,
    laadUploadGroepen,
    maakFoto,
    slaBankjeOp,
    geefHartje,
    rapporteerBankje,
  };
}

/*
  Voer dit uit in de Supabase SQL editor:

  -- 1. bench_likes tabel (voorkomt dubbel liken)
  CREATE TABLE IF NOT EXISTS bench_likes (
    bench_id uuid REFERENCES benches(id) ON DELETE CASCADE,
    user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (bench_id, user_id)
  );

  -- 2. increment_heart: returns false bij duplicate
  CREATE OR REPLACE FUNCTION increment_heart(bench_id_input uuid)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    INSERT INTO bench_likes (bench_id, user_id) VALUES (bench_id_input, auth.uid());
    UPDATE benches SET heart_count = heart_count + 1 WHERE id = bench_id_input;
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
  $$;

  -- 3. bench_reports tabel
  CREATE TABLE IF NOT EXISTS bench_reports (
    bench_id uuid REFERENCES benches(id) ON DELETE CASCADE,
    user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (bench_id, user_id)
  );

  -- 4. report_bench: verwijdert na 5 rapportages
  CREATE OR REPLACE FUNCTION report_bench(bench_id_input uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE cnt int;
  BEGIN
    INSERT INTO bench_reports (bench_id, user_id) VALUES (bench_id_input, auth.uid())
    ON CONFLICT DO NOTHING;
    SELECT COUNT(*) INTO cnt FROM bench_reports WHERE bench_id = bench_id_input;
    IF cnt >= 5 THEN DELETE FROM benches WHERE id = bench_id_input; END IF;
  END;
  $$;

  -- 5. user_id kolom op benches (als die er nog niet is)
  ALTER TABLE benches ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

  -- 6. can_upload_bench: max 3 per 24 uur
  CREATE OR REPLACE FUNCTION can_upload_bench()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT COUNT(*) < 3
    FROM benches
    WHERE user_id = auth.uid()
      AND created_at > NOW() - INTERVAL '24 hours';
  $$;
*/
