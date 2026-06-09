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

---

## ✨ Краткое описание

School Meal Tracker — современное веб-приложение для учёта горячего питания в школе-интернате. Полностью автоматизирует сбор заявок, учёт фактической выдачи, формирование табелей в Excel, а также предоставляет аналитику, журнал изменений и систему внутренних уведомлений.

---

## ⚙️ Основные возможности

- ✅ Аутентификация и разграничение прав (JWT, роли).  
- ✅ Управление классами (добавление, редактирование, удаление, сортировка).  
- ✅ Управление пользователями (операции доступные менеджеру).  
- ✅ Подача заявок на питание (завтрак / обед) с учётом выходных и праздников.  
- ✅ Сводная таблица менеджера — просмотр и правка заявок по дням.  
- ✅ Экспорт табеля в Excel (форматирование, итоги).  
- ✅ Печатная форма для столовой (отдельное окно, авто-печать).  
- ✅ Аналитика: линейные графики, топ классов, сравнение по периодам.  
- ✅ Журнал изменений (аудит) с фильтрами и русскими метками полей.  
- ✅ Внутренние уведомления (колокольчик, браузерные тосты, без внешней почты).  
- ✅ Адаптивный дизайн для мобильных и десктопных устройств.

---

## 👥 Роли пользователей

| Роль | Email | Пароль |
|------|-------|--------|
| Менеджер | `manager@example.com` | `manager123` |
| Классный руководитель | `class_teacher@example.com` | `teacher123` |
| Столовая | `canteen@example.com` | `canteen123` |

---

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
- JWT (авторизация)

### Отчёты
- ExcelJS (генерация табелей)  
- Печатная форма отчётов

---

## 🚀 Установка и запуск

Установите зависимости:

```bash
npm install
```

Запустите frontend + backend в режиме разработки:

```bash
npm run dev
```

**Локальные адреса:**

- Frontend: `http://localhost:3000`  
- Backend API: `http://localhost:4000`

---

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

---

## 📁 Структура проекта

school-meal-tracker/
├── 📂 public/ # Статика (favicon, манифест, robots.txt)
├── 📂 server/
│ ├── 📂 routes/ # API-маршруты
│ │ ├── auth.js # аутентификация (JWT)
│ │ ├── classes.js # управление классами
│ │ ├── records.js # заявки на питание
│ │ ├── notifications.js # уведомления
│ │ ├── audit.js # журнал изменений
│ │ ├── export.js # экспорт в Excel
│ │ ├── statistics.js # аналитика
│ │ ├── users.js # пользователи
│ │ └── holidays.js # праздничные дни
│ ├── db.js # инициализация SQLite, миграции
│ └── index.js # точка входа backend (Express)
├── 📂 src/
│ ├── 📂 components/ # React-компоненты
│ │ ├── NotificationBell.tsx # колокольчик уведомлений
│ │ ├── NotificationList.tsx # страница уведомлений
│ │ ├── AnalyticsDashboard.tsx # аналитика (графики)
│ │ ├── AuditLog.tsx # журнал изменений
│ │ ├── ClassOrderManager.tsx # сортировка классов
│ │ ├── ManagerDashboard.tsx # панель менеджера
│ │ ├── TeacherDashboard.tsx # панель учителя
│ │ ├── CanteenDashboard.tsx # панель столовой
│ │ └── ... # остальные компоненты
│ ├── 📂 context/ # AuthContext (JWT, роли)
│ ├── 📂 services/ # api.ts – клиент для бэкенда
│ ├── 📂 types/ # TypeScript-типы
│ ├── 📂 utils/ # утилиты
│ │ ├── excelExport.ts # генерация табеля (ExcelJS)
│ │ └── printUtils.ts # печатная форма
│ ├── App.tsx # маршрутизация и защита роутов
│ └── index.tsx
├── 📄 .env # переменные окружения (необязательно)
├── 📄 package.json
├── 📄 README.md
└── 📄 tsconfig.json
