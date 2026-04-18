import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import { FaCalendar } from "react-icons/fa";
import { CiClock1, CiClock2 } from "react-icons/ci";
import { FaCheck } from "react-icons/fa";

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

const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const COLLAPSE_THRESHOLD = 150;

function normalizeTask(task) {
  return {
    ...task,
    dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
    priority: PRIORITY_OPTIONS.includes(task.priority) ? task.priority : "Medium",
    status: STATUS_OPTIONS.includes(task.status) ? task.status : "Pending",
  };
}

function formatDueDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeRemaining(dueDate, now, status) {
  if (status === "Done") {
    return "Completed";
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return overdue ? "Overdue by moments" : "Due now";
  }

  if (minutes < 60) {
    return overdue
      ? `Overdue by ${minutes} minute${minutes === 1 ? "" : "s"}`
      : `Due in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  if (hours < 24) {
    return overdue
      ? `Overdue by ${hours} hour${hours === 1 ? "" : "s"}`
      : `Due in ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return overdue
    ? `Overdue by ${days} day${days === 1 ? "" : "s"}`
    : `Due in ${days} day${days === 1 ? "" : "s"}`;
}


export default function TodoCard({ task = SAMPLE_TASK }) {
  const [todo, setTodo] = useState(() => normalizeTask(task));
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState(() => ({
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    dueDateInput: toDateInputValue(todo.dueDate),
  }));
  const [now, setNow] = useState(() => new Date());
  const [isExpanded, setIsExpanded] = useState(() => todo.description.length <= COLLAPSE_THRESHOLD);

  const editButtonRef = useRef(null);

  useEffect(() => {
    if (todo.status === "Done") {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timerId);
  }, [todo.status]);

  useEffect(() => {
    if (todo.description.length <= COLLAPSE_THRESHOLD) {
      setIsExpanded(true);
    }
  }, [todo.description]);

  const dueDate = todo.dueDate;
  const dueDateStr = formatDueDate(dueDate);
  const isOverdue = dueDate.getTime() < now.getTime() && todo.status !== "Done";
  const completed = todo.status === "Done";
  const timeRemaining = formatTimeRemaining(dueDate, now, todo.status);
  const hasLongDescription = todo.description.length > COLLAPSE_THRESHOLD;
  const visibleDescription = useMemo(() => {
    if (isExpanded || !hasLongDescription) {
      return todo.description;
    }

    return `${todo.description.slice(0, COLLAPSE_THRESHOLD)}...`;
  }, [hasLongDescription, isExpanded, todo.description]);

  const handleEdit = useCallback(() => {
    setEditValues({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      dueDateInput: toDateInputValue(todo.dueDate),
    });
    setIsEditing(true);
  }, [todo]);

  const handleDelete = useCallback(() => {
    window.alert(`Delete task: ${todo.title}`);
  }, [todo.title]);

  const closeEditMode = useCallback(() => {
    setIsEditing(false);
    window.requestAnimationFrame(() => {
      editButtonRef.current?.focus();
    });
  }, []);

  const handleSave = useCallback(
    (event) => {
      event.preventDefault();

      const nextDate = new Date(`${editValues.dueDateInput}T23:59:00`);
      setTodo((current) => ({
        ...current,
        title: editValues.title.trim() || current.title,
        description: editValues.description.trim() || current.description,
        priority: editValues.priority,
        dueDate: Number.isNaN(nextDate.getTime()) ? current.dueDate : nextDate,
      }));
      setNow(new Date());
      closeEditMode();
    },
    [closeEditMode, editValues]
  );

  const handleCancel = useCallback(() => {
    closeEditMode();
  }, [closeEditMode]);

  const handleStatusChange = useCallback((event) => {
    const nextStatus = event.target.value;
    setTodo((current) => ({ ...current, status: nextStatus }));
  }, []);

  const handleCheckboxChange = useCallback((event) => {
    const checked = event.target.checked;
    setTodo((current) => ({
      ...current,
      status: checked ? "Done" : "Pending",
    }));
  }, []);

  const priorityClass = `priority--${todo.priority.toLowerCase()}`;
  const statusClass = `status--${todo.status.toLowerCase().replace(/\s+/g, "-")}`;

  if (isEditing) {
    return (
      <article data-testid="test-todo-card" className="todo-card todo-card--editing">
        <form data-testid="test-todo-edit-form" className="todo-edit-form" onSubmit={handleSave}>
          <h3 className="todo-edit-form__title">Edit Task</h3>

          <label className="todo-edit-form__field" htmlFor="todo-edit-title">
            Title
          </label>
          <input
            id="todo-edit-title"
            data-testid="test-todo-edit-title-input"
            className="todo-edit-form__input"
            type="text"
            value={editValues.title}
            onChange={(event) => setEditValues((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <label className="todo-edit-form__field" htmlFor="todo-edit-description">
            Description
          </label>
          <textarea
            id="todo-edit-description"
            data-testid="test-todo-edit-description-input"
            className="todo-edit-form__textarea"
            rows={5}
            value={editValues.description}
            onChange={(event) =>
              setEditValues((prev) => ({ ...prev, description: event.target.value }))
            }
            required
          />

          <div className="todo-edit-form__row">
            <div className="todo-edit-form__group">
              <label className="todo-edit-form__field" htmlFor="todo-edit-priority">
                Priority
              </label>
              <select
                id="todo-edit-priority"
                data-testid="test-todo-edit-priority-select"
                className="todo-edit-form__select"
                value={editValues.priority}
                onChange={(event) =>
                  setEditValues((prev) => ({ ...prev, priority: event.target.value }))
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="todo-edit-form__group">
              <label className="todo-edit-form__field" htmlFor="todo-edit-due-date">
                Due date
              </label>
              <input
                id="todo-edit-due-date"
                data-testid="test-todo-edit-due-date-input"
                className="todo-edit-form__input"
                type="date"
                value={editValues.dueDateInput}
                onChange={(event) =>
                  setEditValues((prev) => ({ ...prev, dueDateInput: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="todo-edit-form__actions">
            <button data-testid="test-todo-save-button" type="submit" className="todo-btn todo-btn--primary">
              Save
            </button>
            <button
              data-testid="test-todo-cancel-button"
              type="button"
              className="todo-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article
      data-testid="test-todo-card"
      className={`todo-card ${priorityClass} ${statusClass}${isOverdue ? " todo-card--overdue" : ""}${completed ? " todo-card--done" : ""}`}
    >
      {/* ── top bar ── */}
      <div className="todo-card__topbar">
        <div className="todo-card__priority-wrap">
          <span
            data-testid="test-todo-priority-indicator"
            className={`priority-indicator priority-indicator--${todo.priority.toLowerCase()}`}
            aria-hidden="true"
          />
          <span
            data-testid="test-todo-priority"
            className="badge"
            aria-label={`Priority: ${todo.priority}`}
          >
            {todo.priority}
          </span>
        </div>

        <div className="todo-card__actions">
          <button
            data-testid="test-todo-edit-button"
            className="icon-btn"
            onClick={handleEdit}
            aria-label="Edit task"
            ref={editButtonRef}
          >
            <RiPencilFill />
          </button>
          <button
            data-testid="test-todo-delete-button"
            className="icon-btn icon-btn--danger"
            onClick={handleDelete}
            aria-label="Delete task"
          >
            <FaRegTrashAlt />
          </button>
        </div>
      </div>

      {/* ── checkbox + title ── */}
      <div className="todo-card__heading">
        <label className="checkbox-wrap" htmlFor={`complete-${task.id}`}>
          <input
            type="checkbox"
            id={`complete-${todo.id}`}
            data-testid="test-todo-complete-toggle"
            checked={completed}
            onChange={handleCheckboxChange}
            aria-label="Mark task as complete"
          />
          <span className="checkbox-custom" aria-hidden="true">
            <FaCheck />
          </span>
        </label>

        <h3
          data-testid="test-todo-title"
          className="todo-card__title"
        >
          {todo.title}
        </h3>
      </div>

      {/* ── description ── */}
      <section data-testid="test-todo-collapsible-section" className="todo-card__collapsible-section">
        <p
          data-testid="test-todo-description"
          className="todo-card__desc"
        >
          {visibleDescription}
        </p>
        {hasLongDescription ? (
          <button
            type="button"
            data-testid="test-todo-expand-toggle"
            className="todo-card__expand-toggle"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        ) : (
          <button
            type="button"
            data-testid="test-todo-expand-toggle"
            className="todo-card__expand-toggle"
            disabled
            aria-disabled="true"
          >
            Full description
          </button>
        )}
      </section>

      {/* ── tags ── */}
      <ul
        data-testid="test-todo-tags"
        className="todo-card__tags"
        role="list"
        aria-label="Categories"
      >
        {todo.tags.map((tag) => (
          <li
            key={tag}
            data-testid={`test-todo-tag-${tag.toLowerCase()}`}
            className="tag"
          >
            {tag}
          </li>
        ))}
      </ul>

      <div className="todo-card__status-controls">
        <label className="todo-card__status-label" htmlFor="todo-status-control">
          Status
        </label>
        <select
          id="todo-status-control"
          data-testid="test-todo-status-control"
          className="todo-card__status-select"
          value={todo.status}
          onChange={handleStatusChange}
          aria-label="Task status"
        >
          {STATUS_OPTIONS.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption}
            </option>
          ))}
        </select>
      </div>

      {/* ── footer ── */}
      <div className="todo-card__footer">
        <div className="todo-card__dates">
          <time
            data-testid="test-todo-due-date"
            dateTime={dueDate.toISOString()}
            className="due-date"
            aria-label={`Due date: ${dueDateStr}`}
          >
            <FaCalendar />
            Due {dueDateStr}
          </time>

          <time
            data-testid="test-todo-time-remaining"
            dateTime={dueDate.toISOString()}
            className={`time-remaining${isOverdue ? " time-remaining--overdue" : ""}`}
            aria-label={`Time remaining: ${timeRemaining}`}
          >
            <CiClock1 />
            {timeRemaining}
          </time>

          <span
            data-testid="test-todo-overdue-indicator"
            className={`overdue-indicator${isOverdue ? " overdue-indicator--active" : ""}`}
            role="status"
          >
            {completed ? "Completed" : isOverdue ? "Overdue" : "On track"}
          </span>
        </div>

        <span
          data-testid="test-todo-status"
          className={`status-badge ${statusClass}`}
          aria-label={`Status: ${todo.status}`}
        >
          <span className="status-dot" aria-hidden="true" />
          {todo.status}
        </span>
      </div>
    </article>
  );
}
