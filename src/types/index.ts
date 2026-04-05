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
