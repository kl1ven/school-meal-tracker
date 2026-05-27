import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Class, Holiday, MealRecord } from '../types';
import NotificationBell from './NotificationBell';
import './TeacherDashboard.css';

const getToday = () => new Date().toISOString().slice(0, 10);

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('ru-RU');
};

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [history, setHistory] = useState<MealRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [date, setDate] = useState(getToday());
  const [breakfast, setBreakfast] = useState(0);
  const [lunch, setLunch] = useState(0);
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDate(getToday());

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.classId) {
      api.fetchClasses().then((items) => {
        const current = items.find((c) => c.id.toString() === user.classId) || null;
        setClassInfo(current);
        if (current) {
          loadHistory(current.id);
        }
      });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!date) {
      setHolidays([]);
      return;
    }

    const selectedDate = new Date(date);
    api.fetchHolidays(selectedDate.getMonth() + 1, selectedDate.getFullYear())
      .then((items) => setHolidays(items))
      .catch(() => setHolidays([]));
  }, [date]);

  useEffect(() => {
    if (!classInfo || !date) {
      setBreakfast(0);
      setLunch(0);
      setIsExistingRecord(false);
      return;
    }

    api.fetchRecordsByDate(date)
      .then((rows) => {
        const currentRecord = rows.find((item) => Number(item.class_id) === classInfo.id);
        setBreakfast(currentRecord?.breakfast_count ?? 0);
        setLunch(currentRecord?.lunch_count ?? 0);
        setIsExistingRecord(Boolean(currentRecord));
      })
      .catch(() => {
        setBreakfast(0);
        setLunch(0);
        setIsExistingRecord(false);
      });
  }, [classInfo, date]);

  const loadHistory = async (classId: number) => {
    try {
      const rows = await api.fetchHistory(classId);
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  };

  const isWeekend = (value: string) => {
    const day = new Date(value).getDay();
    return day === 0 || day === 6;
  };

  const isHoliday = (value: string) => holidays.some((item) => item.date === value && !item.is_working);
  const isNonWorkingDay = Boolean(date) && (isWeekend(date) || isHoliday(date));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!classInfo) {
      setError('Класс не загружен.');
      return;
    }

    if (!date) {
      setError('Выберите дату.');
      return;
    }

    if (new Date(date) > new Date(getToday())) {
      setError('Нельзя сохранять данные на будущую дату.');
      return;
    }

    if (!Number.isInteger(breakfast) || breakfast < 0 || !Number.isInteger(lunch) || lunch < 0) {
      setError('Количество должно быть целым числом от 0.');
      return;
    }

    if (isNonWorkingDay) {
      setError('На выходной или праздничный день внесение данных не требуется.');
      return;
    }

    try {
      await api.saveMealRecord({ class_id: classInfo.id, date, breakfast_count: breakfast, lunch_count: lunch });
      setIsExistingRecord(true);
      setMessage(isExistingRecord ? 'Изменения сохранены.' : 'Запись сохранена.');
      loadHistory(classInfo.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Классный руководитель</h1>
          <p>Добро пожаловать, {user?.fullName}</p>
          <p>Класс: {classInfo?.name || 'не назначен'}</p>
        </div>
        <div className="header-buttons">
          <NotificationBell />
          <button className="logout-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <section className="dashboard-section">
        <h2>Учет питания</h2>
        {isNonWorkingDay && (
          <div className="warning-banner">
            ⚠️ Внимание: выбранная дата – выходной/праздничный день. Внесение данных не требуется.
          </div>
        )}

        <form className="dashboard-form" onSubmit={handleSubmit}>
          <label>
            Дата
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getToday()} />
          </label>

          {!isNonWorkingDay && (
            <>
              <label>
                Завтрак, порций
                <input type="number" min="0" value={breakfast} onChange={(event) => setBreakfast(Number(event.target.value))} />
              </label>
              <label>
                Обед, порций
                <input type="number" min="0" value={lunch} onChange={(event) => setLunch(Number(event.target.value))} />
              </label>
              <button type="submit">{isExistingRecord ? 'Сохранить изменения' : 'Сохранить'}</button>
            </>
          )}
        </form>

        {!isNonWorkingDay && <p style={{ marginTop: 12, color: '#475569' }}>Можно менять данные за текущий и предыдущие дни.</p>}
        {error && <p className="form-error">{error}</p>}
        {message && <p className="dashboard-message">{message}</p>}
      </section>

      <section className="dashboard-section">
        <h2>Последние 10 записей</h2>
        <div className="table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Завтрак</th>
                <th>Обед</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3}>Записей пока нет.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Дата">{formatDate(item.date)}</td>
                    <td data-label="Завтрак">{item.breakfast_count}</td>
                    <td data-label="Обед">{item.lunch_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default TeacherDashboard;
