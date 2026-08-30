import { FormEvent, useEffect, useState } from "react";
import { api, getToken, Goal, GoalType } from "./api";
import AuthScreen from "./AuthScreen";
import GoalCard from "./GoalCard";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<GoalType>("build");
  const [error, setError] = useState<string | null>(null);

  async function loadGoals() {
    try {
      setGoals(await api.listGoals());
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (authed) loadGoals();
  }, [authed]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.createGoal(newTitle.trim(), newType);
      setNewTitle("");
      loadGoals();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleToday(goal: Goal) {
    const isDone = goal.type === "build" ? goal.loggedToday : goal.relapsedToday;
    try {
      const updated = isDone ? await api.undoToday(goal.id) : await api.logToday(goal.id);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function editGoal(goal: Goal, title: string) {
    try {
      const updated = await api.updateGoal(goal.id, title);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeGoal(goal: Goal) {
    if (!confirm(`Remove "${goal.title}"?`)) return;
    try {
      await api.deleteGoal(goal.id);
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setAuthed(false);
    setGoals([]);
  }

  if (!authed) {
    return <AuthScreen onAuthed={() => setAuthed(true)} />;
  }

  const building = goals.filter((g) => g.type === "build");
  const breaking = goals.filter((g) => g.type === "break");

  return (
    <div className="app">
      <header>
        <h1>Habit Shaper</h1>
        <button className="link-button" onClick={logout}>Log out</button>
      </header>

      <form className="new-goal-form" onSubmit={handleCreate}>
        <input
          placeholder="e.g. meditate, exercise, read, learn Mandarin ..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <select value={newType} onChange={(e) => setNewType(e.target.value as GoalType)}>
          <option value="build">Build</option>
          <option value="break">Break</option>
        </select>
        <button type="submit">Add habit</button>
      </form>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>Building 🔥</h2>
        {building.length === 0 && <p className="empty">No build habits yet.</p>}
        <div className="goal-grid">
          {building.map((g) => (
            <GoalCard key={g.id} goal={g} onToggleToday={toggleToday} onEdit={editGoal} onDelete={removeGoal} />
          ))}
        </div>
      </section>

      <section>
        <h2>Breaking ✅</h2>
        {breaking.length === 0 && <p className="empty">No break habits yet.</p>}
        <div className="goal-grid">
          {breaking.map((g) => (
            <GoalCard key={g.id} goal={g} onToggleToday={toggleToday} onEdit={editGoal} onDelete={removeGoal} />
          ))}
        </div>
      </section>
    </div>
  );
}
