import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function ChapterList() {
    const { projectId } = useParams();

    const [chapters, setChapters] = useState([]);

    //formularz
    const [newChapterNumber, setNewChapterNumber] = useState('');
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newChapterImage, setNewChapterImage] = useState('');
    const [newTimelinePointStart, setNewTimelinePointStart] = useState('');
    const [newTimelinePointEnd, setNewTimelinePointEnd] = useState('');
    const [newDisplayLabel, setNewDisplayLabel] = useState('');

    //stan okna pop-up
    const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    console.log('Łączenie sie z serverem laravel... pobieram projekty');

      fetch(`http://localhost:8000/api/chapters/${projectId}/chapters`)
        .then(response => response.json())
        .then(data => {
          console.log('Otrzymałem dane z serwera laravel: ', data);
          setChapters(data);
        })
        .catch(error => {
        console.error('Błąd podczas pobierania danych z serweralaravel:', error);
        }
        )
        
  }, [projectId]);

  const handleAddChapter = () => {
    const newChapterData = {
      chapter_number: newChapterNumber,
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
        if (!response.ok) {
          throw new Error('Błąd przy zapisie rozdziału');
        }
        return response.json();
      })
      .then(createdChapter => {
        setChapters([...chapters, createdChapter]);
        setNewChapterNumber('');
        setNewName('');
        setNewDescription('');
        setNewChapterImage('');
        setNewTimelinePointStart('');
        setNewTimelinePointEnd('');
        setNewDisplayLabel('');
        setIsModalOpen(false);
      })
      .catch(error => {
        console.error('Błąd podczas zapisywania rozdziału:', error);
      });
  };
        

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>Rozdziały</h1>
            <button onClick={() => setIsModalOpen(true)}
                style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                + Nowy rozdział
            </button>
        </div>
        
        {/* formularz dodawania rozdziału*/}

        {isModalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px' }}>
                    <h2>Nowy Rozdział</h2>
                    <input type="number" placeholder="Numer rozdziału" value={newChapterNumber} onChange={(e) => setNewChapterNumber(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="Nazwa rozdziału" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <textarea placeholder="Opis rozdziału" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="URL obrazka rozdziału" value={newChapterImage} onChange={(e) => setNewChapterImage(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="Punkt startowy na osi czasu" value={newTimelinePointStart} onChange={(e) => setNewTimelinePointStart(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="Punkt końcowy na osi czasu" value={newTimelinePointEnd} onChange={(e) => setNewTimelinePointEnd(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="Etykieta do wyświetlania na osi czasu" value={newDisplayLabel} onChange={(e) => setNewDisplayLabel(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Anuluj
                        </button>
                        <button onClick={handleAddChapter} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Zapisz Rozdział
                        </button>
                    </div>
                </div>
            </div>
        )}
    <div>
        {chapters.map(chapter => (
            <Link to={`/chapter/${chapter.id}`} key={chapter.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2>{chapter.name}</h2>
            <p>{chapter.description}</p>
            <p>{chapter.chapter_image}</p>
        </Link>    
    ))}
    </div>
    </div>
  );
}

export default ChapterList;