import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveHost() {
  const configured = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(':')[0]}:3000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_URL = resolveHost();

let authToken = null;

export function setToken(token) {
  authToken = token;
}

function qs(params) {
  const keys = Object.keys(params || {});
  if (!keys.length) return '';
  return '?' + keys.map((k) => `${k}=${encodeURIComponent(params[k])}`).join('&');
}

async function request(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let payload;
  if (formData) {
    payload = formData;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const api = {
  login: (email, password) => request('/api/login', { method: 'POST', body: { email, password } }),
  register: (body) => request('/api/register', { method: 'POST', body }),
  logout: () => request('/api/logout', { method: 'POST' }).catch(() => {}),
  me: () => request('/api/me'),
  needs: (params = {}) => request(`/api/needs${qs(params)}`),
  need: (id) => request(`/api/needs/${id}`),
  createNeed: (body) => request('/api/needs', { method: 'POST', body }),
  help: (id) => request(`/api/needs/${id}/help`, { method: 'POST' }),
  conversations: () => request('/api/conversations'),
  messages: (id) => request(`/api/conversations/${id}/messages`),
  sendMessage: (id, text, files) => {
    const fd = new FormData();
    if (text) fd.append('text', text);
    (files || []).forEach((f) => fd.append('files', f));
    return request(`/api/conversations/${id}/messages`, { method: 'POST', formData: fd });
  },
};