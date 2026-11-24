import { useMemo, useState } from 'react';

import useProjectChecklist from './useProjectChecklist';

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

function ChecklistItem({
  canMoveDown,
  canMoveUp,
  item,
  isPending,
  onDelete,
  onMove,
  onToggle,
  onUpdate,
}) {
  const [content, setContent] = useState(item.content);
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const isDirty = content !== item.content || dueDate !== (item.due_date || '');
  const isOverdue = !item.is_completed && item.due_date && item.due_date < todayDate();

  const save = async () => {
    if (!isDirty || !content.trim()) return;
    try {
      await onUpdate(item.id, { content, due_date: dueDate || null });
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  return (
    <li className={`project-checklist-item${item.is_completed ? ' is-completed' : ''}${isOverdue ? ' is-overdue' : ''}`}>
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={() => onToggle(item).catch(() => {})}
        disabled={isPending}
        aria-label={item.is_completed ? `Otwórz ponownie: ${item.content}` : `Oznacz jako wykonane: ${item.content}`}
      />
      <div className="project-checklist-item__fields">
        <input
          type="text"
          value={content}
          maxLength={500}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            }
          }}
          aria-label="Treść zadania"
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
        {isOverdue && <span className="project-checklist-item__overdue">Po terminie</span>}
      </div>
      <div className="project-checklist-item__actions">
        {isDirty && (
          <button type="button" onClick={save} disabled={isPending || !content.trim()}>
            Zapisz
          </button>
        )}
        <button
          type="button"
          onClick={() => onMove(item, -1).catch(() => {})}
          disabled={isPending || !canMoveUp}
          aria-label={`Przesuń zadanie „${item.content}” w górę`}
          title="Przesuń w górę"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(item, 1).catch(() => {})}
          disabled={isPending || !canMoveDown}
          aria-label={`Przesuń zadanie „${item.content}” w dół`}
          title="Przesuń w dół"
        >
          ↓
        </button>
        <button
          type="button"
          className="is-danger"
          onClick={() => onDelete(item)}
          disabled={isPending}
          aria-label={`Usuń zadanie „${item.content}”`}
        >
          Usuń
        </button>
      </div>
    </li>
  );
}

export default function ProjectChecklist({ projectId }) {
  const [filter, setFilter] = useState('active');
  const [newContent, setNewContent] = useState('');
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
  } = useProjectChecklist(projectId);

  const visibleItems = useMemo(() => {
    if (filter === 'active') return groups.active;
    if (filter === 'completed') return groups.completed;
    return items;
  }, [filter, groups, items]);

  const addItem = async (event) => {
    event.preventDefault();
    if (!newContent.trim() || pendingIds.has('create')) return;
    try {
      await createItem(newContent);
      setNewContent('');
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  const confirmDelete = async (item) => {
    if (!window.confirm(`Usunąć zadanie „${item.content}”?`)) return;
    try {
      await deleteItem(item.id);
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  if (isLoading) return <div className="project-notes-state">Ładowanie checklisty…</div>;
  if (loadError) {
    return (
      <div className="project-notes-state is-error" role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={loadItems}>Spróbuj ponownie</button>
      </div>
    );
  }

  return (
    <section className="project-checklist" aria-labelledby="project-checklist-title">
      <header className="project-checklist__toolbar">
        <div>
          <h2 id="project-checklist-title">Do zrobienia</h2>
          <span>{items.length} {items.length === 1 ? 'zadanie' : 'zadań'}</span>
        </div>
        <form onSubmit={addItem} className="project-checklist__add">
          <label className="sr-only" htmlFor="new-checklist-item">Nowe zadanie</label>
          <input
            id="new-checklist-item"
            type="text"
            value={newContent}
            maxLength={500}
            onChange={(event) => setNewContent(event.target.value)}
            placeholder="Dodaj zadanie…"
            disabled={pendingIds.has('create')}
          />
          <button type="submit" disabled={!newContent.trim() || pendingIds.has('create')}>
            {pendingIds.has('create') ? 'Dodawanie…' : 'Dodaj'}
          </button>
        </form>
        <div className="project-checklist__filters" aria-label="Filtr zadań">
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

      {operationError && <div className="project-checklist__error" role="alert">{operationError}</div>}

      {visibleItems.length === 0 ? (
        <div className="project-notes-empty">
          {items.length === 0 ? 'Dodaj pierwsze zadanie do wspólnej checklisty projektu.' : 'Brak zadań w tym widoku.'}
        </div>
      ) : (
        <ul className="project-checklist__list">
          {visibleItems.map((item) => {
            const group = item.is_completed ? groups.completed : groups.active;
            const index = group.findIndex((entry) => entry.id === item.id);
            return (
              <ChecklistItem
                key={`${item.id}-${item.content}-${item.due_date || ''}`}
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
