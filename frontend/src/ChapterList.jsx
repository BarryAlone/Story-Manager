import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import FABIcon from './assets/icons/plus.png';

function ChapterList() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [chapters, setChapters] = useState([]);
  
  // Stany UI Modali
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState(null);
  
  // Stany dla Hamburger Menu (Kebab) i Zamiany (Swap)
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [chapterToSwap, setChapterToSwap] = useState(null);
  const [targetSwapId, setTargetSwapId] = useState('');

  // Formularz nowego/edytowanego rozdziału
  const [newChapterNumber, setNewChapterNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newChapterImage, setNewChapterImage] = useState(null);
  const [newTimelinePointStart, setNewTimelinePointStart] = useState('');
  const [newTimelinePointEnd, setNewTimelinePointEnd] = useState('');
  const [newDisplayLabel, setNewDisplayLabel] = useState('');

  useEffect(() => {
    fetch(`http://localhost:8000/api/chapters/${projectId}/chapters`)
      .then(response => response.json())
      .then(data => setChapters(data))
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

  // Otwieranie głównego modala
  const openCreateModal = () => {
    setEditingChapterId(null);
    setNewChapterNumber('');
    setNewName('');
    setNewDescription('');
    setNewChapterImage(null);
    setNewTimelinePointStart('');
    setNewTimelinePointEnd('');
    setNewDisplayLabel('');
    setIsModalOpen(true);
  };

  const openEditModal = (chapter) => {
    setEditingChapterId(chapter.id);
    setNewChapterNumber(chapter.chapter_number || '');
    setNewName(chapter.name);
    setNewDescription(chapter.description || '');
    setNewChapterImage(null);
    setNewTimelinePointStart(chapter.timeline_point_start || '');
    setNewTimelinePointEnd(chapter.timeline_point_end || '');
    setNewDisplayLabel(chapter.display_label || '');
    setIsModalOpen(true);
    setOpenMenuId(null); // Zamknij menu po otwarciu
  };

  // Otwieranie modala do zamiany (Swap)
  const openSwapModal = (chapter) => {
    setChapterToSwap(chapter);
    setTargetSwapId('');
    setIsSwapModalOpen(true);
    setOpenMenuId(null); // Zamknij menu
  };

  // Zapis rozdziału
  const handleSaveChapter = () => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('name', newName);
    formData.append('description', newDescription || '');
    
    if (newChapterNumber) formData.append('chapter_number', newChapterNumber);
    if (newTimelinePointStart) formData.append('timeline_point_start', newTimelinePointStart);
    if (newTimelinePointEnd) formData.append('timeline_point_end', newTimelinePointEnd);
    if (newDisplayLabel) formData.append('display_label', newDisplayLabel);
    if (newChapterImage) formData.append('chapter_image', newChapterImage);

    let url = 'http://localhost:8000/api/chapters';
    let method = 'POST';

    if (editingChapterId) {
      url = `http://localhost:8000/api/chapters/${editingChapterId}`;
      formData.append('_method', 'PUT');
    }

    fetch(url, {
      method: method,
      headers: { 'Accept': 'application/json' },
      body: formData 
    })
      .then(async response => {
        if (!response.ok) throw new Error('Błąd przy zapisie rozdziału');
        return response.json();
      })
      .then(savedChapter => {
        if (editingChapterId) {
          setChapters(chapters.map(c => c.id === editingChapterId ? savedChapter : c));
        } else {
          setChapters([...chapters, savedChapter]);
        }
        setIsModalOpen(false);
      })
      .catch(error => console.error('Błąd:', error));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Czy na pewno chcesz trwale usunąć ten rozdział?")) return;
    fetch(`http://localhost:8000/api/chapters/${id}`, { method: 'DELETE' })
      .then(response => { if (response.ok) setChapters(chapters.filter(c => c.id !== id)); })
      .catch(error => console.error('Błąd usuwania:', error));
    setOpenMenuId(null);
  };

  // // Odświeżanie listy z serwera
  const refreshChapters = () => {
    fetch(`http://localhost:8000/api/chapters/${projectId}/chapters`)
      .then(response => response.json())
      .then(data => setChapters(data))
      .catch(error => console.error('Błąd odświeżania:', error));
  };

  // Funkcja zmiany kolejności góra/dół
  const handleMove = (chapter, direction) => {
    fetch(`http://localhost:8000/api/chapters/${chapter.id}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ direction: direction })
    })
    .then(response => {
      if (response.ok) {
        refreshChapters(); // Pobieramy zaktualizowaną listę z nowymi numerami
      } else {
        alert("Nie udało się przesunąć rozdziału.");
      }
    })
    .catch(error => console.error('Błąd przesuwania:', error));
  };

  // Funkcja zamiany miejscami dwóch konkretnych rozdziałów (Z modala)
  const handleSwapSubmit = () => {
    if (!targetSwapId) return;

    fetch(`http://localhost:8000/api/chapters/${chapterToSwap.id}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ target_id: targetSwapId })
    })
    .then(response => {
      if (response.ok) {
        setIsSwapModalOpen(false);
        refreshChapters(); // Pobieramy zaktualizowaną listę po zamianie
      } else {
        alert("Wystąpił błąd podczas zamiany.");
      }
    })
    .catch(error => console.error('Błąd zamiany:', error));
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 30px', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box', position: 'relative' }}>
        
        {/* Niewidoczny overlay do zamykania menu po kliknięciu poza nim */}
        {openMenuId && (
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
          />
        )}

        {/* NAGŁÓWEK */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
          <h1 style={{ margin: 0, fontSize: '2.2rem', color: '#111827' }}>Rozdziały</h1>
          
          <button 
            onClick={openCreateModal}
            style={{ width: '45px', height: '45px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: '#454545', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s, backgroundColor 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.backgroundColor = '#4338ca'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = '#454545'; }}
          >
            <img src={FABIcon} alt="Dodaj" style={{ width: '20px', height: '20px', filter: 'invert(1)' }} />
          </button>
        </div>
        
        {/* --- MODAL DODAWANIA / EDYCJI --- */}
        {isModalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '450px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <h2 style={{marginTop: 0, marginBottom: '20px', color: '#1f2937'}}>{editingChapterId ? 'Edytuj Rozdział' : 'Nowy Rozdział'}</h2>
                    
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Numer (zostaw puste dla szkicu):</label>
                    <input type="number" value={newChapterNumber} onChange={(e) => setNewChapterNumber(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                    
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Tytuł:</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                    
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Krótki opis:</label>
                    <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box', minHeight: '80px' }} />
                    
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Miniatura (opcjonalnie):</label>
                    <input type="file" accept="image/*" onChange={(e) => setNewChapterImage(e.target.files[0])} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Start osi czasu:</label>
                            <input type="number" value={newTimelinePointStart} onChange={(e) => setNewTimelinePointStart(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Koniec osi czasu:</label>
                            <input type="number" value={newTimelinePointEnd} onChange={(e) => setNewTimelinePointEnd(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 'bold' }}>Etykieta wyświetlana (np. "Wiosna 1092"):</label>
                    <input type="text" value={newDisplayLabel} onChange={(e) => setNewDisplayLabel(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '25px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Anuluj</button>
                        <button onClick={handleSaveChapter} style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Zapisz</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL ZAMIANY MIEJSCAMI (SWAP) --- */}
        {isSwapModalOpen && chapterToSwap && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <h2 style={{marginTop: 0, marginBottom: '20px', color: '#1f2937'}}>Zamień rozdział miejscami</h2>
                    <p style={{ color: '#4b5563', marginBottom: '15px' }}>Z którym rozdziałem chcesz zamienić <strong>#{chapterToSwap.chapter_number} {chapterToSwap.name}</strong>?</p>
                    
                    <select 
                        value={targetSwapId} 
                        onChange={(e) => setTargetSwapId(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginBottom: '25px', borderRadius: '5px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                    >
                        <option value="" disabled>-- Wybierz rozdział --</option>
                        {numberedChapters.filter(c => c.id !== chapterToSwap.id).map(c => (
                            <option key={c.id} value={c.id}>
                                #{c.chapter_number} {c.name}
                            </option>
                        ))}
                    </select>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setIsSwapModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Anuluj</button>
                        <button onClick={handleSwapSubmit} disabled={!targetSwapId} style={{ padding: '10px 20px', backgroundColor: targetSwapId ? '#4f46e5' : '#a5b4fc', color: 'white', border: 'none', borderRadius: '5px', cursor: targetSwapId ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>Zamień</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- GŁÓWNY UKŁAD 2 KOLUMN --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '40px' }}>
          
          {/* LEWA KOLUMNA: OŚ CZASU */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 2, border: '1px solid #e5e7eb', borderRadius: '10px', backgroundColor: '#ffffff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '15px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>Oś czasu ({numberedChapters.length})</h2>
            </div>
            
            <div style={{ padding: '20px', maxHeight: 'calc(100vh - 220px)', overflowY: 'scroll', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {numberedChapters.length > 0 ? numberedChapters.map((chapter, index) => {
                  const imageUrl = chapter.chapter_image ? `http://localhost:8000/storage/${chapter.chapter_image}` : null;
                  const isFirst = index === 0;
                  const isLast = index === numberedChapters.length - 1;

                  return (
                    <div 
                      key={chapter.id} 
                      onClick={() => navigate(`/project/${projectId}/chapters/${chapter.id}`)}
                      style={{ 
                        display: 'flex', height: '120px', flexShrink: 0, borderRadius: '8px', overflow: 'visible', 
                        backgroundColor: '#ffffff', border: '1px solid #e5e7eb', cursor: 'pointer', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s, border-color 0.2s' 
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#9ca3af'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      {/* Lewa strona: Zdjęcie */}
                      <div style={{ width: '120px', flexShrink: 0, backgroundColor: '#f3f4f6', backgroundImage: imageUrl ? `url(${imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', borderRight: '1px solid #e5e7eb', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                        {!imageUrl && <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>Brak zdj.</div>}
                      </div>

                      {/* Prawa strona: Tekst i Akcje */}
                      <div style={{ flex: 1, padding: '15px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* ZMIANA: Hamburger Menu i Strzałki */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 11 }}>
                          
                          {/* Strzałki */}
                          <div style={{ display: 'flex', gap: '2px', marginRight: '5px' }}>
                             {!isFirst && (
                               <button onClick={(e) => { e.stopPropagation(); handleMove(chapter, 'up'); }} title="Przesuń wyżej" style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4b5563', fontSize: '0.7rem' }}>▲</button>
                             )}
                             {!isLast && (
                               <button onClick={(e) => { e.stopPropagation(); handleMove(chapter, 'down'); }} title="Przesuń niżej" style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4b5563', fontSize: '0.7rem' }}>▼</button>
                             )}
                          </div>

                          {/* Kebab Menu (⋮) */}
                          <div style={{ position: 'relative' }}>
                             <button 
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chapter.id ? null : chapter.id); }} 
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', backgroundColor: openMenuId === chapter.id ? '#e5e7eb' : 'transparent', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4b5563' }}
                             >
                               ⋮
                             </button>
                             
                             {openMenuId === chapter.id && (
                               <div style={{ position: 'absolute', top: '32px', right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 12, width: '160px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                 <button onClick={(e) => { e.stopPropagation(); openEditModal(chapter); }} style={{ padding: '10px 15px', textAlign: 'left', border: 'none', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>Edytuj</button>
                                 <button onClick={(e) => { e.stopPropagation(); openSwapModal(chapter); }} style={{ padding: '10px 15px', textAlign: 'left', border: 'none', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>Zamień z...</button>
                                 <button onClick={(e) => { e.stopPropagation(); handleDelete(chapter.id); }} style={{ padding: '10px 15px', textAlign: 'left', border: 'none', backgroundColor: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>Usuń</button>
                               </div>
                             )}
                          </div>
                        </div>

                        {/* Nagłówek */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', paddingRight: '80px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 'bold', color: '#4f46e5', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>#{chapter.chapter_number}</span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapter.name}</h3>
                        </div>

                        {/* Etykiety osi czasu pod tytułem */}
                          {(chapter.timeline_point_start || chapter.timeline_point_end || chapter.display_label) && (
                            <div style={{ marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}>
                                
                                {/* Start osi czasu */}
                                {chapter.timeline_point_start && <span>{chapter.timeline_point_start}</span>}
                                
                                {/* Koniec osi czasu (z myślnikiem, jeśli istnieje) */}
                                {chapter.timeline_point_end && <span> &nbsp;—&nbsp; {chapter.timeline_point_end}</span>}
                                
                                {/* Etykieta wyświetlana na samym końcu */}
                                {chapter.display_label && <span style={{ marginLeft: '8px', fontStyle: 'italic', fontWeight: '500' }}>{chapter.display_label}</span>}
                                
                              </span>
                            </div>
                          )}

                        {/* Opis */}
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingRight: '40px' }}>
                          {chapter.description || 'Brak opisu...'}
                        </p>
                      </div>
                    </div>     
                  );
              }) : <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>Oś czasu jest pusta.</p>}
            </div>
          </div>

          {/* PRAWA KOLUMNA: SZKICE */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid #e5e7eb', borderRadius: '10px', backgroundColor: '#f9fafb', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4b5563' }}>Nieponumerowane rozdziały ({draftedChapters.length})</h2>
            </div>
            
            <div style={{ padding: '20px', maxHeight: 'calc(100vh - 220px)', overflowY: 'scroll', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {draftedChapters.length > 0 ? draftedChapters.map(chapter => {
                const imageUrl = chapter.chapter_image ? `http://localhost:8000/storage/${chapter.chapter_image}` : null;

                return (
                  <div 
                    key={chapter.id} 
                    onClick={() => navigate(`/project/${projectId}/chapters/${chapter.id}`)}
                    style={{ 
                      display: 'flex', height: '110px', flexShrink: 0, borderRadius: '8px', overflow: 'visible', 
                      backgroundColor: '#f3f4f6', border: '1px dashed #d1d5db', cursor: 'pointer', opacity: 0.9,
                      transition: 'border-color 0.2s, opacity 0.2s' 
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.opacity = 0.9; }}
                  >
                    {/* Lewa strona: Zdjęcie */}
                    <div style={{ width: '90px', flexShrink: 0, backgroundColor: '#e5e7eb', backgroundImage: imageUrl ? `url(${imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(50%)', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                    </div>

                    {/* Prawa strona: Tekst i Akcje */}
                    <div style={{ flex: 1, padding: '12px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      
                      {/* ZMIANA: Kebab Menu dla Szkiców */}
                      <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 11 }}>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chapter.id ? null : chapter.id); }} 
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', backgroundColor: openMenuId === chapter.id ? '#d1d5db' : 'transparent', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4b5563' }}
                         >
                           ⋮
                         </button>
                         
                         {openMenuId === chapter.id && (
                           <div style={{ position: 'absolute', top: '32px', right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 12, width: '120px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                             <button onClick={(e) => { e.stopPropagation(); openEditModal(chapter); }} style={{ padding: '10px 15px', textAlign: 'left', border: 'none', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>Edytuj</button>
                             <button onClick={(e) => { e.stopPropagation(); handleDelete(chapter.id); }} style={{ padding: '10px 15px', textAlign: 'left', border: 'none', backgroundColor: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>Usuń</button>
                           </div>
                         )}
                      </div>

                      {/* Nagłówek */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px', paddingRight: '40px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chapter.name}</h3>
                      </div>

                      {/* Opis */}
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingRight: '30px' }}>
                        {chapter.description || 'Szkic bez opisu...'}
                      </p>
                    </div>
                  </div>
                );
              }) : <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>Brak szkiców.</p>}
            </div>
          </div>

        </div>
    </div>
  );
}

export default ChapterList;