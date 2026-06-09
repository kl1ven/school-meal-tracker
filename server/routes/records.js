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

const AUDIT_FIELDS = ['date', 'class_id', 'breakfast_count', 'lunch_count', 'actual_breakfast_count', 'actual_lunch_count'];

const getChangedValues = (oldValues, newValues) => {
  const changedOld = {};
  const changedNew = {};

  AUDIT_FIELDS.forEach((field) => {
    const oldValue = oldValues[field];
    const newValue = newValues[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedOld[field] = oldValue;
      changedNew[field] = newValue;
    }
  });

  return {
    oldValues: Object.keys(changedOld).length ? changedOld : null,
    newValues: Object.keys(changedNew).length ? changedNew : null,
  };
};

const logAudit = async ({ user, action, tableName, recordId, oldValues, newValues }) => {
  const auditOld = oldValues ? JSON.stringify(oldValues) : null;
  const auditNew = JSON.stringify(newValues);
  await runAsync(
    'INSERT INTO audit_log (user_id, user_name, action, table_name, record_id, old_values, new_values, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [user.id, user.name, action, tableName, recordId, auditOld, auditNew, new Date().toISOString()],
  );
};

// Helper function to create notification
const createNotification = async ({ userId, type, title, message, link }) => {
  try {
    const result = await runAsync(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, type, title, message, link || null]
    );

    console.log(`[notifications] 📬 Создано: userId=${userId}, type=${type}, title="${title}", id=${result.lastID}`);
    return result.lastID;
  } catch (error) {
    console.error('[notifications] ❌ Ошибка создания:', error);
    throw error;
  }
};

// Create notification but avoid sending duplicates within a short window
const createNotificationIfNotRecent = async ({ userId, type, title, message, link, windowSeconds = 30 }) => {
  try {
    // Check for a recent identical notification (same user, type and message)
    const recent = await getAsync(
      `SELECT id, created_at FROM notifications WHERE user_id = ? AND type = ? AND message = ? AND created_at >= datetime('now', ?)`,
      [userId, type, message, `-${windowSeconds} seconds`]
    );

    if (!recent) {
      const id = await createNotification({ userId, type, title, message, link });
      console.log(`[notifications] ✅ Уведомление создано (дубликат не найден): userId=${userId}, type=${type}, title="${title}", id=${id}, window=${windowSeconds}sec`);
      return id;
    } else {
      console.log(`[notifications] ⏭️ ДУБЛЬ заблокирован: userId=${userId}, type=${type}, recent_id=${recent.id}, created_at=${recent.created_at}, window=${windowSeconds}sec`);
      return null;
    }
  } catch (error) {
    console.error('[notifications] ❌ Ошибка при проверке дупликата:', error);
    // Fallback: create notification anyway if check fails
    console.log('[notifications] ⚠️ Создаём уведомление без проверки (ошибка в sql)');
    return await createNotification({ userId, type, title, message, link });
  }
};

// Notify all managers about new request
const notifyManagersAboutNewRequest = async (date, classId) => {
  const managers = await allAsync('SELECT id FROM users WHERE role = ?', ['manager']);
  const classInfo = await getAsync('SELECT name FROM classes WHERE id = ?', [classId]);

  const title = 'Новая заявка по питанию';
  const message = `Поступила новая заявка по питанию для класса ${classInfo?.name || 'неизвестный'} на ${date}.`;
  const link = `/manager/records?date=${date}&classId=${classId}`;

  for (const manager of managers) {
    await createNotificationIfNotRecent({
      userId: manager.id,
      type: 'new_request',
      title,
      message,
      link,
      windowSeconds: 30,
    });
  }
};

// Notify teacher about manager edit
const notifyTeacherAboutEdit = async (date, classId, teacherId) => {
  const classInfo = await getAsync('SELECT name FROM classes WHERE id = ?', [classId]);

  await createNotificationIfNotRecent({
    userId: teacherId,
    type: 'manager_edit',
    title: 'Менеджер изменил вашу заявку',
    message: `Менеджер изменил данные по питанию для класса ${classInfo?.name || 'неизвестный'} на ${date}.`,
    link: `/teacher/records?date=${date}`,
    windowSeconds: 30,
  });
};

// Notify teacher about actual data change
const notifyTeacherAboutActualChange = async (date, classId, teacherId, breakfastDiff, lunchDiff) => {
  const classInfo = await getAsync('SELECT name FROM classes WHERE id = ?', [classId]);
  const changes = [];
  if (breakfastDiff >= 1) changes.push(`завтрак (разница ${breakfastDiff})`);
  if (lunchDiff >= 1) changes.push(`обед (разница ${lunchDiff})`);

  const message = `Для класса ${classInfo?.name || 'неизвестный'} на ${date} обнаружено расхождение: ${changes.join(', ')}.`;

  await createNotificationIfNotRecent({
    userId: teacherId,
    type: 'actual_changed',
    title: 'Фактическая выдача отличается от вашей заявки',
    message,
    link: `/teacher/records?date=${date}`,
    windowSeconds: 30,
  });
};

