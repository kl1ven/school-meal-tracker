# 🍽️ School Meal Tracker

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/JWT-333333?logo=json-web-tokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/ExcelJS-007ACC?logo=excel&logoColor=white" alt="ExcelJS" />
</p>

## ✨ Краткое описание

School Meal Tracker — современное веб-приложение для учёта горячего питания в школе-интернате. Поддерживает три роли: **классный руководитель**, **менеджер питания** и **сотрудник столовой**.

## ⚙️ Основные возможности

- ✅ **Аутентификация**: JWT и разграничение доступа по ролям.
- ✅ **Управление классами**: сортировка, добавление, редактирование, удаление.
- ✅ **Управление пользователями**: менеджер добавляет и редактирует учителей и сотрудников столовой.
- ✅ **Заявки на питание**: завтрак/обед с учётом выходных и праздников.
- ✅ **Сводная таблица менеджера**: просмотр и редактирование заявок по дням.
- ✅ **Экспорт в Excel**: форматированный табель с итогами.
- ✅ **Печатная форма**: новое окно и автоматическая печать для столовой.
- ✅ **Аналитика менеджера**: графики, топ классов, сравнение с прошлым месяцем.
- ✅ **Журнал изменений**: аудит с фильтрами и русскими полями.
- ✅ **Внутренние уведомления**: колокольчик, тосты и автообновление.
- ✅ **Адаптивный интерфейс**: для мобильных устройств.

## 👥 Роли пользователей

| Роль | Email | Пароль |
|------|-------|--------|
| Менеджер | `manager@example.com` | `manager123` |
| Классный руководитель | `class_teacher@example.com` | `teacher123` |
| Столовая | `canteen@example.com` | `canteen123` |

## 🧰 Технологии

### Frontend
- React
- TypeScript
- react-router-dom
- recharts
- react-icons

### Backend
- Node.js
- Express
- SQLite
- JWT

### Отчёты
- ExcelJS
- Печатная форма отчётов

## 🚀 Установка и запуск

```bash
npm install
npm run dev
```

**Локальные адреса:**

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`

## 🖼️ Скриншоты интерфейса

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/login.png" alt="Экран входа" width="100%" />
      <br /><strong>🔐 Экран входа</strong>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/teacher-dashboard.png" alt="Панель учителя" width="100%" />
      <br /><strong>👩‍🏫 Панель учителя</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/manager-dashboard.png" alt="Панель менеджера" width="100%" />
      <br /><strong>📊 Панель менеджера</strong>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/canteen-dashboard.png" alt="Панель столовой" width="100%" />
      <br /><strong>🍽️ Панель столовой</strong>
    </td>
  </tr>
</table>

## 📁 Структура проекта

- `src/` — frontend на React и TypeScript
- `server/` — backend на Express и SQLite
- `docs/screenshots/` — интерфейсные скриншоты
- `package.json` — npm-скрипты и зависимости
