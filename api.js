const express = require('express');
const multer = require('multer');
const path = require('path');
const { db, hashPassword, isValidUsername, createSession, conversationFor, touchConversation } = require('./data');

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    role: u.role,
    username: u.username,
    childrenCount: u.childrenCount,
    about: u.about
  };
}

function payFields(need, include) {
  const base = {
    id: need.id,
    title: need.title,
    category: need.category,
    urgency: need.urgency,
    description: need.description,
    status: need.status,
    createdAt: need.createdAt
  };
  if (include) {
    base.cardNumber = need.cardNumber;
  }
  return base;
}

function apiAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.cookies?.uid || '';
  const userId = db.sessions.get(token);
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });
  req.user = user;
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const URGENCY = { critical: 'Критично', high: 'Высокая', medium: 'Средняя', low: 'Не срочно' };

router.get('/health', (req, res) => res.json({ ok: true }));

/* ---------- Аутентификация ---------- */

router.post('/register', (req, res) => {
  const { username, password, role, childrenCount, about } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Заполните юзернейм, пароль и роль' });
  }
  if (!['family', 'benefactor'].includes(role)) {
    return res.status(400).json({ error: 'Некорректная роль' });
  }
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Юзернейм: 3–30 символов (буквы, цифры, _ или -)' });
  }
  const uname = username.trim().toLowerCase();
  if (db.users.some((u) => u.usernameLower === uname)) {
    return res.status(400).json({ error: 'Пользователь с таким юзернеймом уже зарегистрирован' });
  }
  const user = {
    id: db.nextId.user++,
    role,
    username: username.trim(),
    usernameLower: uname,
    password: hashPassword(password),
    childrenCount: role === 'family' ? Math.max(0, parseInt(childrenCount, 10) || 0) : null,
    about: (about || '').trim()
  };
  db.users.push(user);
  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find((u) => u.usernameLower === String(username || '').trim().toLowerCase());
  if (!user || user.password !== hashPassword(password || '')) {
    return res.status(401).json({ error: 'Неверный юзернейм или пароль' });
  }
  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

router.post('/logout', apiAuth, (req, res) => {
  db.sessions.delete((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  res.json({ ok: true });
});

router.get('/me', apiAuth, (req, res) => res.json({ user: publicUser(req.user) }));

/* ---------- Нужды ---------- */

router.get('/needs', (req, res) => {
  let list = [...db.needs].sort((a, b) => b.createdAt - a.createdAt);
  if (req.query.category) list = list.filter((n) => n.category === req.query.category);
  if (req.query.urgency) list = list.filter((n) => n.urgency === req.query.urgency);
  res.json({
    needs: list.map((n) => ({ ...payFields(n, false), author: publicUser(db.users.find((u) => u.id === n.userId)) }))
  });
});

router.get('/needs/:id', (req, res) => {
  const need = db.needs.find((n) => n.id === Number(req.params.id));
  if (!need) return res.status(404).json({ error: 'Нужда не найдена' });
  const helpers = db.conversations
    .filter((c) => c.needId === need.id)
    .map((c) => publicUser(db.users.find((u) => u.id === (c.participantA === need.userId ? c.participantB : c.participantA))))
    .filter(Boolean);
  res.json({ need: { ...payFields(need, true), author: publicUser(db.users.find((u) => u.id === need.userId)), helpers } });
});

router.post('/needs', apiAuth, (req, res) => {
  if (req.user.role !== 'family') return res.status(403).json({ error: 'Только семьи могут подавать нужды' });
  const { title, category, urgency, description, cardNumber } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'Заполните название и описание' });
  const card = String(cardNumber || '').replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(card)) return res.status(400).json({ error: 'Укажите корректный номер карты (13–19 цифр)' });
  const need = {
    id: db.nextId.need++,
    userId: req.user.id,
    title: title.trim(),
    category: (category || 'Другое').trim(),
    urgency: URGENCY[urgency] ? urgency : 'medium',
    description: description.trim(),
    cardNumber: card,
    status: 'open',
    createdAt: Date.now()
  };
  db.needs.push(need);
  res.json({ need: payFields(need, true) });
});

router.post('/needs/:id/help', apiAuth, (req, res) => {
  if (req.user.role !== 'benefactor') return res.status(403).json({ error: 'Только благотворители могут откликаться' });
  const need = db.needs.find((n) => n.id === Number(req.params.id));
  if (!need) return res.status(404).json({ error: 'Нужда не найдена' });
  if (need.userId === req.user.id) return res.status(400).json({ error: 'Нельзя помочь самому себе' });
  let conv = conversationFor(need.id, need.userId, req.user.id);
  if (!conv) {
    conv = {
      id: db.nextId.conversation++,
      needId: need.id,
      participantA: need.userId,
      participantB: req.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.conversations.push(conv);
  }
  res.json({ conversation: conv });
});

/* ---------- Сообщения ---------- */

router.get('/conversations', apiAuth, (req, res) => {
  const list = db.conversations
    .filter((c) => c.participantA === req.user.id || c.participantB === req.user.id)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((c) => {
      const need = db.needs.find((n) => n.id === c.needId);
      const otherId = c.participantA === req.user.id ? c.participantB : c.participantA;
      const other = publicUser(db.users.find((u) => u.id === otherId));
      const last = db.messages.filter((m) => m.conversationId === c.id).slice(-1)[0] || null;
      const unread = db.messages.filter((m) => m.conversationId === c.id && m.senderId !== req.user.id && !m.read).length;
      return { conversationId: c.id, need: need ? { id: need.id, title: need.title } : null, other, last, unread, updatedAt: c.updatedAt };
    });
  res.json({ conversations: list });
});

router.get('/conversations/:id/messages', apiAuth, (req, res) => {
  const conv = db.conversations.find((c) => c.id === Number(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Диалог не найден' });
  if (conv.participantA !== req.user.id && conv.participantB !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  const msgs = db.messages
    .filter((m) => m.conversationId === conv.id)
    .map((m) => ({ ...m, author: publicUser(db.users.find((u) => u.id === m.senderId)) }));
  db.messages.filter((m) => m.conversationId === conv.id && m.senderId !== req.user.id).forEach((m) => (m.read = true));
  const need = db.needs.find((n) => n.id === conv.needId);
  const otherId = conv.participantA === req.user.id ? conv.participantB : conv.participantA;
  res.json({ conversationId: conv.id, need: need ? { id: need.id, title: need.title } : null, other: publicUser(db.users.find((u) => u.id === otherId)), messages: msgs });
});

router.post('/conversations/:id/messages', apiAuth, upload.array('files', 5), (req, res) => {
  const conv = db.conversations.find((c) => c.id === Number(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Диалог не найден' });
  if (conv.participantA !== req.user.id && conv.participantB !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  const text = (req.body.text || '').trim();
  const files = (req.files || []).map((f) => ({ name: f.originalname, path: `/uploads/${f.filename}`, size: f.size, mime: f.mimetype }));
  if (!text && files.length === 0) return res.status(400).json({ error: 'Пустое сообщение' });
  const msg = {
    id: db.nextId.message++,
    conversationId: conv.id,
    senderId: req.user.id,
    text,
    files,
    read: false,
    createdAt: Date.now()
  };
  db.messages.push(msg);
  touchConversation(conv.id);
  res.json({ message: { ...msg, author: publicUser(req.user) } });
});

module.exports = router;


