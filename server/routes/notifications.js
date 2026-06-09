const express = require('express');
const { getAsync, allAsync, runAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/notifications - Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unreadOnly = 0 } = req.query;
    const userId = req.user.id;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (unreadOnly == 1) {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notifications = await allAsync(query, params);

    const countResult = await getAsync(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? ${unreadOnly == 1 ? 'AND is_read = 0' : ''}`,
      [userId]
    );

    res.json({
      notifications,
      total: countResult.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read - Mark one notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await getAsync(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read for current user
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await runAsync('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// POST /api/notifications/test - Send test notification (manager only)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can send test notifications' });
    }

    const { userId, title, message, link } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: userId, title, message' });
    }

    // Create notification
    const result = await runAsync(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'test', title, message, link || null]
    );

    console.log(`[notifications] 🧪 Тестовое уведомление создано: userId=${userId}, title="${title}", id=${result.lastID}`);

    res.json({
      success: true,
      notificationId: result.lastID,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// POST /api/notifications/check-reminder - Check reminder for teacher
router.post('/check-reminder', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can check reminders' });
    }

    const userId = req.user.id;
    const classId = req.user.class_id;

    if (!classId) {
      return res.json({ reminderSent: false, message: 'No class assigned' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if record exists for today
    const record = await getAsync(
      `SELECT * FROM meal_records WHERE date = ? AND class_id = ?`,
      [today, classId]
    );

    if (record) {
      return res.json({ reminderSent: false, message: 'Data already submitted for today' });
    }

    // Check if reminder already sent today
    const existingReminder = await getAsync(
      `SELECT * FROM notifications WHERE user_id = ? AND type = 'reminder' AND date(created_at) = ?`,
      [userId, today]
    );

    if (existingReminder) {
      return res.json({ reminderSent: false, message: 'Reminder already sent today' });
    }

    // Create reminder notification
    const result = await runAsync(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        userId,
        'reminder',
        'Напоминание: данные по питанию не внесены',
        `Пожалуйста, внесите данные по количеству школьников в классе на ${today}.`,
      ]
    );

    console.log(`[notifications] 🔔 Напоминание отправлено: userId=${userId}, date=${today}, id=${result.lastID}`);

    res.json({ reminderSent: true, notificationId: result.lastID });
  } catch (error) {
    console.error('Error checking reminder:', error);
    res.status(500).json({ error: 'Failed to check reminder' });
  }
});

// DELETE /api/notifications/:id - Delete notification (only owner)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await getAsync(
      'SELECT id, user_id FROM notifications WHERE id = ?',
      [id]
    );

    if (!notification) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    if (notification.user_id !== userId) {
      return res.status(403).json({ error: 'Нет доступа к этому уведомлению' });
    }

    await runAsync('DELETE FROM notifications WHERE id = ?', [id]);

    console.log(`[notifications] 🗑️ Уведомление удалено: userId=${userId}, id=${id}`);

    res.json({ success: true, message: 'Уведомление удалено' });
  } catch (error) {
    console.error('Ошибка при удалении уведомления:', error);
    res.status(500).json({ error: 'Не удалось удалить уведомление' });
  }
});

module.exports = router;
