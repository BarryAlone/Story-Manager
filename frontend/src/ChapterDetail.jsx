import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import backArrow from './assets/icons/back_arrow.png';
import { apiFetch, backendUrl } from './api';

function ChapterDetail() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  
  const [chapter, setChapter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Odpytujemy Twój Laravelowy kontroler (metoda show)
    apiFetch(`/api/chapters/${chapterId}`)
      .then(response => {
        if (!response.ok) throw new Error('Nie udało się pobrać rozdziału');
        return response.json();
      })
      .then(data => {
        // Twój kontroler zwraca obiekt owinięty w klucz 'chapter'
        setChapter(data.chapter);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Błąd:', error);
        setIsLoading(false);
      });
  }, [chapterId]);

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Ładowanie danych rozdziału...</div>;
  }

  if (!chapter) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Nie znaleziono rozdziału.</div>;
  }

  const imageUrl = chapter.chapter_image ? backendUrl(`/storage/${chapter.chapter_image}`) : null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* Pasek nawigacji powrotnej */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            padding: '8px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', 
            borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#374151',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
          onMouseEnter={e => e.target.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={e => e.target.style.backgroundColor = '#f3f4f6'}
        >
          <img src={backArrow} alt="Powrót" style={{ width: '16px', height: '16px' }} />
          
        </button>
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        
        {/* LEWA STRONA (Główna oś tekstowa - styl Wiki) */}
        <div style={{ flex: '1', backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px' }}>
            {chapter.name}
          </h1>
          
          <div style={{ marginTop: '20px', lineHeight: '1.8', fontSize: '1.1rem', color: '#374151' }}>
            {/* Tutaj w przyszłości wyląduje TinyMCE. Na razie wyświetlamy surowy tekst */}
            {chapter.description_long ? (
              <div dangerouslySetInnerHTML={{ __html: chapter.description_long }} />
            ) : (
              <p style={{ fontStyle: 'italic', color: '#9ca3af' }}>Rozdział nie posiada jeszcze pełnej treści. Czas zacząć pisać!</p>
            )}
          </div>
        </div>

        {/* PRAWA STRONA (Panel boczny z atrybutami - styl Infobox) */}
        <aside style={{ width: '320px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 15px 0', borderBottom: '1px solid #d1d5db', paddingBottom: '10px' }}>
            Metadane Rozdziału
          </h2>

          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Okładka rozdziału" 
              style={{ width: '100%', height: 'auto', borderRadius: '4px', marginBottom: '15px' }} 
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Status:</span>
              <span>{chapter.chapter_number ? `Rozdział ${chapter.chapter_number}` : 'Szkic (Nieprzypisany)'}</span>
            </div>
            
            {chapter.display_label && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>
                <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Etykieta osi:</span>
                <span>{chapter.display_label}</span>
              </div>
            )}

            {(chapter.timeline_point_start || chapter.timeline_point_end) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>
                <span style={{ fontWeight: 'bold', color: '#4b5563' }}>Ramy czasowe:</span>
                <span>{chapter.timeline_point_start || '?'} - {chapter.timeline_point_end || '?'}</span>
              </div>
            )}

            <div style={{ marginTop: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>Krótki opis:</span>
              <p style={{ 
                margin: 0, color: '#6b7280', 
                wordWrap: 'break-word',       /* KLUCZOWE: łamie bardzo długie słowa */
                overflowWrap: 'break-word'    /* Wsparcie dla nowoczesnych przeglądarek */
              }}>
                {chapter.description || 'Brak.'}
              </p>
            </div>
          </div>

          <button 
            style={{ 
              width: '100%', marginTop: '20px', padding: '12px', 
              backgroundColor: '#4f46e5', color: 'white', border: 'none', 
              borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#4338ca'}
            onMouseLeave={e => e.target.style.backgroundColor = '#4f46e5'}
          >
            Edytuj rozdział
          </button>
        </aside>

      </div>
    </div>
  );
}

export default ChapterDetail;
