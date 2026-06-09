const express = require('express');
const { allAsync, getAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.use(authenticateToken);

function ensureManager(req, res) {
  if (req.user.role !== 'manager') {
    res.status(403).json({ message: 'Доступ запрещен.' });
    return false;
  }
  return true;
}

// GET /api/statistics/daily?classId=&month=&year=
router.get('/daily', async (req, res) => {
  if (!ensureManager(req, res)) return;

  const classId = req.query.classId ? Number(req.query.classId) : null;
  const month = String(req.query.month || '').padStart(2, '0');
  const year = String(req.query.year || '');
  if (!month || !year) return res.status(400).json({ message: 'Не указан месяц или год.' });

  const params = [year, month];
  let where = 'WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ?';
  if (classId) {
    where += ' AND class_id = ?';
    params.push(classId);
  }

  const rows = await allAsync(`
    SELECT date, SUM(breakfast_count) AS breakfast, SUM(lunch_count) AS lunch
    FROM meal_records
    ${where}
    GROUP BY date
    ORDER BY date ASC
  `, params);

  // build full days list for month
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const dates = [];
  const breakfast = [];
  const lunch = [];
  const rowMap = {};
  rows.forEach((r) => { rowMap[r.date] = r; });

  for (let d = 1; d <= daysInMonth; d += 1) {
    const day = String(d).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    dates.push(dateStr);
    const r = rowMap[dateStr];
    breakfast.push(r ? Number(r.breakfast) : 0);
    lunch.push(r ? Number(r.lunch) : 0);
  }

  res.json({ dates, breakfast, lunch });
});

// GET /api/statistics/classes?month=&year=&type=breakfast|lunch
router.get('/classes', async (req, res) => {
  if (!ensureManager(req, res)) return;

  const month = String(req.query.month || '').padStart(2, '0');
  const year = String(req.query.year || '');
  const type = req.query.type === 'lunch' ? 'lunch_count' : 'breakfast_count';
  if (!month || !year) return res.status(400).json({ message: 'Не указан месяц или год.' });

  const rows = await allAsync(`
    SELECT classes.name AS className, SUM(meal_records.${type}) AS total
    FROM meal_records
    JOIN classes ON meal_records.class_id = classes.id
    WHERE strftime("%Y", meal_records.date) = ? AND strftime("%m", meal_records.date) = ?
    GROUP BY meal_records.class_id
    ORDER BY total DESC
  `, [year, month]);

  const parsed = rows.map((r) => ({ className: r.className, total: Number(r.total) }));
  res.json(parsed);
});

// GET /api/statistics/summary?month=&year=
router.get('/summary', async (req, res) => {
  if (!ensureManager(req, res)) return;

  const month = String(req.query.month || '').padStart(2, '0');
  const year = String(req.query.year || '');
  if (!month || !year) return res.status(400).json({ message: 'Не указан месяц или год.' });

  const totalRow = await getAsync(`
    SELECT SUM(breakfast_count) AS totalBreakfast, SUM(lunch_count) AS totalLunch
    FROM meal_records
    WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ?
  `, [year, month]);

  const daysRow = await getAsync(`
    SELECT COUNT(DISTINCT date) AS daysCount FROM meal_records WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ?
  `, [year, month]);

  const maxBreakfastRow = await getAsync(`SELECT MAX(day_sum) AS maxBreakfast FROM (SELECT SUM(breakfast_count) AS day_sum FROM meal_records WHERE strftime("%Y", date)=? AND strftime("%m", date)=? GROUP BY date)`, [year, month]);
  const minBreakfastRow = await getAsync(`SELECT MIN(day_sum) AS minBreakfast FROM (SELECT SUM(breakfast_count) AS day_sum FROM meal_records WHERE strftime("%Y", date)=? AND strftime("%m", date)=? GROUP BY date)`, [year, month]);
  const maxLunchRow = await getAsync(`SELECT MAX(day_sum) AS maxLunch FROM (SELECT SUM(lunch_count) AS day_sum FROM meal_records WHERE strftime("%Y", date)=? AND strftime("%m", date)=? GROUP BY date)`, [year, month]);
  const minLunchRow = await getAsync(`SELECT MIN(day_sum) AS minLunch FROM (SELECT SUM(lunch_count) AS day_sum FROM meal_records WHERE strftime("%Y", date)=? AND strftime("%m", date)=? GROUP BY date)`, [year, month]);

  const totalBreakfast = Number(totalRow?.totalBreakfast || 0);
  const totalLunch = Number(totalRow?.totalLunch || 0);
  const daysCount = Number(daysRow?.daysCount || 0) || 1;

  const avgBreakfast = daysCount ? (totalBreakfast / daysCount) : 0;
  const avgLunch = daysCount ? (totalLunch / daysCount) : 0;

  const summary = {
    totalBreakfast,
    totalLunch,
    avgBreakfast: Number(avgBreakfast.toFixed(2)),
    avgLunch: Number(avgLunch.toFixed(2)),
    maxBreakfast: Number(maxBreakfastRow?.maxBreakfast || 0),
    minBreakfast: Number(minBreakfastRow?.minBreakfast || 0),
    maxLunch: Number(maxLunchRow?.maxLunch || 0),
    minLunch: Number(minLunchRow?.minLunch || 0),
    daysCount,
    breakfastShare: totalBreakfast + totalLunch ? Number((totalBreakfast / (totalBreakfast + totalLunch)).toFixed(4)) : 0,
  };

  res.json(summary);
});

// GET /api/statistics/comparison?month=&year=&prevMonth=&prevYear=
router.get('/comparison', async (req, res) => {
  if (!ensureManager(req, res)) return;

  const month = String(req.query.month || '').padStart(2, '0');
  const year = String(req.query.year || '');
  const prevMonth = String(req.query.prevMonth || '').padStart(2, '0');
  const prevYear = String(req.query.prevYear || '');
  if (!month || !year || !prevMonth || !prevYear) return res.status(400).json({ message: 'Не указан месяц/год или предыдущий месяц/год.' });

  const curr = await getAsync('SELECT SUM(breakfast_count) AS b, SUM(lunch_count) AS l FROM meal_records WHERE strftime("%Y", date)=? AND strftime("%m", date)=?', [year, month]);
  const prev = await getAsync('SELECT SUM(breakfast_count) AS b, SUM(lunch_count) AS l FROM meal_records WHERE strftime("%Y", date)=? AND strftime("%m", date)=?', [prevYear, prevMonth]);

  const currB = Number(curr?.b || 0);
  const currL = Number(curr?.l || 0);
  const prevB = Number(prev?.b || 0);
  const prevL = Number(prev?.l || 0);

  const pct = (currVal, prevVal) => {
    if (prevVal === 0) return prevVal === currVal ? 0 : 100;
    return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
  };

  res.json({
    breakfast: { current: currB, previous: prevB, changePercent: pct(currB, prevB) },
    lunch: { current: currL, previous: prevL, changePercent: pct(currL, prevL) },
  });
});

module.exports = router;
