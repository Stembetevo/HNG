import { useState, useEffect, useCallback } from "react";


function formatDueDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRemaining(date) {
  const now = new Date();
  const diffMs = date - now;
  const absDiff = Math.abs(diffMs);

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  const overdue = diffMs < 0;

  if (minutes < 1) return overdue ? "Just overdue" : "Due now";
  if (minutes < 60)
    return overdue
      ? `Overdue by ${minutes}m`
      : `Due in ${minutes}m`;
  if (hours < 24)
    return overdue
      ? `Overdue by ${hours}h`
      : `Due in ${hours}h`;
  return overdue
    ? `Overdue by ${days}d`
    : `Due in ${days} day${days !== 1 ? "s" : ""}`;
}


const SAMPLE_TASK = {
  id: "task-001",
  title: "Redesign the onboarding flow",
  description:
    "Audit the current onboarding screens, identify friction points, and produce hi-fi mockups for the new three-step flow before the sprint review.",
  priority: "High",
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  status: "In Progress",
  tags: ["Design", "UX", "Sprint-3"],
};


export default function TodoCard({ task = SAMPLE_TASK }) {
  const [completed, setCompleted] = useState(false);
  const [tick, setTick] = useState(0);

  // Refresh time display every 45 seconds
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 45_000);
    return () => clearInterval(id);
  }, []);

  const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  const timeRemaining = formatTimeRemaining(dueDate);
  const dueDateStr = formatDueDate(dueDate);
  const isOverdue = dueDate < new Date();

  const handleEdit = useCallback(() => {
    alert(`Edit task: ${task.title}`);
  }, [task.title]);

  const handleDelete = useCallback(() => {
    alert(`Delete task: ${task.title}`);
  }, [task.title]);

  const priorityClass = `priority--${task.priority.toLowerCase()}`;
  const statusClass = `status--${task.status.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <article
      data-testid="test-todo-card"
      className={`todo-card${completed ? " todo-card--done" : ""}`}
    >
      {/* ── top bar ── */}
      <div className="todo-card__topbar">
        <span
          data-testid="test-todo-priority"
          className={`badge ${priorityClass}`}
          aria-label={`Priority: ${task.priority}`}
        >
          {task.priority}
        </span>

        <div className="todo-card__actions">
          <button
            data-testid="test-todo-edit-button"
            className="icon-btn"
            onClick={handleEdit}
            aria-label="Edit task"
          >
            <PencilIcon />
          </button>
          <button
            data-testid="test-todo-delete-button"
            className="icon-btn icon-btn--danger"
            onClick={handleDelete}
            aria-label="Delete task"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* ── checkbox + title ── */}
      <div className="todo-card__heading">
        <label className="checkbox-wrap" htmlFor={`complete-${task.id}`}>
          <input
            type="checkbox"
            id={`complete-${task.id}`}
            data-testid="test-todo-complete-toggle"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            aria-label="Mark task as complete"
          />
          <span className="checkbox-custom" aria-hidden="true">
            <CheckIcon />
          </span>
        </label>

        <h3
          data-testid="test-todo-title"
          className="todo-card__title"
        >
          {task.title}
        </h3>
      </div>

      {/* ── description ── */}
      <p
        data-testid="test-todo-description"
        className="todo-card__desc"
      >
        {task.description}
      </p>

      {/* ── tags ── */}
      <ul
        data-testid="test-todo-tags"
        className="todo-card__tags"
        role="list"
        aria-label="Categories"
      >
        {task.tags.map((tag) => (
          <li
            key={tag}
            data-testid={`test-todo-tag-${tag.toLowerCase()}`}
            className="tag"
          >
            {tag}
          </li>
        ))}
      </ul>

      {/* ── footer ── */}
      <div className="todo-card__footer">
        <div className="todo-card__dates">
          <time
            data-testid="test-todo-due-date"
            dateTime={dueDate.toISOString()}
            className="due-date"
            aria-label={`Due date: ${dueDateStr}`}
          >
            <CalendarIcon />
            {dueDateStr}
          </time>

          <time
            data-testid="test-todo-time-remaining"
            dateTime={dueDate.toISOString()}
            className={`time-remaining${isOverdue ? " time-remaining--overdue" : ""}`}
            aria-label={`Time remaining: ${timeRemaining}`}
          >
            <ClockIcon />
            {timeRemaining}
          </time>
        </div>

        <span
          data-testid="test-todo-status"
          className={`status-badge ${statusClass}`}
          aria-label={`Status: ${task.status}`}
        >
          <span className="status-dot" aria-hidden="true" />
          {task.status}
        </span>
      </div>
    </article>
  );
}
