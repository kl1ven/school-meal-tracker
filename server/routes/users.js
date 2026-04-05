const express = require('express');
const bcrypt = require('bcryptjs');
const { allAsync, getAsync, runAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

function managerOnly(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Нет доступа.' });
  }
  next();
}

router.use(authenticateToken);
router.use(managerOnly);

const getUserWithClass = async (id) => getAsync(
  `SELECT users.id, users.name, users.email, users.role, users.class_id, classes.name AS class_name
   FROM users
   LEFT JOIN classes ON classes.id = users.class_id
   WHERE users.id = ?`,
  [id],
);

const syncTeacherClass = async (userId, newClassId, oldClassId = null) => {
  if (oldClassId && Number(oldClassId) !== Number(newClassId)) {
    await runAsync('UPDATE classes SET teacher_id = NULL WHERE id = ?', [oldClassId]);
  }

  if (!newClassId) {
    await runAsync('UPDATE users SET class_id = NULL WHERE id = ?', [userId]);
    return;
  }

  const classRow = await getAsync('SELECT teacher_id FROM classes WHERE id = ?', [newClassId]);
  if (classRow?.teacher_id && Number(classRow.teacher_id) !== Number(userId)) {
    await runAsync('UPDATE users SET class_id = NULL WHERE id = ?', [classRow.teacher_id]);
  }

  await runAsync('UPDATE classes SET teacher_id = ? WHERE id = ?', [userId, newClassId]);
  await runAsync('UPDATE users SET class_id = ? WHERE id = ?', [newClassId, userId]);
};

router.get('/', async (_req, res) => {
  const users = await allAsync(
    `SELECT users.id, users.name, users.email, users.role, users.class_id, classes.name AS class_name
     FROM users
     LEFT JOIN classes ON classes.id = users.class_id
     ORDER BY CASE WHEN users.role = 'manager' THEN 0 WHEN users.role = 'canteen' THEN 1 ELSE 2 END, users.name`,
    [],
  );
  res.json(users);
});

router.post('/', async (req, res) => {
  const { name, email, password, role, class_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Заполните имя, email, пароль и роль.' });
  }

  if (role === 'teacher' && !class_id) {
    return res.status(400).json({ message: 'Для классного руководителя нужно выбрать класс.' });
  }

  const existing = await getAsync('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(400).json({ message: 'Пользователь с таким email уже существует.' });
  }

  const result = await runAsync(
    'INSERT INTO users (name, email, password_hash, role, class_id) VALUES (?, ?, ?, ?, ?)',
    [name, email, bcrypt.hashSync(password, 10), role, role === 'teacher' ? class_id : null],
  );

  if (role === 'teacher' && class_id) {
    await syncTeacherClass(result.lastID, class_id);
  }

  const user = await getUserWithClass(result.lastID);
  res.status(201).json(user);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, class_id } = req.body;

  const existing = await getAsync('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Пользователь не найден.' });
  }

  const nextRole = role || existing.role;
  const nextClassId = nextRole === 'teacher' ? (class_id || null) : null;

  if (nextRole === 'teacher' && !nextClassId) {
    return res.status(400).json({ message: 'Для классного руководителя нужно выбрать класс.' });
  }

  if (email && email !== existing.email) {
    const duplicate = await getAsync('SELECT id FROM users WHERE email = ? AND id <> ?', [email, id]);
    if (duplicate) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует.' });
    }
  }

  const passwordHash = password ? bcrypt.hashSync(password, 10) : existing.password_hash;

  await runAsync(
    'UPDATE users SET name = ?, email = ?, password_hash = ?, role = ?, class_id = ? WHERE id = ?',
    [name || existing.name, email || existing.email, passwordHash, nextRole, nextClassId, id],
  );

  if (existing.class_id && Number(existing.class_id) !== Number(nextClassId)) {
    await runAsync('UPDATE classes SET teacher_id = NULL WHERE id = ?', [existing.class_id]);
  }

  if (nextRole === 'teacher' && nextClassId) {
    await syncTeacherClass(Number(id), nextClassId, existing.class_id);
  }

  const user = await getUserWithClass(id);
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (Number(req.user.id) === Number(id)) {
    return res.status(400).json({ message: 'Нельзя удалить текущего пользователя.' });
  }

  const existing = await getAsync('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Пользователь не найден.' });
  }

  if (existing.class_id) {
    await runAsync('UPDATE classes SET teacher_id = NULL WHERE id = ?', [existing.class_id]);
  }

  await runAsync('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true });
});

module.exports = router;
