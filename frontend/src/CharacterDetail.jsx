import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import editIcon from './assets/icons/pencil.png';

function CharacterDetail() {
  const { projectId, characterId } = useParams();
  const [character, setCharacter] = useState(null);
  const [projectAttributes, setProjectAttributes] = useState([]);
  const [form, setForm] = useState({
    name: '',
    group_name: '',
    description: '',
    attributes: {},
    imageFile: null,
  });
  const [editingFields, setEditingFields] = useState({
    name: false,
    group_name: false,
    description: false,
    image: false,
    attributes: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/characters/${characterId}`)
      .then(response => response.json())
      .then(data => {
        const characterData = data.character || data;
        setCharacter(characterData);
        setProjectAttributes(data.attributes || []);
        setForm({
          name: characterData.name || '',
          group_name: characterData.group_name || '',
          description: characterData.description || '',
          attributes: characterData.attributes || {},
          imageFile: null,
        });
      })
      .catch(error => {
        console.error('Błąd pobierania profilu:', error);
        setError('Nie udało się pobrać danych postaci.');
      });
  }, [characterId]);

  if (error) {
    return <div style={{ padding: '20px', color: '#b91c1c' }}>{error}</div>;
  }

  if (!character) {
    return <div style={{ padding: '20px' }}>Ładowanie profilu postaci...</div>;
  }

  const imageUrl = character.character_image ? `http://localhost:8000/storage/${character.character_image}` : null;

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeChange = (attrId, value) => {
    setForm(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrId]: value,
      },
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm(prev => ({ ...prev, imageFile: e.target.files[0] }));
      setEditingFields(prev => ({ ...prev, image: true }));
    }
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('group_name', form.group_name || '');
    formData.append('description', form.description || '');
    Object.entries(form.attributes).forEach(([key, value]) => {
      formData.append(`attributes[${key}]`, value);
    });
    if (form.imageFile) {
      formData.append('character_image', form.imageFile);
    }
    formData.append('_method', 'PUT');

    fetch(`http://localhost:8000/api/characters/${characterId}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData,
    })
      .then(async response => {
        setIsSaving(false);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Błąd zapisu');
        }
        return response.json();
      })
      .then(updatedCharacter => {
        setCharacter(updatedCharacter);
        setForm(prev => ({ ...prev, imageFile: null }));
        setEditingFields({ name: false, group_name: false, description: false, image: false, attributes: {} });
      })
      .catch(err => {
        console.error('Błąd zapisu postaci:', err);
        setError('Nie udało się zapisać zmian.');
      });
  };

  const handleReset = () => {
    setForm({
      name: character.name || '',
      group_name: character.group_name || '',
      description: character.description || '',
      attributes: character.attributes || {},
      imageFile: null,
    });
    setEditingFields({ name: false, group_name: false, description: false, image: false, attributes: {} });
    setError(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Link to={`/project/${projectId}/characters`} style={{ textDecoration: 'none', color: '#4B5563', marginBottom: '20px', display: 'inline-block' }}>
        ← Powrót do listy postaci
      </Link>

      <div style={{ display: 'flex', gap: '40px', marginTop: '20px', flexWrap: 'wrap' }}>
        <div style={{ width: '300px', minWidth: '280px', borderRadius: '10px', backgroundColor: '#374151', overflow: 'hidden' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={character.name} style={{ width: '100%', height: '400px', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#9ca3af' }}>Brak zdjęcia</div>
          )}
          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Zdjęcie postaci</div>
              <button
                onClick={() => setEditingFields(prev => ({ ...prev, image: true }))}
                title="Zmień zdjęcie"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            {editingFields.image && (
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginTop: '12px', width: '100%' }} />
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              {editingFields.name ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{ width: '100%', padding: '14px', fontSize: '2rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              ) : (
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{character.name}</h1>
              )}
            </div>
            <button
              onClick={() => setEditingFields(prev => ({ ...prev, name: true }))}
              title="Edytuj imię"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
            >
              <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            {editingFields.group_name ? (
              <input
                type="text"
                value={form.group_name}
                onChange={(e) => handleInputChange('group_name', e.target.value)}
                placeholder="Frakcja / grupa"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            ) : (
              <span style={{ backgroundColor: '#4B5563', color: 'white', padding: '8px 16px', borderRadius: '15px', fontSize: '0.95rem' }}>
                {character.group_name || 'Brak grupy'}
              </span>
            )}
            <button
              onClick={() => setEditingFields(prev => ({ ...prev, group_name: true }))}
              title="Edytuj grupę"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
            >
              <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#374151' }}>Biografia / Opis</h3>
              <button
                onClick={() => setEditingFields(prev => ({ ...prev, description: true }))}
                title="Edytuj opis"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            {editingFields.description ? (
              <textarea
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', resize: 'vertical' }}
              />
            ) : (
              <p style={{ lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }}>
                {character.description || 'Ta postać nie ma jeszcze opisu.'}
              </p>
            )}
          </div>

          {projectAttributes && projectAttributes.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#374151' }}>Atrybuty</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                {projectAttributes.map(attr => (
                  <div key={attr.id} style={{ padding: '14px', backgroundColor: '#f3f4f6', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{attr.name}</span>
                      <button
                        onClick={() => setEditingFields(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            [attr.id]: true,
                          },
                        }))}
                        title={`Edytuj ${attr.name}`}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <img src={editIcon} alt="Edytuj" style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                    {editingFields.attributes[attr.id] ? (
                      <input
                        type={attr.type === 'number' ? 'number' : 'text'}
                        value={form.attributes[attr.id] ?? ''}
                        onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    ) : (
                      <div style={{ fontSize: '1.05rem', color: '#4b5563', fontWeight: 500 }}>
                        {form.attributes[attr.id] ?? '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '25px', gap: '10px' }}>
            <button
              onClick={handleReset}
              style={{ padding: '10px 18px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', borderRadius: '8px', cursor: 'pointer' }}
            >
              Anuluj zmiany
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              style={{ padding: '10px 18px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              {isSaving ? 'Zapisuję...' : 'Zapisz zmiany'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterDetail;
