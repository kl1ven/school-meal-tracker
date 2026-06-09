import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sortClasses } from '../utils/excelExport';
import { Class, Holiday, MealRecord } from '../types';
import NotificationBell from './NotificationBell';
import './ManagerDashboard.css';
const getToday = () => new Date().toISOString().slice(0, 10);

const normalizeDateValue = (value: string) => {
  if (!value) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const dottedMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dottedMatch) {
    const [, day, month, year] = dottedMatch;
    return `${year}-${month}-${day}`;
  }

  return value;
};

const sortByOrder = (items: Class[]) => sortClasses(items);

type ParallelFilter = 'all' | '1-4' | '5-11';
type ActualState = Record<number, { breakfast: number; lunch: number }>;

const CanteenDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [date, setDate] = useState(getToday());
  const [parallelFilter, setParallelFilter] = useState<ParallelFilter>('all');
  const [classes, setClasses] = useState<Class[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [actuals, setActuals] = useState<ActualState>({});
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error'; visible: boolean }>({ text: '', type: 'success', visible: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async (selectedDate: string) => {
    const normalizedDate = normalizeDateValue(selectedDate);
    setIsLoading(true);

    try {
      if (!normalizedDate) {
        setClasses([]);
        setRecords([]);
        setActuals({});
        setHolidays([]);
        setMessage('Выберите дату');
        return;
      }

      const [yearString, monthString] = normalizedDate.split('-');
      const month = Number(monthString);
      const year = Number(yearString);

      const [classesResult, recordsResult, holidaysResult] = await Promise.allSettled([
        api.fetchClasses(),
        api.fetchRecordsByDate(normalizedDate),
        api.fetchHolidays(month, year),
      ]);

      const safeRecords = recordsResult.status === 'fulfilled'
        ? recordsResult.value.map((item) => ({
            ...item,
            date: normalizeDateValue(item.date),
          }))
        : [];

      const fallbackClasses = Array.from(
        new Map(
          safeRecords.map((item) => [
            Number(item.class_id),
            {
              id: Number(item.class_id),
              name: item.class_name || `Класс ${item.class_id}`,
              parallel: Number(item.parallel ?? (parseInt(item.class_name ?? '', 10) || 0)),
            },
          ]),
        ).values(),
      ) as Class[];

      const classItems = classesResult.status === 'fulfilled' && classesResult.value.length > 0
        ? classesResult.value
        : fallbackClasses;

      const holidayItems = holidaysResult.status === 'fulfilled' ? holidaysResult.value : [];
      const sortedClasses = sortByOrder(classItems);
      const recordByClassId = new Map<number, MealRecord>(safeRecords.map((item) => [Number(item.class_id), item]));
      const nextActuals: ActualState = {};

      sortedClasses.forEach((classItem) => {
        const record = recordByClassId.get(classItem.id);
        nextActuals[classItem.id] = {
          breakfast: record?.actual_breakfast_count ?? record?.breakfast_count ?? 0,
          lunch: record?.actual_lunch_count ?? record?.lunch_count ?? 0,
        };
      });

      setClasses(sortedClasses);
      setRecords(safeRecords);
      setHolidays(holidayItems);
      setActuals(nextActuals);

      const isNonWorkingSelectedDay = isWeekend(normalizedDate) || holidayItems.some((item) => item.date === normalizedDate && !item.is_working);
      const errors = [classesResult, recordsResult, holidaysResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason as Error);

      if (safeRecords.length === 0 && isNonWorkingSelectedDay) {
        setMessage('На выбранный выходной или праздничный день заявок нет.');
      } else if (errors.length > 0 && safeRecords.length === 0 && sortedClasses.length === 0) {
        setMessage('Не удалось загрузить данные. Обновите страницу ещё раз.');
      }
    } catch (err) {
      setMessage('Не удалось загрузить данные. Обновите страницу ещё раз.');
      setClasses([]);
      setRecords([]);
      setActuals({});
      setHolidays([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(date);
  }, [date, loadData]);

  const isWeekend = (value: string) => {
    const day = new Date(value).getDay();
    return day === 0 || day === 6;
  };

  const isHoliday = (value: string) => holidays.some((item) => item.date === value && !item.is_working);
  const isNonWorkingDay = Boolean(date) && (isWeekend(date) || isHoliday(date));

  const filteredClasses = useMemo(() => classes.filter((classItem) => {
    const grade = parseInt(classItem.name, 10) || 0;
    if (parallelFilter === '1-4') return grade >= 1 && grade <= 4;
    if (parallelFilter === '5-11') return grade >= 5 && grade <= 11;
    return true;
  }), [classes, parallelFilter]);

  const recordsByClassId = useMemo(
    () => new Map<number, MealRecord>(records.map((item) => [Number(item.class_id), item])),
    [records],
  );

  const rows = useMemo(() => filteredClasses.map((classItem) => {
    const record = recordsByClassId.get(classItem.id);
    return {
      classId: classItem.id,
      className: classItem.name,
      requestedBreakfast: Number(record?.breakfast_count ?? 0),
      requestedLunch: Number(record?.lunch_count ?? 0),
      actualBreakfast: Number(actuals[classItem.id]?.breakfast ?? record?.actual_breakfast_count ?? record?.breakfast_count ?? 0),
      actualLunch: Number(actuals[classItem.id]?.lunch ?? record?.actual_lunch_count ?? record?.lunch_count ?? 0),
    };
  }), [actuals, filteredClasses, recordsByClassId]);

  const totals = rows.reduce(
    (acc, row) => ({
      requestedBreakfast: acc.requestedBreakfast + row.requestedBreakfast,
      requestedLunch: acc.requestedLunch + row.requestedLunch,
      actualBreakfast: acc.actualBreakfast + row.actualBreakfast,
      actualLunch: acc.actualLunch + row.actualLunch,
    }),
    { requestedBreakfast: 0, requestedLunch: 0, actualBreakfast: 0, actualLunch: 0 },
  );

  const handleActualChange = (classId: number, type: 'breakfast' | 'lunch', value: string) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setActuals((prev) => ({
      ...prev,
      [classId]: {
        ...(prev[classId] ?? { breakfast: 0, lunch: 0 }),
        [type]: numericValue,
      },
    }));
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type, visible: true });
    setTimeout(() => {
      setToast((prev) => (prev.text === text ? { ...prev, visible: false } : prev));
    }, 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      const normalizedDate = normalizeDateValue(date);
      await Promise.all(
        rows.map((row) => api.saveActualMealRecord({
          date: normalizedDate,
          class_id: row.classId,
          actual_breakfast_count: row.actualBreakfast,
          actual_lunch_count: row.actualLunch,
        })),
      );

      await loadData(normalizedDate);
      showToast('Сохранено', 'success');
      setMessage('');
    } catch (err) {
      const text = (err as Error).message || 'Не удалось сохранить данные.';
      showToast(text, 'error');
      setMessage(text);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Столовая</h1>
          <p>Добро пожаловать, {user?.fullName}</p>
        </div>
        <div className="header-buttons">
          <NotificationBell />
          <button className="logout-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <section className="dashboard-section">
        <div className="dashboard-row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <h2>Сводка питания на день</h2>
          <label>
            Дата
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Параллель
            <select value={parallelFilter} onChange={(event) => setParallelFilter(event.target.value as ParallelFilter)}>
              <option value="all">Все классы</option>
              <option value="1-4">1-4 классы</option>
              <option value="5-11">5-11 классы</option>
            </select>
          </label>
        </div>

        {isNonWorkingDay && (
          <div className="warning-banner">
            ⚠️ Внимание: выбранная дата – выходной/праздничный день. Работа столовой по заявкам на эту дату обычно не требуется.
          </div>
        )}

        {message && <p className="dashboard-message">{message}</p>}

        {toast.visible && (
          <div className={`toast toast-${toast.type}`}>
            {toast.text}
          </div>
        )}

        <div className="table-wrapper">
          <table className="summary-table canteen-table">
            <thead>
              <tr>
                <th>Класс</th>
                <th>Заявлено завтрак</th>
                <th>Заявлено обед</th>
                <th>Фактически выдано завтрак</th>
                <th>Фактически выдано обед</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={5}>Список классов пока недоступен.</td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.classId} style={{ background: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td data-label="Класс">{row.className}</td>
                    <td data-label="Заявлено завтрак">{row.requestedBreakfast}</td>
                    <td data-label="Заявлено обед">{row.requestedLunch}</td>
                    <td data-label="Фактически выдано завтрак">
                      <input
                        type="number"
                        min="0"
                        value={row.actualBreakfast}
                        onChange={(event) => handleActualChange(row.classId, 'breakfast', event.target.value)}
                      />
                    </td>
                    <td data-label="Фактически выдано обед">
                      <input
                        type="number"
                        min="0"
                        value={row.actualLunch}
                        onChange={(event) => handleActualChange(row.classId, 'lunch', event.target.value)}
                      />
                    </td>
                  </tr>
                ))
              )}
              {rows.length > 0 && (
                <tr>
                  <td data-label="Итого"><strong>Итого</strong></td>
                  <td data-label="Заявлено завтрак"><strong>{totals.requestedBreakfast}</strong></td>
                  <td data-label="Заявлено обед"><strong>{totals.requestedLunch}</strong></td>
                  <td data-label="Фактически выдано завтрак"><strong>{totals.actualBreakfast}</strong></td>
                  <td data-label="Фактически выдано обед"><strong>{totals.actualLunch}</strong></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="button-row" style={{ marginTop: 16 }}>
          <button type="button" onClick={handleSave} disabled={isSaving || rows.length === 0}>
            {isSaving ? 'Сохраняем...' : 'Сохранить фактическую выдачу'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default CanteenDashboard;
