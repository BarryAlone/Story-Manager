import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function CharacterList() {
  const { projectId } = useParams();
  const [characters, setCharacters] = useState([]);

  // Formularz
  const [newName, setNewName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCharacterImage, setNewCharacterImage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/projects/${projectId}/characters`)
      .then(response => response.json())
      .then(data => setCharacters(data))
      .catch(error => console.error('Błąd:', error));
  }, [projectId]);

  const handleSaveCharacter = () => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('name', newName);
    formData.append('group_name', newGroupName || '');
    formData.append('description', newDescription || '');
    
    if (newCharacterImage) {
      formData.append('character_image', newCharacterImage);
    }

    let url = 'http://localhost:8000/api/characters';
    
    if (editingCharacterId) {
      url = `http://localhost:8000/api/characters/${editingCharacterId}`;
      formData.append('_method', 'PUT'); 
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    })
      .then(async response => {
        if (!response.ok) {
          const err = await response.json();
          console.error("Błąd walidacji:", err);
          throw new Error('Błąd przy zapisie postaci');
        }
        return response.json();
      })
      .then(savedCharacter => {
        if (editingCharacterId) {
          setCharacters(characters.map(char => char.id === editingCharacterId ? savedCharacter : char));
        } else {
          setCharacters([...characters, savedCharacter]);
        }
        closeModal();
      })
      .catch(error => console.error('Błąd zapisu:', error));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę postać?")) return;

    fetch(`http://localhost:8000/api/characters/${id}`, { method: 'DELETE' })
      .then(response => {
        if (response.ok) setCharacters(characters.filter(char => char.id !== id));
      })
      .catch(error => console.error('Błąd usuwania:', error));
  };

  const openEditModal = (character) => {
    setEditingCharacterId(character.id);
    setNewName(character.name);
    setNewGroupName(character.group_name || '');
    setNewDescription(character.description || '');
    setNewCharacterImage(null); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingCharacterId(null);
    setNewName('');
    setNewGroupName('');
    setNewDescription('');
    setNewCharacterImage(null);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Postacie</h1>
        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          + Nowa postać
        </button>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px' }}>
            <h2 style={{ marginTop: 0 }}>{editingCharacterId ? 'Edytuj Postać' : 'Nowa Postać'}</h2>
            <input type="text" placeholder="Imię postaci" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Frakcja / Grupa (opcjonalnie)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <textarea placeholder="Opis postaci" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />
            <input type="file" accept="image/*" onChange={(e) => setNewCharacterImage(e.target.files[0])} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveCharacter} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* --- KAFELKI POSTACI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {characters.map(character => {
          // Budowanie adresu URL dla obrazka (Jeśli brak, używamy pustego stringa, by nie wyświetlał błędu)
          const imageUrl = character.character_image ? `http://localhost:8000/storage/${character.character_image}` : null;

          // Style kafelków postaci
          return (
            <div 
              key={character.id} 
              style={{ 
                position: 'relative',
                height: '380px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#374151',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              {/* Opcje akcji (na razie emotki, potem zmienić na ikony) */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <button 
                  onClick={() => openEditModal(character)} 
                  title="Edytuj"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px' }}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(character.id)} 
                  title="Usuń"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255, 0, 0, 0.8)', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px' }}
                >
                  🗑️
                </button>
              </div>

              {/* Dolny obszar z tekstem i przyciemnieniem*/}
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                padding: '40px 20px 20px 20px', 
                background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent)', 
                color: 'white' 
              }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  {character.name}
                </h2>
                
                {character.group_name && (
                  <span style={{ backgroundColor: '#4B5563', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', display: 'inline-block', marginBottom: '10px' }}>
                    {character.group_name}
                  </span>
                )}
                
                {/* Ograniczenie opisu do 3 linijek. */}
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: '#e5e7eb',
                  display: '-webkit-box',
                  WebkitLineClamp: 3, // <--- Tutaj dziad ogranicza i bardzo dobrze bo już mnie to wkurwiało D;<
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {character.description || 'Brak opisu postaci.'}
                </p>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CharacterList;