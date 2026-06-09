const express = require('express');
const { allAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Доступ запрещен.' });
  }

  const limit = Number(req.query.limit) || 100;
  const offset = Number(req.query.offset) || 0;
  const fromDate = req.query.fromDate ? String(req.query.fromDate) : null;
  const toDate = req.query.toDate ? String(req.query.toDate) : null;
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const classId = req.query.classId ? Number(req.query.classId) : null;
  const recordId = req.query.recordId ? Number(req.query.recordId) : null;

  let query = 'SELECT audit_log.* FROM audit_log';
  const params = [];

  if (classId) {
    query += ' JOIN meal_records ON audit_log.record_id = meal_records.id';
  }

  query += ' WHERE 1=1';

  if (userId) {
    query += ' AND audit_log.user_id = ?';
    params.push(userId);
  }

  if (recordId) {
    query += ' AND audit_log.record_id = ?';
    params.push(recordId);
  }

  if (fromDate) {
    query += ' AND audit_log.created_at >= ?';
    params.push(fromDate);
  }

  if (toDate) {
    query += ' AND audit_log.created_at <= ?';
    params.push(toDate);
  }

  if (classId) {
    query += ' AND meal_records.class_id = ?';
    params.push(classId);
  }

  query += ' ORDER BY audit_log.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await allAsync(query, params);
  const parsedRows = rows.map((row) => ({
    ...row,
    old_values: row.old_values ? JSON.parse(row.old_values) : null,
    new_values: row.new_values ? JSON.parse(row.new_values) : null,
  }));

  res.json(parsedRows);
});

module.exports = router;
