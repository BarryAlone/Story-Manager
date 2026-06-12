import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function CharacterDetail() {
  // Pobieramy z adresu URL zarówno ID projektu, jak i ID postaci
  const { projectId, characterId } = useParams();
  const [character, setCharacter] = useState(null);

  useEffect(() => {
    // Zapytanie do Laravela o tę JEDNĄ konkretną postać
    fetch(`http://localhost:8000/api/characters/${characterId}`)
      .then(response => response.json())
      .then(data => setCharacter(data))
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
        </div>
      </div>
    </div>
  );
}

export default CharacterDetail;