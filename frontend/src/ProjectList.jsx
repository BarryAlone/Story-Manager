import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import deleteIcon from './assets/icons/trash-can.png';
import editIcon from './assets/icons/pencil.png';
import plusIcon from './assets/icons/plus.png';
import { apiFetch, backendUrl } from './api';
import useAuth from './useAuth';
import './ProjectList.css';

function formatUpdatedAt(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

async function fetchProjects() {
  const response = await apiFetch('/api/projects');

  if (!response.ok) {
    throw new Error('Nie udało się pobrać projektów.');
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Serwer zwrócił nieprawidłową listę projektów.');
  }

  return data;
}

function projectCountLabel(count) {
  if (count === 1) return 'projekt';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
    return 'projekty';
  }

  return 'projektów';
}

function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProjectImage, setNewProjectImage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      setProjects(await fetchProjects());
    } catch {
      setLoadError('Nie udało się pobrać Twoich projektów. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    fetchProjects()
      .then((data) => {
        if (isCurrent) setProjects(data);
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError('Nie udało się pobrać Twoich projektów. Sprawdź połączenie i spróbuj ponownie.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !isSaving) setIsModalOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isModalOpen, isSaving]);

  const orderedProjects = useMemo(() => {
    if (!projects.some((project) => formatUpdatedAt(project.updated_at))) return projects;

    return [...projects].sort((first, second) => {
      const firstUpdatedAt = Date.parse(first.updated_at) || 0;
      const secondUpdatedAt = Date.parse(second.updated_at) || 0;

      return secondUpdatedAt - firstUpdatedAt;
    });
  }, [projects]);

  const recentProjectIds = useMemo(
    () => new Set(
      orderedProjects
        .filter((project) => formatUpdatedAt(project.updated_at))
        .slice(0, 3)
        .map((project) => project.id),
    ),
    [orderedProjects],
  );

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Twórco';

  const openCreateModal = () => {
    setEditingProjectId(null);
    setNewName('');
    setNewDescription('');
    setNewProjectImage(null);
    setSaveError('');
    setIsModalOpen(true);
  };

  const openEditModal = (project) => {
    setEditingProjectId(project.id);
    setNewName(project.name);
    setNewDescription(project.description || '');
    setNewProjectImage(null);
    setSaveError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSaving) setIsModalOpen(false);
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError('');

    const formData = new FormData();
    formData.append('name', newName);
    formData.append('description', newDescription || '');

    if (newProjectImage) {
      formData.append('project_image', newProjectImage);
    }

    let url = '/api/projects';

    if (editingProjectId) {
      url = `/api/projects/${editingProjectId}`;
      formData.append('_method', 'PUT');
    }

    try {
      const response = await apiFetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Nie udało się zapisać projektu.');
      }

      const savedProject = await response.json();

      setProjects((currentProjects) => (
        editingProjectId
          ? currentProjects.map((project) => (
            project.id === editingProjectId ? savedProject : project
          ))
          : [...currentProjects, savedProject]
      ));
      setIsModalOpen(false);
    } catch {
      setSaveError('Nie udało się zapisać projektu. Sprawdź dane i spróbuj ponownie.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Czy na pewno chcesz trwale usunąć ten projekt i całą jego zawartość?')) return;

    try {
      const response = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });

      if (!response.ok) throw new Error('Nie udało się usunąć projektu.');

      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== id));
    } catch (error) {
      console.error('Błąd usuwania:', error);
    }
  };

  return (
    <section className="dashboard" aria-labelledby="projects-heading">
      <header className="dashboard__hero">
        <div>
          <p className="dashboard__eyebrow">Witaj, {firstName}!</p>
          <h1 id="projects-heading">Twoje projekty</h1>
          <p className="dashboard__intro">
            Wróć do swojego świata albo rozpocznij zupełnie nową historię.
          </p>
        </div>

        {!isLoading && !loadError && projects.length > 0 && (
          <button className="dashboard__create-button" type="button" onClick={openCreateModal}>
            <img src={plusIcon} alt="" aria-hidden="true" />
            Utwórz projekt
          </button>
        )}
      </header>

      {!isLoading && !loadError && (
        <div className="dashboard__summary" aria-live="polite">
          <span className="dashboard__count">{projects.length}</span>
          <span>{projectCountLabel(projects.length)} na Twoim koncie</span>
          {recentProjectIds.size > 0 && projects.length > 1 }
        </div>
      )}

      {isLoading && (
        <div className="dashboard__state" role="status" aria-live="polite">
          <span className="dashboard__spinner" aria-hidden="true" />
          <h2>Ładujemy Twoje projekty</h2>
          <p>To potrwa tylko chwilę.</p>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="dashboard__state dashboard__state--error" role="alert">
          <h2>Nie udało się załadować projektów</h2>
          <p>{loadError}</p>
          <button type="button" onClick={loadProjects}>Spróbuj ponownie</button>
        </div>
      )}

      {!isLoading && !loadError && projects.length === 0 && (
        <div className="dashboard__state dashboard__state--empty">
          <div className="dashboard__empty-icon" aria-hidden="true">✦</div>
          <h2>Tu zacznie się Twoja pierwsza historia</h2>
          <p>Utwórz projekt, aby zacząć porządkować świat, bohaterów i rozdziały.</p>
          <button type="button" onClick={openCreateModal}>
            <img src={plusIcon} alt="" aria-hidden="true" />
            Utwórz pierwszy projekt
          </button>
        </div>
      )}

      {!isLoading && !loadError && orderedProjects.length > 0 && (
        <div className="dashboard__grid" aria-label="Lista projektów">
          {orderedProjects.map((project) => {
            const imageUrl = project.project_image
              ? backendUrl(`/storage/${project.project_image}`)
              : null;
            const updatedAt = formatUpdatedAt(project.updated_at);
            const isRecent = recentProjectIds.has(project.id);

            return (
              <article
                className="project-card"
                key={project.id}
                style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
              >
                <button
                  className="project-card__open"
                  type="button"
                  onClick={() => navigate(`/project/${project.id}/characters`)}
                  aria-label={`Otwórz projekt ${project.name}`}
                />

                <div className="project-card__actions">
                  <button
                    type="button"
                    onClick={() => openEditModal(project)}
                    aria-label={`Edytuj projekt ${project.name}`}
                    title="Edytuj"
                  >
                    <img src={editIcon} alt="" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(project.id)}
                    aria-label={`Usuń projekt ${project.name}`}
                    title="Usuń"
                  >
                    <img src={deleteIcon} alt="" aria-hidden="true" />
                  </button>
                </div>

                {isRecent && <span className="project-card__badge">Ostatnio edytowany</span>}

                <div className="project-card__content">
                  <h2>{project.name}</h2>
                  <p>{project.description || 'Brak opisu.'}</p>
                  {updatedAt && <time dateTime={project.updated_at}>Edytowano {updatedAt}</time>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="project-modal" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <form
            className="project-modal__dialog"
            onSubmit={handleSaveProject}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            <h2 id="project-modal-title">
              {editingProjectId ? 'Edytuj projekt' : 'Nowy projekt'}
            </h2>

            <label htmlFor="project-name">Nazwa projektu</label>
            <input
              id="project-name"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              required
              autoFocus
            />

            <label htmlFor="project-description">Opis projektu</label>
            <textarea
              id="project-description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
            />

            <label htmlFor="project-image">Okładka projektu (opcjonalnie)</label>
            <input
              id="project-image"
              type="file"
              accept="image/*"
              onChange={(event) => setNewProjectImage(event.target.files[0])}
            />

            {saveError && <p className="project-modal__error" role="alert">{saveError}</p>}

            <div className="project-modal__actions">
              <button type="button" className="project-modal__cancel" onClick={closeModal} disabled={isSaving}>
                Anuluj
              </button>
              <button type="submit" className="project-modal__save" disabled={isSaving}>
                {isSaving ? 'Zapisywanie…' : 'Zapisz'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default ProjectList;
