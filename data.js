const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

const db = {
  users: [],
  needs: [],
  conversations: [],
  messages: [],
  sessions: new Map(),
  nextId: { user: 1, need: 1, conversation: 1, message: 1 }
};

function loadDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    db.users = data.users || [];
    db.needs = data.needs || [];
    db.conversations = data.conversations || [];
    db.messages = data.messages || [];
    db.nextId = { user: 1, need: 1, conversation: 1, message: 1, ...(data.nextId || {}) };
    db.sessions = new Map();
  } catch (e) {
    console.error('Не удалось загрузить данные:', e.message);
  }
}

function saveDb() {
  try {
    const snapshot = { ...db, sessions: {} };
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error('Не удалось сохранить данные:', e.message);
  }
}

loadDb();
setInterval(saveDb, 5000).unref();
process.on('SIGTERM', () => {
  saveDb();
  process.exit(0);
});
process.on('SIGINT', () => {
  saveDb();
  process.exit(0);
});
process.on('exit', saveDb);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '::pomogisemiam').digest('hex');
}

function isValidUsername(username) {
  return /^[\p{L}\p{N}_-]{3,30}$/u.test(username || '');
}

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions.set(token, userId);
  return token;
}

function currentUser(req) {
  const token = req.cookies?.uid || '';
  const userId = db.sessions.get(token);
  return db.users.find((u) => u.id === userId) || null;
}

function needById(id) {
  return db.needs.find((n) => n.id === id);
}

function conversationFor(needId, userA, userB) {
  return db.conversations.find(
    (c) =>
      c.needId === needId &&
      ((c.participantA === userA && c.participantB === userB) ||
        (c.participantA === userB && c.participantB === userA))
  );
}

function touchConversation(id) {
  const c = db.conversations.find((x) => x.id === id);
  if (c) c.updatedAt = Date.now();
}

module.exports = { db, hashPassword, isValidUsername, createSession, currentUser, needById, conversationFor, touchConversation };