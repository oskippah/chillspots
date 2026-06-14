import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert('Registreren mislukt', error.message);
    else Alert.alert('Gelukt!', 'Account aangemaakt. Je bent ingelogd.');
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
        <Text style={styles.sub}>Log in of maak een account</Text>

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

        <Pressable style={styles.btn} onPress={signIn} disabled={loading}>
          <Text style={styles.btnText}>Inloggen</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={signUp} disabled={loading}>
          <Text style={styles.btnGhostText}>Nieuw account maken</Text>
        </Pressable>
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
