export type UserRole = "owner" | "member";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  /** Pounds. Null until set; the protein target waits on it. */
  weightLb: number | null;
  /** True while the password was chosen by somebody else. */
  mustChangePassword: boolean;
  createdAt: string;
}

export interface LogEntry {
  id: number;
  userId: number;
  metricId: string;
  date: string;
  /** Whole units: minutes, steps, or grams, per the metric. */
  amount: number;
  notes: string | null;
  createdAt: string;
}

export interface NewLogEntry {
  userId: number;
  metricId: string;
  date: string;
  amount: number;
  notes?: string | null;
}
