import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { formatDate, initials } from '../util';

export default function ConversationsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await api.conversations();
      setConversations(data.conversations);
    } finally {
      setLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const onRefresh = () => load(true);
  const openChat = (conv) =>
    navigation.navigate('Chat', {
      conversationId: conv.conversationId,
      title: conv.other?.username,
    });

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Личные сообщения</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.conversationId)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.item, item.unread > 0 && styles.itemUnread]} onPress={() => openChat(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.other?.username)}</Text>
              </View>
              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{'@' + (item.other?.username || 'Пользователь')}</Text>
                  <Text style={styles.time}>
                    {item.last ? formatDate(item.last.createdAt) : formatDate(item.updatedAt)}
                  </Text>
                </View>
                <Text style={styles.needTitle} numberOfLines={1}>По нужде: «{item.need?.title || 'удалена'}»</Text>
                <View style={styles.row}>
                  <Text style={[styles.preview, { flex: 1 }]} numberOfLines={1}>
                    {item.last && item.last.files?.length ? '📎 ' : ''}
                    {item.last ? item.last.text || 'Вложение' : 'Нет сообщений'}
                  </Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Пока нет диалогов. Благотворители нажимают «Хочу помочь» на нужде — и диалог появляется здесь.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  itemUnread: { borderLeftWidth: 4, borderLeftColor: colors.brand, backgroundColor: '#FFF7F8' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: colors.muted },
  needTitle: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 4 },
  preview: { fontSize: 13, color: colors.text },
  unreadBadge: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, paddingHorizontal: 20, lineHeight: 20 },
});

