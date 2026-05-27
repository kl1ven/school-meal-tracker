import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { Class, DailyStatResponse, ClassStatItem, MonthlySummary, ComparisonResponse } from '../types';
import './ManagerDashboard.css';

const getTodayMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

const AnalyticsDashboard: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number>(getTodayMonthYear().month);
  const [year, setYear] = useState<number>(getTodayMonthYear().year);

  const [daily, setDaily] = useState<DailyStatResponse | null>(null);
  const [topBreakfast, setTopBreakfast] = useState<ClassStatItem[]>([]);
  const [topLunch, setTopLunch] = useState<ClassStatItem[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const classesData = await api.fetchClasses();
        setClasses(classesData);
      } catch (err) {
        // ignore
      }
    };
    load();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dailyData, topB, topL, summ, comp] = await Promise.all([
        api.getDailyStatistics(selectedClass, month, year),
        api.getClassStatistics(month, year, 'breakfast'),
        api.getClassStatistics(month, year, 'lunch'),
        api.getMonthlySummary(month, year),
        api.getComparison(month, year, month - 1 <= 0 ? 12 : month - 1, month - 1 <= 0 ? year - 1 : year),
      ]);
      setDaily(dailyData);
      setTopBreakfast(topB.slice(0, 5));
      setTopLunch(topL.slice(0, 5));
      setSummary(summ);
      setComparison(comp);
    } catch (err) {
      // swallow for now
    } finally {
      setLoading(false);
    }
  }, [selectedClass, month, year]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const buildLineData = () => {
    if (!daily) return [];
    return daily.dates.map((date, idx) => ({ date, breakfast: daily.breakfast[idx], lunch: daily.lunch[idx] }));
  };

  return (
    <div className="dashboard-section">
      <div className="dashboard-row">
        <h2>Аналитика питания</h2>
      </div>

      <div className="manager-filter-row">
        <label>
          Класс
          <select value={selectedClass ?? ''} onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Все классы</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Месяц
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Год
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <div>Загрузка данных...</div>}
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={buildLineData()} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="breakfast" stroke="#8884d8" />
            <Line type="monotone" dataKey="lunch" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="stat-grid" style={{ marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <h3>Топ-5 — Завтраки</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBreakfast} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="className" type="category" />
                <Tooltip />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Топ-5 — Обеды</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLunch} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="className" type="category" />
                <Tooltip />
                <Bar dataKey="total" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="summary-cards" style={{ marginTop: 20 }}>
        <div className="summary-card">
          <strong>Всего завтраков</strong>
          <div>{summary ? summary.totalBreakfast : '-'}</div>
        </div>
        <div className="summary-card">
          <strong>Всего обедов</strong>
          <div>{summary ? summary.totalLunch : '-'}</div>
        </div>
        <div className="summary-card">
          <strong>Среднее/день (завтрак)</strong>
          <div>{summary ? summary.avgBreakfast : '-'}</div>
        </div>
        <div className="summary-card">
          <strong>Максимум за день (завтрак)</strong>
          <div>{summary ? summary.maxBreakfast : '-'}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Сравнение с предыдущим месяцем</h3>
        {comparison ? (
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div>Завтраки: {comparison.breakfast.current} ({comparison.breakfast.changePercent}%)</div>
            </div>
            <div>
              <div>Обеды: {comparison.lunch.current} ({comparison.lunch.changePercent}%)</div>
            </div>
          </div>
        ) : <div>-</div>}
      </div>

    </div>
  );
};

export default AnalyticsDashboard;
