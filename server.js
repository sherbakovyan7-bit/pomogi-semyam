const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const multer = require('multer');
const { db, hashPassword, isValidUsername, createSession, currentUser, needById, conversationFor, touchConversation } = require('./data');
const api = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use('/api', api);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  res.locals.user = currentUser(req);
  res.locals.path = req.path;
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

function requireLogin(req, res, next) {
  if (!res.locals.user) return res.redirect('/login');
  next();
}

function isBenefactor(user) {
  return user && user.role === 'benefactor';
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCard(card) {
  return String(card).replace(/(\d{4})(?=\d)/g, '$1 ');
}

const URGENCY = { critical: 'Критично', high: 'Высокая', medium: 'Средняя', low: 'Не срочно' };

app.locals.formatDate = formatDate;
app.locals.formatCard = formatCard;
app.locals.URGENCY = URGENCY;

function render(res, view, title, data = {}) {
  res.render(view, { content: view, title, ...data });
}

/* ---------- Аутентификация ---------- */

app.get('/register', (req, res) => {
  if (res.locals.user) return res.redirect('/');
  render(res, 'register', 'Регистрация', { error: null, values: {} });
});

app.post('/register', (req, res) => {
  const { username, password, role, childrenCount, about } = req.body;
  const values = { username, role, childrenCount, about };
  if (!username || !password || !role) {
    return res.status(400).render('register', { content: 'register', title: 'Регистрация', error: 'Заполните все обязательные поля', values });
  }
  if (!['family', 'benefactor'].includes(role)) {
    return res.status(400).render('register', { content: 'register', title: 'Регистрация', error: 'Некорректная роль', values });
  }
  if (!isValidUsername(username)) {
    return res.status(400).render('register', { content: 'register', title: 'Регистрация', error: 'Юзернейм: 3–30 символов (буквы, цифры, _ или -)', values });
  }
  const uname = username.trim().toLowerCase();
  if (db.users.some((u) => u.usernameLower === uname)) {
    return res.status(400).render('register', { content: 'register', title: 'Регистрация', error: 'Пользователь с таким юзернеймом уже зарегистрирован', values });
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
  res.cookie('uid', token, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

app.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect('/');
  render(res, 'login', 'Вход', { error: null, values: {} });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find((u) => u.usernameLower === String(username || '').trim().toLowerCase());
  if (!user || user.password !== hashPassword(password || '')) {
    return res.status(401).render('login', { content: 'login', title: 'Вход', error: 'Неверный юзернейм или пароль', values: { username } });
  }
  const token = createSession(user.id);
  res.cookie('uid', token, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  const token = req.cookies?.uid;
  if (token) db.sessions.delete(token);
  res.clearCookie('uid');
  res.redirect('/');
});

/* ---------- Нужды ---------- */

app.get('/', (req, res) => {
  const { category, urgency } = req.query;
  let list = [...db.needs].sort((a, b) => b.createdAt - a.createdAt);
  if (category) list = list.filter((n) => n.category === category);
  if (urgency) list = list.filter((n) => n.urgency === urgency);
  render(res, 'index', 'Нужды семей', {
    needs: list,
    category,
    urgency,
    categories: [...new Set(db.needs.map((n) => n.category))],
    db
  });
});

app.get('/need/new', requireLogin, (req, res) => {
  if (isBenefactor(res.locals.user)) return res.redirect('/');
  render(res, 'new-need', 'Подать нужду', { error: null, values: {} });
});

app.post('/need/new', requireLogin, (req, res) => {
  const user = res.locals.user;
  if (isBenefactor(user)) return res.redirect('/');
  const { title, category, urgency, description, cardNumber } = req.body;
  const values = { title, category, urgency, description, cardNumber };
  if (!title || !description) {
    return res.status(400).render('new-need', { content: 'new-need', title: 'Подать нужду', error: 'Заполните название и описание нужды', values });
  }
  const card = String(cardNumber || '').replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(card)) {
    return res.status(400).render('new-need', { content: 'new-need', title: 'Подать нужду', error: 'Укажите корректный номер карты (13–19 цифр)', values });
  }
  const need = {
    id: db.nextId.need++,
    userId: user.id,
    title: title.trim(),
    category: (category || 'Другое').trim(),
    urgency: URGENCY[urgency] ? urgency : 'medium',
    description: description.trim(),
    cardNumber: card,
    status: 'open',
    createdAt: Date.now()
  };
  db.needs.push(need);
  res.redirect(`/need/${need.id}?justCreated=1`);
});

app.get('/need/:id', (req, res) => {
  const need = needById(Number(req.params.id));
  if (!need) return res.status(404).render('error', { message: 'Нужда не найдена' });
  const author = db.users.find((u) => u.id === need.userId);
  const helpers = db.conversations
    .filter((c) => c.needId === need.id)
    .map((c) => db.users.find((u) => u.id === (c.participantA === need.userId ? c.participantB : c.participantA)))
    .filter(Boolean);
  const user = res.locals.user;
  let myConversation = null;
  if (user) {
    const other = user.id === need.userId ? null : user.id;
    if (other) {
      myConversation = conversationFor(need.id, need.userId, other);
    }
  }
  render(res, 'need', 'Нужда', { need, author, helpers, myConversation, justCreated: !!req.query.justCreated });
});

/* ---------- Помощь: диалог семьи и благотворителя ---------- */

app.post('/need/:id/help', requireLogin, (req, res) => {
  const user = res.locals.user;
  const need = needById(Number(req.params.id));
  if (!need) return res.status(404).render('error', { message: 'Нужда не найдена' });
  if (!isBenefactor(user)) return res.redirect(`/need/${need.id}`);
  if (need.userId === user.id) return res.redirect(`/need/${need.id}`);
  let conv = conversationFor(need.id, need.userId, user.id);
  if (!conv) {
    conv = {
      id: db.nextId.conversation++,
      needId: need.id,
      participantA: need.userId,
      participantB: user.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.conversations.push(conv);
  }
  res.redirect(`/chat/${conv.id}?opened=1`);
});

/* ---------- Личные сообщения ---------- */

app.get('/messages', requireLogin, (req, res) => {
  const user = res.locals.user;
  const conversations = db.conversations
    .filter((c) => c.participantA === user.id || c.participantB === user.id)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((c) => {
      const need = needById(c.needId);
      const otherId = c.participantA === user.id ? c.participantB : c.participantA;
      const other = db.users.find((u) => u.id === otherId);
      const last = db.messages.filter((m) => m.conversationId === c.id).slice(-1)[0] || null;
      const unread = db.messages.filter((m) => m.conversationId === c.id && m.senderId !== user.id && !m.read).length;
      return { conv: c, need, other, last, unread };
    });
  render(res, 'messages', 'Сообщения', { conversations });
});

app.get('/chat/:id', requireLogin, (req, res) => {
  const user = res.locals.user;
  const conv = db.conversations.find((c) => c.id === Number(req.params.id));
  if (!conv) return res.status(404).render('error', { message: 'Диалог не найден' });
  if (conv.participantA !== user.id && conv.participantB !== user.id) {
    return res.status(403).render('error', { message: 'Нет доступа к этому диалогу' });
  }
  const need = needById(conv.needId);
  const otherId = conv.participantA === user.id ? conv.participantB : conv.participantA;
  const other = db.users.find((u) => u.id === otherId);
  const msgs = db.messages
    .filter((m) => m.conversationId === conv.id)
    .map((m) => ({ ...m, author: db.users.find((u) => u.id === m.senderId) }));
  db.messages
    .filter((m) => m.conversationId === conv.id && m.senderId !== user.id)
    .forEach((m) => (m.read = true));
  render(res, 'chat', 'Переписка', { conv, need, other, msgs, opened: !!req.query.opened });
});

app.post('/chat/:id/send', requireLogin, upload.array('files', 5), (req, res) => {
  const user = res.locals.user;
  const conv = db.conversations.find((c) => c.id === Number(req.params.id));
  if (!conv) return res.status(404).render('error', { message: 'Диалог не найден' });
  if (conv.participantA !== user.id && conv.participantB !== user.id) {
    return res.status(403).render('error', { message: 'Нет доступа к этому диалогу' });
  }
  const text = (req.body.text || '').trim();
  const files = (req.files || []).map((f) => ({ name: f.originalname, path: `/uploads/${f.filename}`, size: f.size, mime: f.mimetype }));
  if (!text && files.length === 0) return res.redirect(`/chat/${conv.id}#messages`);
  db.messages.push({
    id: db.nextId.message++,
    conversationId: conv.id,
    senderId: user.id,
    text,
    files,
    read: false,
    createdAt: Date.now()
  });
  touchConversation(conv.id);
  res.redirect(`/chat/${conv.id}#messages`);
});

app.use((req, res) => res.status(404).render('error', { message: 'Страница не найдена' }));

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});