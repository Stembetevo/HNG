import { useState, useCallback } from "react";

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 2v4M16 2v4M3 9h18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

  const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  const dueDateStr = dueDate.toString();
  const dueTimeStr = dueDate.toTimeString();
  const isOverdue = dueDate < new Date();

  const handleEdit = useCallback(() => {
    alert('Are you sure you want to edit the task ?!');
  }, [task.title]);

  const handleDelete = useCallback(() => {
    alert(`Are you sure you want to remove the task?`);
  }, [task.title]);

  const priorityClass = `priority--${task.priority.toLowerCase()}`;
  const statusClass = `status--${task.status.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <article
      data-testid="test-todo-card"
      className="todo-card"
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
        className={`todo-card__desc${completed ? " todo-card__desc--done" : ""}`}
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
            aria-label={`Due time: ${dueTimeStr}`}
          >
            <ClockIcon />
            {dueTimeStr}
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
