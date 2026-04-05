const express = require('express');
const { getAsync, allAsync, runAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

const parseLocalDate = (value) => {
  const parts = String(value).split('-').map(Number);
  if (parts.length === 3 && parts.every((item) => Number.isFinite(item))) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const isWeekendDate = (value) => {
  const day = parseLocalDate(value).getDay();
  return day === 0 || day === 6;
};

router.use(authenticateToken);

router.get('/history', async (req, res) => {
  const classId = req.user.role === 'teacher' ? req.user.class_id : req.query.classId;
  if (!classId) {
    return res.status(400).json({ message: 'Не указан класс.' });
  }
  const rows = await allAsync('SELECT * FROM meal_records WHERE class_id = ? ORDER BY date DESC LIMIT 10', [classId]);
  res.json(rows);
});

router.get('/date', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'Не указана дата.' });
  }

  const params = [date];
  let query = `
    SELECT meal_records.*, classes.name AS class_name, classes.parallel
    FROM meal_records
    JOIN classes ON meal_records.class_id = classes.id
    WHERE meal_records.date = ?
  `;

  if (req.user.role === 'teacher') {
    query += ' AND meal_records.class_id = ?';
    params.push(req.user.class_id);
  } else if (req.query.classId) {
    query += ' AND meal_records.class_id = ?';
    params.push(req.query.classId);
  }

  const rows = await allAsync(query, params);
  res.json(rows);
});

router.get('/month', async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) {
    return res.status(400).json({ message: 'Не указан месяц или год.' });
  }

  const params = [year.toString(), String(month).padStart(2, '0')];
  let query = 'SELECT meal_records.*, classes.name AS class_name, classes.parallel FROM meal_records JOIN classes ON meal_records.class_id = classes.id WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ?';
  if (req.user.role === 'teacher') {
    query += ' AND meal_records.class_id = ?';
    params.push(req.user.class_id);
  } else if (req.query.classId) {
    query += ' AND meal_records.class_id = ?';
    params.push(req.query.classId);
  }

  const rows = await allAsync(query, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { date, class_id, breakfast_count, lunch_count } = req.body;
  if (req.user.role === 'canteen') {
    return res.status(403).json({ message: 'Столовая не может изменять исходные заявки.' });
  }
  if (!date || !class_id) {
    return res.status(400).json({ message: 'Не указаны дата и класс.' });
  }

  const recordDate = new Date(date);
  const today = new Date();
  if (recordDate > today) {
    return res.status(400).json({ message: 'Нельзя сохранять данные на будущую дату.' });
  }
  if (!Number.isInteger(breakfast_count) || breakfast_count < 0 || !Number.isInteger(lunch_count) || lunch_count < 0) {
    return res.status(400).json({ message: 'Количество должно быть целым числом >= 0.' });
  }

  if (req.user.role === 'teacher') {
    const holiday = await getAsync('SELECT is_working FROM holiday_calendar WHERE date = ?', [date]);
    const isNonWorkingHoliday = Boolean(holiday) && Number(holiday.is_working) === 0;

    if (isWeekendDate(date) || isNonWorkingHoliday) {
      return res.status(400).json({ message: 'На выходной или праздничный день учитель не может вносить данные.' });
    }
  }

  if (req.user.role === 'teacher' && req.user.class_id !== Number(class_id)) {
    return res.status(403).json({ message: 'Нет доступа к этому классу.' });
  }

  const existing = await getAsync('SELECT * FROM meal_records WHERE date = ? AND class_id = ?', [date, class_id]);
  if (existing) {
    await runAsync(
      'UPDATE meal_records SET breakfast_count = ?, lunch_count = ?, created_by = ? WHERE id = ?',
      [breakfast_count, lunch_count, req.user.id, existing.id],
    );
    return res.json({
      ...existing,
      breakfast_count,
      lunch_count,
      created_by: req.user.id,
    });
  }

  const result = await runAsync(
    'INSERT INTO meal_records (date, class_id, breakfast_count, lunch_count, created_by) VALUES (?, ?, ?, ?, ?)',
    [date, class_id, breakfast_count, lunch_count, req.user.id],
  );
  res.json({ id: result.lastID, date, class_id, breakfast_count, lunch_count, created_by: req.user.id });
});

router.post('/actual', async (req, res) => {
  const { date, class_id, actual_breakfast_count, actual_lunch_count } = req.body;

  if (!['manager', 'canteen'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Нет доступа к фактической выдаче.' });
  }
  if (!date || !class_id) {
    return res.status(400).json({ message: 'Не указаны дата и класс.' });
  }
  if (!Number.isInteger(actual_breakfast_count) || actual_breakfast_count < 0 || !Number.isInteger(actual_lunch_count) || actual_lunch_count < 0) {
    return res.status(400).json({ message: 'Фактическое количество должно быть целым числом >= 0.' });
  }

  const existing = await getAsync('SELECT * FROM meal_records WHERE date = ? AND class_id = ?', [date, class_id]);
  if (existing) {
    await runAsync(
      'UPDATE meal_records SET actual_breakfast_count = ?, actual_lunch_count = ? WHERE id = ?',
      [actual_breakfast_count, actual_lunch_count, existing.id],
    );
    return res.json({
      ...existing,
      actual_breakfast_count,
      actual_lunch_count,
    });
  }

  const result = await runAsync(
    `INSERT INTO meal_records (
      date, class_id, breakfast_count, lunch_count, actual_breakfast_count, actual_lunch_count, created_by
    ) VALUES (?, ?, 0, 0, ?, ?, ?)`,
    [date, class_id, actual_breakfast_count, actual_lunch_count, req.user.id],
  );

  res.json({
    id: result.lastID,
    date,
    class_id,
    breakfast_count: 0,
    lunch_count: 0,
    actual_breakfast_count,
    actual_lunch_count,
    created_by: req.user.id,
  });
});

module.exports = router;
