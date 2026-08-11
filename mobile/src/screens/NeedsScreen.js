import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NeedCard from '../components/NeedCard';
import { colors, CATEGORIES, URGENCY } from '../theme';

const URGENCY_KEYS = ['', 'critical', 'high', 'medium', 'low'];

export default function NeedsScreen({ navigation }) {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh) => {
    if (refresh) setRefreshing(true);
    try {
      const params = {};
      if (category) params.category = category;
      if (urgency) params.urgency = urgency;
      const data = await api.needs(params);
      setNeeds(data.needs);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, [category, urgency]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const onRefresh = () => load(true);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Нужды семей</Text>
        <Text style={styles.subtitle}>Семьи с детьми до 18 лет публикуют свои просьбы</Text>
        {user?.role === 'family' && (
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('NewNeed')}>
            <Text style={styles.newBtnText}>+ Подать нужду</Text>
          </TouchableOpacity>
        )}
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(category === c ? '' : c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.urgencyRow}>
          {URGENCY_KEYS.map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.urgencyChip, urgency === k && styles.urgencyChipActive]}
              onPress={() => setUrgency(urgency === k ? '' : k)}
            >
              <Text style={[styles.urgencyText, urgency === k && styles.urgencyTextActive]}>
                {k === '' ? 'Все' : URGENCY[k].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={onRefresh}><Text style={styles.retryText}>Повторить</Text></TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : (
        <FlatList
          data={needs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NeedCard need={item} onPress={() => navigation.navigate('NeedDetail', { needId: item.id })} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет нужд по выбранным фильтрам</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 10 },
  newBtn: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: '#FFF0F3' },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.brand, fontWeight: '600' },
  urgencyRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  urgencyChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: colors.card },
  urgencyChipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  urgencyText: { fontSize: 12, color: colors.text },
  urgencyTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.danger, marginBottom: 10 },
  retry: { backgroundColor: colors.brand, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});