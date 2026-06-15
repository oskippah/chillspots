import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

function validateUsername(u: string): string | null {
  if (u.length < 3) return 'Minimaal 3 tekens.';
  if (u.length > 30) return 'Maximaal 30 tekens.';
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return 'Alleen letters, cijfers, punten (.), underscores (_) en streepjes (-) toegestaan.';
  return null;
}

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUp() {
    const usernameError = validateUsername(username.trim());
    if (usernameError) { Alert.alert('Ongeldige gebruikersnaam', usernameError); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { Alert.alert('Registreren mislukt', error.message); setLoading(false); return; }
    const { error: profileError } = await supabase.rpc('create_profile', { username_input: username.trim() });
    setLoading(false);
    if (profileError) {
      if (profileError.message.includes('unique') || profileError.message.includes('duplicate')) {
        Alert.alert('Gebruikersnaam al in gebruik', 'Kies een andere gebruikersnaam.');
      } else {
        Alert.alert('Profiel aanmaken mislukt', profileError.message);
      }
      return;
    }
    Alert.alert('Gelukt!', 'Account aangemaakt. Je bent ingelogd.');
  }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Inloggen mislukt', error.message);
  }

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.box}>
        <Text style={styles.h1}>Chillspots</Text>
        <Text style={styles.sub}>{isSignUp ? 'Maak een account aan' : 'Log in'}</Text>

        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Gebruikersnaam (letters, cijfers, . _ -)"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            maxLength={30}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Wachtwoord"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {isSignUp ? (
          <>
            <Pressable style={styles.btn} onPress={signUp} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Bezig...' : 'Account aanmaken'}</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => setIsSignUp(false)} disabled={loading}>
              <Text style={styles.btnGhostText}>Al een account? Inloggen</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.btn} onPress={signIn} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Bezig...' : 'Inloggen'}</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => setIsSignUp(true)} disabled={loading}>
              <Text style={styles.btnGhostText}>Nog geen account? Registreren</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#dfe7df', justifyContent: 'center' },
  box: { padding: 28 },
  h1: { fontSize: 30, fontWeight: '800', color: '#3f4c2c', textAlign: 'center' },
  sub: { fontSize: 14, color: '#6f7567', textAlign: 'center', marginTop: 4, marginBottom: 28 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, padding: 15, fontSize: 15,
    marginBottom: 12, color: '#2a2620',
  },
  btn: { backgroundColor: '#3f4c2c', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnGhost: { padding: 16, alignItems: 'center', marginTop: 4 },
  btnGhostText: { color: '#5a6b3f', fontSize: 14, fontWeight: '700' },
});