// Notify manager about discrepancy
const notifyManagerAboutDiscrepancy = async (date, classId, breakfast, lunch) => {
  const managers = await allAsync('SELECT id FROM users WHERE role = ?', ['manager']);
  const classInfo = await getAsync('SELECT name FROM classes WHERE id = ?', [classId]);

  const discrepancyInfo = [];
  if (breakfast >= 1) discrepancyInfo.push(`Завтрак: разница ${breakfast}`);
  if (lunch >= 1) discrepancyInfo.push(`Обед: разница ${lunch}`);

  const title = 'Расхождение заявленных и фактических порций';
  const message = `В классе ${classInfo?.name || 'неизвестный'} на ${date} обнаружено расхождение: ${discrepancyInfo.join(', ')}.`;
  const link = `/manager/records?date=${date}&classId=${classId}`;

  // Send a single notification per manager, but avoid duplicates within a short time window
  for (const manager of managers) {
    await createNotificationIfNotRecent({ 
      userId: manager.id, 
      type: 'discrepancy', 
      title, 
      message, 
      link,
      windowSeconds: 30,
    });
  }
};

// Notify canteen about confirmed data
const notifyCanteenAboutConfirmation = async (date, classId) => {
  const canteens = await allAsync('SELECT id FROM users WHERE role = ?', ['canteen']);
  const classInfo = await getAsync('SELECT name FROM classes WHERE id = ?', [classId]);

  const title = 'Фактические данные подтверждены';
  const message = `Менеджер подтвердил фактические данные по питанию для класса ${classInfo?.name || 'неизвестный'} на ${date}.`;
  const link = `/canteen/records?date=${date}&classId=${classId}`;

  for (const canteen of canteens) {
    await createNotificationIfNotRecent({ 
      userId: canteen.id, 
      type: 'confirmation', 
      title, 
      message, 
      link,
      windowSeconds: 30,
    });
  }
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
    const newValues = {
      date: existing.date,
      class_id: existing.class_id,
      breakfast_count,
      lunch_count,
      actual_breakfast_count: existing.actual_breakfast_count,
      actual_lunch_count: existing.actual_lunch_count,
    };
    const { oldValues: changedOld, newValues: changedNew } = getChangedValues(existing, newValues);

    await runAsync(
      'UPDATE meal_records SET breakfast_count = ?, lunch_count = ?, created_by = ? WHERE id = ?',
      [breakfast_count, lunch_count, req.user.id, existing.id],
    );

    if (changedOld && changedNew) {
      await logAudit({
        user: req.user,
        action: 'UPDATE',
        tableName: 'meal_records',
        recordId: existing.id,
        oldValues: changedOld,
        newValues: changedNew,
      });
    }

    // Notify managers if teacher modified the request
    if (req.user.role === 'teacher') {
      console.log(`[records] 👨‍🏫 Учитель изменил заявку, уведомляем менеджеров: date=${date}, class_id=${class_id}`);
      await notifyManagersAboutNewRequest(date, class_id);
    }

    // Notify teacher if manager modified the request
    if (req.user.role === 'manager') {
      console.log(`[records] 👨‍💼 Менеджер изменил заявку, уведомляем учителя: date=${date}, class_id=${class_id}`);
      const teacher = await getAsync('SELECT id FROM users WHERE role = ? AND class_id = ?', ['teacher', class_id]);
      if (teacher) {
        await notifyTeacherAboutEdit(date, class_id, teacher.id);
      }
    }

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

  await logAudit({
    user: req.user,
    action: 'CREATE',
    tableName: 'meal_records',
    recordId: result.lastID,
    oldValues: null,
    newValues: {
      date,
      class_id,
      breakfast_count,
      lunch_count,
      actual_breakfast_count: existing?.actual_breakfast_count ?? 0,
      actual_lunch_count: existing?.actual_lunch_count ?? 0,
    },
  });

  // Notify managers about new request from teacher
  if (req.user.role === 'teacher') {
    console.log(`[records] 📝 Учитель создал новую заявку, уведомляем менеджеров: date=${date}, class_id=${class_id}`);
    await notifyManagersAboutNewRequest(date, class_id);
  }

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
  
  // Check for discrepancy
  let breakfastDiff = 0;
  let lunchDiff = 0;
  
  if (existing) {
    breakfastDiff = Math.abs(existing.breakfast_count - actual_breakfast_count);
    lunchDiff = Math.abs(existing.lunch_count - actual_lunch_count);
    console.log(`[records] actual save by ${req.user.role} for date=${date}, class=${class_id}, breakfastDiff=${breakfastDiff}, lunchDiff=${lunchDiff}`);
    
    // Notify manager about discrepancy (any difference >= 1)
    if (breakfastDiff >= 1 || lunchDiff >= 1) {
      console.log(`[records] ⚠️ Обнаружено расхождение, уведомляем менеджеров: date=${date}, class_id=${class_id}, breakfast_diff=${breakfastDiff}, lunch_diff=${lunchDiff}`);
      await notifyManagerAboutDiscrepancy(date, class_id, breakfastDiff, lunchDiff);
    }
    
    // Notify teacher about actual data change
    if (breakfastDiff >= 1 || lunchDiff >= 1) {
      console.log(`[records] 📊 Расхождение обнаружено, уведомляем учителя: date=${date}, class_id=${class_id}`);
      const teacher = await getAsync('SELECT id FROM users WHERE role = ? AND class_id = ?', ['teacher', class_id]);
      if (teacher) {
        await notifyTeacherAboutActualChange(date, class_id, teacher.id, breakfastDiff, lunchDiff);
      }
    }
  }

  if (existing) {
    const newValues = {
      date: existing.date,
      class_id: existing.class_id,
      breakfast_count: existing.breakfast_count,
      lunch_count: existing.lunch_count,
      actual_breakfast_count,
      actual_lunch_count,
    };
    const { oldValues: changedOld, newValues: changedNew } = getChangedValues(existing, newValues);

    await runAsync(
      'UPDATE meal_records SET actual_breakfast_count = ?, actual_lunch_count = ? WHERE id = ?',
      [actual_breakfast_count, actual_lunch_count, existing.id],
    );

    if (changedOld && changedNew) {
      await logAudit({
        user: req.user,
        action: 'UPDATE',
        tableName: 'meal_records',
        recordId: existing.id,
        oldValues: changedOld,
        newValues: changedNew,
      });
    }

    // Notify canteen about confirmation (if manager saves) or managers about canteen confirmation
    if (req.user.role === 'manager') {
      console.log(`[records] ✅ Менеджер подтвердил фактические данные, уведомляем столовую: date=${date}, class_id=${class_id}`);
      await notifyCanteenAboutConfirmation(date, class_id);
    } else if (req.user.role === 'canteen') {
      // For canteen: send a single notification to managers per date (once per day)
      try {
        console.log(`[records] 🍽️ Столовая сохранила фактические данные: date=${date}, class=${class_id}`);
        const existingSent = await getAsync('SELECT id FROM daily_notifications_sent WHERE date = ? AND type = ?', [date, 'canteen_update']);
        
        if (!existingSent) {
          const insertResult = await runAsync('INSERT OR IGNORE INTO daily_notifications_sent (date, type) VALUES (?, ?)', [date, 'canteen_update']);
          
          if (insertResult.changes > 0) {
            console.log(`[records] 📲 Первая сохранение на дату ${date}, отправляем уведомления менеджерам`);
            const managers = await allAsync('SELECT id FROM users WHERE role = ?', ['manager']);
            const message = `Столовая внесла фактические данные за ${date}`;
            const title = 'Столовая внесла фактические данные';
            const link = `/manager/records?date=${date}`;
            for (const manager of managers) {
              await createNotificationIfNotRecent({ 
                userId: manager.id, 
                type: 'canteen_update', 
                title, 
                message, 
                link,
                windowSeconds: 30,
              });
            }
          } else {
            console.log(`[records] ⏭️ Уведомление на ${date} уже было отправлено сегодня (INSERT OR IGNORE)`);
          }
        } else {
          console.log(`[records] ⏭️ Уведомление на ${date} уже было отправлено (дневной лимит)`);
        }
      } catch (err) {
        console.error('[records] ❌ Ошибка при обработке уведомления столовой:', err);
      }
    }

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

  const newRecord = {
    date,
    class_id,
    breakfast_count: 0,
    lunch_count: 0,
    actual_breakfast_count,
    actual_lunch_count,
  };

  await logAudit({
    user: req.user,
    action: 'CREATE',
    tableName: 'meal_records',
    recordId: result.lastID,
    oldValues: null,
    newValues: newRecord,
  });

  // Notify about confirmation for new record
  if (req.user.role === 'manager') {
    await notifyCanteenAboutConfirmation(date, class_id);
  }

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
