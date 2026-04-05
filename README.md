# 🍽️ School Meal Tracker

<p align="center">
  <img src="public/school.png" alt="School Meal Tracker" width="120" />
</p>

<p align="center"><strong>Современная система учёта школьного питания с ролями, отчётами, печатью и интерфейсом для столовой.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-43853D?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Status-Ready-success" alt="Status" />
  <img src="https://img.shields.io/badge/Mobile-Friendly-8A2BE2" alt="Mobile Friendly" />
</p>

<p align="center">
  <a href="https://github.com/elizabethSmith138/school-meal-tracker"><strong>GitHub Repository</strong></a> •
  <a href="#-о-проекте"><strong>О проекте</strong></a> •
  <a href="#-скриншоты-интерфейса"><strong>Скриншоты</strong></a> •
  <a href="#-demo--deploy"><strong>Demo / Deploy</strong></a> •
  <a href="#-установка-и-запуск"><strong>Запуск</strong></a>
</p>

Веб-приложение для **учёта школьного питания** с разделением по ролям, хранением данных в **SQLite**, экспортом в **Excel** и отдельным интерфейсом для **столовой**.

---

## 📌 О проекте

Система помогает школе вести ежедневный учёт заявок на завтраки и обеды, контролировать фактическую выдачу питания и формировать отчёты для администрации и столовой.

Приложение адаптировано под разные роли пользователей:
- **классный руководитель** — подаёт данные по своему классу;
- **менеджер питания** — управляет пользователями, классами, календарём и отчётами;
- **столовая** — видит сводку по заявкам и вносит фактическую выдачу.

---

## ✨ Основные возможности

- авторизация с ролевым доступом: `teacher`, `manager`, `canteen`;
- ведение заявок на питание по датам и классам;
- ограничение ввода на выходные и праздничные дни;
- календарь рабочих / нерабочих дней;
- управление пользователями и назначением классных руководителей;
- отдельная панель для столовой с фактической выдачей питания;
- печатная форма для столовой;
- экспорт ежемесячного отчёта в `Excel`;
- хранение данных в базе `SQLite`;
- адаптивный интерфейс для мобильных устройств.

---

## 🖼️ Скриншоты интерфейса

<p align="center">
  <img src="public/school.png" alt="School Meal Tracker Preview" width="120" />
</p>

<table>
  <tr>
    <td align="center" width="33%">
      <strong>🔐 Вход в систему</strong><br />
      <sub>Авторизация учителя, менеджера и сотрудника столовой</sub>
    </td>
    <td align="center" width="33%">
      <strong>📊 Панель менеджера</strong><br />
      <sub>Сводные данные, Excel-отчёты, праздники, классы и пользователи</sub>
    </td>
    <td align="center" width="33%">
      <strong>🍽️ Панель столовой</strong><br />
      <sub>Заявки на день и фактическая выдача питания</sub>
    </td>
  </tr>
</table>

> Для максимально эффектного вида на GitHub можно позже добавить реальные PNG/JPG-скриншоты интерфейса в папку `docs/screenshots/` и подставить их в этот блок без изменения структуры README.

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

При необходимости можно создать файл `.env` в корне проекта:

```env
JWT_SECRET=your_secret_key
DB_FILE=server/database.sqlite
```

Если файл `.env` не задан, используются значения по умолчанию.

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

## 📁 Структура проекта

```text
src/
  components/      UI-компоненты и панели ролей
  context/         контекст авторизации
  services/        API-клиент
  types/           общие TypeScript-типы
  utils/           экспорт и печать

server/
  routes/          API-маршруты
  db.js            подключение к SQLite
  index.js         точка входа backend
```

---

## 📋 Бизнес-логика

- учителя не могут вносить данные на выходные и праздничные дни;
- для выходных и праздников в отчётах используется пометка `в`;
- столовая может фиксировать **фактическую выдачу**, отдельно от поданных заявок;
- менеджер может редактировать календарь рабочих дней и формировать печатные / Excel-отчёты.

---

## ✅ Текущее состояние

Проект:
- успешно собирается через `npm run build`;
- проходит базовые тесты;
- поддерживает основные сценарии для `teacher`, `manager` и `canteen`.

---

## 📄 Назначение

Этот проект можно использовать как учебную или рабочую систему для цифровизации школьного учёта питания, заявок и отчётности.

---

## 🌟 Для GitHub-портфолио

Проект демонстрирует навыки:
- построения full-stack приложения на `React + TypeScript + Express + SQLite`;
- проектирования ролей и прав доступа;
- работы с таблицами, отчётами и печатными формами;
- адаптации интерфейса под мобильные устройства;
- организации прикладной бизнес-логики для реального сценария школы.
