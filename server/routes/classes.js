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
      `SELECT classes.*, users.id AS teacher_id, users.name AS teacher_name, users.email AS teacher_email
       FROM classes
       LEFT JOIN users ON users.class_id = classes.id AND users.role = 'teacher'
       ORDER BY CASE WHEN classes.sort_order > 0 THEN classes.sort_order ELSE 9999 END, classes.parallel, classes.name`,
      [],
    );
    return res.json(rows);
  }

  const clazz = await getAsync(
    `SELECT classes.*, users.id AS teacher_id, users.name AS teacher_name, users.email AS teacher_email
     FROM classes
     LEFT JOIN users ON users.class_id = classes.id AND users.role = 'teacher'
     WHERE classes.id = ?`,
    [req.user.class_id],
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

  const nextSortOrderRow = await getAsync('SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextOrder FROM classes');
  const nextSortOrder = nextSortOrderRow?.nextOrder || 1;
  const result = await runAsync('INSERT INTO classes (name, parallel, sort_order) VALUES (?, ?, ?)', [name, parallel, nextSortOrder]);

  if (teacher_id) {
    await runAsync('UPDATE users SET class_id = NULL WHERE class_id = ? AND role = ? AND id <> ?', [result.lastID, 'teacher', teacher_id]);
    await runAsync('UPDATE users SET class_id = ? WHERE id = ? AND role = ?', [result.lastID, teacher_id, 'teacher']);
  }

  res.json({ id: result.lastID, name, parallel, sort_order: nextSortOrder, teacher_id: teacher_id || null });
});

router.put('/:id', managerOnly, async (req, res) => {
  const { id } = req.params;
  const { name, parallel, teacher_id, sort_order } = req.body;
  const existing = await getAsync('SELECT * FROM classes WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Класс не найден.' });
  }

  const nextSortOrder = typeof sort_order === 'number' ? sort_order : existing.sort_order;
  await runAsync('UPDATE classes SET name = ?, parallel = ?, sort_order = ? WHERE id = ?', [
    name || existing.name,
    parallel || existing.parallel,
    nextSortOrder,
    id,
  ]);

  if (teacher_id) {
    await runAsync('UPDATE users SET class_id = NULL WHERE class_id = ? AND role = ? AND id <> ?', [id, 'teacher', teacher_id]);
    await runAsync('UPDATE users SET class_id = ? WHERE id = ? AND role = ?', [id, teacher_id, 'teacher']);
  } else {
    await runAsync('UPDATE users SET class_id = NULL WHERE class_id = ? AND role = ?', [id, 'teacher']);
  }

  res.json({ id: Number(id), name: name || existing.name, parallel: parallel || existing.parallel, sort_order: nextSortOrder, teacher_id: teacher_id || null });
});

router.put('/:id/order', managerOnly, async (req, res) => {
  const { id } = req.params;
  const { sort_order } = req.body;
  const existing = await getAsync('SELECT * FROM classes WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ message: 'Класс не найден.' });
  }
  if (typeof sort_order !== 'number') {
    return res.status(400).json({ message: 'Неправильный порядок сортировки.' });
  }
  await runAsync('UPDATE classes SET sort_order = ? WHERE id = ?', [sort_order, id]);
  res.json({ id: Number(id), sort_order });
});

router.put('/order', managerOnly, async (req, res) => {
  const { class_ids } = req.body;
  if (!Array.isArray(class_ids)) {
    return res.status(400).json({ message: 'Неверный формат списка классов.' });
  }

  let nextOrder = 1;
  for (const rawId of class_ids) {
    const classId = Number(rawId);
    if (Number.isNaN(classId)) continue;
    await runAsync('UPDATE classes SET sort_order = ? WHERE id = ?', [nextOrder, classId]);
    nextOrder += 1;
  }

  res.json({ success: true });
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
