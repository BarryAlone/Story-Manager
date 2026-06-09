import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import RelationshipGraph from './RelationshipGraph';

function RelationshipList() {
  const { projectId } = useParams();
  
  // Stany na dane z bazy
  const [relationships, setRelationships] = useState([]);
  const [characters, setCharacters] = useState([]);

  // Stany formularza
  const [character1Id, setCharacter1Id] = useState('');
  const [character2Id, setCharacter2Id] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [description, setDescription] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pobieranie danych przy wejściu na stronę
  useEffect(() => {
    // 1. Pobieramy postacie (do list rozwijanych)
    fetch(`http://localhost:8000/api/projects/${projectId}/characters`)
      .then(res => res.json())
      .then(data => setCharacters(data))
      .catch(err => console.error('Błąd pobierania postaci:', err));

    // 2. Pobieramy relacje dla tego projektu
    fetch(`http://localhost:8000/api/projects/${projectId}/character-relationships`)
      .then(res => res.json())
      .then(data => setRelationships(data))
      .catch(err => console.error('Błąd pobierania relacji:', err));
  }, [projectId]);

  const handleSaveRelationship = () => {
    // Walidacja front-endowa
    if (!character1Id || !character2Id || character1Id === character2Id) {
      alert("Wybierz dwie różne postacie!");
      return;
    }

    const newRelationship = {
      project_id: projectId,
      character_1_id: character1Id,
      character_2_id: character2Id,
      relation_name: relationshipType,
      description: description
    };

    fetch('http://localhost:8000/api/character-relationships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newRelationship)
    })
      .then(async response => {
        if (!response.ok) {
          const err = await response.json();
          console.error("Szczegóły błędu:", err);
          throw new Error('Błąd przy zapisie');
        }
        return response.json();
      })
      .then(savedData => {
        setRelationships([...relationships, savedData]);
        closeModal();
      })
      .catch(error => console.error(error));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Usunąć tę relację?")) return;
    fetch(`http://localhost:8000/api/character-relationships/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) setRelationships(relationships.filter(r => r.id !== id));
      })
      .catch(err => console.error(err));
  };

  const closeModal = () => {
    setCharacter1Id('');
    setCharacter2Id('');
    setRelationshipType('');
    setDescription('');
    setIsModalOpen(false);
  };

  // Funkcja pomocnicza do wyświetlania imienia postaci na podstawie ID
  const getCharacterName = (id) => {
    const char = characters.find(c => c.id === parseInt(id));
    return char ? char.name : `Nieznana postać (ID: ${id})`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Relacje postaci</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          + Dodaj relację
        </button>
      </div>

      {/* GRAF RELACJI POSTACI */}
      <div style={{ marginBottom: '40px' }}>
        <RelationshipGraph />
      </div>

      {/* MODAL TWORZENIA RELACJI */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Nowa Relacja</h2>
            
            <select value={character1Id} onChange={(e) => setCharacter1Id(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
              <option value="">-- Wybierz Postać 1 --</option>
              {characters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>

            <select value={character2Id} onChange={(e) => setCharacter2Id(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
              <option value="">-- Wybierz Postać 2 --</option>
              {characters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>

            <input type="text" placeholder="Typ relacji (np. Wróg, Rodzeństwo, Sojusznik)" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <textarea placeholder="Opis / Notatki o relacji" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box', minHeight: '80px' }} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveRelationship} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* --- LISTA RELACJI --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
        {relationships.length === 0 ? <p style={{ color: 'gray' }}>Brak relacji w tym projekcie.</p> : null}
        
        {relationships.map(rel => (
          <div key={rel.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px', backgroundColor: '#f9fafb', position: 'relative' }}>
            <button 
              onClick={() => handleDelete(rel.id)} 
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontSize: '16px' }}
              title="Usuń"
            >
              🗑️
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px', fontWeight: 'bold' }}>
              <span style={{ color: '#2563eb' }}>{getCharacterName(rel.character_1_id)}</span>
              <span style={{ fontSize: '20px', color: '#9ca3af' }}>↔️</span>
              <span style={{ color: '#dc2626' }}>{getCharacterName(rel.character_2_id)}</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ backgroundColor: '#e5e7eb', padding: '3px 10px', borderRadius: '15px', fontSize: '0.85rem', color: '#374151' }}>
                {rel.relation_name || 'Nieokreślona'}
              </span>
              <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#4b5563' }}>
                {rel.description || 'Brak opisu.'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RelationshipList;