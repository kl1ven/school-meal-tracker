export type UserRole = 'teacher' | 'manager' | 'canteen';

export type User = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  classId?: string;
  className?: string;
};

export type Class = {
  id: number;
  name: string;
  parallel: number;
  sort_order?: number;
  teacher_id?: number | null;
  teacher_name?: string;
  teacher_email?: string;
};

export type MealRecord = {
  id: number;
  date: string;
  class_id: number;
  breakfast_count: number;
  lunch_count: number;
  actual_breakfast_count?: number;
  actual_lunch_count?: number;
  created_by?: number | null;
  class_name?: string;
  parallel?: number;
};

export type AuditLogEntry = {
  id: number;
  userId: number;
  userName: string;
  action: string;
  tableName: string;
  recordId: number;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any>;
  createdAt: string;
};

export type DailyStatResponse = {
  dates: string[];
  breakfast: number[];
  lunch: number[];
};

export type ClassStatItem = {
  className: string;
  total: number;
};

export type MonthlySummary = {
  totalBreakfast: number;
  totalLunch: number;
  avgBreakfast: number;
  avgLunch: number;
  maxBreakfast: number;
  minBreakfast: number;
  maxLunch: number;
  minLunch: number;
  daysCount: number;
  breakfastShare: number;
};

export type ComparisonResponse = {
  breakfast: { current: number; previous: number; changePercent: number };
  lunch: { current: number; previous: number; changePercent: number };
};

export type ActualMealRecord = {
  date: string;
  class_id: number;
  actual_breakfast_count: number;
  actual_lunch_count: number;
};

export type Holiday = {
  id: number;
  date: string;
  is_working: boolean;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type NotificationType = 'reminder' | 'discrepancy' | 'confirmation' | 'new_request' | 'test';

export type Notification = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: number;
  link: string | null;
  emailSent: number;
  createdAt: string;
};
