const express = require('express');
const { getAsync, allAsync, runAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) {
    const rows = await allAsync('SELECT * FROM holiday_calendar ORDER BY date', []);
    return res.json(rows);
  }
  const rows = await allAsync(
    'SELECT * FROM holiday_calendar WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ? ORDER BY date',
    [year.toString(), String(month).padStart(2, '0')],
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { date, is_working } = req.body;
  if (!date || typeof is_working !== 'boolean') {
    return res.status(400).json({ message: 'Нужно указать дату и рабочий статус.' });
  }
  const existing = await getAsync('SELECT * FROM holiday_calendar WHERE date = ?', [date]);
  if (existing) {
    await runAsync('UPDATE holiday_calendar SET is_working = ? WHERE date = ?', [is_working ? 1 : 0, date]);
    return res.json({ ...existing, is_working });
  }
  const result = await runAsync('INSERT INTO holiday_calendar (date, is_working) VALUES (?, ?)', [date, is_working ? 1 : 0]);
  res.json({ id: result.lastID, date, is_working });
});

module.exports = router;
