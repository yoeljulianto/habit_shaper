import { useState } from "react";
import { Goal } from "./api";

interface Props {
  goal: Goal;
  onToggleToday: (goal: Goal) => void;
  onEdit: (goal: Goal, newTitle: string) => void;
  onDelete: (goal: Goal) => void;
}

export default function GoalCard({ goal, onToggleToday, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);

  const isBuild = goal.type === "build";
  const doneToday = isBuild ? goal.loggedToday : goal.relapsedToday;

  function saveEdit() {
    if (title.trim() && title !== goal.title) onEdit(goal, title.trim());
    setEditing(false);
  }

  return (
    <div className={`goal-card ${goal.type}`}>
      <div className="goal-header">
        {editing ? (
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
        ) : (
          <h3 onClick={() => setEditing(true)}>{goal.title}</h3>
        )}
        <span className={`badge ${goal.type}`}>{isBuild ? "Building" : "Breaking"}</span>
      </div>

      {isBuild ? (
        <>
          <p className="streak">🔥 {goal.streak ?? 0}-day streak</p>
          <p className="weekly">This week: {goal.weekly?.completed ?? 0}/7 done ({goal.weekly?.missed ?? 0} missed)</p>
        </>
      ) : (
        <p className="streak">✅ {goal.cleanStreak ?? 0} days clean</p>
      )}

      <div className="goal-actions">
        <button className={doneToday ? "active" : ""} onClick={() => onToggleToday(goal)}>
          {isBuild
            ? doneToday ? "✓ Done today (undo)" : "Mark done today"
            : doneToday ? "Relapsed today (undo)" : "I relapsed today"}
        </button>
        <button className="danger" onClick={() => onDelete(goal)}>Remove</button>
      </div>
    </div>
  );
}
