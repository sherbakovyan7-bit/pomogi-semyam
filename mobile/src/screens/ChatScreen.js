import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Linking, Alert, Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, API_URL } from '../api';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';
import { formatDate, formatSize, isImageMime } from '../util';

export default function ChatScreen({ route }) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [other, setOther] = useState(null);
  const [needTitle, setNeedTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.messages(conversationId);
      setMessages(data.messages);
      setOther(data.other);
      setNeedTitle(data.need?.title || '');
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  const pickImages = async () => {
    const { assets } = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!assets?.length) return;
    const files = assets.map((a) => ({
      uri: a.uri,
      name: a.fileName || `photo-${Date.now()}.jpg`,
      type: a.mimeType || 'image/jpeg',
    }));
    setPendingFiles((prev) => [...prev, ...files].slice(0, 5));
  };

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const files = result.assets.map((a) => ({
      uri: a.uri,
      name: a.name || 'file',
      type: a.mimeType || 'application/octet-stream',
    }));
    setPendingFiles((prev) => [...prev, ...files].slice(0, 5));
  };

  const send = async () => {
    const trimmed = text.trim();
    if ((!trimmed && pendingFiles.length === 0) || sending) return;
    setSending(true);
    try {
      const { message } = await api.sendMessage(conversationId, trimmed, pendingFiles);
      setMessages((prev) => [...prev, message]);
      setText('');
      setPendingFiles([]);
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSending(false);
    }
  };

  const openFile = (f) => Linking.openURL(`${API_URL}${f.path}`).catch(() => {});

  const renderMessage = ({ item: m }) => {
    const mine = m.senderId === user.id;
    return (
      <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!!m.text && <Text style={[styles.msgText, mine && styles.msgTextMine]}>{m.text}</Text>}
          {m.files?.length > 0 && (
            <View style={styles.files}>
              {m.files.map((f, i) =>
                isImageMime(f.mime) ? (
                  <TouchableOpacity key={i} onPress={() => openFile(f)}>
                    <Image source={{ uri: `${API_URL}${f.path}` }} style={styles.thumb} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity key={i} style={styles.fileRow} onPress={() => openFile(f)}>
                    <Text style={[styles.fileEmoji, mine && styles.fileEmojiMine]}>📄</Text>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, mine && styles.fileTextMine]} numberOfLines={1}>{f.name}</Text>
                      <Text style={[styles.fileSize, mine && styles.fileTextMine]}>
                        {formatSize(f.size)} · нажмите, чтобы открыть
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
          <Text style={[styles.meta, mine && styles.metaMine]}>{formatDate(m.createdAt)}{mine ? ' · Я' : ''}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>{'@' + (other?.username || 'Чат')}</Text>
          {!!needTitle && <Text style={styles.headerNeed} numberOfLines={1}>По нужде: «{needTitle}»</Text>}
        </View>
        {other?.role === 'family' && <Text style={styles.headerRole}>Детей: {other.childrenCount}</Text>}
      </View>

      {error && (
        <TouchableOpacity style={styles.errorBar} onPress={load}>
          <Text style={styles.errorBarText}>{error} — нажмите, чтобы повторить</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.msgList}
        ListEmptyComponent={<Text style={styles.empty}>Напишите первое сообщение!</Text>}
      />

      {pendingFiles.length > 0 && (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText} numberOfLines={1}>
            📎 {pendingFiles.length} файл(ов): {pendingFiles.map((f) => f.name).join(', ')}
          </Text>
          <TouchableOpacity onPress={() => setPendingFiles([])}><Text style={styles.pendingClear}>✕</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickImages}>
          <Text style={styles.attachText}>🖼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} onPress={pickDocuments}>
          <Text style={styles.attachText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Сообщение…"
          placeholderTextColor="#adb5bd"
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() && pendingFiles.length === 0) || sending ? styles.sendBtnDisabled : null]}
          onPress={send}
          disabled={(!text.trim() && pendingFiles.length === 0) || sending}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerName: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerNeed: { fontSize: 12, color: colors.muted, marginTop: 1 },
  headerRole: { fontSize: 12, color: colors.muted, marginLeft: 8 },
  errorBar: { backgroundColor: '#FDEAEA', padding: 8, alignItems: 'center' },
  errorBarText: { color: colors.danger, fontSize: 13 },
  msgList: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#EEF0F6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: colors.text, lineHeight: 20 },
  msgTextMine: { color: '#fff' },
  files: { marginTop: 6, gap: 6 },
  thumb: { width: 130, height: 100, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileEmoji: { fontSize: 22 },
  fileEmojiMine: { opacity: 0.9 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  fileSize: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  fileTextMine: { color: '#fff' },
  meta: { marginTop: 3, fontSize: 11, opacity: 0.55, color: colors.text, alignSelf: 'flex-end', marginLeft: 10 },
  metaMine: { color: '#fff' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30, fontSize: 13 },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  pendingText: { flex: 1, fontSize: 12, color: colors.brandDark },
  pendingClear: { fontSize: 16, color: colors.muted, paddingHorizontal: 6 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  attachText: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 16 },
});

