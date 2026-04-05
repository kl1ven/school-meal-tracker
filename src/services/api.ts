import { ActualMealRecord, AuthResponse, Class, Holiday, MealRecord, User } from '../types';

const API_BASE = process.env.REACT_APP_API_BASE || (typeof window !== 'undefined' && window.location.port === '3000' ? 'http://localhost:4000' : '');

type BackendUser = {
  id: number;
  name: string;
  email: string;
  role: 'teacher' | 'manager' | 'canteen';
  class_id: number | null;
  class_name?: string | null;
};

type BackendAuthResponse = {
  token: string;
  user: BackendUser;
};

const normalizeDate = (value: string): string => {
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

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
};

const request = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Ошибка на сервере. Попробуйте позже.');
    }
    return response;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен.');
    }
    throw err;
  }
};

const mapBackendUser = (backendUser: BackendUser): User => ({
  id: backendUser.id.toString(),
  fullName: backendUser.name,
  email: backendUser.email,
  password: '',
  role: backendUser.role,
  classId: backendUser.class_id !== null ? backendUser.class_id.toString() : undefined,
  className: backendUser.class_name ?? undefined,
});

export const api = {
  login: async (emailOrPhone: string, password: string): Promise<AuthResponse> => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    });
    const data = (await response.json()) as BackendAuthResponse;
    return {
      token: data.token,
      user: mapBackendUser(data.user),
    };
  },

  fetchProfile: async (): Promise<User> => {
    const response = await request('/api/auth/profile');
    const backendUser = (await response.json()) as BackendUser;
    return mapBackendUser(backendUser);
  },

  fetchClasses: async (): Promise<Class[]> => {
    const response = await request('/api/classes');
    return response.json();
  },

  fetchTeachers: async (): Promise<User[]> => {
    const response = await request('/api/classes/teachers');
    const backendUsers = (await response.json()) as BackendUser[];
    return backendUsers.map(mapBackendUser);
  },

  fetchUsers: async (): Promise<User[]> => {
    const response = await request('/api/users');
    const backendUsers = (await response.json()) as BackendUser[];
    return backendUsers.map(mapBackendUser);
  },

  createUser: async (payload: { fullName: string; email: string; password: string; role: 'teacher' | 'manager' | 'canteen'; classId?: string }): Promise<User> => {
    const response = await request('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        class_id: payload.role === 'teacher' ? Number(payload.classId) : null,
      }),
    });
    const backendUser = (await response.json()) as BackendUser;
    return mapBackendUser(backendUser);
  },

  updateUser: async (id: string, payload: { fullName: string; email: string; password?: string; role: 'teacher' | 'manager' | 'canteen'; classId?: string }): Promise<User> => {
    const response = await request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        class_id: payload.role === 'teacher' ? Number(payload.classId) : null,
      }),
    });
    const backendUser = (await response.json()) as BackendUser;
    return mapBackendUser(backendUser);
  },

  deleteUser: async (id: string): Promise<void> => {
    await request(`/api/users/${id}`, { method: 'DELETE' });
  },

  createClass: async (name: string, parallel: number, teacher_id?: number | null): Promise<Class> => {
    const response = await request('/api/classes', {
      method: 'POST',
      body: JSON.stringify({ name, parallel, teacher_id }),
    });
    return response.json();
  },

  updateClass: async (id: number, name: string, parallel: number, teacher_id?: number | null): Promise<Class> => {
    const response = await request(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, parallel, teacher_id }),
    });
    return response.json();
  },

  deleteClass: async (id: number): Promise<void> => {
    await request(`/api/classes/${id}`, { method: 'DELETE' });
  },

  fetchHistory: async (class_id: number): Promise<MealRecord[]> => {
    const response = await request(`/api/records/history?classId=${class_id}`);
    return response.json();
  },

  fetchMonthRecords: async (month: number, year: number): Promise<MealRecord[]> => {
    const response = await request(`/api/records/month?month=${month}&year=${year}`);
    return response.json();
  },

  fetchRecordsByDate: async (date: string): Promise<MealRecord[]> => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return [];
    }

    const [yearString, monthString] = normalizedDate.split('-');
    const month = Number(monthString);
    const year = Number(yearString);

    try {
      const response = await request(`/api/records/date?date=${encodeURIComponent(normalizedDate)}`);
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const records = (await response.json()) as MealRecord[];
        return records.map((item) => ({
          ...item,
          date: normalizeDate(item.date),
        }));
      }
    } catch {
      // fallback to month loading below
    }

    const monthRecords = await api.fetchMonthRecords(month, year);
    return monthRecords
      .map((item) => ({
        ...item,
        date: normalizeDate(item.date),
      }))
      .filter((item) => normalizeDate(item.date) === normalizedDate);
  },

  saveMealRecord: async (record: { date: string; class_id: number; breakfast_count: number; lunch_count: number }): Promise<MealRecord> => {
    const response = await request('/api/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    return response.json();
  },

  saveActualMealRecord: async (record: ActualMealRecord): Promise<MealRecord> => {
    const response = await request('/api/records/actual', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    return response.json();
  },

  fetchHolidays: async (month: number, year: number): Promise<Holiday[]> => {
    const response = await request(`/api/holidays?month=${month}&year=${year}`);
    return response.json();
  },

  fetchCanteenPrintHtml: async (date: string): Promise<string> => {
    const normalizedDate = normalizeDate(date);
    const response = await request(`/api/export/canteen-print?date=${encodeURIComponent(normalizedDate)}`);
    const html = await response.text();

    if (!html.includes('Распечатка для столовой')) {
      throw new Error('Печатная форма недоступна на сервере.');
    }

    return html;
  },

  saveHoliday: async (date: string, is_working: boolean): Promise<Holiday> => {
    const response = await request('/api/holidays', {
      method: 'POST',
      body: JSON.stringify({ date, is_working }),
    });
    return response.json();
  },
};
