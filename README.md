# Chillspots

Snap Map voor publieke bankjes. Deel foto's van bankjes, geef hartjes aan de beste plekken en ontdek chill spots in de buurt — alleen of met vrienden via privégroepen.

## Wat het doet

- Foto van een bankje + uitzicht uploaden op je huidige locatie
- Hartjes geven aan bankjes
- Bankjes gesorteerd op populariteit
- Privégroepen aanmaken en bankjes delen met vrienden via een uitnodigingscode
- Login verplicht

## Tech stack

- React Native + Expo (iOS-first)
- Expo Router (file-based routing)
- Supabase (auth, database, storage)

## Lokaal draaien

1. Dependencies installeren:
   ```bash
   npm install
   ```

2. `.env` aanmaken op basis van `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Vul je Supabase URL en key in.

3. App starten:
   ```bash
   npx expo start --tunnel
   ```

4. Scan de QR-code met **Expo Go** op je telefoon.

## Supabase setup

Maak de volgende RPC-functie aan in de Supabase SQL editor:

```sql
CREATE OR REPLACE FUNCTION increment_heart(bench_id_input uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE benches SET heart_count = heart_count + 1 WHERE id = bench_id_input;
$$;
```
