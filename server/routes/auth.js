const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getAsync } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

router.post('/login', async (req, res) => {
  const { emailOrPhone, password } = req.body;
  if (!emailOrPhone || !password) {
    return res.status(400).json({ message: 'Email или пароль обязателен.' });
  }

  const user = await getAsync('SELECT id, name, email, password_hash, role, class_id FROM users WHERE email = ?', [emailOrPhone]);
  if (!user) {
    return res.status(401).json({ message: 'Неправильные данные для входа.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: 'Неправильные данные для входа.' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, class_id: user.class_id }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, class_id: user.class_id } });
});

router.get('/profile', authenticateToken, async (req, res) => {
  const { id } = req.user;
  const user = await getAsync('SELECT id, name, email, role, class_id FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден.' });
  }
  res.json(user);
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(401).json({ message: 'Токен недействителен.' });
    }

    try {
      const currentUser = await getAsync(
        'SELECT id, name, email, role, class_id FROM users WHERE id = ?',
        [payload.id],
      );

      if (!currentUser) {
        return res.status(401).json({ message: 'Пользователь не найден.' });
      }

      req.user = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        class_id: currentUser.class_id,
      };

      next();
    } catch (dbError) {
      return res.status(500).json({ message: 'Не удалось проверить пользователя.' });
    }
  });
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
