const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const dbFile = process.env.DB_FILE || path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile);

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

async function initDb() {
  await runAsync(`PRAGMA journal_mode = WAL`);

  const classesTableSql = await getAsync(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'classes'`);
  const classesHasTeacherId = classesTableSql?.sql?.includes('teacher_id');

  if (classesHasTeacherId) {
    await runAsync('DROP TABLE IF EXISTS classes_old');
    await runAsync('ALTER TABLE classes RENAME TO classes_old');
  }

  await runAsync(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parallel INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  const classColumns = await allAsync('PRAGMA table_info(classes)');
  const classesHasSortOrder = classColumns.some((column) => column.name === 'sort_order');
  if (!classesHasSortOrder) {
    await runAsync('ALTER TABLE classes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  }

  if (classesHasTeacherId) {
    await runAsync(`
      UPDATE users
      SET class_id = (
        SELECT id FROM classes_old WHERE classes_old.teacher_id = users.id
      )
      WHERE role = 'teacher' AND class_id IS NULL
    `);

    await runAsync(`
      INSERT INTO classes (id, name, parallel, sort_order)
      SELECT id, name, parallel, 0 FROM classes_old
    `);

    await runAsync('DROP TABLE classes_old');
  }

  const usersTableSql = await getAsync(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'`);
  if (usersTableSql?.sql && (!usersTableSql.sql.includes("'canteen'") || !usersTableSql.sql.includes('UNIQUE(class_id)'))) {
    await runAsync('DROP TABLE IF EXISTS users_old');
    await runAsync('ALTER TABLE users RENAME TO users_old');
    await runAsync(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher', 'manager', 'canteen')),
        class_id INTEGER,
        FOREIGN KEY(class_id) REFERENCES classes(id),
        UNIQUE(class_id)
      )
    `);
    await runAsync(`
      INSERT INTO users (id, name, email, password_hash, role, class_id)
      SELECT id, name, email, password_hash, role, class_id FROM users_old
    `);
    await runAsync('DROP TABLE users_old');
  }

  await runAsync(`
    CREATE TABLE IF NOT EXISTS meal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      breakfast_count INTEGER NOT NULL DEFAULT 0,
      lunch_count INTEGER NOT NULL DEFAULT 0,
      actual_breakfast_count INTEGER NOT NULL DEFAULT 0,
      actual_lunch_count INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      UNIQUE(date, class_id),
      FOREIGN KEY(class_id) REFERENCES classes(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);

  const mealColumns = await allAsync(`PRAGMA table_info(meal_records)`);
  if (!mealColumns.some((column) => column.name === 'created_by')) {
    await runAsync('ALTER TABLE meal_records ADD COLUMN created_by INTEGER');
  }
  if (!mealColumns.some((column) => column.name === 'actual_breakfast_count')) {
    await runAsync('ALTER TABLE meal_records ADD COLUMN actual_breakfast_count INTEGER NOT NULL DEFAULT 0');
  }
  if (!mealColumns.some((column) => column.name === 'actual_lunch_count')) {
    await runAsync('ALTER TABLE meal_records ADD COLUMN actual_lunch_count INTEGER NOT NULL DEFAULT 0');
  }
  await runAsync(`
    UPDATE meal_records
    SET actual_breakfast_count = COALESCE(actual_breakfast_count, 0),
        actual_lunch_count = COALESCE(actual_lunch_count, 0)
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS holiday_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      is_working INTEGER NOT NULL DEFAULT 1
    )
  `);

  const classesCount = (await getAsync('SELECT COUNT(*) AS count FROM classes')).count;
  if (classesCount === 0) {
    const parallels = [1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 7, 9, 9, 9, 10, 11];
    const names = [
      '1-а', '1-б', '1г-доп', '1-в', '2-а', '2-б', '3-а', '3-б', '4-а', '4-б',
      '5-а', '5-б', '6-а', '6-б', '7-а', '6в/7б', '8-а', '8-б', '8-в', '7в/8г',
      '9-а', '9-б', '9в/10б', '10-а', '11',
    ];
    for (let index = 0; index < names.length; index += 1) {
      await runAsync('INSERT INTO classes (name, parallel, sort_order) VALUES (?, ?, ?)', [names[index], parallels[index] || 0, index + 1]);
    }
  }

  const CLASS_ORDER = [
    '1-а', '1-б', '1г-доп', '1-в', '2-а', '2-б', '3-а', '3-б', '4-а', '4-б',
    '5-а', '5-б', '6-а', '6-б', '7-а', '6в/7б', '8-а', '8-б', '8-в', '7в/8г',
    '9-а', '9-б', '9в/10б', '10-а', '11'
  ];

  let maxSortOrder = 0;
  const currentClassRows = await allAsync('SELECT id, name, sort_order FROM classes ORDER BY id');
  currentClassRows.forEach((row) => {
    if (typeof row.sort_order === 'number' && row.sort_order > maxSortOrder) {
      maxSortOrder = row.sort_order;
    }
  });

  for (let index = 0; index < CLASS_ORDER.length; index += 1) {
    const order = index + 1;
    await runAsync('UPDATE classes SET sort_order = ? WHERE name = ? AND sort_order = 0', [order, CLASS_ORDER[index]]);
    if (order > maxSortOrder) {
      maxSortOrder = order;
    }
  }

  const remainingClasses = await allAsync('SELECT id FROM classes WHERE sort_order = 0 ORDER BY name');
  for (const row of remainingClasses) {
    maxSortOrder += 1;
    await runAsync('UPDATE classes SET sort_order = ? WHERE id = ?', [maxSortOrder, row.id]);
  }

  async function ensureUser({ name, email, password, role, className = null }) {
    let classId = null;
    if (className) {
      const classRow = await getAsync('SELECT id FROM classes WHERE name = ?', [className]);
      classId = classRow ? classRow.id : null;
    }

    const existingUser = await getAsync('SELECT id, class_id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      if (role === 'teacher' && classId && Number(existingUser.class_id) !== Number(classId)) {
        await runAsync('UPDATE users SET class_id = ? WHERE id = ?', [classId, existingUser.id]);
      }
      return;
    }

    await runAsync(
      'INSERT INTO users (name, email, password_hash, role, class_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, bcrypt.hashSync(password, 10), role, classId],
    );
  }

  await ensureUser({
    name: 'Классный руководитель',
    email: 'class_teacher@example.com',
    password: 'teacher123',
    role: 'teacher',
    className: '3-а',
  });

  await ensureUser({
    name: 'Иванова Мария Петровна',
    email: 'ivanova@example.com',
    password: 'teacher123',
    role: 'teacher',
    className: '1-а',
  });

  await ensureUser({
    name: 'Сидоров Петр Иванович',
    email: 'sidorov@example.com',
    password: 'teacher123',
    role: 'teacher',
    className: '2-а',
  });

  await ensureUser({
    name: 'Петрова Елена Сергеевна',
    email: 'petrova@example.com',
    password: 'teacher123',
    role: 'teacher',
    className: '5-а',
  });

  await ensureUser({
    name: 'Смирнов Анатолий Викторович',
    email: 'smirnov@example.com',
    password: 'teacher123',
    role: 'teacher',
  });

  await ensureUser({
    name: 'Менеджер питания',
    email: 'manager@example.com',
    password: 'manager123',
    role: 'manager',
  });

  await ensureUser({
    name: 'Сотрудник столовой',
    email: 'canteen@example.com',
    password: 'canteen123',
    role: 'canteen',
  });
}

module.exports = { db, initDb, runAsync, getAsync, allAsync };
