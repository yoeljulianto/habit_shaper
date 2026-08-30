import { Response } from "express";
import { pool } from "../db/pool";
import { AuthedRequest } from "../middleware/auth";

type GoalType = "build" | "break";

interface GoalRow {
  id: number;
  user_id: number;
  title: string;
  type: GoalType;
  created_at: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Consecutive completed days ending today or yesterday.
function computeBuildStreak(logDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!logDates.has(todayStr())) cursor.setDate(cursor.getDate() - 1);

  while (logDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Days since last relapse (or since goal creation if never relapsed).
function computeCleanStreak(relapseDates: string[], createdAt: string | Date): number {
  const today = new Date(todayStr());
  const created = new Date(createdAt);
  const sorted = [...relapseDates].sort();
  const lastRelapse = sorted.length > 0 ? new Date(sorted[sorted.length - 1]) : null;

  const start = lastRelapse ? new Date(lastRelapse) : created;
  if (lastRelapse) start.setDate(start.getDate() + 1);

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.max(diffDays + 1, 0);
}

function computeWeeklyRate(logDates: Set<string>) {
  let completed = 0;
  for (let i = 0; i < 7; i++) if (logDates.has(daysAgoStr(i))) completed++;
  return { completed, missed: 7 - completed };
}

async function attachStats(goal: GoalRow) {
  const [logs]: any = await pool.query(
    "SELECT log_date FROM goal_logs WHERE goal_id = ? ORDER BY log_date DESC",
    [goal.id]
  );
  const logDates: string[] = logs.map((r: any) => new Date(r.log_date).toISOString().slice(0, 10));
  const logDateSet = new Set(logDates);

  if (goal.type === "build") {
    return {
      ...goal,
      streak: computeBuildStreak(logDateSet),
      weekly: computeWeeklyRate(logDateSet),
      loggedToday: logDateSet.has(todayStr()),
    };
  }

  return {
    ...goal,
    cleanStreak: computeCleanStreak(logDates, goal.created_at),
    relapsedToday: logDateSet.has(todayStr()),
  };
}

export async function listGoals(req: AuthedRequest, res: Response) {
  const [rows]: any = await pool.query("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", [req.userId]);
  res.json(await Promise.all(rows.map((g: GoalRow) => attachStats(g))));
}

export async function createGoal(req: AuthedRequest, res: Response) {
  const { title, type } = req.body ?? {};
  if (!title || !["build", "break"].includes(type)) {
    return res.status(400).json({ error: "title and a valid type ('build'|'break') are required" });
  }

  const [result]: any = await pool.query("INSERT INTO goals (user_id, title, type) VALUES (?, ?, ?)", [req.userId, title, type]);
  const [rows]: any = await pool.query("SELECT * FROM goals WHERE id = ?", [result.insertId]);
  res.status(201).json(await attachStats(rows[0]));
}

async function ownedGoal(userId: number, goalId: number): Promise<GoalRow | null> {
  const [rows]: any = await pool.query("SELECT * FROM goals WHERE id = ? AND user_id = ?", [goalId, userId]);
  return rows[0] ?? null;
}

export async function updateGoal(req: AuthedRequest, res: Response) {
  const goalId = Number(req.params.id);
  const { title } = req.body ?? {};

  const goal = await ownedGoal(req.userId!, goalId);
  if (!goal) return res.status(404).json({ error: "goal not found" });
  if (!title) return res.status(400).json({ error: "title is required" });

  await pool.query("UPDATE goals SET title = ? WHERE id = ?", [title, goalId]);
  const [rows]: any = await pool.query("SELECT * FROM goals WHERE id = ?", [goalId]);
  res.json(await attachStats(rows[0]));
}

export async function deleteGoal(req: AuthedRequest, res: Response) {
  const goal = await ownedGoal(req.userId!, Number(req.params.id));
  if (!goal) return res.status(404).json({ error: "goal not found" });

  await pool.query("DELETE FROM goals WHERE id = ?", [goal.id]);
  res.status(204).send();
}

export async function logToday(req: AuthedRequest, res: Response) {
  const goal = await ownedGoal(req.userId!, Number(req.params.id));
  if (!goal) return res.status(404).json({ error: "goal not found" });

  await pool.query("INSERT IGNORE INTO goal_logs (goal_id, log_date) VALUES (?, ?)", [goal.id, todayStr()]);
  res.json(await attachStats(goal));
}

export async function undoToday(req: AuthedRequest, res: Response) {
  const goal = await ownedGoal(req.userId!, Number(req.params.id));
  if (!goal) return res.status(404).json({ error: "goal not found" });

  await pool.query("DELETE FROM goal_logs WHERE goal_id = ? AND log_date = ?", [goal.id, todayStr()]);
  res.json(await attachStats(goal));
}