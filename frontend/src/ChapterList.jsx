import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import FABIcon from './assets/icons/plus.png';

function ChapterList() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [chapters, setChapters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Stany akordeonów
  const [isDraftsOpen, setIsDraftsOpen] = useState(false); 
  const [isTimelineOpen, setIsTimelineOpen] = useState(true); // Oś czasu domyślnie otwarta

  // Formularz
  const [newChapterNumber, setNewChapterNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newChapterImage, setNewChapterImage] = useState('');
  const [newTimelinePointStart, setNewTimelinePointStart] = useState('');
  const [newTimelinePointEnd, setNewTimelinePointEnd] = useState('');
  const [newDisplayLabel, setNewDisplayLabel] = useState('');

  useEffect(() => {
    fetch(`http://localhost:8000/api/chapters/${projectId}/chapters`)
      .then(response => response.json())
      .then(data => {
        setChapters(data);
      })
      .catch(error => console.error('Błąd:', error))
  }, [projectId]);

  // Logika filtrowania
  const draftedChapters = useMemo(
    () => chapters.filter((chapter) => !chapter.chapter_number || chapter.chapter_number === 0),
    [chapters]
  );

  const numberedChapters = useMemo(
    () => chapters.filter((chapter) => chapter.chapter_number && chapter.chapter_number > 0).sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number)),
    [chapters]
  );

  // Funkcja zapisu
  const handleAddChapter = () => {
    const newChapterData = {
      chapter_number: newChapterNumber || null,
      project_id: projectId,
      name: newName,
      description: newDescription,
      chapter_image: newChapterImage,
      timeline_point_start: newTimelinePointStart,
      timeline_point_end: newTimelinePointEnd,
      display_label: newDisplayLabel
    };

    fetch(`http://localhost:8000/api/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newChapterData)
    })
      .then(response => {
        if (!response.ok) throw new Error('Błąd przy zapisie rozdziału');
        return response.json();
      })
      .then(createdChapter => {
        setChapters([...chapters, createdChapter]);
        setNewChapterNumber(''); setNewName(''); setNewDescription('');
        setNewChapterImage(''); setNewTimelinePointStart(''); setNewTimelinePointEnd(''); setNewDisplayLabel('');
        setIsModalOpen(false);
      })
      .catch(error => console.error('Błąd:', error));
  };

  return (
    <div>
        {/* NAGŁÓWEK */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>Rozdziały</h1>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ position: 'fixed', bottom: '40px', right: '40px', width: '60px', height: '60px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: '#6c7683', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
            >
              <img src={FABIcon} alt="Dodaj" style={{ width: '24px', height: '24px' }} />
            </button>
        </div>
        
        {/* MODAL DODAWANIA */}
        {isModalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px' }}>
                    <h2>Nowy Rozdział</h2>
                    <input type="number" placeholder="Numer rozdziału (Zostaw puste dla szkicu)" value={newChapterNumber} onChange={(e) => setNewChapterNumber(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="Nazwa rozdziału" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <textarea placeholder="Opis rozdziału" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Anuluj</button>
                        <button onClick={handleAddChapter} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Zapisz</button>
                    </div>
                </div>
            </div>
        )}

      {/* SEKCJA 1: SZKICE (ZWIJANA + WEWNĘTRZNY SCROLL) */}
      <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb', overflow: 'hidden' }}>
        <div 
          onClick={() => setIsDraftsOpen(!isDraftsOpen)} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', backgroundColor: '#f3f4f6' }}
        >
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#374151' }}>Nieprzypisane szkice ({draftedChapters.length})</h2>
          <span style={{ fontWeight: 'bold', color: '#6b7280' }}>{isDraftsOpen ? '▲ Zwiń' : '▼ Rozwiń'}</span>
        </div>
        
        {isDraftsOpen && (
          // Kontener z wewnętrznym scrollem (maxHeight)
          <div style={{ padding: '15px 20px', maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {draftedChapters.length > 0 ? draftedChapters.map(chapter => (
              <div 
                key={chapter.id} 
                onClick={() => navigate(`/project/${projectId}/chapters/${chapter.id}`)}
                style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>Szkic</div>
                <h3 style={{ margin: '0 0 5px 0', color: '#111827' }}>{chapter.name}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563' }}>{chapter.description || 'Brak opisu.'}</p>
              </div>
            )) : <p style={{ color: '#6b7280', margin: 0 }}>Brak szkiców.</p>}
          </div>
        )}
      </div>

      {/* SEKCJA 2: OŚ CZASU (ZWIJANA + WEWNĘTRZNY SCROLL) */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
        <div 
          onClick={() => setIsTimelineOpen(!isTimelineOpen)} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', borderBottom: isTimelineOpen ? '1px solid #e5e7eb' : 'none' }}
        >
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>Oś czasu ({numberedChapters.length})</h2>
          <span style={{ fontWeight: 'bold', color: '#6b7280' }}>{isTimelineOpen ? '▲ Zwiń' : '▼ Rozwiń'}</span>
        </div>

        {isTimelineOpen && (
          // Kontener z wewnętrznym scrollem (maxHeight)
          <div style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f9fafb' }}>
            {numberedChapters.length > 0 ? numberedChapters.map(chapter => (
                <div 
                  key={chapter.id} 
                  onClick={() => navigate(`/project/${projectId}/chapters/${chapter.id}`)}
                  style={{ padding: '15px 20px', backgroundColor: '#374151', color: 'white', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '5px', fontWeight: 'bold' }}>ROZDZIAŁ {chapter.chapter_number}</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{chapter.name}</h3>
                    <p style={{ margin: 0, color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.4' }}>{chapter.description || 'Brak opisu.'}</p>
                </div>     
            )) : <p style={{ color: '#6b7280', margin: 0 }}>Brak przypisanych rozdziałów na osi czasu.</p>}
          </div>
        )}
      </div>

    </div>
  );
}

export default ChapterList;