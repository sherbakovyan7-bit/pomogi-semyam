import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../api';
import { colors, CATEGORIES, URGENCY } from '../theme';

export default function NewNeedScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [urgency, setUrgency] = useState('high');
  const [description, setDescription] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      return Alert.alert('Ошибка', 'Заполните название и описание нужды');
    }
    const card = cardNumber.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(card)) {
      return Alert.alert('Ошибка', 'Номер карты должен содержать от 13 до 19 цифр');
    }
    setBusy(true);
    try {
      const { need } = await api.createNeed({
        title: title.trim(),
        category,
        urgency,
        description: description.trim(),
        cardNumber: card,
      });
      Alert.alert('Опубликовано', 'Спасибо! Благотворители уже видят вашу нужду.', [
        { text: 'Открыть', onPress: () => navigation.replace('NeedDetail', { needId: need.id }) },
        { text: 'На главную', onPress: () => navigation.navigate('Needs') },
      ]);
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Название *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            placeholder="Например: Нужна детская коляска"
            placeholderTextColor="#adb5bd"
          />
        </View>

        <Text style={styles.label}>Категория</Text>
        <View style={styles.chipsWrap}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Срочность</Text>
        <View style={styles.chipsWrap}>
          {Object.entries(URGENCY).map(([key, u]) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, urgency === key && styles.chipActive]}
              onPress={() => setUrgency(key)}
            >
              <Text style={[styles.chipText, urgency === key && styles.chipTextActive]}>{u.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Описание *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={3000}
            placeholder="Расскажите подробнее: что нужно, размеры, сроки, как удобнее передать помощь…"
            placeholderTextColor="#adb5bd"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.payBox}>
          <Text style={styles.payTitle}>💰 Реквизиты для перевода денег</Text>
          <Text style={styles.payHint}>Номер карты увидят благотворители, чтобы помочь вам деньгами</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Номер карты (для перевода) *</Text>
          <TextInput
            style={styles.input}
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="number-pad"
            maxLength={19}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor="#adb5bd"
          />
        </View>

        <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Опубликовать нужду</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 32 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  textarea: { minHeight: 120 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: '#FFF0F3' },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.brand, fontWeight: '600' },
  payBox: {
    backgroundColor: '#FDF3E7',
    borderWidth: 1,
    borderColor: '#F0D9B8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  payTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
  payHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  btn: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});