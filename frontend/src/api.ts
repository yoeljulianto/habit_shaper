const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type GoalType = "build" | "break";

export interface Goal {
  id: number;
  title: string;
  type: GoalType;
  created_at: string;
  streak?: number;
  weekly?: { completed: number; missed: number };
  loggedToday?: boolean;
  cleanStreak?: number;
  relapsedToday?: boolean;
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  listGoals: () => request<Goal[]>("/goals"),
  createGoal: (title: string, type: GoalType) =>
    request<Goal>("/goals", { method: "POST", body: JSON.stringify({ title, type }) }),
  updateGoal: (id: number, title: string) =>
    request<Goal>(`/goals/${id}`, { method: "PUT", body: JSON.stringify({ title }) }),
  deleteGoal: (id: number) => request<void>(`/goals/${id}`, { method: "DELETE" }),
  logToday: (id: number) => request<Goal>(`/goals/${id}/log`, { method: "POST" }),
  undoToday: (id: number) => request<Goal>(`/goals/${id}/log`, { method: "DELETE" }),
};

export { getToken };
