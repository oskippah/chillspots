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

export function useBenches() {
  const [benches, setBenches] = useState<Bench[]>([]);
  const [fotoBench, setFotoBench] = useState<string | null>(null);
  const [fotoView, setFotoView] = useState<string | null>(null);
  const [hasTrash, setHasTrash] = useState(false);
  const [bezig, setBezig] = useState(false);
  // gebruik geen useState zodat mutaties geen re-render triggeren
  const [likedIds] = useState(() => new Set<string>());

  async function laadBenches() {
    const { data, error } = await supabase
      .from('benches')
      .select('id, lat, lng, has_trash, heart_count, photo_bench, photo_view')
      .order('heart_count', { ascending: false });
    if (!error && data) {
      setBenches(
        data.map((b: any) => ({
          id: b.id,
          title: 'Bankje',
          lat: b.lat,
          lng: b.lng,
          hasTrash: b.has_trash,
          hearts: b.heart_count,
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
    setBezig(true);
    try {
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
      const { error } = await supabase.from('benches').insert({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        has_trash: hasTrash,
        photo_bench: benchUrl,
        photo_view: viewUrl,
      });
      if (error) { alert('Opslaan mislukt: ' + error.message); setBezig(false); return false; }
      alert('Bankje toegevoegd! 🎉');
      setFotoBench(null);
      setFotoView(null);
      setHasTrash(false);
      await laadBenches();
      setBezig(false);
      return true;
    } catch (e: any) {
      alert('Er ging iets mis: ' + e.message);
      setBezig(false);
      return false;
    }
  }

  // Optimistisch: UI update direct, rollback bij fout.
  // Vereist Supabase RPC: zie SQL onderaan dit bestand.
  async function geefHartje(benchId: string) {
    if (likedIds.has(benchId)) return;
    likedIds.add(benchId);
    setBenches((prev) =>
      prev.map((b) => (b.id === benchId ? { ...b, hearts: b.hearts + 1 } : b))
    );
    const { error } = await supabase.rpc('increment_heart', { bench_id_input: benchId });
    if (error) {
      likedIds.delete(benchId);
      setBenches((prev) =>
        prev.map((b) => (b.id === benchId ? { ...b, hearts: b.hearts - 1 } : b))
      );
      alert('Hartje geven mislukt: ' + error.message);
    }
  }

  return {
    benches,
    fotoBench, setFotoBench,
    fotoView, setFotoView,
    hasTrash, setHasTrash,
    bezig,
    likedIds,
    laadBenches,
    maakFoto,
    slaBankjeOp,
    geefHartje,
  };
}

/*
  Maak deze functie aan in Supabase SQL editor:

  CREATE OR REPLACE FUNCTION increment_heart(bench_id_input uuid)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    UPDATE benches SET heart_count = heart_count + 1 WHERE id = bench_id_input;
  $$;
*/
