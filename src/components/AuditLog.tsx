import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuditLogEntry, Class, User } from '../types';
import './ManagerDashboard.css';

const actionLabels: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
};

const fieldLabels: Record<string, string> = {
  breakfast_count: 'завтрак (заявлено)',
  lunch_count: 'обед (заявлено)',
  actual_breakfast_count: 'завтрак (факт)',
  actual_lunch_count: 'обед (факт)',
  date: 'дата',
  class_id: 'класс',
  created_by: 'кем создано',
  breakfast_diff: 'разница завтрак',
  lunch_diff: 'разница обед',
};

const parseAuditValues = (value: Record<string, any> | string | null | undefined): Record<string, any> | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  return value;
};

const formatJson = (value: Record<string, any> | string | null | undefined) => {
  const parsed = parseAuditValues(value);
  if (!parsed) {
    return '';
  }

  const lines = Object.entries(parsed).reduce<string[]>((result, [key, itemValue]) => {
    if (itemValue === null || itemValue === undefined) {
      return result;
    }

    const label = fieldLabels[key] || key;
    const formattedValue = typeof itemValue === 'object' ? JSON.stringify(itemValue) : itemValue;
    return [...result, `${label}: ${formattedValue}`];
  }, []);

  return lines.join('\n');
};

const AuditLog: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadAudit = React.useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.fetchAudit({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        userId: userId ? Number(userId) : undefined,
        classId: classId ? Number(classId) : undefined,
        limit: 200,
      });
      setAuditEntries(data);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, userId, classId]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [usersData, classesData] = await Promise.all([api.fetchUsers(), api.fetchClasses()]);
        setUsers(usersData);
        setClasses(classesData);
      } catch (err) {
        setMessage((err as Error).message);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  return (
    <div className="dashboard-section">
      <div className="dashboard-row">
        <h2>Журнал изменений</h2>
      </div>
      {message && <div className="message">{message}</div>}
      <div className="audit-filters">
        <label>
          С даты
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          По дату
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label>
          Пользователь
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            <option value="">Все</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Класс
          <select value={classId} onChange={(event) => setClassId(event.target.value)}>
            <option value="">Все</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Старые значения</th>
              <th>Новые значения</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Загрузка...</td>
              </tr>
            ) : auditEntries.length === 0 ? (
              <tr>
                <td colSpan={7}>Записей не найдено.</td>
              </tr>
            ) : (
              auditEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString('ru-RU')}</td>
                  <td>{entry.userName}</td>
                  <td>{actionLabels[entry.action.toUpperCase()] || entry.action}</td>
                  <td>
                    <pre className="audit-json">{formatJson(entry.oldValues)}</pre>
                  </td>
                  <td>
                    <pre className="audit-json">{formatJson(entry.newValues)}</pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
