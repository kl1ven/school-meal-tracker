const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const classesRoutes = require('./routes/classes');
const recordsRoutes = require('./routes/records');
const holidayRoutes = require('./routes/holidays');
const exportRoutes = require('./routes/export');
const usersRoutes = require('./routes/users');

const app = express();
const port = process.env.PORT || 4000;

(async () => {
  await initDb();

  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/classes', classesRoutes);
  app.use('/api/records', recordsRoutes);
  app.use('/api/holidays', holidayRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/users', usersRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API маршрут не найден.' });
  });

  app.use(express.static(path.join(__dirname, '..', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  });

  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
})();

