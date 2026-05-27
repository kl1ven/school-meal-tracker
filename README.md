# 🍽️ School Meal Tracker

<p align="center">
  <strong>Система учёта питания в школе-интернате</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-43853D?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Status-Ready-success" alt="Status" />
</p>

---

## 📌 Краткое описание

Веб-приложение для учёта горячего питания в школе-интернате с разделением по ролям: **классный руководитель**, **менеджер питания** и **сотрудник столовой**.

---

## ✨ Основные возможности

### 🔐 Аутентификация и авторизация
- JWT-токены для безопасной авторизации
- Три роли пользователей с разграничением прав доступа

### 👥 Управление
- **Управление классами**: сортировка, добавление, редактирование, удаление
- **Управление пользователями**: создание, редактирование, удаление учителей и сотрудников столовой (только менеджер)

### 📝 Заявки на питание
- Подача заявок на завтраки и обеды от классного руководителя
- Валидация дат с учётом выходных и праздников
- Сводная таблица для менеджера (просмотр и редактирование заявок по дням)
- Календарь праздников и выходных дней

### 📊 Отчёты и аналитика
- **Экспорт в Excel** с форматированием (объединённые ячейки, рамки, итоги, отметка "в" для выходных)
- **Печатная форма** для столовой (новое окно, автоматическая печать)
- **Аналитика для менеджера**: линейные графики, топ классов, сводка, сравнение с предыдущим месяцем

### 📋 Журнал изменений
- Полный аудит всех операций с фильтрами
- Русские названия полей и действий (Создание, Изменение, Удаление)
- Отсутствие технических колонок "таблица" и "ID записи"

### 🔔 Система уведомлений
- **Внутренние уведомления**: колокольчик, браузерные тосты, автообновление
- **Email-уведомления** через Ethereal (разработка) или реальный SMTP (продакшн)
- **Дедупликация**: одно уведомление от столовой в день
- **Часовой пояс**: UTC+9 (Нерюнгри) для времени уведомлений и журнала

### 📱 Интерфейс
- Адаптивный дизайн для мобильных устройств
- Удобная навигация для разных ролей

---

## � Роли пользователей

| Роль | Возможности |
|------|-------------|
| **Классный руководитель** | Подача заявок на питание по своему классу, просмотр истории |
| **Менеджер питания** | Управление пользователями, классами, праздниками, просмотр аналитики, экспорт и печать отчётов |
| **Столовая** | Просмотр сводки на день, внесение фактической выдачи питания |

---

## 🧰 Технологический стек

### Frontend
- React 19
- TypeScript
- react-router-dom
- recharts (графики)
- react-icons (иконки)

### Backend
- Node.js
- Express
- SQLite
- JWT (авторизация)

### Отчёты и уведомления
- ExcelJS (экспорт в Excel)
- Nodemailer (email)
- Ethereal (тестовые письма)

---

## 🔐 Тестовые учётные данные

| Роль | Email | Пароль |
|------|-------|--------|
| Менеджер | `manager@example.com` | `manager123` |
| Классный руководитель | `class_teacher@example.com` | `teacher123` |
| Столовая | `canteen@example.com` | `canteen123` |

---

## 🚀 Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск проекта (frontend + backend одновременно)

```bash
npm run dev
```

### 3. Отдельный запуск (при необходимости)

```bash
# Только backend
npm run server

# Только frontend
npm start
```

### 🌐 Доступные адреса

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`

---

## 🏗️ Структура проекта

```
school-meal-tracker/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/               # UI-компоненты
│   │   ├── AuditLog.tsx          # Журнал изменений
│   │   ├── AnalyticsDashboard.tsx # Аналитика
│   │   ├── CanteenDashboard.tsx  # Панель столовой
│   │   ├── ManagerDashboard.tsx  # Панель менеджера
│   │   ├── TeacherDashboard.tsx  # Панель учителя
│   │   ├── NotificationBell.tsx  # Колокольчик уведомлений
│   │   └── ...
│   ├── services/                 # API-клиент
│   │   └── api.ts
│   ├── types/                    # TypeScript типы
│   └── App.tsx
├── server/                       # Backend (Node.js + Express)
│   ├── index.js                  # Главный файл сервера
│   ├── db.js                     # Инициализация БД
│   ├── database.sqlite           # SQLite база данных
│   └── routes/                   # API маршруты
│       ├── auth.js
│       ├── records.js
│       ├── users.js
│       ├── classes.js
│       ├── audit.js
│       ├── notifications.js
│       ├── statistics.js
│       └── ...
├── public/                       # Публичные файлы
├── docs/screenshots/             # Скриншоты интерфейса
└── package.json
```

---

## 🖼️ Скриншоты интерфейса

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/login.png" alt="Экран входа" width="100%" />
      <br /><strong>🔐 Экран входа</strong>
      <br /><sub>Авторизация учителя, менеджера и столовой</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/teacher-dashboard.png" alt="Панель учителя" width="100%" />
      <br /><strong>👩‍🏫 Панель учителя</strong>
      <br /><sub>Подача заявок на питание</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/manager-dashboard.png" alt="Панель менеджера" width="100%" />
      <br /><strong>📊 Панель менеджера</strong>
      <br /><sub>Управление, аналитика, отчёты</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/canteen-dashboard.png" alt="Панель столовой" width="100%" />
      <br /><strong>🍽️ Панель столовой</strong>
      <br /><sub>Сводка на день и фактическая выдача</sub>
    </td>
  </tr>
</table>

---

## �🖼️ Скриншоты интерфейса

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/login.png" alt="Экран входа" width="100%" />
      <br /><strong>🔐 Экран входа</strong>
      <br /><sub>Авторизация учителя, менеджера и сотрудника столовой</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/teacher-dashboard.png" alt="Панель учителя" width="100%" />
      <br /><strong>👩‍🏫 Панель учителя</strong>
      <br /><sub>Ввод заявок на питание и просмотр истории</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/manager-dashboard.png" alt="Панель менеджера" width="100%" />
      <br /><strong>📊 Панель менеджера</strong>
      <br /><sub>Сводные данные, классы, пользователи, праздники и отчёты</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/canteen-dashboard.png" alt="Панель столовой" width="100%" />
      <br /><strong>🍽️ Панель столовой</strong>
      <br /><sub>Сводка на день и фактическая выдача питания</sub>
    </td>
  </tr>
</table>

---

## 👥 Роли пользователей

| Роль | Возможности |
|------|-------------|
| `teacher` | Вводит данные по своему классу, просматривает последние записи |
| `manager` | Видит сводную таблицу, управляет классами, пользователями, праздниками, экспортом и печатью |
| `canteen` | Получает сводку на день и вносит фактическую выдачу завтраков и обедов |

---

## 🧰 Технологии

### Frontend
- `React`
- `TypeScript`
- `react-router-dom`
- CSS-модули / кастомные стили

### Backend
- `Node.js`
- `Express`
- `SQLite`
- `JWT` авторизация

### Отчёты
- `exceljs`
- серверная печатная форма для столовой

---

## 🔐 Тестовые учётные данные

- `class_teacher@example.com` / `teacher123` — **классный руководитель**
- `manager@example.com` / `manager123` — **менеджер питания**
- `canteen@example.com` / `canteen123` — **столовая**

---

## 🌐 Demo / Deploy

| Среда | Адрес / способ | Назначение |
|------|-----------------|------------|
| Local Demo | `http://localhost:3000` | пользовательский интерфейс |
| Local API | `http://localhost:4000` | backend и база данных |
| GitHub | `https://github.com/elizabethSmith138/school-meal-tracker` | исходный код проекта |
| Production | `npm run build` + `npm run server` | готово для деплоя на VPS / Render / Railway |

