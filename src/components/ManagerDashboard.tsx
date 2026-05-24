import { exportToExcel, sortClasses } from '../utils/excelExport';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { printMealReport } from '../utils/printUtils';
import { Class, Holiday, MealRecord, User } from '../types';
import UserManager from './UserManager';
import ClassOrderManager from './ClassOrderManager';
import './ManagerDashboard.css';

const getToday = () => new Date().toISOString().slice(0, 10);
const formatDate = (value: string) => new Date(value).toLocaleDateString('ru-RU');

type CellEditorState = {
  classId: number;
  className: string;
  date: string;
  breakfast: number;
  lunch: number;
};

const ManagerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [cellEditor, setCellEditor] = useState<CellEditorState | null>(null);
  const [holidayDate, setHolidayDate] = useState(getToday());
  const [printDate, setPrintDate] = useState(getToday());
  const [holidayWorking, setHolidayWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'order'>('overview');
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({ name: '', parallel: 1, teacher_id: null as number | null });

  const daysInMonth = new Date(year, month, 0).getDate();

  const loadData = useCallback(async () => {
    try {
      const [classesData, recordsData, holidaysData, teachersData] = await Promise.all([
        api.fetchClasses(),
        api.fetchMonthRecords(month, year),
        api.fetchHolidays(month, year),
        api.fetchTeachers(),
      ]);
      setClasses(sortClasses(classesData));
      setRecords(recordsData);
      setHolidays(holidaysData);
      setTeachers(teachersData);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const findRecord = (classId: number, date: string) => records.find((record) => record.class_id === classId && record.date === date);

  const isHoliday = (date: string) => holidays.some((item) => item.date === date && !item.is_working);

  const isWeekend = (date: string) => {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
  };

  const openCellEditor = (classId: number, className: string, date: string) => {
    if (isHoliday(date) || isWeekend(date)) {
      return;
    }
    const record = findRecord(classId, date);
    setCellEditor({
      classId,
      className,
      date,
      breakfast: record?.breakfast_count ?? 0,
      lunch: record?.lunch_count ?? 0,
    });
  };

  const saveCell = async () => {
    if (!cellEditor) return;
    try {
      await api.saveMealRecord({
        class_id: cellEditor.classId,
        date: cellEditor.date,
        breakfast_count: cellEditor.breakfast,
        lunch_count: cellEditor.lunch,
      });
      setMessage('Данные обновлены.');
      setCellEditor(null);
      loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const saveHoliday = async () => {
    try {
      await api.saveHoliday(holidayDate, holidayWorking);
      setMessage('Статус дня сохранен.');
      loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleAddClass = async () => {
    if (!newClass.name.trim()) {
      setMessage('Введите название класса');
      return;
    }
    try {
      await api.createClass(newClass.name, newClass.parallel, newClass.teacher_id);
      setNewClass({ name: '', parallel: 1, teacher_id: null });
      setMessage('Класс добавлен');
      loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
  };

  const handleSaveEditClass = async () => {
    if (!editingClass) return;
    try {
      await api.updateClass(editingClass.id, editingClass.name, editingClass.parallel, editingClass.teacher_id);
      setEditingClass(null);
      setMessage('Класс обновлен');
      loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleDeleteClass = async (classId: number) => {
    if (!window.confirm('Удалить класс и все связанные записи?')) return;
    try {
      await api.deleteClass(classId);
      setMessage('Класс удален');
      loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const exportReport = async () => {
    try {
      await exportToExcel(month, year);
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const printForCanteen = async (selectedDate: string) => {
    try {
      const reportDate = selectedDate || getToday();
      await printMealReport(reportDate);
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Менеджер питания</h1>
          <p>Добро пожаловать, {user?.fullName}</p>
        </div>
        <button className="logout-button" onClick={logout}>
          Выйти
        </button>
      </header>

      <nav className="dashboard-nav">
        <button
          className={activeTab === 'overview' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveTab('overview')}
        >
          Обзор
        </button>
        <button
          className={activeTab === 'users' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveTab('users')}
        >
          Пользователи
        </button>
        <button
          className={activeTab === 'order' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveTab('order')}
        >
          Порядок классов
        </button>
      </nav>

      {activeTab === 'overview' ? (
        <div>
          <section className="dashboard-section">
            <div className="dashboard-row">
              <h2>Сводная таблица за {month}.{year}</h2>
              <div className="dashboard-toolbar">
                <label>
                  Дата для столовой
                  <input type="date" value={printDate} onChange={(event) => setPrintDate(event.target.value)} />
                </label>
                <button className="secondary-button" onClick={() => printForCanteen(printDate)}>
                  Распечатать для столовой
                </button>
                <button className="secondary-button" onClick={exportReport}>
                  Генерировать Excel-отчет
                </button>
              </div>
            </div>

            <div className="manager-filter-row">
              <label>
                Месяц
                <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Год
                <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {[year - 1, year, year + 1].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="table-wrapper-small">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Класс</th>
                    {Array.from({ length: daysInMonth }, (_, idx) => (
                      <th key={idx}>{idx + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map((item) => (
                    <tr key={`${item.id}-row`}>
                      <td>{item.name}</td>
                      {Array.from({ length: daysInMonth }, (_, idx) => {
                        const date = `${year}-${String(month).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`;
                        const holiday = isHoliday(date) || isWeekend(date);
                        const record = findRecord(item.id, date);
                        return (
                          <td key={`${item.id}-${idx}`} onClick={() => openCellEditor(item.id, item.name, date)}>
                            {holiday ? 'в' : record ? `${record.breakfast_count}|${record.lunch_count}` : '0|0'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dashboard-section">
            <h2>Праздничные и выходные дни</h2>
            <div className="holiday-panel">
              <label>
                Дата
                <input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} max={getToday()} />
              </label>
              <label>
                Статус
                <select value={holidayWorking ? '1' : '0'} onChange={(event) => setHolidayWorking(event.target.value === '1')}>
                  <option value="0">Выходной / праздник</option>
                  <option value="1">Рабочий</option>
                </select>
              </label>
              <button type="button" onClick={saveHoliday}>
                Сохранить
              </button>
            </div>
          </section>

          <section className="dashboard-section">
            <h2>Управление классами</h2>
            {message && <div className="message">{message}</div>}

            <div className="add-class-form">
              <h3>Добавить класс</h3>
              <input
                type="text"
                placeholder="Название класса"
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Параллель"
                value={newClass.parallel}
                onChange={(e) => setNewClass({ ...newClass, parallel: parseInt(e.target.value) || 1 })}
              />
              <select
                value={newClass.teacher_id || ''}
                onChange={(e) => setNewClass({ ...newClass, teacher_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Выберите классного руководителя (необязательно)</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
              <button onClick={handleAddClass}>Добавить</button>
            </div>

            <table className="classes-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Параллель</th>
                  <th>Классный руководитель</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classItem) => (
                  <tr key={classItem.id}>
                    <td data-label="Название">
                      {editingClass?.id === classItem.id ? (
                        <input
                          type="text"
                          value={editingClass.name}
                          onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                        />
                      ) : (
                        classItem.name
                      )}
                    </td>
                    <td data-label="Параллель">
                      {editingClass?.id === classItem.id ? (
                        <input
                          type="number"
                          value={editingClass.parallel}
                          onChange={(e) => setEditingClass({ ...editingClass, parallel: parseInt(e.target.value) || 1 })}
                        />
                      ) : (
                        classItem.parallel
                      )}
                    </td>
                    <td data-label="Классный руководитель">
                      {editingClass?.id === classItem.id ? (
                        <select
                          value={editingClass.teacher_id || ''}
                          onChange={(e) => setEditingClass({ ...editingClass, teacher_id: e.target.value ? parseInt(e.target.value) : null })}
                        >
                          <option value="">Не назначен</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.fullName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        classItem.teacher_name || 'Не назначен'
                      )}
                    </td>
                    <td data-label="Действия">
                      <div className="table-actions">
                        {editingClass?.id === classItem.id ? (
                          <>
                            <button onClick={handleSaveEditClass}>Сохранить</button>
                            <button onClick={() => setEditingClass(null)}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditClass(classItem)}>Редактировать</button>
                            <button onClick={() => handleDeleteClass(classItem.id)}>Удалить</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {cellEditor && (
            <div className="modal-backdrop" onClick={() => setCellEditor(null)}>
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <h3>Редактировать {cellEditor.className} - {formatDate(cellEditor.date)}</h3>
                <label>
                  Завтрак
                  <input type="number" min="0" value={cellEditor.breakfast} onChange={(event) => setCellEditor((prev) => (prev ? { ...prev, breakfast: Number(event.target.value) } : null))} />
                </label>
                <label>
                  Обед
                  <input type="number" min="0" value={cellEditor.lunch} onChange={(event) => setCellEditor((prev) => (prev ? { ...prev, lunch: Number(event.target.value) } : null))} />
                </label>
                <div className="button-row">
                  <button type="button" onClick={saveCell}>
                    Сохранить
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setCellEditor(null)}>
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && <p className="dashboard-message">{message}</p>}
        </div>
      ) : activeTab === 'users' ? (
        <UserManager
          classes={classes.map((c) => ({ id: c.id.toString(), name: c.name }))}
          onUsersChanged={loadData}
        />
      ) : activeTab === 'order' ? (
        <ClassOrderManager
          classes={classes}
          onSaveSuccess={loadData}
          onMessage={setMessage}
        />
      ) : null}
    </div>
  )
};
export default ManagerDashboard;
