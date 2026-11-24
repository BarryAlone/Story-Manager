import { useMemo, useState } from 'react';

import useProjectTasks from './useProjectTasks';

const FILTERS = [
  ['active', 'Aktywne'],
  ['completed', 'Wykonane'],
  ['all', 'Wszystkie'],
];

function todayDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function ProjectTaskItem({
  canMoveDown,
  canMoveUp,
  item,
  isPending,
  onDelete,
  onMove,
  onToggle,
  onUpdate,
}) {
  const [title, setTitle] = useState(item.title);
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const isDirty = title !== item.title || dueDate !== (item.due_date || '');
  const isOverdue = !item.is_completed && item.due_date && item.due_date < todayDate();

  const save = async () => {
    if (!isDirty || !title.trim()) return;
    try {
      await onUpdate(item.id, { title, due_date: dueDate || null });
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  return (
    <li className={`project-tasks-item${item.is_completed ? ' is-completed' : ''}${isOverdue ? ' is-overdue' : ''}`}>
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={() => onToggle(item).catch(() => {})}
        disabled={isPending}
        aria-label={item.is_completed ? `Otwórz ponownie: ${item.title}` : `Oznacz jako wykonane: ${item.title}`}
      />
      <div className="project-tasks-item__fields">
        <input
          type="text"
          value={title}
          maxLength={500}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            }
          }}
          aria-label="Tytuł zadania"
          disabled={isPending}
        />
        <label>
          <span>Termin</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={isPending}
          />
        </label>
        {isOverdue && <span className="project-tasks-item__overdue">Po terminie</span>}
      </div>
      <div className="project-tasks-item__actions">
        {isDirty && (
          <button type="button" onClick={save} disabled={isPending || !title.trim()}>
            Zapisz
          </button>
        )}
        <button
          type="button"
          onClick={() => onMove(item, -1).catch(() => {})}
          disabled={isPending || !canMoveUp}
          aria-label={`Przesuń zadanie „${item.title}” w górę`}
          title="Przesuń w górę"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(item, 1).catch(() => {})}
          disabled={isPending || !canMoveDown}
          aria-label={`Przesuń zadanie „${item.title}” w dół`}
          title="Przesuń w dół"
        >
          ↓
        </button>
        <button
          type="button"
          className="is-danger"
          onClick={() => onDelete(item)}
          disabled={isPending}
          aria-label={`Usuń zadanie „${item.title}”`}
        >
          Usuń
        </button>
      </div>
    </li>
  );
}

export default function ProjectTasks({ projectId }) {
  const [filter, setFilter] = useState('active');
  const [newTitle, setNewTitle] = useState('');
  const {
    createItem,
    deleteItem,
    groups,
    isLoading,
    items,
    loadError,
    loadItems,
    moveItem,
    operationError,
    pendingIds,
    toggleItem,
    updateItem,
  } = useProjectTasks(projectId);

  const visibleItems = useMemo(() => {
    if (filter === 'active') return groups.active;
    if (filter === 'completed') return groups.completed;
    return items;
  }, [filter, groups, items]);

  const addItem = async (event) => {
    event.preventDefault();
    if (!newTitle.trim() || pendingIds.has('create')) return;
    try {
      await createItem(newTitle);
      setNewTitle('');
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  const confirmDelete = async (item) => {
    if (!window.confirm(`Usunąć zadanie „${item.title}”?`)) return;
    try {
      await deleteItem(item.id);
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  if (isLoading) return <div className="project-notes-state">Ładowanie zadań…</div>;
  if (loadError) {
    return (
      <div className="project-notes-state is-error" role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={loadItems}>Spróbuj ponownie</button>
      </div>
    );
  }

  return (
    <section className="project-tasks" aria-labelledby="project-tasks-title">
      <header className="project-tasks__toolbar">
        <div>
          <h2 id="project-tasks-title">Do zrobienia</h2>
          <span>{items.length} {items.length === 1 ? 'zadanie' : 'zadań'}</span>
        </div>
        <form onSubmit={addItem} className="project-tasks__add">
          <label className="sr-only" htmlFor="new-project-task">Nowe zadanie</label>
          <input
            id="new-project-task"
            type="text"
            value={newTitle}
            maxLength={500}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Dodaj zadanie…"
            disabled={pendingIds.has('create')}
          />
          <button type="submit" disabled={!newTitle.trim() || pendingIds.has('create')}>
            {pendingIds.has('create') ? 'Dodawanie…' : 'Dodaj'}
          </button>
        </form>
        <div className="project-tasks__filters" aria-label="Filtr zadań">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'is-active' : ''}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {operationError && <div className="project-tasks__error" role="alert">{operationError}</div>}

      {visibleItems.length === 0 ? (
        <div className="project-notes-empty">
          {items.length === 0 ? 'Dodaj pierwsze zadanie projektu.' : 'Brak zadań w tym widoku.'}
        </div>
      ) : (
        <ul className="project-tasks__list">
          {visibleItems.map((item) => {
            const group = item.is_completed ? groups.completed : groups.active;
            const index = group.findIndex((entry) => entry.id === item.id);
            return (
              <ProjectTaskItem
                key={`${item.id}-${item.title}-${item.due_date || ''}`}
                item={item}
                isPending={pendingIds.has(item.id) || pendingIds.has(`order-${item.id}`)}
                canMoveUp={index > 0}
                canMoveDown={index >= 0 && index < group.length - 1}
                onDelete={confirmDelete}
                onMove={moveItem}
                onToggle={toggleItem}
                onUpdate={updateItem}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
