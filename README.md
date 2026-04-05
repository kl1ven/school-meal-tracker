# School Meal Attendance Tracker

Полнофункциональное приложение для учёта питания в школе.

## Что реализовано

- Аутентификация с ролями `teacher` и `manager`
- Учитель видит только свой класс
- Менеджер питания видит сводную таблицу по всем классам
- Учет праздничных и выходных дней
- Управление классами и назначение учителей
- Экспорт Excel-отчета по формату задания
- Бэкенд на Express + SQLite, фронтенд на React + TypeScript

## Учётные данные

- `class_teacher@example.com` / `teacher123` — роль `teacher`, класс `3-а`
- `manager@example.com` / `manager123` — роль `manager`
- `canteen@example.com` / `canteen123` — роль `canteen` (столовая)

## Установка

```bash
npm install
```

## Запуск

Для запуска фронтенда и бэкенда одновременно:

```bash
npm run dev
```

Если нужно запустить отдельно:

```bash
npm run server
npm start
```

- Фронтенд: `http://localhost:3000`
- Бэкенд API: `http://localhost:4000`

## Переменные окружения

Можно задать `.env` в корне:

```env
JWT_SECRET=your_secret_key
DB_FILE=server/database.sqlite
```

Если `.env` не указан, используются значения по умолчанию.

## Продакшн-сборка

```bash
npm run build
npm run server
```

Сервер будет обслуживать статические файлы из `build`.

## Структура проекта

- `src/` — фронтенд React + TypeScript
- `src/components/` — страницы и компоненты интерфейса
- `src/context/` — контекст авторизации
- `src/services/` — HTTP API-клиент
- `server/` — бэкенд Express + SQLite

## Особенности

- Русский интерфейс и дата в формате `DD.MM.YYYY`
- Для нерабочих дней в отчёте выводится буква `в`
- Excel-отчёт формируется на сервере и скачивается автоматически
