import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function CharacterDetail() {
  // Pobieramy z adresu URL zarówno ID projektu, jak i ID postaci
  const { projectId, characterId } = useParams();
  const [character, setCharacter] = useState(null);
  const [projectAttributes, setProjectAttributes] = useState([]);

  useEffect(() => {
    // Zapytanie do Laravela o tę JEDNĄ konkretną postać
    fetch(`http://localhost:8000/api/characters/${characterId}`)
      .then(response => response.json())
      .then(data => {
        setCharacter(data.character || data);
        setProjectAttributes(data.attributes || []);
      })
      .catch(error => console.error('Błąd pobierania profilu:', error));
  }, [characterId]);

  if (!character) {
    return <div style={{ padding: '20px' }}>Ładowanie profilu postaci...</div>;
  }

  const imageUrl = character.character_image ? `http://localhost:8000/storage/${character.character_image}` : null;

  return (
    <div style={{ padding: '20px' }}>
      {/* Przycisk powrotu */}
      <Link to={`/project/${projectId}/characters`} style={{ textDecoration: 'none', color: '#4B5563', marginBottom: '20px', display: 'inline-block' }}>
        ← Powrót do listy postaci
      </Link>

      <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
        {/* Lewa strona: Duże zdjęcie */}
        <div style={{ width: '300px', height: '400px', borderRadius: '10px', backgroundColor: '#374151', overflow: 'hidden' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af' }}>Brak zdjęcia</div>
          )}
        </div>

        {/* Prawa strona: Informacje */}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem' }}>{character.name}</h1>
          
          {character.group_name && (
            <span style={{ backgroundColor: '#4B5563', color: 'white', padding: '5px 15px', borderRadius: '15px', fontSize: '0.9rem' }}>
              {character.group_name}
            </span>
          )}

          <h3 style={{ marginTop: '30px', marginBottom: '10px', color: '#374151' }}>Biografia / Opis</h3>
          <p style={{ lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }}>
            {character.description || 'Ta postać nie ma jeszcze opisu.'}
          </p>

            {/* SEKCJA ATRYBUTÓW */}
            {projectAttributes && projectAttributes.length > 0 && (
              <>
                <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#374151' }}>Atrybuty</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                  {projectAttributes.map(attr => (
                    <div key={attr.id} style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                        {attr.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '1.1rem', color: '#4b5563', fontWeight: '500' }}>
                        {character.attributes && character.attributes[attr.id] ? character.attributes[attr.id] : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
}

export default CharacterDetail;