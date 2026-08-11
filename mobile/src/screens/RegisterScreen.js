import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../AuthContext';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [role, setRole] = useState('family');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [childrenCount, setChildrenCount] = useState('1');
  const [about, setAbout] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username || !password) return setError('Заполните юзернейм и пароль');
    if (username.trim().length < 3 || username.trim().length > 30) return setError('Юзернейм: 3–30 символов');
    if (password.length < 4) return setError('Пароль должен быть не короче 4 символов');
    setBusy(true);
    setError(null);
    try {
      await register({
        username: username.trim(),
        password,
        role,
        childrenCount: role === 'family' ? parseInt(childrenCount, 10) || 0 : 0,
        about: about.trim(),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const RoleBtn = ({ value, label, sub }) => (
    <TouchableOpacity
      style={[styles.roleBtn, role === value && styles.roleBtnActive]}
      onPress={() => setRole(value)}
    >
      <Text style={[styles.roleTitle, role === value && styles.roleTitleActive]}>{label}</Text>
      <Text style={styles.roleSub}>{sub}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>❤ ПомогиСемьям</Text>
        <Text style={styles.subtitle}>Регистрация</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Кто вы?</Text>
        <View style={styles.roleRow}>
          <RoleBtn value="family" label="Семья" sub="Нуждаюсь в помощи" />
          <RoleBtn value="benefactor" label="Благотворитель" sub="Хочу помогать" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Юзернейм *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={30}
            placeholder="mama_anny"
            placeholderTextColor="#adb5bd"
          />
          <Text style={styles.hint}>3–30 символов: буквы, цифры, _ и -</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Пароль *</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="минимум 4 символа" placeholderTextColor="#adb5bd" />
        </View>
        {role === 'family' && (
          <View style={styles.field}>
            <Text style={styles.label}>Сколько детей до 18 лет?</Text>
            <TextInput
              style={styles.input}
              value={childrenCount}
              onChangeText={setChildrenCount}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#adb5bd"
            />
          </View>
        )}
        <View style={styles.field}>
          <Text style={styles.label}>Коротко о себе / семье (необязательно)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={about}
            onChangeText={setAbout}
            multiline
            placeholder="Например: одинокая мама двоих детей…"
            placeholderTextColor="#adb5bd"
          />
        </View>

        <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Создать аккаунт</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 60 },
  logo: { fontSize: 26, fontWeight: '800', color: colors.brand, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 14, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.card,
  },
  roleBtnActive: { borderColor: colors.brand, backgroundColor: '#FFF0F3' },
  roleTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
  roleTitleActive: { color: colors.brand },
  roleSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { color: colors.brandDark, textAlign: 'center', marginTop: 16, fontSize: 15 },
});