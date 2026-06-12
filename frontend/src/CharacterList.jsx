import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import moreIcon from './assets/icons/more.png';
import deleteIcon from './assets/icons/trash-can.png';
import editIcon from './assets/icons/pencil.png';
import FABIcon from './assets/icons/plus.png';

function CharacterList() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [projectAttributes, setProjectAttributes] = useState([]);

  // Formularz
  const [newName, setNewName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCharacterImage, setNewCharacterImage] = useState(null);
  const [characterAttributes, setCharacterAttributes] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState(null);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeType, setNewAttributeType] = useState('text');

  useEffect(() => {
    fetch(`http://localhost:8000/api/projects/${projectId}/characters`)
      .then(response => response.json())
      .then(data => {
        setCharacters(data.characters || data);
        setProjectAttributes(data.attributes || []);
      })
      .catch(error => console.error('Błąd:', error));

    fetch(`http://localhost:8000/api/projects/${projectId}/attributes`)
      .then(response => response.json())
      .then(data => setProjectAttributes(data))
      .catch(error => console.error('Błąd pobierania atrybutów:', error));
  }, [projectId]);

  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) return;

    fetch('http://localhost:8000/api/project-attributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        name: newAttributeName,
        type: newAttributeType
      })
    })
      .then(response => response.json())
      .then(data => {
        setProjectAttributes([...projectAttributes, data]);
        setNewAttributeName('');
        setNewAttributeType('text');
        setShowAttributeForm(false);
      })
      .catch(error => console.error('Błąd dodawania atrybutu:', error));
  };

  const handleDeleteAttribute = (attributeId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten atrybut?')) return;

    fetch(`http://localhost:8000/api/project-attributes/${attributeId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (response.ok) {
          setProjectAttributes(projectAttributes.filter(attr => attr.id !== attributeId));
          setCharacterAttributes(prev => {
            const next = { ...prev };
            delete next[attributeId];
            return next;
          });
        }
      })
      .catch(error => console.error('Błąd usuwania atrybutu:', error));
  };

  const handleSaveCharacter = () => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('name', newName);
    formData.append('group_name', newGroupName || '');
    formData.append('description', newDescription || '');

    Object.entries(characterAttributes).forEach(([key, value]) => {
      formData.append(`attributes[${key}]`, value);
    });
    
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
    setCharacterAttributes(character.attributes || {});
    setNewCharacterImage(null);
    setShowAttributeForm(false);
    setNewAttributeName('');
    setNewAttributeType('text');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingCharacterId(null);
    setNewName('');
    setNewGroupName('');
    setNewDescription('');
    setCharacterAttributes({});
    setNewCharacterImage(null);
    setShowAttributeForm(false);
    setNewAttributeName('');
    setNewAttributeType('text');
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Postacie</h1>
        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          style={{ 
            position: 'fixed',
            bottom: '40px',
            right: '40px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#6c7683',
            opacity: 0.9,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <img src={FABIcon} alt="Dodaj postać" style={{ width: '24px', height: '24px' }} />
        </button>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px', margin: '20px 0', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{editingCharacterId ? 'Edytuj Postać' : 'Nowa Postać'}</h2>
            <input type="text" placeholder="Imię postaci" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Frakcja / Grupa (opcjonalnie)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <textarea placeholder="Opis postaci" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />
            <input type="file" accept="image/*" onChange={(e) => setNewCharacterImage(e.target.files[0])} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />

            {/* SEKCJA ATRYBUTÓW */}
            <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>Atrybuty Postaci</h3>
              <button
                onClick={() => setShowAttributeForm(true)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  fontSize: '1.2rem',
                  lineHeight: '1',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Dodaj nowy atrybut"
              >
                +
              </button>
            </div>

            {/* Wyświetlanie istniejących atrybutów projektu */}
            <div style={{ marginBottom: '15px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '10px' }}>
              {projectAttributes.length > 0 ? (
                projectAttributes.map(attr => (
                  <div key={attr.id} style={{ position: 'relative', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', borderRadius: '5px', backgroundColor: '#f8fafc' }}>
                    <label style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span>{attr.name}:</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAttribute(attr.id); }}
                        title="Usuń atrybut"
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '3px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '700',
                          lineHeight: '1',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </label>
                    <input 
                      type={attr.type === 'number' ? 'number' : 'text'} 
                      value={characterAttributes[attr.id] || ''} 
                      onChange={(e) => setCharacterAttributes({...characterAttributes, [attr.id]: e.target.value})}
                      placeholder="Wartość" 
                      style={{ flex: 1, padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db' }}
                    />
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af' }}>Brak atrybutów. Dodaj nowy atrybut poniżej.</p>
              )}
            </div>

            {/* Formularz dodawania nowego atrybutu */}
            {showAttributeForm && (
              <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '5px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Nowy atrybut</div>
                  <button
                    onClick={() => { setShowAttributeForm(false); setNewAttributeName(''); setNewAttributeType('text'); }}
                    title="Anuluj"
                    style={{
                      width: '24px',
                      height: '24px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '700',
                      lineHeight: '1',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ display: 'grid', gap: '10px', marginBottom: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="Nazwa atrybutu (np. Wzrost, Rasa)" 
                    value={newAttributeName} 
                    onChange={(e) => setNewAttributeName(e.target.value)}
                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                  />
                  <select 
                    value={newAttributeType} 
                    onChange={(e) => setNewAttributeType(e.target.value)}
                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                  >
                    <option value="text">Tekst</option>
                    <option value="number">Liczba</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={handleAddAttribute}
                    style={{ padding: '10px 16px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )}

            {/* Przyciski akcji */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveCharacter} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* --- KAFELKI POSTACI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {characters.map(character => {
          const imageUrl = character.character_image ? `http://localhost:8000/storage/${character.character_image}` : null;

          return (
            <div 
              key={character.id} 
              onClick={() => navigate(`/project/${projectId}/characters/${character.id}`)}
              style={{ 
                textDecoration: 'none',
                color: 'inherit',
                position: 'relative',
                height: '380px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#374151',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'block',
                cursor: 'pointer'
              }}
            >
              {/* Opcje akcji */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(character); }} 
                  title="Edytuj"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}
                >
                  <img src={editIcon} alt="Edytuj" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(character.id); }} 
                  title="Usuń"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}
                >
                  <img src={deleteIcon} alt="Usuń" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                </button>
              </div>

              {/* Obszar z tekstem */}
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
                
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: '#e5e7eb',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
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
