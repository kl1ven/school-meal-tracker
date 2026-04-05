const express = require('express');
const { getAsync, allAsync, runAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

function managerOnly(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Нет доступа.' });
  }
  next();
}

router.use(authenticateToken);

router.get('/', async (req, res) => {
  if (['manager', 'canteen'].includes(req.user.role)) {
    const rows = await allAsync(
      `SELECT classes.*, users.name AS teacher_name, users.email AS teacher_email
       FROM classes
       LEFT JOIN users ON classes.teacher_id = users.id
       ORDER BY classes.parallel, classes.name`,
      [],
    );
    return res.json(rows);
  }

  const clazz = await getAsync(
    'SELECT classes.*, users.name AS teacher_name, users.email AS teacher_email FROM classes JOIN users ON classes.id = users.class_id WHERE users.id = ?',
    [req.user.id],
  );
  if (!clazz) {
    return res.status(404).json({ message: 'Класс не найден.' });
  }
  res.json([clazz]);
});

router.get('/teachers', managerOnly, async (req, res) => {
  const teachers = await allAsync(
    'SELECT id, name, email, role, class_id FROM users WHERE role = ? ORDER BY name',
    ['teacher'],
  );
  res.json(teachers);
});

router.post('/', managerOnly, async (req, res) => {
  const { name, parallel, teacher_id } = req.body;
  if (!name || !parallel) {
    return res.status(400).json({ message: 'Заполните название и параллель.' });
  }

  const result = await runAsync('INSERT INTO classes (name, parallel, teacher_id) VALUES (?, ?, ?)', [name, parallel, teacher_id || null]);

  if (teacher_id) {
    const existingTeacher = await getAsync('SELECT class_id FROM users WHERE id = ?', [teacher_id]);
    if (existingTeacher?.class_id && existingTeacher.class_id !== result.lastID) {
      await runAsync('UPDATE classes SET teacher_id = NULL WHERE id = ?', [existingTeacher.class_id]);
    }
    await runAsync('UPDATE users SET class_id = ? WHERE id = ?', [result.lastID, teacher_id]);
  }

  res.json({ id: result.lastID, name, parallel, teacher_id });
});

router.put('/:id', managerOnly, async (req, res) => {
  const { id } = req.params;
  const { name, parallel, teacher_id } = req.body;
  const existing = await getAsync('SELECT * FROM classes WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Класс не найден.' });
  }

  await runAsync('UPDATE classes SET name = ?, parallel = ?, teacher_id = ? WHERE id = ?', [
    name || existing.name,
    parallel || existing.parallel,
    teacher_id || null,
    id,
  ]);

  if (existing.teacher_id && existing.teacher_id !== teacher_id) {
    await runAsync('UPDATE users SET class_id = NULL WHERE id = ?', [existing.teacher_id]);
  }

  if (teacher_id) {
    const existingTeacher = await getAsync('SELECT class_id FROM users WHERE id = ?', [teacher_id]);
    if (existingTeacher?.class_id && existingTeacher.class_id !== Number(id)) {
      await runAsync('UPDATE classes SET teacher_id = NULL WHERE id = ?', [existingTeacher.class_id]);
    }
    await runAsync('UPDATE users SET class_id = ? WHERE id = ?', [id, teacher_id]);
  }

  res.json({ id: Number(id), name: name || existing.name, parallel: parallel || existing.parallel, teacher_id: teacher_id || null });
});

router.delete('/:id', managerOnly, async (req, res) => {
  const { id } = req.params;
  const existing = await getAsync('SELECT * FROM classes WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Класс не найден.' });
  }
  await runAsync('DELETE FROM meal_records WHERE class_id = ?', [id]);
  await runAsync('UPDATE users SET class_id = NULL WHERE class_id = ?', [id]);
  await runAsync('DELETE FROM classes WHERE id = ?', [id]);
  res.json({ message: 'Класс удален.' });
});

module.exports = router;
