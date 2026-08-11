import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { colors, URGENCY } from '../theme';
import { formatDate } from '../util';

function formatCard(card) {
  return String(card || '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function NeedDetailScreen({ route, navigation }) {
  const { needId } = route.params;
  const { user } = useAuth();
  const [need, setNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.need(needId);
      setNeed(data.need);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [needId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const help = async () => {
    setBusy(true);
    try {
      const { conversation } = await api.help(needId);
      Alert.alert('Диалог открыт', 'Теперь вы можете общаться с семьёй лично.', [
        {
          text: 'Перейти в чат',
          onPress: () => navigation.navigate('Chat', { conversationId: conversation.id, title: need.title }),
        },
        { text: 'Ок' },
      ]);
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  if (error || !need) return <View style={styles.center}><Text style={styles.errorText}>{error || 'Нужда не найдена'}</Text></View>;

  const urgency = URGENCY[need.urgency] || URGENCY.medium;
  const isFamilyOwner = user?.role === 'family' && need.userId === user.id;
  const isBenefactor = user?.role === 'benefactor';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{need.title}</Text>
        <View style={[styles.badge, { backgroundColor: urgency.color }]}>
          <Text style={styles.badgeText}>{urgency.label}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{need.category}</Text>
        <Text style={styles.meta}>·</Text>
        <Text style={styles.meta}>{formatDate(need.createdAt)}</Text>
      </View>

      <Text style={styles.desc}>{need.description}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>@{need.author?.username || 'Семья'}</Text>
        {need.author?.role === 'family' && (
          <Text style={styles.cardLine}>👨‍👩‍👧‍👦 Детей до 18 лет: {need.author.childrenCount}</Text>
        )}
        {need.author?.about ? <Text style={styles.cardLine}>{need.author.about}</Text> : null}
      </View>

      <View style={[styles.card, styles.payCard]}>
        <Text style={[styles.cardTitle, styles.payTitle]}>💰 Перевод денег</Text>
        <Text style={styles.payLine}>Получатель: @{need.author?.username || '—'}</Text>
        <Text style={styles.payLine}>Карта: {formatCard(need.cardNumber)}</Text>
        <Text style={styles.payWarning}>Не сообщайте коды из SMS и CVV. Переводите только по номеру карты выше.</Text>
      </View>

      {need.helpers?.length > 0 && isFamilyOwner && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Откликнулись: {need.helpers.map((h) => '@' + h.username).join(', ')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Conversations')}>
            <Text style={styles.link}>Открыть сообщения</Text>
          </TouchableOpacity>
        </View>
      )}

      {isBenefactor && need.userId !== user.id && (
        <TouchableOpacity style={[styles.helpBtn, busy && styles.btnDisabled]} onPress={help} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.helpText}>Хочу помочь 💬</Text>}
        </TouchableOpacity>
      )}
      {isFamilyOwner && (
        <Text style={styles.hint}>
          Следите за сообщениями: благотворители напишут вам лично.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText: { color: colors.danger },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { fontSize: 21, fontWeight: '800', color: colors.text, flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  meta: { color: colors.muted, fontSize: 13 },
  desc: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  cardLine: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  payCard: { borderColor: '#2BA24C', backgroundColor: '#F2FBF5' },
  payTitle: { color: '#1E7D3C' },
  payLine: { fontSize: 15, color: colors.text, marginBottom: 4 },
  payWarning: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 16 },
  link: { color: colors.brandDark, fontWeight: '600', marginTop: 6 },
  helpBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  helpText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { textAlign: 'center', color: colors.muted, marginTop: 14, fontSize: 13 },
});