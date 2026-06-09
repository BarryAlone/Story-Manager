import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ProjectList() {


    const [projects, setProjects] = useState([]);

    //formularz
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newProjectImage, setNewProjectImage] = useState('');

    

    //stan okna pop-up
    const [isModalOpen, setIsModalOpen] = useState(false);
  

  useEffect(() => {
    console.log('Łączenie sie z serverem laravel... pobieram projekty');

      fetch('http://localhost:8000/api/projects')
        .then(response => response.json())
        .then(data => {
          console.log('Otrzymałem dane z serwera laravel: ', data);
          setProjects(data);
        })
        .catch(error => {
        console.error('Błąd podczas pobierania danych z serweralaravel:', error);
        }
        )
        
  }, []);

  const handleAddProject = () => {
    const newProjectData = {
      name: newName,
      description: newDescription,
      project_image: newProjectImage
    };

    fetch('http://localhost:8000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newProjectData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Błąd przy zapisie projektu');
        }
        return response.json();
      })
      .then(createdProject => {
        setProjects([...projects, createdProject]);
        setNewName('');
        setNewDescription('');
        setNewProjectImage('');
        setIsModalOpen(false);
      })
      .catch(error => {
        console.error('Błąd podczas zapisywania projektu:', error);
      });
  };
        

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h1>Twoje Projekty</h1>
        </div>
            <div style={{ display: 'flex', justifyContent: 'right', alignItems: 'center' }}>
            <button onClick={() => setIsModalOpen(true)}
                style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                + Nowy projekt
            </button>
            </div>
          
        
        {/* formularz dodawania projektu*/}

        {isModalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px' }}>
                    <h2>Nowy Projekt</h2>
                    <input type="text" placeholder="Nazwa projektu" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <textarea placeholder="Opis projektu" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <input type="text" placeholder="URL obrazka projektu" value={newProjectImage} onChange={(e) => setNewProjectImage(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Anuluj
                        </button>
                        <button onClick={handleAddProject} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Zapisz Projekt
                        </button>
                    </div>
                </div>
            </div>
        )}  

    <div>
        {projects.map(project => (
            <Link to={`/project/${project.id}/characters`} key={project.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2>{project.name}</h2>
            <p>{project.description}</p>
            <p>{project.project_image}</p>
        </Link>    
    ))}
    </div>
    </div>
  );
}

export default ProjectList;