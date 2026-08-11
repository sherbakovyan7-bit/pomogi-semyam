import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, URGENCY } from '../theme';
import { formatDate, initials } from '../util';

export default function NeedCard({ need, onPress }) {
  const urgency = URGENCY[need.urgency] || URGENCY.medium;
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: urgency.color }]}>
          <Text style={styles.badgeText}>{urgency.label}</Text>
        </View>
        <Text style={styles.category}>{need.category}</Text>
      </View>
      <Text style={styles.title} onPress={onPress}>{need.title}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {need.description}
      </Text>
      <View style={styles.bottomRow}>
        <View style={styles.author}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(need.author?.username)}</Text></View>
          <Text style={styles.authorName} numberOfLines={1}>{need.author?.username || 'Аноним'}</Text>
        </View>
        <Text style={styles.date}>{formatDate(need.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  category: { color: colors.muted, fontSize: 13 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  desc: { fontSize: 14, color: colors.muted, marginBottom: 10, lineHeight: 19 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  authorName: { fontSize: 12, color: colors.text, flexShrink: 1 },
  date: { fontSize: 11, color: colors.muted },
});