> Сейчас проект ориентирован на локальный запуск, но архитектура уже готова для публикации в облаке.

---

## 🚀 Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск проекта

#### Одновременно frontend + backend

```bash
npm run dev
```

#### Отдельный запуск

```bash
npm run server
npm start
```

### Доступные адреса

- frontend: `http://localhost:3000`
- backend API: `http://localhost:4000`

---

## ⚙️ Переменные окружения

Создайте файл `.env` в корне проекта (см. `.env.example` для примера):

```env
# Email Configuration (Optional)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@example.com
```

### 📧 Email-конфигурация

Приложение поддерживает **две режима отправки email**:

#### 1️⃣ Режим разработки (по умолчанию) — Ethereal test account
Если переменные `SMTP_*` не установлены, система автоматически создаст тестовый Ethereal-аккаунт и выведет учётные данные в консоль:
```
[Mailer] ✅ Ethereal test account created:
  Email: xxxxx@ethereal.email
  Password: xxxxxxxxxxxxx
  Preview URL: https://ethereal.email/messages
```
Письма можно просмотреть на https://ethereal.email/messages — не требует реальной отправки.

#### 2️⃣ Режим продакшена — Real SMTP
Укажите свой SMTP-сервер через переменные окружения:

**Брево (Sendinblue):**
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_brevo_smtp_login
SMTP_PASS=your_brevo_smtp_key
EMAIL_FROM=noreply@yourschool.com
```

**Gmail (с App Password):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
EMAIL_FROM=your_email@gmail.com
```

**Яндекс.Почта:**
```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@yandex.ru
SMTP_PASS=your_password
EMAIL_FROM=your_email@yandex.ru
```

**Mail.ru:**
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@mail.ru
SMTP_PASS=your_password
EMAIL_FROM=your_email@mail.ru
```

Полный список примеров см. в `.env.example`.

### 📬 Уведомления
Система отправляет email-уведомления в следующих случаях:
- классный руководитель подал новую заявку → менеджеру
- при расхождении фактической выдачи от плана → менеджеру
- менеджер подтвердил/обработал заявку → столовой
- доступны тестовые уведомления (только менеджер)

---

## 🏗️ Сборка проекта

```bash
npm run build
```

Для запуска production-сборки:

```bash
npm run server
```

Сервер будет раздавать статические файлы из папки `build/`.

---

## � Email-конфигурация

### Режим разработки (по умолчанию) — Ethereal test account

Если переменные `SMTP_*` не установлены, система автоматически создаст тестовый Ethereal-аккаунт:

```
[Mailer] ✅ Ethereal test account created:
  Email: xxxxx@ethereal.email
  Password: xxxxxxxxxxxxx
  Preview URL: https://ethereal.email/messages
```

Письма можно просмотреть на `https://ethereal.email/messages`.

### Режим продакшена — Real SMTP

Создайте файл `.env` в корне проекта:

```env
# Email Configuration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@example.com
```

Примеры для популярных SMTP-сервисов см. в `.env.example`.

---

## 🔄 Команды для разработки

```bash
# Установка зависимостей
npm install

# Запуск frontend + backend
npm run dev

# Только backend
npm run server

# Только frontend
npm start

# Сборка для production
npm run build

# Тесты
npm run test
```

---

## 💡 Возможности для дальнейшего развития

- Интеграция с Telegram для уведомлений
- Более детальная аналитика по классам и блюдам
- Поддержка нескольких школ и филиалов
- Синхронизация с системой управления школой

---

## 📝 Лицензия

Проект создан для учебных целей.

---

## 👨‍💻 Разработка

Проект готов к локальному запуску и может быть развёрнут на VPS, Render, Railway или других облачных платформах.

Для вопросов и предложений см. GitHub репозиторий проекта.

