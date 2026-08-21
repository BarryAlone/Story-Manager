import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import deleteIcon from './assets/icons/trash-can.png';
import editIcon from './assets/icons/pencil.png';
import FABIcon from './assets/icons/plus.png';
import { apiFetch, backendUrl } from './api';

function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);

  // Stany formularza
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProjectImage, setNewProjectImage] = useState(null); // NULL dla pliku

  // Stany UI i Edycji
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);

  useEffect(() => {
    apiFetch('/api/projects')
      .then(response => response.json())
      .then(data => setProjects(data))
      .catch(error => console.error('Błąd pobierania projektów:', error));
  }, []);

  // Otwieranie modala do tworzenia
  const openCreateModal = () => {
    setEditingProjectId(null);
    setNewName('');
    setNewDescription('');
    setNewProjectImage(null);
    setIsModalOpen(true);
  };

  // Otwieranie modala do edycji
  const openEditModal = (project) => {
    setEditingProjectId(project.id);
    setNewName(project.name);
    setNewDescription(project.description || '');
    setNewProjectImage(null); // Nie wczytujemy starego pliku, czekamy na ewentualny nowy
    setIsModalOpen(true);
  };

  // Główna funkcja Zapisz (Create & Update)
  const handleSaveProject = () => {
    const formData = new FormData();
    formData.append('name', newName);
    formData.append('description', newDescription || '');
    
    if (newProjectImage) {
      formData.append('project_image', newProjectImage);
    }

    let url = '/api/projects';
    let method = 'POST';

    // Jeśli edytujemy, zmieniamy URL i dorzucamy fake-ową metodę PUT (Laravel tego wymaga przy FormData)
    if (editingProjectId) {
      url = `/api/projects/${editingProjectId}`;
      formData.append('_method', 'PUT');
    }

    apiFetch(url, {
      method: method,
      headers: { 'Accept': 'application/json' },
      body: formData // Wysyłamy FormData, NIE JSON!
    })
      .then(async response => {
        if (!response.ok) {
          const err = await response.json();
          console.error("Błąd walidacji:", err);
          throw new Error('Błąd przy zapisie projektu');
        }
        return response.json();
      })
      .then(savedProject => {
        if (editingProjectId) {
          // Podmieniamy wyedytowany projekt w liście
          setProjects(projects.map(p => p.id === editingProjectId ? savedProject : p));
        } else {
          // Dodajemy nowy projekt do listy
          setProjects([...projects, savedProject]);
        }
        setIsModalOpen(false);
      })
      .catch(error => console.error('Błąd zapisu:', error));
  };

  // Usuwanie projektu
  const handleDelete = (id) => {
    if (!window.confirm("Czy na pewno chcesz trwale usunąć ten projekt i całą jego zawartość?")) return;

    apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
      .then(response => {
        if (response.ok) {
          setProjects(projects.filter(p => p.id !== id));
        }
      })
      .catch(error => console.error('Błąd usuwania:', error));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px' }}>
        <h1>Twoje projekty</h1>
      </div>
      
      {/* Przycisk FAB (Pływający Plus) */}
      <button 
        onClick={openCreateModal}
        style={{ position: 'fixed', bottom: '40px', right: '40px', width: '60px', height: '60px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: '#6c7683', opacity: 0.9, boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, transition: 'transform 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <img src={FABIcon} alt="Dodaj projekt" style={{ width: '24px', height: '24px' }} />
      </button>

      {/* --- MODAL FORMULARZA --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px' }}>
            <h2 style={{ marginTop: 0 }}>{editingProjectId ? 'Edytuj Projekt' : 'Nowy Projekt'}</h2>
            
            <input type="text" placeholder="Nazwa projektu" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <textarea placeholder="Opis projektu" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />
            
            {/* Input typu FILE */}
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#6b7280' }}>Okładka projektu (opcjonalnie)</label>
            <input type="file" accept="image/*" onChange={(e) => setNewProjectImage(e.target.files[0])} style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Anuluj
              </button>
              <button onClick={handleSaveProject} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}  

      {/* --- KAFELKI PROJEKTÓW --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
        {projects.length > 0 ? projects.map(project => {
          
          // Generowanie URL dla okładki (zakładając że Laravel zapisuje to w storage/projects/...)
          const imageUrl = project.project_image ? backendUrl(`/storage/${project.project_image}`) : null;

          return (
            <div 
              key={project.id} 
              onClick={() => navigate(`/project/${project.id}/characters`)}
              style={{ textDecoration: 'none',
                       color: 'inherit',
                       position: 'relative',
                       height: '220px',
                       borderRadius: '12px',
                       overflow: 'hidden', 
                       backgroundColor: '#374151', 
                       backgroundImage: imageUrl ? `url(${imageUrl})` : 'none', 
                       backgroundSize: 'cover', 
                       backgroundPosition: 'center', 
                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
                       display: 'block', 
                       cursor: 'pointer', 
                       transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Opcje akcji (Pływające przyciski Edytuj/Usuń) */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(project); }} 
                  title="Edytuj"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.9)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} 
                  title="Usuń"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.9)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <img src={deleteIcon} alt="Usuń" style={{ width: '18px', height: '18px' }} />
                </button>
              </div>

              {/* Obszar z tekstem (Gradient przykrywający dół) */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 20px 20px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', color: 'white' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  {project.name}
                </h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#e5e7eb', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {project.description || 'Brak opisu.'}
                </p>
              </div>
            </div>
          );
        }) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Nie masz jeszcze żadnych projektów. Stwórz swój pierwszy literacki świat!
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectList;
