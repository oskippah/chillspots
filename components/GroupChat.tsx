import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Message = { id: string; user_id: string; username: string; content: string; created_at: string };
type Props = { visible: boolean; groupId: string; groupName: string; onClose: () => void };

export default function GroupChat({ visible, groupId, groupName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string>('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function laadBerichten() {
    const { data } = await supabase
      .from('group_messages')
      .select('id, user_id, username, content, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }

  useEffect(() => {
    if (!visible || !groupId) return;
    (async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      setMyId(uid);
      if (uid) {
        const { data } = await supabase.from('profiles').select('username').eq('id', uid).single();
        setMyUsername(data?.username ?? 'Onbekend');
      }
      laadBerichten();
    })();
  }, [visible, groupId]);

  async function verstuur() {
    if (!input.trim() || !myId) return;
    setSending(true);
    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      user_id: myId,
      username: myUsername,
      content: input.trim(),
    });
    setSending(false);
    if (!error) {
      setInput('');
      laadBerichten();
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Text style={styles.empty}>Nog geen berichten. Zeg iets!</Text>}
            renderItem={({ item }) => {
              const mine = item.user_id === myId;
              return (
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {!mine && <Text style={styles.bubbleUser}>{item.username}</Text>}
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatTime(item.created_at)}</Text>
                </View>
              );
            }}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Stuur een bericht..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={verstuur}
              returnKeyType="send"
              multiline
            />
            <Pressable style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]} onPress={verstuur} disabled={!input.trim() || sending}>
              <Text style={styles.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0faf5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#c6f6d5',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a3a2d' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e8f5ee', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#2f855a', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#68908a', marginTop: 40, fontSize: 14 },
  bubble: {
    maxWidth: '78%', borderRadius: 18, padding: 12, paddingVertical: 8,
  },
  bubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: '#2f855a', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleUser: { fontSize: 11, fontWeight: '700', color: '#2f855a', marginBottom: 3 },
  bubbleText: { fontSize: 15, color: '#1a3a2d' },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#7a9e8a', marginTop: 3, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#c6f6d5',
  },
  input: {
    flex: 1, backgroundColor: '#f0faf5', borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#1a3a2d',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#2f855a',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },
});

/*
  SQL — voer uit in Supabase:

  CREATE TABLE IF NOT EXISTS group_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "leden kunnen berichten lezen" ON group_messages
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
    );

  CREATE POLICY "leden kunnen berichten sturen" ON group_messages
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
      AND auth.uid() = user_id
    );
*/
