import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function CharacterList() {

  const [characters, setCharacters] = useState([]);

  const { projectId } = useParams();

  useEffect(() => {
    console.log('Łączenie sie z serverem laravel... pobieram postacie');

      fetch(`http://localhost:8000/api/projects/${projectId}/characters`)
        .then(response => response.json())
        .then(data => {
          console.log('Otrzymałem dane z serwera laravel: ', data);
          setCharacters(data);
        })
        .catch(error => {
        console.error('Błąd podczas pobierania danych z serweralaravel:', error);
        }
        )
        
  }, [projectId]);

  return (
    <div>
      <h1>Twoje Postacie</h1>
      <button>
        + Nowa postać
      </button>

      <div>
        {characters.map(character => (
          <div key={character.id}>
            <h2>{character.name}</h2>
            <p>{character.description}</p>
            <p>{character.character_image}</p>  
          </div>
        ))}
      </div>
    </div>
  );
}

export default CharacterList;