import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function AttributeList() {
  const { projectId } = useParams();
  
  const [attributes, setAttributes] = useState([]);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeType, setNewAttributeType] = useState('text');
  const [isLoading, setIsLoading] = useState(true);

  // Pobieranie atrybutów po załadowaniu widoku
  useEffect(() => {
    fetch(`http://localhost:8000/api/projects/${projectId}/attributes`)
      .then(response => response.json())
      .then(data => {
        setAttributes(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Błąd pobierania atrybutów:', error);
        setIsLoading(false);
      });
  }, [projectId]);

  // Dodawanie nowego atrybutu
  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) return;

    fetch(`http://localhost:8000/api/projects/${projectId}/attributes`, {
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
        setAttributes([...attributes, data]);
        setNewAttributeName('');
        setNewAttributeType('text'); // Resetujemy typ na domyślny
      })
      .catch(error => console.error('Błąd dodawania atrybutu:', error));
  };

  // Usuwanie atrybutu
  const handleDeleteAttribute = (attributeId) => {
    // Dodałem ostrzeżenie, bo usunięcie atrybutu usunie go też z zapisanych postaci!
    if (!window.confirm('Czy na pewno chcesz usunąć ten atrybut? Usunięcie go spowoduje utratę tych danych u wszystkich przypisanych postaci!')) return;

    fetch(`http://localhost:8000/api/projects/${projectId}/attributes/${attributeId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (response.ok) {
          setAttributes(attributes.filter(attr => attr.id !== attributeId));
        }
      })
      .catch(error => console.error('Błąd usuwania atrybutu:', error));
  };

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Ładowanie atrybutów...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', marginBottom: '20px' }}>Atrybuty Projektu</h1>
      
      {/* --- Sekcja dodawania nowego atrybutu --- */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <input 
          type="text" 
          placeholder="Nazwa atrybutu (np. Wzrost, Rasa, Wiek, Rodzaj magii)" 
          value={newAttributeName} 
          onChange={(e) => setNewAttributeName(e.target.value)}
          style={{ flex: '1', padding: '10px', borderRadius: '5px', border: '1px solid #d1d5db' }}
        />
        <select 
          value={newAttributeType} 
          onChange={(e) => setNewAttributeType(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #d1d5db', backgroundColor: 'white', minWidth: '120px' }}
        >
          <option value="text">Tekst</option>
          <option value="number">Liczba</option>
        </select>
        <button 
          onClick={handleAddAttribute}
          style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Dodaj Atrybut
        </button>
      </div>

      {/* --- Sekcja listy atrybutów --- */}
      <div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#374151' }}>
          Istniejące atrybuty ({attributes.length})
        </h2>
        
        {attributes.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {attributes.map(attr => (
              <li key={attr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                
                {/* Lewa strona wiersza: Nazwa i plakietka z typem */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#111827' }}>
                    {attr.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', padding: '4px 8px', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    {attr.type === 'number' ? 'Liczba' : 'Tekst'}
                  </span>
                </div>
                
                {/* Prawa strona wiersza: Akcje */}
                <button 
                  onClick={() => handleDeleteAttribute(attr.id)}
                  style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', color: '#6b7280' }}>
            Nie dodano jeszcze żadnych atrybutów. Stwórz pierwszy używając formularza powyżej!
          </div>
        )}
      </div>
    </div>
  );
}

export default AttributeList;